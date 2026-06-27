import {
  getRegionConfig,
  WORKBENCH_SHAPEFILE_REGIONS,
  type ParcelRecord,
  type RegionKey,
} from "./mockData";
import { getWorkbenchRegionDatasetSync, loadWorkbenchRegionDataset } from "./workbenchParcels";

export const DATABASE_PARCEL_LIMIT = 50;

export type DatabaseParcel = ParcelRecord & {
  regionKey: RegionKey;
  regionLabel: string;
};

export type WorkflowBucket =
  | "all"
  | "mutation_pending"
  | "pending_approval"
  | "has_encumbrance"
  | "disputed"
  | "variance_green"
  | "variance_amber"
  | "variance_red";

export type DatabaseFilterState = {
  region: string;
  taluk: string;
  village: string;
  ward: string;
  status: string;
  varianceBand: string;
  classification: string;
  landUse: string;
  workflow: WorkflowBucket;
  search: string;
};

export const DEFAULT_DATABASE_FILTERS: DatabaseFilterState = {
  region: "",
  taluk: "",
  village: "",
  ward: "",
  status: "",
  varianceBand: "",
  classification: "",
  landUse: "",
  workflow: "all",
  search: "",
};

export type DatabaseFilterOptions = {
  regions: Array<{ value: string; label: string }>;
  taluks: string[];
  villages: string[];
  wards: string[];
  statuses: string[];
  varianceBands: string[];
  classifications: string[];
  landUses: string[];
};

export function loadAllWorkbenchParcelsSync(): DatabaseParcel[] {
  return WORKBENCH_SHAPEFILE_REGIONS.flatMap((regionKey) => {
    const config = getRegionConfig(regionKey);
    const dataset = getWorkbenchRegionDatasetSync(regionKey);
    return dataset.parcels.slice(0, DATABASE_PARCEL_LIMIT).map((parcel) => ({
      ...parcel,
      regionKey,
      regionLabel: config.label,
    }));
  }).slice(0, DATABASE_PARCEL_LIMIT);
}

export async function loadAllWorkbenchParcels(): Promise<DatabaseParcel[]> {
  const datasets = await Promise.all(
    WORKBENCH_SHAPEFILE_REGIONS.map((regionKey) => loadWorkbenchRegionDataset(regionKey)),
  );
  return WORKBENCH_SHAPEFILE_REGIONS.flatMap((regionKey, index) => {
    const config = getRegionConfig(regionKey);
    return datasets[index].parcels.slice(0, DATABASE_PARCEL_LIMIT).map((parcel) => ({
      ...parcel,
      regionKey,
      regionLabel: config.label,
    }));
  }).slice(0, DATABASE_PARCEL_LIMIT);
}

export function getParcelGeometry(
  parcel: DatabaseParcel,
): GeoJSON.Polygon | GeoJSON.MultiPolygon | null {
  const dataset = getWorkbenchRegionDatasetSync(parcel.regionKey);
  const feature = dataset.geojson.parcels.features.find((f) => f.properties?.id === parcel.id);
  if (!feature?.geometry) return null;
  if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
    return feature.geometry;
  }
  return null;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function buildFilterOptions(parcels: DatabaseParcel[]): DatabaseFilterOptions {
  return {
    regions: uniqueSorted(parcels.map((p) => p.regionLabel)).map((label) => ({
      value: label,
      label,
    })),
    taluks: uniqueSorted(parcels.map((p) => p.taluk)),
    villages: uniqueSorted(parcels.map((p) => p.village)),
    wards: uniqueSorted(parcels.map((p) => p.ward)),
    statuses: uniqueSorted(parcels.map((p) => p.status)),
    varianceBands: uniqueSorted(parcels.map((p) => p.varianceBand)),
    classifications: uniqueSorted(parcels.map((p) => p.classification)),
    landUses: uniqueSorted(parcels.map((p) => p.landUse)),
  };
}

function matchesSearch(parcel: DatabaseParcel, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [
    parcel.surveyNo,
    parcel.subDiv,
    parcel.ulpin,
    parcel.owner,
    parcel.ownerMasked,
    parcel.id,
    parcel.mutationRef,
    parcel.village,
    parcel.taluk,
  ].some((value) => String(value).toLowerCase().includes(q));
}

function matchesWorkflow(parcel: DatabaseParcel, workflow: WorkflowBucket): boolean {
  switch (workflow) {
    case "all":
      return true;
    case "mutation_pending":
      return parcel.status === "mutation_pending";
    case "pending_approval":
      return parcel.approvalStatus === "Pending" || parcel.approvalStatus === "Under review";
    case "has_encumbrance":
      return parcel.encumbrance !== "None";
    case "disputed":
      return parcel.status === "disputed";
    case "variance_green":
      return parcel.varianceBand === "green";
    case "variance_amber":
      return parcel.varianceBand === "amber";
    case "variance_red":
      return parcel.varianceBand === "red";
    default:
      return true;
  }
}

export function filterParcels(parcels: DatabaseParcel[], filters: DatabaseFilterState): DatabaseParcel[] {
  return parcels.filter((parcel) => {
    if (filters.region && parcel.regionLabel !== filters.region) return false;
    if (filters.taluk && parcel.taluk !== filters.taluk) return false;
    if (filters.village && parcel.village !== filters.village) return false;
    if (filters.ward && parcel.ward !== filters.ward) return false;
    if (filters.status && parcel.status !== filters.status) return false;
    if (filters.varianceBand && parcel.varianceBand !== filters.varianceBand) return false;
    if (filters.classification && parcel.classification !== filters.classification) return false;
    if (filters.landUse && parcel.landUse !== filters.landUse) return false;
    if (!matchesWorkflow(parcel, filters.workflow)) return false;
    if (!matchesSearch(parcel, filters.search)) return false;
    return true;
  });
}

export type DatabaseStats = {
  total: number;
  mutationPending: number;
  disputed: number;
  redVariance: number;
  amberVariance: number;
  greenVariance: number;
  withEncumbrance: number;
};

export function computeDatabaseStats(parcels: DatabaseParcel[]): DatabaseStats {
  return {
    total: parcels.length,
    mutationPending: parcels.filter((p) => p.status === "mutation_pending").length,
    disputed: parcels.filter((p) => p.status === "disputed").length,
    redVariance: parcels.filter((p) => p.varianceBand === "red").length,
    amberVariance: parcels.filter((p) => p.varianceBand === "amber").length,
    greenVariance: parcels.filter((p) => p.varianceBand === "green").length,
    withEncumbrance: parcels.filter((p) => p.encumbrance !== "None").length,
  };
}

export function formatParcelStatus(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
