/**
 * Convert Ulhas Vaitarna village shapefiles to WGS84 GeoJSON for the workbench map.
 * Run: npm run generate:parcel-geojson
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as shapefile from "shapefile";
import proj4 from "proj4";
import * as turf from "@turf/turf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "data", "parcels");
const sourceRoot =
  process.env.SHAPEFILE_SOURCE ??
  "C:\\Users\\Fahad\\Desktop\\rfp\\Ulhas Vaitarna Villages Shapefile\\polygon_data";

const UTM43N = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs";
const WGS84 = "EPSG:4326";

/** @type {Record<string, { region: string; shp: string }>} */
const REGION_SOURCES = {
  puducherry: {
    region: "puducherry",
    shp: join(sourceRoot, "ambele kh murbad thane", "Ambele Kh._Murbad_Thane_Polygons.shp"),
  },
  karaikal: {
    region: "karaikal",
    shp: join(sourceRoot, "Khutal Bangla_Murbad_Thane", "Khutal Bangla_Murbad_Thane_Polyline.shp"),
  },
  mahe: {
    region: "mahe",
    shp: join(sourceRoot, "Sakhare_Murbad_Thane", "Sakhare_Murbad_Thane_Polygons.shp"),
  },
};

function reprojectCoord([x, y]) {
  const [lon, lat] = proj4(UTM43N, WGS84, [x, y]);
  return [lon, lat];
}

function reprojectCoords(coords) {
  if (typeof coords[0] === "number") return reprojectCoord(coords);
  return coords.map(reprojectCoords);
}

function reprojectFeature(feature) {
  const geom = feature.geometry;
  if (!geom) return feature;
  return {
    ...feature,
    geometry: {
      ...geom,
      coordinates: reprojectCoords(geom.coordinates),
    },
  };
}

async function readShapefile(shpPath) {
  const features = [];
  const source = await shapefile.open(shpPath);
  let result = await source.read();
  while (!result.done) {
    features.push(result.value);
    result = await source.read();
  }
  return features;
}

function normalizeGeometryFeatures(features) {
  return features
    .map((feature) => {
      const geom = feature.geometry;
      if (!geom) return null;
      if (geom.type === "LineString") return turf.lineString(geom.coordinates, feature.properties ?? {});
      if (geom.type === "MultiLineString") {
        return geom.coordinates.map((coords) => turf.lineString(coords, feature.properties ?? {}));
      }
      if (geom.type === "Polygon") return turf.polygon(geom.coordinates, feature.properties ?? {});
      if (geom.type === "MultiPolygon") {
        return geom.coordinates.map((coords) => turf.polygon(coords, feature.properties ?? {}));
      }
      return null;
    })
    .flat()
    .filter(Boolean);
}

function isValidParcelPolygon(feature) {
  if (feature.geometry.type !== "Polygon") return false;
  const ring = feature.geometry.coordinates[0];
  if (!ring || ring.length < 4) return false;
  return turf.area(feature) > 1;
}

function polygonizeLines(lineFeatures) {
  if (!lineFeatures.length) return [];
  try {
    const polygonized = turf.polygonize(turf.featureCollection(lineFeatures));
    return polygonized.features.filter(isValidParcelPolygon);
  } catch {
    return [];
  }
}

function extractBoundariesAndPolygons(features) {
  const normalized = normalizeGeometryFeatures(features);
  const existingPolygons = normalized.filter((feature) => feature.geometry.type === "Polygon");
  const lineFeatures = normalized.filter((feature) => feature.geometry.type === "LineString");
  const polygonized = polygonizeLines(lineFeatures);

  return {
    boundaries: lineFeatures,
    polygons: [...existingPolygons, ...polygonized],
  };
}

function flattenPolygons(features) {
  const out = [];
  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      if (isValidParcelPolygon(feature)) out.push(feature);
      continue;
    }
    if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach((coords, index) => {
        const part = turf.polygon(coords, { ...(feature.properties ?? {}), _part: index });
        if (isValidParcelPolygon(part)) out.push(part);
      });
    }
  }
  return out;
}

function dedupeBoundaries(lineFeatures) {
  const seen = new Set();
  const out = [];
  for (const line of lineFeatures) {
    const coords = line.geometry.coordinates;
    if (coords.length < 2) continue;
    const a = coords[0];
    const b = coords[coords.length - 1];
    const forward = coords.map((c) => `${c[0].toFixed(7)},${c[1].toFixed(7)}`).join(";");
    const reverse = [...coords].reverse().map((c) => `${c[0].toFixed(7)},${c[1].toFixed(7)}`).join(";");
    const key = forward < reverse ? forward : reverse;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

async function convertRegion(key, config) {
  console.log(`Converting ${key} from ${config.shp}`);
  const raw = await readShapefile(config.shp);
  const reprojected = raw.map(reprojectFeature);
  const { boundaries, polygons } = extractBoundariesAndPolygons(reprojected);
  const parcelPolygons = flattenPolygons(polygons);
  const boundaryLines = dedupeBoundaries(boundaries);

  const parcelCollection = {
    type: "FeatureCollection",
    features: parcelPolygons.map((feature, index) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        shapeIndex: index,
        sourceVillage: key,
        _source: "polygonize",
      },
    })),
  };

  const boundaryCollection = {
    type: "FeatureCollection",
    features: boundaryLines.map((feature, index) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        boundaryIndex: index,
        sourceVillage: key,
      },
    })),
  };

  const parcelPath = join(outDir, `${key}.geojson`);
  const boundaryPath = join(outDir, `${key}-boundaries.geojson`);
  await writeFile(parcelPath, JSON.stringify(parcelCollection));
  await writeFile(boundaryPath, JSON.stringify(boundaryCollection));
  console.log(
    `  -> ${parcelPolygons.length} parcel polygons, ${boundaryLines.length} boundary lines`,
  );
  console.log(`     ${parcelPath}`);
  console.log(`     ${boundaryPath}`);
  return { polygons: parcelPolygons.length, boundaries: boundaryLines.length };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let totalPolygons = 0;
  let totalBoundaries = 0;
  for (const [key, config] of Object.entries(REGION_SOURCES)) {
    const counts = await convertRegion(key, config);
    totalPolygons += counts.polygons;
    totalBoundaries += counts.boundaries;
  }
  console.log(
    `Done. ${totalPolygons} parcel polygons and ${totalBoundaries} boundary lines across ${Object.keys(REGION_SOURCES).length} regions.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
