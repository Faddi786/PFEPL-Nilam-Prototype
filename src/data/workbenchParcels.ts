import * as turf from "@turf/turf";
import {
  getRegionConfig,
  getRegionDataset,
  rebuildRegionDatasetWithParcels,
  varianceBandForIndex,
  variancePctForBand,
  WORKBENCH_SHAPEFILE_REGIONS,
  type ParcelRecord,
  type RegionDataset,
  type RegionKey,
} from "./mockData";

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;
type GeoCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

const datasetCache = new Map<RegionKey, RegionDataset>();
const loadPromises = new Map<RegionKey, Promise<RegionDataset>>();

function polygonRing(feature: GeoFeature): [number, number][] | null {
  const geom = feature.geometry;
  if (geom.type === "Polygon") return geom.coordinates[0] as [number, number][];
  if (geom.type === "MultiPolygon") return geom.coordinates[0][0] as [number, number][];
  return null;
}

function isValidParcelPolygon(feature: GeoFeature): boolean {
  const ring = polygonRing(feature);
  if (!ring || ring.length < 4) return false;
  return turf.area(feature) > 1;
}

/** Deep-copy coordinates so adjacent polygonized parcels do not share vertex refs. */
function deepCloneCoords<T>(coords: T): T {
  return JSON.parse(JSON.stringify(coords));
}

function decouplePolygonCoords(feature: GeoFeature): GeoFeature {
  const geom = feature.geometry;
  if (geom.type === "Polygon") {
    return {
      type: "Feature",
      properties: { ...feature.properties },
      geometry: { type: "Polygon", coordinates: deepCloneCoords(geom.coordinates) },
    };
  }
  if (geom.type === "MultiPolygon") {
    return {
      type: "Feature",
      properties: { ...feature.properties },
      geometry: { type: "MultiPolygon", coordinates: deepCloneCoords(geom.coordinates) },
    };
  }
  return feature;
}

const COLLINEAR_AREA_EPS = 1e-14;
const SIMPLIFY_TOLERANCE_DEG = 5e-6;

function removeCollinearRingPoints(ring: [number, number][]): [number, number][] {
  if (ring.length < 4) return ring;
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const points = closed ? ring.slice(0, -1) : ring.slice();
  if (points.length < 3) return ring;

  const kept: [number, number][] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[(i - 1 + points.length) % points.length];
    const b = points[i];
    const c = points[(i + 1) % points.length];
    const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    if (cross > COLLINEAR_AREA_EPS) kept.push(b);
  }
  if (kept.length < 3) return ring;
  kept.push(kept[0]);
  return kept;
}

function simplifyParcelFeature(feature: GeoFeature): GeoFeature {
  const geom = feature.geometry;
  if (geom.type !== "Polygon" && geom.type !== "MultiPolygon") return feature;

  try {
    let candidate = turf.cleanCoords(feature) as GeoFeature;
    candidate = turf.simplify(candidate, { tolerance: SIMPLIFY_TOLERANCE_DEG, highQuality: true }) as GeoFeature;
    const cleaned = candidate.geometry;
    if (!cleaned) return feature;

    if (cleaned.type === "Polygon") {
      const ring = removeCollinearRingPoints(cleaned.coordinates[0] as [number, number][]);
      return {
        type: "Feature",
        properties: { ...feature.properties },
        geometry: { type: "Polygon", coordinates: [ring, ...cleaned.coordinates.slice(1)] },
      };
    }

    if (cleaned.type === "MultiPolygon") {
      const coordinates = cleaned.coordinates.map((polyCoords) => {
        const ring = removeCollinearRingPoints(polyCoords[0] as [number, number][]);
        return [ring, ...polyCoords.slice(1)];
      });
      return {
        type: "Feature",
        properties: { ...feature.properties },
        geometry: { type: "MultiPolygon", coordinates },
      };
    }
  } catch {
    return feature;
  }

  return feature;
}

function cleanPolygonFeature(feature: GeoFeature): GeoFeature {
  try {
    const cleaned = turf.buffer(feature, 0, { units: "meters" });
    if (!cleaned?.geometry) return feature;
    if (cleaned.geometry.type === "Polygon") {
      return {
        type: "Feature",
        properties: { ...feature.properties },
        geometry: { type: "Polygon", coordinates: deepCloneCoords(cleaned.geometry.coordinates) },
      };
    }
  } catch {
    // Keep decoupled original when buffer(0) fails.
  }
  return feature;
}

/** One enclosed polygon per feature — split MultiPolygons and detach shared vertices. */
function normalizeParcelGeometries(features: GeoFeature[]): GeoFeature[] {
  const normalized: GeoFeature[] = [];

  features.forEach((feature) => {
    const decoupled = decouplePolygonCoords(feature);
    const geom = decoupled.geometry;

    const polygonParts: GeoFeature[] =
      geom.type === "MultiPolygon"
        ? geom.coordinates.map((polyCoords) => ({
            type: "Feature" as const,
            properties: { ...decoupled.properties },
            geometry: { type: "Polygon" as const, coordinates: deepCloneCoords(polyCoords) },
          }))
        : geom.type === "Polygon"
          ? [decoupled]
          : [];

    polygonParts.forEach((part) => {
      const cleaned = cleanPolygonFeature(part);
      const simplified = simplifyParcelFeature(cleaned);
      if (isValidParcelPolygon(simplified)) normalized.push(simplified);
    });
  });

  return normalized;
}

function polygonizeBoundaries(boundaryCollection: GeoCollection | null): GeoFeature[] {
  if (!boundaryCollection?.features.length) return [];
  try {
    const lineFeatures = boundaryCollection.features.filter(
      (feature) =>
        feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString",
    );
    if (!lineFeatures.length) return [];
    const polygonized = turf.polygonize({
      type: "FeatureCollection",
      features: lineFeatures,
    } as GeoJSON.FeatureCollection<GeoJSON.LineString | GeoJSON.MultiLineString>);
    return normalizeParcelGeometries(polygonized.features as GeoFeature[]);
  } catch {
    return [];
  }
}

function assignSyntheticAttrs(
  regionKey: RegionKey,
  geometryFeatures: GeoFeature[],
): { parcelFeatures: GeoFeature[]; parcelAttrs: Record<string, ParcelRecord> } {
  const config = getRegionConfig(regionKey);
  const templateDataset = getRegionDataset(regionKey);
  const templates = templateDataset.parcels;
  const parcelAttrs: Record<string, ParcelRecord> = {};
  const parcelFeatures: GeoFeature[] = [];

  geometryFeatures.forEach((feature, index) => {
    const ring = polygonRing(feature);
    if (!ring || ring.length < 4) return;

    const template = templates[index % templates.length];
    const parcelIndex = index + 1;
    const id = `${config.code}-P-${String(parcelIndex).padStart(4, "0")}`;
    const areaSqM = Math.max(1, Math.round(turf.area(feature)));

    const band = varianceBandForIndex(parcelIndex);
    const variancePct = variancePctForBand(band, parcelIndex);

    const attrs: ParcelRecord = {
      ...template,
      id,
      ulpin: `${config.ulpinPrefix}${String(parcelIndex).padStart(10, "0")}`,
      areaSqM,
      source: "Village shapefile (Ulhas Vaitarna)",
      osmTag: "parcel_boundary",
      varianceBand: band,
      variancePct,
    };

    parcelAttrs[id] = attrs;
    parcelFeatures.push({
      type: "Feature",
      geometry: deepCloneCoords(feature.geometry),
      properties: attrs,
    });
  });

  return { parcelFeatures, parcelAttrs };
}

async function loadBoundaryCollection(regionKey: RegionKey): Promise<GeoCollection | null> {
  const response = await fetch(`/data/parcels/${regionKey}-boundaries.geojson`);
  if (!response.ok) return null;
  return (await response.json()) as GeoCollection;
}

async function loadShapefileDataset(regionKey: RegionKey): Promise<RegionDataset> {
  const [parcelResponse, boundaryCollection] = await Promise.all([
    fetch(`/data/parcels/${regionKey}.geojson`),
    loadBoundaryCollection(regionKey),
  ]);
  if (!parcelResponse.ok) {
    throw new Error(`Failed to load parcel GeoJSON for ${regionKey}`);
  }

  const collection = (await parcelResponse.json()) as GeoCollection;
  const config = getRegionConfig(regionKey);
  const rawGeometry =
    collection.features.length > 0
      ? (collection.features as GeoFeature[])
      : polygonizeBoundaries(boundaryCollection);
  const geometryFeatures = normalizeParcelGeometries(rawGeometry);
  const { parcelFeatures, parcelAttrs } = assignSyntheticAttrs(regionKey, geometryFeatures);
  return rebuildRegionDatasetWithParcels(config, parcelFeatures, parcelAttrs, boundaryCollection);
}

export function getWorkbenchRegionDatasetSync(regionKey: RegionKey): RegionDataset {
  if (datasetCache.has(regionKey)) return datasetCache.get(regionKey)!;
  return getRegionDataset(regionKey);
}

export async function loadWorkbenchRegionDataset(regionKey: RegionKey): Promise<RegionDataset> {
  if (datasetCache.has(regionKey)) return datasetCache.get(regionKey)!;

  if (!WORKBENCH_SHAPEFILE_REGIONS.includes(regionKey)) {
    const dataset = getRegionDataset(regionKey);
    datasetCache.set(regionKey, dataset);
    return dataset;
  }

  const pending = loadPromises.get(regionKey);
  if (pending) return pending;

  const promise = loadShapefileDataset(regionKey)
    .then((dataset) => {
      datasetCache.set(regionKey, dataset);
      loadPromises.delete(regionKey);
      return dataset;
    })
    .catch((error) => {
      loadPromises.delete(regionKey);
      console.error(error);
      const fallback = getRegionDataset(regionKey);
      datasetCache.set(regionKey, fallback);
      return fallback;
    });

  loadPromises.set(regionKey, promise);
  return promise;
}
