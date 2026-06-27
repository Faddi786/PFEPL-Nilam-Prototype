import type { ParcelRecord } from "../data/mockData";

/** Capitalize first character of a label/key for display (does not alter data values). */
export function titleCaseLabel(key: string): string {
  if (!key) return key;
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export const PARCEL_FIELD_LABELS: Record<keyof ParcelRecord, string> = {
  id: "ID",
  surveyNo: "Survey No",
  subDiv: "Sub-division",
  ulpin: "ULPIN",
  pattaNo: "Patta No",
  deedNo: "Deed No",
  village: "Village",
  taluk: "Taluk",
  ward: "Ward",
  region: "Region",
  classification: "Classification",
  landUse: "Land use",
  holdingType: "Holding type",
  areaSqM: "Area (sq.m)",
  plotFrontageM: "Frontage (m)",
  plotDepthM: "Depth (m)",
  owner: "Owner",
  ownerMasked: "Owner (masked)",
  status: "Status",
  mutationRef: "Mutation ref",
  encumbrance: "Encumbrance",
  fmbSheet: "FMB sheet",
  varianceBand: "Variance band",
  variancePct: "Variance %",
  registeredOn: "Registered on",
  lastSurvey: "Last survey",
  taxDue: "Tax due",
  soilType: "Soil type",
  roadAccess: "Road access",
  source: "Data source",
  osmTag: "OSM tag",
  blockNo: "Block No",
  sheetNo: "Sheet No",
  mutationType: "Mutation type",
  approvalStatus: "Approval status",
  surveyYear: "Survey year",
  gpsAccuracy: "GPS accuracy",
  boundaryType: "Boundary type",
  irrigationSource: "Irrigation source",
  cropType: "Crop type",
  buildingFootprint: "Building footprint",
  districtCode: "District code",
  revenueBlock: "Revenue block",
  subdivisionNo: "Subdivision No",
  landCategory: "Land category",
  occupancyType: "Occupancy type",
  waterSource: "Water source",
  electricityConnection: "Electricity connection",
  drainageStatus: "Drainage status",
  northBoundary: "North boundary",
  eastBoundary: "East boundary",
};

export function getParcelFieldLabel(key: keyof ParcelRecord): string {
  return PARCEL_FIELD_LABELS[key] ?? titleCaseLabel(String(key));
}

export const PARCEL_AUDIT_SECTIONS: Array<{
  label: string;
  keys: Array<keyof ParcelRecord>;
}> = [
  {
    label: "Parcel identification",
    keys: ["surveyNo", "subDiv", "ulpin", "blockNo", "sheetNo", "subdivisionNo"],
  },
  {
    label: "Title & locality",
    keys: ["pattaNo", "village", "taluk", "districtCode", "region"],
  },
  {
    label: "Administrative & revenue",
    keys: ["ward", "revenueBlock", "taxDue", "landCategory"],
  },
  {
    label: "Registration & mutation",
    keys: ["registeredOn", "deedNo", "mutationRef", "mutationType", "approvalStatus"],
  },
  {
    label: "Mutation & workflow",
    keys: ["status", "encumbrance", "holdingType", "occupancyType"],
  },
  {
    label: "Owner & classification",
    keys: ["classification", "owner", "ownerMasked"],
  },
  {
    label: "Land use & soil",
    keys: ["landUse", "soilType", "cropType", "irrigationSource"],
  },
  {
    label: "Survey & area",
    keys: ["lastSurvey", "surveyYear", "areaSqM", "gpsAccuracy"],
  },
  {
    label: "Plot dimensions",
    keys: ["plotFrontageM", "plotDepthM", "buildingFootprint"],
  },
  {
    label: "Cadastral & access",
    keys: ["fmbSheet", "roadAccess", "boundaryType", "northBoundary", "eastBoundary"],
  },
  {
    label: "Infrastructure",
    keys: ["waterSource", "electricityConnection", "drainageStatus"],
  },
  {
    label: "Variance & quality",
    keys: ["varianceBand", "variancePct"],
  },
  {
    label: "Data provenance",
    keys: ["source", "osmTag"],
  },
];

export function formatParcelValue(key: keyof ParcelRecord, value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "areaSqM") return Number(value).toLocaleString();
  if (key === "variancePct") return `${Number(value).toFixed(2)}%`;
  if (key === "plotFrontageM" || key === "plotDepthM") return `${value} m`;
  if (key === "gpsAccuracy") return `${value} m`;
  if (key === "buildingFootprint") return `${value} sq.m`;
  return String(value);
}
