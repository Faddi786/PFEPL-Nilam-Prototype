import * as turf from "@turf/turf";
import {
  DEFAULT_REGION_KEY,
  getRegionConfig,
  type ParcelRecord,
  type RegionDataset,
  type RegionKey,
} from "./mockData";
import { getWorkbenchRegionDatasetSync } from "./workbenchParcels";
import { loadAllWorkbenchParcelsSync } from "./parcelDatabase";

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;

export type CadastralParcel = {
  id: string;
  surveyNo: string;
  ring: [number, number][];
  areaSqM: number;
  owner: string;
  classification: string;
  village: string;
};

export type BufferFeatureType = "road" | "river" | "canal";

export type AreaDiffCase = {
  id: string;
  surveyNo: string;
  village: string;
  fmbAreaSqM: number;
  dgpsAreaSqM: number;
  diffSqM: number;
  variancePct: number;
  status: "minor" | "moderate" | "critical";
  parcelId: string;
};

export type EncroachmentCase = {
  id: string;
  surveyNo: string;
  govtLandType: string;
  encroachedAreaSqM: number;
  buildingType: string;
  status: "open" | "notified" | "resolved";
  ring: [number, number][];
  govtLandRing: [number, number][];
  parcelId: string;
};

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

let activeWorkbenchDataset: RegionDataset | null = null;
let cachedParcels: CadastralParcel[] | null = null;

/** Bind spatial tools to the same loaded workbench dataset as the map (real GeoJSON). */
export function syncCadastralSpatialDataset(dataset: RegionDataset): void {
  activeWorkbenchDataset = dataset;
  cachedParcels = null;
}

function ringFromFeature(feature: GeoFeature): [number, number][] {
  const geom = feature.geometry;
  if (geom.type === "Polygon") return geom.coordinates[0] as [number, number][];
  if (geom.type === "MultiPolygon") return geom.coordinates[0][0] as [number, number][];
  return [];
}

function bboxRing(bbox: [number, number, number, number]): [number, number][] {
  const [minX, minY, maxX, maxY] = bbox;
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ];
}

export function isGovtParcel(attrs: ParcelRecord): boolean {
  const haystack = [
    attrs.classification,
    attrs.landUse,
    attrs.landCategory,
    attrs.occupancyType,
    attrs.status,
  ]
    .join(" ")
    .toLowerCase();
  return (
    haystack.includes("gov") ||
    haystack.includes("poramboke") ||
    haystack.includes("public") ||
    haystack.includes("revenue land")
  );
}

function areaDiffStatus(variancePct: number): AreaDiffCase["status"] {
  if (variancePct >= 3.5) return "critical";
  if (variancePct >= 2) return "moderate";
  return "minor";
}

function overlapSeverity(areaSqM: number): OverlapCase["severity"] {
  if (areaSqM >= 25) return "high";
  if (areaSqM >= 8) return "medium";
  return "low";
}

export function getWorkbenchDataset(regionKey: RegionKey = DEFAULT_REGION_KEY): RegionDataset {
  return activeWorkbenchDataset ?? getWorkbenchRegionDatasetSync(regionKey);
}

export function getCadastralParcels(): CadastralParcel[] {
  if (cachedParcels) return cachedParcels;

  const dataset = getWorkbenchDataset();
  cachedParcels = dataset.geojson.parcels.features
    .map((feature) => {
      const id = String(feature.properties?.id ?? "");
      if (!id) return null;
      const attrs = dataset.parcelAttrs[id];
      const ring = ringFromFeature(feature as GeoFeature);
      if (ring.length < 4) return null;
      return {
        id,
        surveyNo: String(attrs?.surveyNo ?? feature.properties?.surveyNo ?? "—"),
        ring,
        areaSqM: Number(attrs?.areaSqM ?? feature.properties?.areaSqM ?? Math.round(turf.area(feature))),
        owner: String(attrs?.owner ?? feature.properties?.owner ?? "—"),
        classification: String(attrs?.classification ?? feature.properties?.classification ?? "Private"),
        village: String(attrs?.village ?? feature.properties?.village ?? "Khutal"),
      } satisfies CadastralParcel;
    })
    .filter((parcel): parcel is CadastralParcel => parcel !== null);

  return cachedParcels;
}

export function getSpatialContext() {
  const dataset = getWorkbenchDataset();
  const config = getRegionConfig(DEFAULT_REGION_KEY);
  return {
    village: config.villages[0] ?? "Khutal",
    taluk: config.label,
    district: config.label,
    ut: "Puducherry",
    center: dataset.cadastralView.center as [number, number],
    zoom: dataset.cadastralView.zoom,
  };
}

export function getSelectedParcelId(): string {
  const parcels = getCadastralParcels();
  return parcels[2]?.id ?? parcels[0]?.id ?? "";
}

export function getVillageBoundaryRing(): [number, number][] {
  const parcels = getCadastralParcels();
  if (!parcels.length) return [];
  const collection = turf.featureCollection(parcels.map((parcel) => turf.polygon([parcel.ring])));
  const hull = turf.convex(collection);
  if (hull?.geometry?.type === "Polygon") {
    return hull.geometry.coordinates[0] as [number, number][];
  }
  return bboxRing(turf.bbox(collection) as [number, number, number, number]);
}

function ringFromWaterFeatures(features: GeoFeature[]): [number, number][] {
  for (const feature of features) {
    const ring = ringFromFeature(feature);
    if (ring.length >= 4) return ring;
  }

  for (const feature of features) {
    const geom = feature.geometry;
    if (geom?.type !== "LineString" && geom?.type !== "MultiLineString") continue;
    try {
      const buffered = turf.buffer(feature, 35, { units: "meters" });
      if (buffered?.geometry?.type === "Polygon") {
        return buffered.geometry.coordinates[0] as [number, number][];
      }
    } catch {
      // try next feature
    }
  }

  return [];
}

export function getFloodZoneRing(): [number, number][] {
  const dataset = getWorkbenchDataset();
  const fromWater = ringFromWaterFeatures(dataset.geojson.waterBodies.features as GeoFeature[]);
  if (fromWater.length >= 4) return fromWater;

  const parcels = getCadastralParcels();
  const wetlandParcels = parcels.filter((parcel) => {
    const haystack = parcel.classification.toLowerCase();
    return haystack.includes("nanjai") || haystack.includes("poramboke") || haystack.includes("water");
  });
  if (wetlandParcels.length) return parcelUnionRing(wetlandParcels);

  return getVillageBoundaryRing();
}

export function getViewportExtent(): [number, number][] {
  const parcels = getCadastralParcels();
  if (!parcels.length) return [];

  const ranked = [...parcels].sort((a, b) => {
    const ca = turf.centroid(turf.polygon([a.ring]));
    const cb = turf.centroid(turf.polygon([b.ring]));
    return (ca.geometry.coordinates[0] as number) - (cb.geometry.coordinates[0] as number);
  });

  const sliceSize = Math.max(3, Math.floor(ranked.length * 0.35));
  const start = Math.floor((ranked.length - sliceSize) / 2);
  const subset = ranked.slice(start, start + sliceSize);
  const collection = turf.featureCollection(subset.map((parcel) => turf.polygon([parcel.ring])));
  return bboxRing(turf.bbox(collection) as [number, number, number, number]);
}

export function getDgpsSurveyPoint(): [number, number] {
  const dataset = getWorkbenchDataset();
  const dgpsFeature = dataset.geojson.dgps.features[0];
  if (dgpsFeature?.geometry?.type === "Point") {
    return dgpsFeature.geometry.coordinates as [number, number];
  }
  const parcels = getCadastralParcels();
  const target = parcels[2] ?? parcels[0];
  if (!target) return dataset.cadastralView.center as [number, number];
  const centroid = turf.centroid(turf.polygon([target.ring]));
  return centroid.geometry.coordinates as [number, number];
}

function lineFromFeatures(features: GeoFeature[], fallback: [number, number][]): [number, number][] {
  for (const feature of features) {
    if (feature.geometry.type === "LineString") {
      return feature.geometry.coordinates as [number, number][];
    }
    if (feature.geometry.type === "MultiLineString") {
      return feature.geometry.coordinates[0] as [number, number][];
    }
  }
  return fallback;
}

export function getBufferFeatures(): Record<
  BufferFeatureType,
  { label: string; line: [number, number][]; color: string }
> {
  const dataset = getWorkbenchDataset();
  const parcels = getCadastralParcels();
  const collection = turf.featureCollection(parcels.map((parcel) => turf.polygon([parcel.ring])));
  const bbox = turf.bbox(collection);
  const [minX, minY, maxX, maxY] = bbox;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  const fallbackRoad: [number, number][] = [
    [minX + (maxX - minX) * 0.05, minY + (maxY - minY) * 0.18],
    [midX, midY],
    [maxX - (maxX - minX) * 0.08, maxY - (maxY - minY) * 0.12],
  ];
  const fallbackRiver: [number, number][] = [
    [minX, minY + (maxY - minY) * 0.12],
    [midX, minY + (maxY - minY) * 0.14],
    [maxX, minY + (maxY - minY) * 0.1],
  ];
  const fallbackCanal: [number, number][] = [
    [minX + (maxX - minX) * 0.55, minY + (maxY - minY) * 0.12],
    [midX, midY - (maxY - minY) * 0.05],
    [minX + (maxX - minX) * 0.58, maxY - (maxY - minY) * 0.2],
  ];

  const roads = dataset.geojson.roads.features as GeoFeature[];
  const roadLine = lineFromFeatures(roads, fallbackRoad);
  const roadLabel = String(roads[0]?.properties?.name ?? "Cadastral road corridor");

  const waters = dataset.geojson.waterBodies.features as GeoFeature[];
  let riverLine = fallbackRiver;
  for (const feature of waters) {
    if (feature.geometry.type === "LineString") {
      riverLine = feature.geometry.coordinates as [number, number][];
      break;
    }
  }
  const riverLabel = String(waters[0]?.properties?.name ?? "Water body reach");

  const canalLine =
    roads.length > 1
      ? lineFromFeatures(roads.slice(1), fallbackCanal)
      : lineFromFeatures(roads, fallbackCanal);
  const canalLabel = String(roads[1]?.properties?.name ?? roads[0]?.properties?.name ?? "Field access path");

  return {
    road: { label: roadLabel, line: roadLine, color: "#475569" },
    river: { label: riverLabel, line: riverLine, color: "#0284c7" },
    canal: { label: canalLabel, line: canalLine, color: "#0d9488" },
  };
}

export function buildBufferPolygon(
  featureType: BufferFeatureType,
  distanceM: number,
): [number, number][] {
  const line = getBufferFeatures()[featureType].line;
  const buffered = turf.buffer(turf.lineString(line), distanceM, { units: "meters" });
  if (!buffered?.geometry || buffered.geometry.type !== "Polygon") return [];
  return buffered.geometry.coordinates[0] as [number, number][];
}

export function getParcelsInBuffer(
  featureType: BufferFeatureType,
  distanceM: number,
): CadastralParcel[] {
  const bufferRing = buildBufferPolygon(featureType, distanceM);
  if (!bufferRing.length) return [];
  const bufferPoly = turf.polygon([bufferRing]);
  return getCadastralParcels().filter((parcel) => {
    try {
      return turf.booleanIntersects(turf.polygon([parcel.ring]), bufferPoly);
    } catch {
      return false;
    }
  });
}

export function getAreaDiffCases(): AreaDiffCase[] {
  const dataset = getWorkbenchDataset();
  return getCadastralParcels()
    .map((parcel) => {
      const attrs = dataset.parcelAttrs[parcel.id];
      if (!attrs) return null;
      const variancePct = Number(attrs.variancePct ?? 0);
      if (variancePct <= 0.4) return null;
      const fmbAreaSqM = parcel.areaSqM;
      const dgpsAreaSqM = Math.max(1, Math.round(fmbAreaSqM * (1 - variancePct / 100)));
      const diffSqM = Math.abs(fmbAreaSqM - dgpsAreaSqM);
      return {
        id: `ad-${parcel.id}`,
        surveyNo: parcel.surveyNo,
        village: parcel.village,
        fmbAreaSqM,
        dgpsAreaSqM,
        diffSqM,
        variancePct,
        status: areaDiffStatus(variancePct),
        parcelId: parcel.id,
      } satisfies AreaDiffCase;
    })
    .filter((row): row is AreaDiffCase => row !== null)
    .sort((a, b) => b.variancePct - a.variancePct)
    .slice(0, 8);
}

export function getOverlapCases(): OverlapCase[] {
  const parcels = getCadastralParcels();
  const cases: OverlapCase[] = [];

  for (let i = 0; i < parcels.length && cases.length < 6; i += 1) {
    for (let j = i + 1; j < parcels.length && cases.length < 6; j += 1) {
      try {
        const polyA = turf.polygon([parcels[i].ring]);
        const polyB = turf.polygon([parcels[j].ring]);
        const intersection = turf.intersect(turf.featureCollection([polyA, polyB]));
        if (!intersection?.geometry) continue;

        let overlapRing: [number, number][] = [];
        if (intersection.geometry.type === "Polygon") {
          overlapRing = intersection.geometry.coordinates[0] as [number, number][];
        } else if (intersection.geometry.type === "MultiPolygon") {
          overlapRing = intersection.geometry.coordinates[0][0] as [number, number][];
        }
        if (overlapRing.length < 4) continue;

        const overlapAreaSqM = Math.round(turf.area(intersection));
        if (overlapAreaSqM < 1) continue;

        cases.push({
          id: `ov-${cases.length + 1}`,
          parcelA: parcels[i].surveyNo,
          parcelB: parcels[j].surveyNo,
          overlapAreaSqM,
          village: parcels[i].village,
          severity: overlapSeverity(overlapAreaSqM),
          ringA: parcels[i].ring,
          ringB: parcels[j].ring,
          overlapRing,
        });
      } catch {
        // skip invalid geometries
      }
    }
  }

  return cases;
}

export function getEncroachmentCases(): EncroachmentCase[] {
  const dataset = getWorkbenchDataset();
  const parcels = getCadastralParcels();
  const govtParcels = parcels.filter((parcel) => {
    const attrs = dataset.parcelAttrs[parcel.id];
    return attrs ? isGovtParcel(attrs) : false;
  });

  const referenceGovt =
    govtParcels[0] ??
    parcels.find((parcel) => parcel.classification.toLowerCase().includes("nanjai")) ??
    parcels[0];

  if (!referenceGovt) return [];

  const govtPoly = turf.polygon([referenceGovt.ring]);
  const cases: EncroachmentCase[] = [];

  for (const parcel of parcels) {
    if (parcel.id === referenceGovt.id) continue;
    try {
      const privatePoly = turf.polygon([parcel.ring]);
      if (!turf.booleanIntersects(privatePoly, govtPoly)) continue;
      const intersection = turf.intersect(turf.featureCollection([privatePoly, govtPoly]));
      if (!intersection?.geometry) continue;

      let ring: [number, number][] = [];
      if (intersection.geometry.type === "Polygon") {
        ring = intersection.geometry.coordinates[0] as [number, number][];
      } else if (intersection.geometry.type === "MultiPolygon") {
        ring = intersection.geometry.coordinates[0][0] as [number, number][];
      }
      if (ring.length < 4) continue;

      const attrs = dataset.parcelAttrs[parcel.id];
      cases.push({
        id: `enc-${cases.length + 1}`,
        surveyNo: parcel.surveyNo,
        govtLandType: String(attrs?.landCategory || attrs?.landUse || "Revenue Poramboke"),
        encroachedAreaSqM: Math.max(1, Math.round(turf.area(intersection))),
        buildingType: attrs?.occupancyType ? String(attrs.occupancyType) : "Parcel overlap",
        status: parcel.id.endsWith("3") ? "notified" : "open",
        ring,
        govtLandRing: referenceGovt.ring,
        parcelId: parcel.id,
      });
      if (cases.length >= 5) break;
    } catch {
      // skip invalid geometries
    }
  }

  return cases;
}

export function getGovtLandRing(): [number, number][] {
  const cases = getEncroachmentCases();
  if (cases[0]?.govtLandRing.length) return cases[0].govtLandRing;
  const dataset = getWorkbenchDataset();
  const govtParcel = getCadastralParcels().find((parcel) => {
    const attrs = dataset.parcelAttrs[parcel.id];
    return attrs ? isGovtParcel(attrs) : false;
  });
  return govtParcel?.ring ?? getVillageBoundaryRing();
}

function polygonRingFromLayer(features: GeoFeature[]): [number, number][] {
  for (const feature of features) {
    if (feature.geometry.type === "Polygon") {
      return feature.geometry.coordinates[0] as [number, number][];
    }
    if (feature.geometry.type === "MultiPolygon") {
      return feature.geometry.coordinates[0][0] as [number, number][];
    }
  }
  return [];
}

function parcelUnionRing(parcels: CadastralParcel[]): [number, number][] {
  if (!parcels.length) return [];
  if (parcels.length === 1) return parcels[0].ring;
  const unioned = turf.union(
    turf.featureCollection(parcels.slice(0, 12).map((parcel) => turf.polygon([parcel.ring]))),
  );
  if (unioned?.geometry?.type === "Polygon") {
    return unioned.geometry.coordinates[0] as [number, number][];
  }
  return getVillageBoundaryRing();
}

export function getIntersectLayerPairs(): IntersectLayerPair[] {
  const dataset = getWorkbenchDataset();
  const parcels = getCadastralParcels();
  if (!parcels.length) return [];

  const privateParcels = parcels.filter((parcel) => parcel.classification !== "Poramboke");
  const layerARing = parcelUnionRing(privateParcels.slice(0, 10));
  const forestRing =
    polygonRingFromLayer(dataset.geojson.forest.features as GeoFeature[]) || getVillageBoundaryRing();
  const floodRing = getFloodZoneRing();
  const municipalRing = getVillageBoundaryRing();
  const roadBuffer = buildBufferPolygon("road", 40);
  const roadRing = roadBuffer.length ? roadBuffer : layerARing;

  const pairs: Array<{
    id: string;
    label: string;
    layerA: string;
    layerB: string;
    description: string;
    layerARing: [number, number][];
    layerBRing: [number, number][];
  }> = [
    {
      id: "int-forest",
      label: "Private parcels × Forest reserve",
      layerA: "Private parcels",
      layerB: "Forest reserve",
      description: "Parcels inside notified forest boundary",
      layerARing,
      layerBRing: forestRing,
    },
    {
      id: "int-flood",
      label: "Parcels × Flood zone",
      layerA: "Cadastral parcels",
      layerB: "Flood hazard zone",
      description: "Parcels within flood-plain reach derived from cadastral extent",
      layerARing: parcelUnionRing(parcels.slice(0, 8)),
      layerBRing: floodRing,
    },
    {
      id: "int-municipal",
      label: "Parcels × Municipal limits",
      layerA: "Village parcels",
      layerB: "Municipal boundary",
      description: "Parcels straddling village boundary envelope",
      layerARing: parcelUnionRing(parcels.slice(4, 14)),
      layerBRing: municipalRing,
    },
    {
      id: "int-road",
      label: "Parcels × Road project corridor",
      layerA: "Private parcels",
      layerB: "Road widening corridor",
      description: "Parcels affected by road acquisition buffer",
      layerARing: parcelUnionRing(privateParcels.slice(0, 8)),
      layerBRing: roadRing,
    },
  ];

  return pairs.map((pair) => {
    let intersectRing: [number, number][] = pair.layerARing;
    let intersectAreaSqM = 0;
    try {
      const layerA = turf.polygon([pair.layerARing]);
      const layerB = turf.polygon([pair.layerBRing]);
      const intersection = turf.intersect(turf.featureCollection([layerA, layerB]));
      if (intersection?.geometry?.type === "Polygon") {
        intersectRing = intersection.geometry.coordinates[0] as [number, number][];
        intersectAreaSqM = Math.round(turf.area(intersection));
      } else if (intersection?.geometry?.type === "MultiPolygon") {
        intersectRing = intersection.geometry.coordinates[0][0] as [number, number][];
        intersectAreaSqM = Math.round(turf.area(intersection));
      }
    } catch {
      intersectAreaSqM = 0;
    }

    const layerBPoly = turf.polygon([pair.layerBRing]);
    const parcelCount = parcels.filter((parcel) => {
      try {
        return turf.booleanIntersects(turf.polygon([parcel.ring]), layerBPoly);
      } catch {
        return false;
      }
    }).length;

    return {
      ...pair,
      intersectRing,
      intersectAreaSqM,
      parcelCount,
    };
  });
}

function buildScopeStatistics(
  scope: StatisticsScope,
  label: string,
  records: Array<ParcelRecord & { regionKey?: RegionKey }>,
): ScopeStatistics {
  const totalParcels = records.length;
  const govtParcels = records.filter((record) => isGovtParcel(record)).length;
  const privateParcels = totalParcels - govtParcels;
  const pendingMutations = records.filter((record) => record.status === "mutation_pending").length;
  const totalAreaSqM = records.reduce((sum, record) => sum + Number(record.areaSqM ?? 0), 0);
  const avgSizeSqM = totalParcels ? Math.round(totalAreaSqM / totalParcels) : 0;

  return {
    scope,
    label,
    totalParcels,
    govtParcels,
    privateParcels,
    avgSizeSqM,
    pendingMutations,
    totalAreaHa: Number((totalAreaSqM / 10_000).toFixed(1)),
    chartData: [
      { label: "Private", value: privateParcels, color: "#3b82f6" },
      { label: "Government", value: govtParcels, color: "#f59e0b" },
      { label: "Pending mutation", value: pendingMutations, color: "#ef4444" },
    ],
  };
}

export function getStatisticsByScope(): ScopeStatistics[] {
  const dataset = getWorkbenchDataset();
  const villageRecords = Object.values(dataset.parcelAttrs);
  const allRecords = loadAllWorkbenchParcelsSync();

  const context = getSpatialContext();
  return [
    buildScopeStatistics("village", context.village, villageRecords),
    buildScopeStatistics("taluk", context.taluk, allRecords),
    buildScopeStatistics("district", context.district, allRecords),
    buildScopeStatistics("ut", context.ut, allRecords),
  ];
}

export function getParcelById(parcelId: string): CadastralParcel | undefined {
  return getCadastralParcels().find((parcel) => parcel.id === parcelId);
}

export function getTransformPreviewParcel(): CadastralParcel | undefined {
  return getCadastralParcels()[0];
}

export { SPATIAL_TOOL_CATALOG as MORE_TOOLS_TABS, type MoreToolsTabId } from "./spatialToolCatalog";
