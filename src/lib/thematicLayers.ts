import * as turf from "@turf/turf";
import { buildFmbChainsFromParcels } from "./fmbChainGenerator";

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;
type FeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

export const CROP_TYPES = [
  "Rice",
  "Wheat",
  "Sugarcane",
  "Bajra",
  "Jowar",
  "Cotton",
  "Maize",
] as const;

export const CROP_COLORS: Record<(typeof CROP_TYPES)[number], string> = {
  Rice: "rgba(34,197,94,0.58)",
  Wheat: "rgba(234,179,8,0.62)",
  Sugarcane: "rgba(132,204,22,0.55)",
  Bajra: "rgba(217,119,6,0.58)",
  Jowar: "rgba(250,204,21,0.55)",
  Cotton: "rgba(191,219,254,0.65)",
  Maize: "rgba(163,230,53,0.58)",
};

export type ThematicLayerCollections = {
  crops: FeatureCollection;
  buildings: FeatureCollection;
  trees: FeatureCollection;
  roads: FeatureCollection;
  waterBodies: FeatureCollection;
  forest: FeatureCollection;
};

function seeded(seedText: string) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function emptyCollection(): FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}

function parcelPolygons(parcels: GeoFeature[]): GeoFeature[] {
  return parcels.filter((feature) => {
    const type = feature.geometry?.type;
    return type === "Polygon" || type === "MultiPolygon";
  });
}

function scaleInsideParcel(parcel: GeoFeature, factor: number): GeoFeature | null {
  try {
    const polygon = parcel as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
    const centroid = turf.centroid(polygon);
    const scaled = turf.transformScale(polygon, factor, { origin: centroid });
    if (!turf.booleanValid(scaled)) return null;
    const clipped = turf.intersect(
      turf.featureCollection([polygon, scaled]) as GeoJSON.FeatureCollection<
        GeoJSON.Polygon | GeoJSON.MultiPolygon
      >,
    );
    return clipped as GeoFeature | null;
  } catch {
    return null;
  }
}

function randomPointInParcel(parcel: GeoFeature, rng: () => number): GeoJSON.Feature<GeoJSON.Point> | null {
  const polygon = parcel as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>;
  const bbox = turf.bbox(polygon);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const lng = bbox[0] + rng() * (bbox[2] - bbox[0]);
    const lat = bbox[1] + rng() * (bbox[3] - bbox[1]);
    const point = turf.point([lng, lat]);
    if (turf.booleanPointInPolygon(point, polygon)) return point;
  }
  return turf.centroid(polygon) as GeoJSON.Feature<GeoJSON.Point>;
}

function buildCropFeatures(parcels: GeoFeature[], rng: () => number): GeoFeature[] {
  const features: GeoFeature[] = [];
  parcels.forEach((parcel, index) => {
    const landUse = String(parcel.properties?.landUse ?? "");
    const classification = String(parcel.properties?.classification ?? "");
    const isAg = landUse === "Agriculture" || classification === "Nanjai";
    if (!isAg && rng() > 0.35) return;
    if (rng() > 0.62) return;

    const cropType = CROP_TYPES[index % CROP_TYPES.length];
    const cropParcel = turf.clone(parcel) as GeoFeature;
    cropParcel.properties = {
      ...parcel.properties,
      cropType,
      layerKind: "crop",
      parcelId: parcel.properties?.id,
      surveyNo: parcel.properties?.surveyNo,
    };
    features.push(cropParcel);
  });
  return features;
}

function buildBuildingFeatures(parcels: GeoFeature[], rng: () => number): GeoFeature[] {
  const features: GeoFeature[] = [];
  parcels.forEach((parcel, index) => {
    if (rng() > 0.42) return;

    const scale = 0.06 + rng() * 0.06;
    const footprint = scaleInsideParcel(parcel, scale);
    if (!footprint) return;

    footprint.properties = {
      layerKind: "building",
      buildingId: `BLD-${index + 1}`,
      parcelId: parcel.properties?.id,
    };
    features.push(footprint);
  });
  return features;
}

function buildTreeFeatures(parcels: GeoFeature[], rng: () => number): GeoFeature[] {
  const features: GeoFeature[] = [];
  parcels.forEach((parcel) => {
    const treeCount = 2 + Math.floor(rng() * 6);
    for (let i = 0; i < treeCount; i += 1) {
      if (rng() > 0.78) continue;
      const point = randomPointInParcel(parcel, rng);
      if (!point) continue;
      point.properties = {
        layerKind: "tree",
        treeId: `TREE-${features.length + 1}`,
      };
      features.push(point as GeoFeature);
    }
  });
  return features;
}

function buildRoadFeatures(
  bbox: [number, number, number, number],
  rng: () => number,
): GeoFeature[] {
  const [minX, minY, maxX, maxY] = bbox;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const width = maxX - minX;
  const height = maxY - minY;

  const roads: GeoFeature[] = [
    {
      type: "Feature",
      properties: { roadClass: "main", name: "Khutal Main Road" },
      geometry: {
        type: "LineString",
        coordinates: [
          [minX + width * 0.05, minY + height * 0.18],
          [minX + width * 0.35, midY],
          [midX, minY + height * 0.72],
          [maxX - width * 0.08, maxY - height * 0.12],
        ],
      },
    },
    {
      type: "Feature",
      properties: { roadClass: "main", name: "Nedungadu Connector" },
      geometry: {
        type: "LineString",
        coordinates: [
          [minX + width * 0.12, maxY - height * 0.1],
          [minX + width * 0.42, midY + height * 0.08],
          [maxX - width * 0.15, minY + height * 0.22],
        ],
      },
    },
    {
      type: "Feature",
      properties: { roadClass: "path", name: "Interior Lane" },
      geometry: {
        type: "LineString",
        coordinates: [
          [midX - width * 0.12, minY + height * 0.3],
          [midX + width * 0.05, midY],
          [midX - width * 0.08, maxY - height * 0.28],
        ],
      },
    },
    {
      type: "Feature",
      properties: { roadClass: "path", name: "Field Access Path" },
      geometry: {
        type: "LineString",
        coordinates: [
          [minX + width * (0.55 + rng() * 0.1), minY + height * 0.12],
          [minX + width * (0.62 + rng() * 0.08), midY - height * 0.05],
          [minX + width * (0.58 + rng() * 0.12), maxY - height * 0.2],
        ],
      },
    },
  ];

  return roads;
}

function buildWaterBodyFeatures(
  bbox: [number, number, number, number],
  rng: () => number,
): GeoFeature[] {
  const [minX, minY, maxX, maxY] = bbox;
  const width = maxX - minX;
  const height = maxY - minY;

  const riverCenterline: [number, number][] = [
    [minX - width * 0.02, minY + height * (0.08 + rng() * 0.04)],
    [minX + width * 0.18, minY + height * 0.14],
    [minX + width * 0.38, minY + height * 0.11],
    [minX + width * 0.58, minY + height * 0.16],
    [minX + width * 0.78, minY + height * 0.1],
    [maxX + width * 0.03, minY + height * 0.13],
  ];

  const riverLine = turf.lineString(riverCenterline, { name: "Damodar Nadi (sample reach)" });
  const riverBuffer = turf.buffer(riverLine, 0.045 + rng() * 0.02, { units: "kilometers" });
  if (riverBuffer) {
    riverBuffer.properties = { waterType: "river", name: "Damodar Nadi", layerKind: "water" };
  }

  const ponds: GeoFeature[] = Array.from({ length: 3 }).flatMap((_, index) => {
    const cx = minX + width * (0.22 + index * 0.24 + rng() * 0.06);
    const cy = maxY - height * (0.18 + index * 0.12 + rng() * 0.05);
    const radiusKm = 0.018 + rng() * 0.012;
    const pond = turf.buffer(turf.point([cx, cy]), radiusKm, { units: "kilometers" });
    if (!pond) return [];
    pond.properties = { waterType: "pond", name: `Village Tank ${index + 1}`, layerKind: "water" };
    return [pond as GeoFeature];
  });

  const features: GeoFeature[] = [];
  if (riverBuffer) features.push(riverBuffer as GeoFeature);
  features.push(...ponds);
  return features;
}

function buildForestFeatures(parcels: GeoFeature[], rng: () => number): GeoFeature[] {
  const features: GeoFeature[] = [];
  parcels.forEach((parcel, index) => {
    const landCategory = String(parcel.properties?.landCategory ?? "");
    const landUse = String(parcel.properties?.landUse ?? "");
    const isForestCandidate =
      landCategory.toLowerCase().includes("forest") ||
      landUse === "Forest" ||
      (landUse === "Agriculture" && index % 11 === 0);
    if (!isForestCandidate && rng() > 0.18) return;
    if (rng() > 0.55) return;

    const scale = 0.55 + rng() * 0.25;
    const forestParcel = scaleInsideParcel(parcel, scale);
    if (!forestParcel) return;

    forestParcel.properties = {
      ...parcel.properties,
      layerKind: "forest",
      forestType: index % 2 === 0 ? "Scrub woodland" : "Mango grove",
      parcelId: parcel.properties?.id,
      surveyNo: parcel.properties?.surveyNo,
    };
    features.push(forestParcel);
  });
  return features;
}

/** Boundary points, edge distances, and survey bearings derived from parcel rings. */
export function buildCadastralDimensionsFromParcels(
  parcels: GeoFeature[],
): FeatureCollection {
  return buildFmbChainsFromParcels(parcels) as FeatureCollection;
}

export function buildThematicLayersFromParcels(
  parcels: GeoFeature[],
  seed = "thematic-khutal",
): ThematicLayerCollections {
  const polygonParcels = parcelPolygons(parcels);
  if (!polygonParcels.length) {
    return {
      crops: emptyCollection(),
      buildings: emptyCollection(),
      trees: emptyCollection(),
      roads: emptyCollection(),
      waterBodies: emptyCollection(),
      forest: emptyCollection(),
    };
  }

  const rng = seeded(seed);
  const bbox = turf.bbox(turf.featureCollection(polygonParcels)) as [number, number, number, number];

  return {
    crops: { type: "FeatureCollection", features: buildCropFeatures(polygonParcels, rng) },
    buildings: { type: "FeatureCollection", features: buildBuildingFeatures(polygonParcels, rng) },
    trees: { type: "FeatureCollection", features: buildTreeFeatures(polygonParcels, rng) },
    roads: { type: "FeatureCollection", features: buildRoadFeatures(bbox, rng) },
    waterBodies: { type: "FeatureCollection", features: buildWaterBodyFeatures(bbox, rng) },
    forest: { type: "FeatureCollection", features: buildForestFeatures(polygonParcels, rng) },
  };
}
