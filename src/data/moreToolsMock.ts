import * as turf from "@turf/turf";
import { DEFAULT_REGION_KEY } from "./mockData";
import { getWorkbenchRegionDatasetSync } from "./workbenchParcels";

export const SPATIAL_CONTEXT = {
  village: "Khutal",
  taluk: "Karaikal",
  district: "Karaikal",
  ut: "Puducherry",
  center: [79.8372, 10.9254] as [number, number],
  zoom: 16,
} as const;

export type BufferFeatureType = "road" | "river" | "canal";

export const BUFFER_FEATURES: Record<
  BufferFeatureType,
  { label: string; line: [number, number][]; color: string }
> = {
  road: {
    label: "NH-45A Highway",
    line: [
      [79.832, 10.928],
      [79.836, 10.926],
      [79.840, 10.924],
      [79.844, 10.922],
    ],
    color: "#475569",
  },
  river: {
    label: "Arasalar River",
    line: [
      [79.830, 10.922],
      [79.834, 10.924],
      [79.838, 10.926],
      [79.842, 10.928],
    ],
    color: "#0284c7",
  },
  canal: {
    label: "Irrigation Canal",
    line: [
      [79.834, 10.920],
      [79.838, 10.922],
      [79.842, 10.924],
    ],
    color: "#0d9488",
  },
};

export type DemoParcel = {
  id: string;
  surveyNo: string;
  ring: [number, number][];
  areaSqM: number;
  owner: string;
  classification: string;
};

function sampleWorkbenchParcels(count = 12): DemoParcel[] {
  const dataset = getWorkbenchRegionDatasetSync(DEFAULT_REGION_KEY);
  const features = dataset.geojson.parcels.features.slice(0, count);
  return features.map((f, i) => {
    const geom = f.geometry;
    let ring: [number, number][] = [];
    if (geom.type === "Polygon") ring = geom.coordinates[0] as [number, number][];
    else if (geom.type === "MultiPolygon") ring = geom.coordinates[0][0] as [number, number][];
    const props = f.properties ?? {};
    return {
      id: String(props.id ?? `p-${i + 1}`),
      surveyNo: String(props.surveyNo ?? `${120 + i}/${i + 1}`),
      ring,
      areaSqM: Number(props.areaSqM ?? 900 + i * 40),
      owner: String(props.owner ?? "Private holder"),
      classification: String(props.classification ?? "Private"),
    };
  });
}

export const DEMO_PARCELS = sampleWorkbenchParcels(14);

export function buildBufferPolygon(
  featureType: BufferFeatureType,
  distanceM: number,
): [number, number][] {
  const line = BUFFER_FEATURES[featureType].line;
  const buffered = turf.buffer(turf.lineString(line), distanceM, { units: "meters" });
  if (!buffered?.geometry || buffered.geometry.type !== "Polygon") return [];
  return buffered.geometry.coordinates[0] as [number, number][];
}

export function getParcelsInBuffer(
  featureType: BufferFeatureType,
  distanceM: number,
): DemoParcel[] {
  const bufferRing = buildBufferPolygon(featureType, distanceM);
  if (!bufferRing.length) return [];
  const bufferPoly = turf.polygon([bufferRing]);
  return DEMO_PARCELS.filter((p) => {
    try {
      const parcel = turf.polygon([p.ring]);
      return turf.booleanIntersects(parcel, bufferPoly);
    } catch {
      return false;
    }
  });
}

export type AreaDiffCase = {
  id: string;
  surveyNo: string;
  village: string;
  fmbAreaSqM: number;
  dgpsAreaSqM: number;
  diffSqM: number;
  variancePct: number;
  status: "minor" | "moderate" | "critical";
};

export const AREA_DIFF_CASES: AreaDiffCase[] = [
  { id: "ad-1", surveyNo: "124/2", village: "Khutal", fmbAreaSqM: 1200, dgpsAreaSqM: 1187, diffSqM: 13, variancePct: 1.1, status: "minor" },
  { id: "ad-2", surveyNo: "128/1A", village: "Khutal", fmbAreaSqM: 2450, dgpsAreaSqM: 2398, diffSqM: 52, variancePct: 2.1, status: "moderate" },
  { id: "ad-3", surveyNo: "131/4", village: "Thirunallar", fmbAreaSqM: 890, dgpsAreaSqM: 862, diffSqM: 28, variancePct: 3.1, status: "moderate" },
  { id: "ad-4", surveyNo: "142/1", village: "Nedungadu", fmbAreaSqM: 3100, dgpsAreaSqM: 2985, diffSqM: 115, variancePct: 3.7, status: "critical" },
  { id: "ad-5", surveyNo: "156/3B", village: "Khutal", fmbAreaSqM: 1560, dgpsAreaSqM: 1551, diffSqM: 9, variancePct: 0.6, status: "minor" },
  { id: "ad-6", surveyNo: "167/2", village: "Kottucherry", fmbAreaSqM: 720, dgpsAreaSqM: 688, diffSqM: 32, variancePct: 4.4, status: "critical" },
];

export type EncroachmentCase = {
  id: string;
  surveyNo: string;
  govtLandType: string;
  encroachedAreaSqM: number;
  buildingType: string;
  status: "open" | "notified" | "resolved";
  ring: [number, number][];
};

export const GOVT_LAND_RING: [number, number][] = [
  [79.835, 10.926],
  [79.839, 10.927],
  [79.841, 10.923],
  [79.837, 10.921],
  [79.835, 10.926],
];

export const ENCROACHMENT_OVERLAP_RING: [number, number][] = [
  [79.837, 10.924],
  [79.839, 10.925],
  [79.840, 10.923],
  [79.838, 10.922],
  [79.837, 10.924],
];

export const ENCROACHMENT_CASES: EncroachmentCase[] = [
  {
    id: "enc-1",
    surveyNo: "124/2",
    govtLandType: "Revenue Poramboke",
    encroachedAreaSqM: 42,
    buildingType: "Residential extension",
    status: "open",
    ring: ENCROACHMENT_OVERLAP_RING,
  },
  {
    id: "enc-2",
    surveyNo: "129/1",
    govtLandType: "Canal bund",
    encroachedAreaSqM: 18,
    buildingType: "Cattle shed",
    status: "notified",
    ring: [
      [79.833, 10.925],
      [79.834, 10.926],
      [79.835, 10.924],
      [79.833, 10.925],
    ],
  },
  {
    id: "enc-3",
    surveyNo: "135/3",
    govtLandType: "Highway setback",
    encroachedAreaSqM: 65,
    buildingType: "Commercial shop",
    status: "open",
    ring: [
      [79.841, 10.927],
      [79.843, 10.928],
      [79.844, 10.926],
      [79.842, 10.925],
      [79.841, 10.927],
    ],
  },
];

export type OverlapCase = {
  id: string;
  parcelA: string;
  parcelB: string;
  overlapAreaSqM: number;
  village: string;
  severity: "low" | "medium" | "high";
  ringA: [number, number][];
  ringB: [number, number][];
  overlapRing: [number, number][];
};

export const OVERLAP_CASES: OverlapCase[] = [
  {
    id: "ov-1",
    parcelA: "128/1A",
    parcelB: "128/1B",
    overlapAreaSqM: 18,
    village: "Khutal",
    severity: "medium",
    ringA: [
      [79.836, 10.925],
      [79.838, 10.926],
      [79.839, 10.924],
      [79.837, 10.923],
      [79.836, 10.925],
    ],
    ringB: [
      [79.837, 10.925],
      [79.839, 10.926],
      [79.840, 10.924],
      [79.838, 10.923],
      [79.837, 10.925],
    ],
    overlapRing: [
      [79.837, 10.925],
      [79.838, 10.926],
      [79.839, 10.924],
      [79.837, 10.923],
      [79.837, 10.925],
    ],
  },
  {
    id: "ov-2",
    parcelA: "142/1",
    parcelB: "142/2",
    overlapAreaSqM: 7,
    village: "Nedungadu",
    severity: "low",
    ringA: [
      [79.834, 10.923],
      [79.836, 10.924],
      [79.837, 10.922],
      [79.835, 10.921],
      [79.834, 10.923],
    ],
    ringB: [
      [79.835, 10.923],
      [79.837, 10.924],
      [79.838, 10.922],
      [79.836, 10.921],
      [79.835, 10.923],
    ],
    overlapRing: [
      [79.835, 10.923],
      [79.836, 10.924],
      [79.837, 10.922],
      [79.835, 10.921],
      [79.835, 10.923],
    ],
  },
  {
    id: "ov-3",
    parcelA: "156/3A",
    parcelB: "156/3B",
    overlapAreaSqM: 34,
    village: "Khutal",
    severity: "high",
    ringA: [
      [79.840, 10.926],
      [79.842, 10.927],
      [79.843, 10.925],
      [79.841, 10.924],
      [79.840, 10.926],
    ],
    ringB: [
      [79.841, 10.926],
      [79.843, 10.927],
      [79.844, 10.925],
      [79.842, 10.924],
      [79.841, 10.926],
    ],
    overlapRing: [
      [79.841, 10.926],
      [79.842, 10.927],
      [79.843, 10.925],
      [79.841, 10.924],
      [79.841, 10.926],
    ],
  },
];

export type IntersectLayerPair = {
  id: string;
  label: string;
  layerA: string;
  layerB: string;
  description: string;
  layerARing: [number, number][];
  layerBRing: [number, number][];
  intersectRing: [number, number][];
  intersectAreaSqM: number;
  parcelCount: number;
};

export const INTERSECT_LAYER_PAIRS: IntersectLayerPair[] = [
  {
    id: "int-forest",
    label: "Private parcels × Forest reserve",
    layerA: "Private parcels",
    layerB: "Forest reserve",
    description: "Parcels inside notified forest boundary",
    layerARing: [
      [79.833, 10.927],
      [79.837, 10.928],
      [79.838, 10.924],
      [79.834, 10.923],
      [79.833, 10.927],
    ],
    layerBRing: [
      [79.832, 10.928],
      [79.839, 10.929],
      [79.840, 10.923],
      [79.833, 10.922],
      [79.832, 10.928],
    ],
    intersectRing: [
      [79.833, 10.927],
      [79.837, 10.928],
      [79.838, 10.924],
      [79.834, 10.923],
      [79.833, 10.927],
    ],
    intersectAreaSqM: 1240,
    parcelCount: 3,
  },
  {
    id: "int-flood",
    label: "Parcels × Flood zone",
    layerA: "Cadastral parcels",
    layerB: "Flood hazard zone",
    description: "Parcels within 100-year flood plain",
    layerARing: [
      [79.836, 10.926],
      [79.840, 10.927],
      [79.841, 10.923],
      [79.837, 10.922],
      [79.836, 10.926],
    ],
    layerBRing: [
      [79.835, 10.928],
      [79.841, 10.929],
      [79.842, 10.922],
      [79.836, 10.921],
      [79.835, 10.928],
    ],
    intersectRing: [
      [79.836, 10.926],
      [79.840, 10.927],
      [79.841, 10.923],
      [79.837, 10.922],
      [79.836, 10.926],
    ],
    intersectAreaSqM: 890,
    parcelCount: 5,
  },
  {
    id: "int-municipal",
    label: "Parcels × Municipal limits",
    layerA: "Village parcels",
    layerB: "Municipal boundary",
    description: "Parcels straddling municipal ward limits",
    layerARing: [
      [79.838, 10.925],
      [79.842, 10.926],
      [79.843, 10.922],
      [79.839, 10.921],
      [79.838, 10.925],
    ],
    layerBRing: [
      [79.837, 10.927],
      [79.843, 10.928],
      [79.844, 10.921],
      [79.838, 10.920],
      [79.837, 10.927],
    ],
    intersectRing: [
      [79.838, 10.925],
      [79.842, 10.926],
      [79.843, 10.922],
      [79.839, 10.921],
      [79.838, 10.925],
    ],
    intersectAreaSqM: 2150,
    parcelCount: 8,
  },
  {
    id: "int-road",
    label: "Parcels × Road project corridor",
    layerA: "Private parcels",
    layerB: "NH widening corridor",
    description: "Parcels affected by road acquisition",
    layerARing: [
      [79.832, 10.926],
      [79.836, 10.927],
      [79.837, 10.923],
      [79.833, 10.922],
      [79.832, 10.926],
    ],
    layerBRing: [
      [79.831, 10.928],
      [79.838, 10.929],
      [79.839, 10.921],
      [79.832, 10.920],
      [79.831, 10.928],
    ],
    intersectRing: [
      [79.832, 10.926],
      [79.836, 10.927],
      [79.837, 10.923],
      [79.833, 10.922],
      [79.832, 10.926],
    ],
    intersectAreaSqM: 560,
    parcelCount: 2,
  },
];

export type StatisticsScope = "village" | "taluk" | "district" | "ut";

export type ScopeStatistics = {
  scope: StatisticsScope;
  label: string;
  totalParcels: number;
  govtParcels: number;
  privateParcels: number;
  avgSizeSqM: number;
  pendingMutations: number;
  totalAreaHa: number;
  chartData: { label: string; value: number; color: string }[];
};

export const STATISTICS_BY_SCOPE: ScopeStatistics[] = [
  {
    scope: "village",
    label: "Khutal",
    totalParcels: 2450,
    govtParcels: 180,
    privateParcels: 2270,
    avgSizeSqM: 980,
    pendingMutations: 46,
    totalAreaHa: 240.1,
    chartData: [
      { label: "Private", value: 2270, color: "#3b82f6" },
      { label: "Government", value: 180, color: "#f59e0b" },
      { label: "Pending mutation", value: 46, color: "#ef4444" },
    ],
  },
  {
    scope: "taluk",
    label: "Karaikal Taluk",
    totalParcels: 18420,
    govtParcels: 1240,
    privateParcels: 17180,
    avgSizeSqM: 1050,
    pendingMutations: 312,
    totalAreaHa: 1934.5,
    chartData: [
      { label: "Private", value: 17180, color: "#3b82f6" },
      { label: "Government", value: 1240, color: "#f59e0b" },
      { label: "Pending mutation", value: 312, color: "#ef4444" },
    ],
  },
  {
    scope: "district",
    label: "Karaikal District",
    totalParcels: 42100,
    govtParcels: 2890,
    privateParcels: 39210,
    avgSizeSqM: 1120,
    pendingMutations: 678,
    totalAreaHa: 4712.0,
    chartData: [
      { label: "Private", value: 39210, color: "#3b82f6" },
      { label: "Government", value: 2890, color: "#f59e0b" },
      { label: "Pending mutation", value: 678, color: "#ef4444" },
    ],
  },
  {
    scope: "ut",
    label: "Puducherry UT",
    totalParcels: 156800,
    govtParcels: 11240,
    privateParcels: 145560,
    avgSizeSqM: 980,
    pendingMutations: 2340,
    totalAreaHa: 15366.4,
    chartData: [
      { label: "Private", value: 145560, color: "#3b82f6" },
      { label: "Government", value: 11240, color: "#f59e0b" },
      { label: "Pending mutation", value: 2340, color: "#ef4444" },
    ],
  },
];

export { SPATIAL_TOOL_CATALOG as MORE_TOOLS_TABS, type MoreToolsTabId } from "./spatialToolCatalog";
