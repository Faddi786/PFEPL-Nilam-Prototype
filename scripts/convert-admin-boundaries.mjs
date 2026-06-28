/**
 * Convert Maharashtra administrative boundary shapefiles to simplified WGS84 GeoJSON.
 * Run: npm run generate:admin-boundaries
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as shapefile from "shapefile";
import proj4 from "proj4";
import * as turf from "@turf/turf";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "data", "admin-boundaries");
const sourceRoot =
  process.env.ADMIN_BOUNDARY_SOURCE ??
  "C:\\Users\\Fahad\\Desktop\\rfp\\data\\Administrative Boundaries\\Administrative Boundaries";

const UTM43N = "+proj=utm +zone=43 +datum=WGS84 +units=m +no_defs";
const WEB_MERCATOR =
  "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext +no_defs";
const WGS84 = "EPSG:4326";

/** @type {Record<string, { file: string; crs: string; tolerance: number; keepProps: string[] }>} */
const LAYERS = {
  state: {
    file: "Maharashtra_State_boundary.shp",
    crs: WEB_MERCATOR,
    tolerance: 0.002,
    keepProps: ["STATE", "ST_NM", "NAME", "name"],
  },
  district: {
    file: "District_boundry.shp",
    crs: UTM43N,
    tolerance: 0.00015,
    keepProps: ["DISTRICT", "DT_NAME", "D_NAME", "NAME", "name"],
  },
  taluka: {
    file: "Taluka_Boundary.shp",
    crs: UTM43N,
    tolerance: 0.00008,
    keepProps: ["TALUKA", "TL_NAME", "T_NAME", "NAME", "name"],
  },
  village: {
    file: "Village_Boundary.shp",
    crs: UTM43N,
    tolerance: 0.00003,
    keepProps: ["VILLAGE", "V_NAME", "VIL_NM", "NAME", "name"],
  },
};

function reprojectCoord([x, y], crs) {
  const [lon, lat] = proj4(crs, WGS84, [x, y]);
  return [lon, lat];
}

function reprojectCoords(coords, crs) {
  if (typeof coords[0] === "number") return reprojectCoord(coords, crs);
  return coords.map((entry) => reprojectCoords(entry, crs));
}

function reprojectFeature(feature, crs) {
  const geom = feature.geometry;
  if (!geom) return feature;
  return {
    ...feature,
    geometry: {
      ...geom,
      coordinates: reprojectCoords(geom.coordinates, crs),
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

function flattenPolygons(features) {
  const out = [];
  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom) continue;
    if (geom.type === "Polygon") {
      out.push(turf.polygon(geom.coordinates, feature.properties ?? {}));
      continue;
    }
    if (geom.type === "MultiPolygon") {
      geom.coordinates.forEach((coords, index) => {
        out.push(
          turf.polygon(coords, {
            ...(feature.properties ?? {}),
            _part: index,
          }),
        );
      });
    }
  }
  return out;
}

function slimProperties(properties, keepProps) {
  const out = { adminLevel: properties.adminLevel };
  for (const key of keepProps) {
    if (properties[key] != null && String(properties[key]).trim()) {
      out.name = String(properties[key]).trim();
      break;
    }
  }
  return out;
}

function simplifyFeature(feature, tolerance) {
  try {
    let candidate = turf.cleanCoords(feature);
    if (tolerance > 0) {
      candidate = turf.simplify(candidate, { tolerance, highQuality: false });
    }
    if (turf.area(candidate) < 1e-8) return null;
    return candidate;
  } catch {
    return null;
  }
}

async function convertLayer(key, config) {
  const shpPath = join(sourceRoot, config.file);
  console.log(`Converting ${key} from ${shpPath}`);
  const raw = await readShapefile(shpPath);
  const reprojected = raw.map((feature) => reprojectFeature(feature, config.crs));
  const flattened = flattenPolygons(reprojected);
  const simplified = flattened
    .map((feature) => {
      const simplifiedFeature = simplifyFeature(feature, config.tolerance);
      if (!simplifiedFeature) return null;
      return {
        ...simplifiedFeature,
        properties: {
          ...slimProperties(feature.properties ?? {}, config.keepProps),
          adminLevel: key,
        },
      };
    })
    .filter(Boolean);

  const collection = {
    type: "FeatureCollection",
    features: simplified,
  };

  const outPath = join(outDir, `${key}.geojson`);
  const json = JSON.stringify(collection);
  await writeFile(outPath, json);
  const sizeKb = Math.round(json.length / 1024);
  console.log(`  -> ${simplified.length} features, ${sizeKb} KB`);
  console.log(`     ${outPath}`);
  return { features: simplified.length, sizeKb };
}

async function main() {
  await mkdir(outDir, { recursive: true });
  let totalFeatures = 0;
  let totalKb = 0;
  for (const [key, config] of Object.entries(LAYERS)) {
    const stats = await convertLayer(key, config);
    totalFeatures += stats.features;
    totalKb += stats.sizeKb;
  }
  console.log(`Done. ${totalFeatures} features, ~${totalKb} KB total across ${Object.keys(LAYERS).length} layers.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
