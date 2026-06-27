import type { AuditHistoryEntry } from "./auditHistory";
import type { ParcelRecord } from "./mockData";

export type DocumentType =
  | "ror"
  | "patta"
  | "chitta"
  | "adangal"
  | "fmb"
  | "village-map"
  | "mutation-orders"
  | "sale-deeds"
  | "gift-deeds"
  | "partition-deeds"
  | "court-orders"
  | "encumbrance"
  | "land-acquisition"
  | "survey-reports"
  | "inspection-reports"
  | "government-orders"
  | "tax-receipts"
  | "parcel-extract"
  | "parcel-snapshot"
  | "satellite-images"
  | "site-inspection"
  | "field-survey"
  | "ulpin-lineage";

export type DocumentTypeOption = {
  id: DocumentType;
  label: string;
  emoji?: string;
};

export const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { id: "ror", label: "Record of Rights (RoR)", emoji: "📄" },
  { id: "patta", label: "Patta", emoji: "📄" },
  { id: "chitta", label: "Chitta", emoji: "📄" },
  { id: "adangal", label: "Adangal", emoji: "📄" },
  { id: "fmb", label: "FMB Sheet", emoji: "📄" },
  { id: "village-map", label: "Village Map Extract", emoji: "📄" },
  { id: "mutation-orders", label: "Mutation Orders", emoji: "📄" },
  { id: "sale-deeds", label: "Registered Sale Deeds", emoji: "📄" },
  { id: "gift-deeds", label: "Gift Deeds", emoji: "📄" },
  { id: "partition-deeds", label: "Partition Deeds", emoji: "📄" },
  { id: "court-orders", label: "Court Orders", emoji: "📄" },
  { id: "encumbrance", label: "Encumbrance Certificate", emoji: "📄" },
  { id: "land-acquisition", label: "Land Acquisition Notices", emoji: "📄" },
  { id: "survey-reports", label: "Survey Reports", emoji: "📄" },
  { id: "inspection-reports", label: "Inspection Reports", emoji: "📄" },
  { id: "government-orders", label: "Government Orders", emoji: "📄" },
  { id: "tax-receipts", label: "Tax Receipts (if available)", emoji: "📄" },
  { id: "parcel-extract", label: "Digitally Signed Parcel Extract", emoji: "📄" },
  { id: "parcel-snapshot", label: "Parcel Snapshot" },
  { id: "satellite-images", label: "Historical Satellite Images" },
  { id: "site-inspection", label: "Site Inspection Photos" },
  { id: "field-survey", label: "Field Survey Photos" },
  { id: "ulpin-lineage", label: "ULPIN Lineage" },
];

export type WorkspaceTab =
  | "overview"
  | "ownership"
  | "documents"
  | "images"
  | "map"
  | "survey"
  | "mutations"
  | "agriculture"
  | "analytics"
  | "downloads"
  | "audit-log";

export const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "ownership", label: "Ownership" },
  { id: "documents", label: "Documents" },
  { id: "images", label: "Images" },
  { id: "map", label: "Map" },
  { id: "survey", label: "Survey" },
  { id: "mutations", label: "Mutations" },
  { id: "agriculture", label: "Agriculture" },
  { id: "analytics", label: "Analytics" },
  { id: "downloads", label: "Downloads" },
  { id: "audit-log", label: "Audit Log" },
];

export type TimelineEvent = {
  year: number;
  label: string;
  detail?: string;
};

export type AgricultureData = {
  farmerId: string;
  currentCrop: string;
  previousCrop: string;
  cropSeason: string;
  cultivator: string;
  irrigation: string;
  soilType: string;
};

export type AnalyticsMetric = {
  label: string;
  value: string;
  status: "pass" | "warning" | "review";
};

export type DocumentPreview = {
  title: string;
  referenceNo: string;
  issuedOn: string;
  verified: boolean;
  rows: Array<{ label: string; value: string }>;
  footerNote?: string;
};

export type DownloadItem = {
  id: string;
  label: string;
  format: string;
  size: string;
  updated: string;
};

function parseYearFromDate(dateStr: string): number | null {
  const match = dateStr.match(/(\d{4})/);
  return match ? Number(match[1]) : null;
}

function parseSurveyYear(lastSurvey: string, surveyYear: string): number {
  const fromField = parseYearFromDate(surveyYear);
  if (fromField) return fromField;
  const fromSurvey = parseYearFromDate(lastSurvey);
  if (fromSurvey) return fromSurvey;
  return 1998;
}

function hashSeed(text: string): number {
  let seed = 0;
  for (let i = 0; i < text.length; i += 1) {
    seed = (seed * 31 + text.charCodeAt(i)) >>> 0;
  }
  return seed;
}

export function generateParcelTimeline(parcel: ParcelRecord): TimelineEvent[] {
  const surveyYear = parseSurveyYear(parcel.lastSurvey, parcel.surveyYear);
  const registeredYear = parseYearFromDate(parcel.registeredOn) ?? surveyYear + 6;
  const mutationYear = registeredYear + 7;
  const subdivisionYear = mutationYear + 5;
  const ulpinYear = subdivisionYear + 1;
  const cropSurveyYear = ulpinYear + 6;
  const boundaryYear = 2026;

  const events: TimelineEvent[] = [
    { year: surveyYear, label: "Original Survey", detail: parcel.lastSurvey },
    { year: registeredYear, label: "Sale Deed", detail: `Deed ${parcel.deedNo}` },
    { year: mutationYear, label: "Mutation", detail: parcel.mutationRef },
    { year: subdivisionYear, label: "Subdivision", detail: `Sub-div ${parcel.subDiv}` },
    { year: ulpinYear, label: "New ULPIN", detail: parcel.ulpin },
    { year: cropSurveyYear, label: "Crop Survey", detail: parcel.cropType || "Seasonal crop record" },
    { year: boundaryYear, label: "Boundary Correction", detail: "GIS alignment update" },
  ];

  return events.sort((a, b) => a.year - b.year);
}

export function generateAgricultureData(parcel: ParcelRecord): AgricultureData {
  const seed = hashSeed(parcel.id);
  const seasons = ["Kharif 2025", "Rabi 2024–25", "Zaid 2025"];
  const crops = ["Paddy", "Sugarcane", "Groundnut", "Cotton", "Banana"];
  const prevCrops = ["Fallow", "Pulses", "Maize", "Vegetables"];

  return {
    farmerId: `AGR-${parcel.districtCode}-${String(seed % 100000).padStart(5, "0")}`,
    currentCrop: parcel.cropType || crops[seed % crops.length],
    previousCrop: prevCrops[seed % prevCrops.length],
    cropSeason: seasons[seed % seasons.length],
    cultivator: parcel.ownerMasked,
    irrigation: parcel.irrigationSource || parcel.waterSource || "Canal + borewell",
    soilType: parcel.soilType,
  };
}

export function generateAnalyticsMetrics(parcel: ParcelRecord): AnalyticsMetric[] {
  const rorAreaHa = (parcel.areaSqM / 10000).toFixed(4);
  const gisDelta = parcel.variancePct;
  const gisAreaSqM = parcel.areaSqM * (1 + gisDelta / 100);
  const gisAreaHa = (gisAreaSqM / 10000).toFixed(4);
  const diffHa = ((gisAreaSqM - parcel.areaSqM) / 10000).toFixed(4);

  const qcStatus =
    parcel.varianceBand === "green" ? "pass" : parcel.varianceBand === "amber" ? "warning" : "review";

  return [
    { label: "RoR Area", value: `${rorAreaHa} ha`, status: "pass" },
    { label: "GIS Area", value: `${gisAreaHa} ha`, status: "pass" },
    { label: "Difference", value: `${diffHa} ha (${parcel.variancePct}%)`, status: qcStatus },
    {
      label: "ULPIN Status",
      value: parcel.status === "active" ? "Active & verified" : parcel.status.replace(/_/g, " "),
      status: parcel.status === "active" ? "pass" : "warning",
    },
    {
      label: "Boundary Variance",
      value: `${parcel.variancePct}%`,
      status: parcel.varianceBand === "green" ? "pass" : parcel.varianceBand === "amber" ? "warning" : "review",
    },
    {
      label: "Topology Errors",
      value: parcel.varianceBand === "red" ? "2 minor overlaps" : "None detected",
      status: parcel.varianceBand === "red" ? "review" : "pass",
    },
    {
      label: "QC Status",
      value: parcel.varianceBand === "green" ? "Pass" : parcel.varianceBand === "amber" ? "Warning" : "Needs Review",
      status: qcStatus,
    },
  ];
}

function docRef(parcel: ParcelRecord, suffix: string): string {
  return `${parcel.districtCode}/${parcel.taluk.slice(0, 3).toUpperCase()}/${suffix}`;
}

export function generateDocumentPreview(parcel: ParcelRecord, docType: DocumentType): DocumentPreview {
  const areaHa = (parcel.areaSqM / 10000).toFixed(4);
  const areaAres = (parcel.areaSqM / 100).toFixed(2);
  const surveyLabel = `${parcel.surveyNo}${parcel.subDiv ? `/${parcel.subDiv}` : ""}`;

  const baseRows = [
    { label: "District / Taluk", value: `${parcel.region} — ${parcel.taluk}` },
    { label: "Village / Ward", value: `${parcel.village} — Ward ${parcel.ward}` },
    { label: "Survey No. / Sub-div", value: surveyLabel },
    { label: "ULPIN", value: parcel.ulpin },
    { label: "Patta No.", value: parcel.pattaNo },
    { label: "Extent (RoR)", value: `${areaHa} ha (${areaAres} ares)` },
    { label: "Classification", value: `${parcel.classification} — ${parcel.landUse}` },
    { label: "Owner (masked)", value: parcel.ownerMasked },
  ];

  const docMeta: Record<DocumentType, { title: string; ref: string; rows?: Array<{ label: string; value: string }> }> = {
    ror: {
      title: "Record of Rights (Chitta Extract)",
      ref: docRef(parcel, `RoR/${parcel.pattaNo}`),
      rows: [
        ...baseRows,
        { label: "Land Category", value: parcel.landCategory || parcel.classification },
        { label: "Occupancy", value: parcel.occupancyType || parcel.holdingType },
        { label: "Encumbrance", value: parcel.encumbrance },
        { label: "Mutation Ref.", value: parcel.mutationRef },
      ],
    },
    patta: {
      title: "Patta Certificate",
      ref: docRef(parcel, `PTA/${parcel.pattaNo}`),
      rows: [
        ...baseRows,
        { label: "Holding Type", value: parcel.holdingType },
        { label: "Registered On", value: parcel.registeredOn },
        { label: "Deed No.", value: parcel.deedNo },
      ],
    },
    chitta: {
      title: "Chitta — Land Register Extract",
      ref: docRef(parcel, `CHT/${surveyLabel.replace("/", "-")}`),
      rows: [
        ...baseRows,
        { label: "Revenue Block", value: parcel.revenueBlock || parcel.blockNo },
        { label: "Sheet No.", value: parcel.sheetNo || parcel.fmbSheet },
      ],
    },
    adangal: {
      title: "Adangal — Cultivation Register",
      ref: docRef(parcel, `ADG/${parcel.surveyYear || "2025"}`),
      rows: [
        ...baseRows,
        { label: "Crop (season)", value: parcel.cropType || "Paddy" },
        { label: "Irrigation", value: parcel.irrigationSource || "Canal" },
        { label: "Soil Type", value: parcel.soilType },
      ],
    },
    fmb: {
      title: "Field Measurement Book (FMB)",
      ref: parcel.fmbSheet,
      rows: [
        ...baseRows,
        { label: "FMB Sheet", value: parcel.fmbSheet },
        { label: "Block No.", value: parcel.blockNo },
        { label: "Sheet No.", value: parcel.sheetNo },
        { label: "North", value: parcel.northBoundary || "Road" },
        { label: "East", value: parcel.eastBoundary || "Vacant plot" },
      ],
    },
    "village-map": { title: "Village Map Extract", ref: docRef(parcel, `VME/${parcel.village.slice(0, 4).toUpperCase()}`) },
    "mutation-orders": {
      title: "Mutation Order",
      ref: parcel.mutationRef,
      rows: [
        { label: "Mutation Type", value: parcel.mutationType || "Sale" },
        { label: "Approval Status", value: parcel.approvalStatus || "Approved" },
        { label: "Reference", value: parcel.mutationRef },
        ...baseRows.slice(0, 4),
      ],
    },
    "sale-deeds": { title: "Registered Sale Deed", ref: parcel.deedNo, rows: baseRows },
    "gift-deeds": { title: "Gift Deed (sample)", ref: docRef(parcel, `GFT/${parcel.deedNo}`) },
    "partition-deeds": { title: "Partition Deed", ref: docRef(parcel, `PRT/${parcel.subDiv}`) },
    "court-orders": { title: "Court Order", ref: docRef(parcel, "CO/2019/441") },
    encumbrance: {
      title: "Encumbrance Certificate",
      ref: docRef(parcel, `EC/${parcel.ulpin.slice(-8)}`),
      rows: [...baseRows.slice(0, 5), { label: "Encumbrance Status", value: parcel.encumbrance }],
    },
    "land-acquisition": { title: "Land Acquisition Notice", ref: docRef(parcel, "LA/NIL") },
    "survey-reports": {
      title: "Survey Report",
      ref: docRef(parcel, `SRV/${parcel.surveyYear || "2024"}`),
      rows: [
        { label: "Last Survey", value: parcel.lastSurvey },
        { label: "GPS Accuracy", value: `${parcel.gpsAccuracy} m` },
        { label: "Boundary Type", value: parcel.boundaryType || "Stone & hedge" },
        ...baseRows.slice(2, 6),
      ],
    },
    "inspection-reports": { title: "Inspection Report", ref: docRef(parcel, "INS/2025/118") },
    "government-orders": { title: "Government Order", ref: docRef(parcel, "GO/Rev/214") },
    "tax-receipts": {
      title: "Property Tax Receipt",
      ref: docRef(parcel, `TAX/${parcel.pattaNo}`),
      rows: [
        { label: "Tax Due", value: parcel.taxDue },
        ...baseRows.slice(0, 4),
      ],
    },
    "parcel-extract": { title: "Digitally Signed Parcel Extract", ref: docRef(parcel, `DSE/${parcel.ulpin}`), rows: baseRows },
    "parcel-snapshot": { title: "Parcel Snapshot", ref: parcel.id },
    "satellite-images": { title: "Historical Satellite Imagery", ref: `SAT/${parcel.id}/STACK` },
    "site-inspection": { title: "Site Inspection Photos", ref: `PHO/SITE/${parcel.id}` },
    "field-survey": { title: "Field Survey Photos", ref: `PHO/FLD/${parcel.fmbSheet}` },
    "ulpin-lineage": {
      title: "ULPIN Lineage Record",
      ref: parcel.ulpin,
      rows: [
        { label: "Current ULPIN", value: parcel.ulpin },
        { label: "Legacy Survey", value: surveyLabel },
        { label: "Patta", value: parcel.pattaNo },
        { label: "Source System", value: parcel.source },
      ],
    },
  };

  const meta = docMeta[docType];
  const seed = hashSeed(`${parcel.id}-${docType}`);

  return {
    title: meta.title,
    referenceNo: meta.ref,
    issuedOn: parcel.registeredOn || `202${seed % 5}-${String((seed % 12) + 1).padStart(2, "0")}-15`,
    verified: seed % 5 !== 0,
    rows: meta.rows ?? baseRows,
    footerNote: "This is a digitally generated preview for demonstration. Official copies require Tahsildar authentication.",
  };
}

export function generateDownloadItems(parcel: ParcelRecord): DownloadItem[] {
  return DOCUMENT_TYPES.filter((d) => d.id !== "satellite-images" && d.id !== "site-inspection").map((doc, i) => ({
    id: doc.id,
    label: doc.label,
    format: doc.id.includes("image") || doc.id.includes("photo") || doc.id === "parcel-snapshot" ? "ZIP" : "PDF",
    size: `${(120 + (hashSeed(parcel.id + doc.id) % 890))} KB`,
    updated: `2026-0${(i % 6) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
  }));
}

export function summarizeAuditHistory(history: AuditHistoryEntry[]): Array<{ version: string; label: string; timestamp: string }> {
  return [
    { version: "Current", label: "Current record", timestamp: "Present" },
    ...history.map((entry) => ({
      version: `v${entry.version}`,
      label: entry.label,
      timestamp: entry.timestamp,
    })),
  ];
}
