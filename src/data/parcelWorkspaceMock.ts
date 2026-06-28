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
  | "nilamagal"
  | "collabland"
  | "ulpin-lineage"
  | "images"
  | "agristack"
  | "analytics"
  | "documents";

export const WORKSPACE_TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "ownership", label: "Ownership" },
  { id: "nilamagal", label: "Nilamagal" },
  { id: "collabland", label: "Collabland" },
  { id: "ulpin-lineage", label: "ULPIN Lineage" },
  { id: "agristack", label: "Agristack" },
  { id: "images", label: "Images" },
  { id: "analytics", label: "Analytics" },
  { id: "documents", label: "Documents" },
];

export type ParcelDocumentAsset = {
  id: string;
  label: string;
  description: string;
  kind: "pdf" | "image";
  src: string;
  sourceNote?: string;
};

/** Maharashtra / Puducherry land-record documents for the Documents tab preview panel. */
export const PARCEL_DOCUMENT_ASSETS: ParcelDocumentAsset[] = [
  {
    id: "ror-7-12",
    label: "Record of Rights (7/12 Extract)",
    description: "Saath Baara Utara — ownership, classification & crop register",
    kind: "pdf",
    src: "/assets/documents/ror-7-12-extract.pdf",
    sourceNote: "Sample: ACRS proceedings citing RoR & FMB (public research PDF)",
  },
  {
    id: "patta",
    label: "Patta Certificate",
    description: "Puducherry / Tamil Nadu patta extract",
    kind: "pdf",
    src: "/assets/documents/cadastral-mapping-guide.pdf",
    sourceNote: "Sample: KSCST cadastral mapping guidelines (open government PDF)",
  },
  {
    id: "mutation-order",
    label: "Mutation Order",
    description: "Revenue mutation entry — sale / inheritance",
    kind: "pdf",
    src: "/assets/documents/mutation-order-sample.pdf",
    sourceNote: "Sample: BhuNaksha FMB digitization guide (NIC public PDF)",
  },
  {
    id: "fmb-sketch",
    label: "FMB Survey Sketch",
    description: "Field Measurement Book — sub-division diagram",
    kind: "pdf",
    src: "/assets/documents/fmb-bhunaksha-guide.pdf",
    sourceNote: "Sample: BhuNaksha FMB/Tippon digitization (bhunaksha.nic.in)",
  },
  {
    id: "village-map",
    label: "Village Cadastral Map",
    description: "Geo-referenced village parcel mosaic",
    kind: "pdf",
    src: "/assets/documents/cadastral-mapping-guide.pdf",
    sourceNote: "Sample: VIS cadastral mapping guidelines (KSCST)",
  },
  {
    id: "sale-deed",
    label: "Registered Sale Deed",
    description: "Sub-registrar registered transfer deed",
    kind: "pdf",
    src: "/assets/documents/collabland-fmb-study.pdf",
    sourceNote: "Sample: CollabLand FMB study proceedings (ACRS public PDF)",
  },
  {
    id: "encumbrance",
    label: "Encumbrance Certificate",
    description: "Nil encumbrance / charge certificate",
    kind: "pdf",
    src: "/assets/documents/ror-7-12-extract.pdf",
    sourceNote: "Demo placeholder — same public RoR sample",
  },
];

export type WorkspaceImageAsset = {
  id: string;
  label: string;
  category: string;
  src: string;
};

export const WORKSPACE_IMAGE_ASSETS: WorkspaceImageAsset[] = [
  { id: "sat-2024", label: "Satellite 2024", category: "Satellite imagery", src: "/assets/parcel-images/sat-2024-aerial-farm.jpg" },
  { id: "sat-2020", label: "Satellite 2020", category: "Satellite imagery", src: "/assets/parcel-images/sat-2020-paddy-aerial.jpg" },
  { id: "cadastral", label: "Cadastral overlay", category: "Survey sketch", src: "/assets/parcel-images/cadastral-koppa-taluk.png" },
  { id: "fmb-field", label: "FMB field boundary", category: "Survey sketch", src: "/assets/parcel-images/fmb-village-boundaries.jpg" },
  { id: "site-inspection", label: "Site inspection", category: "Field photos", src: "/assets/parcel-images/site-inspection.jpg" },
  { id: "crop-paddy", label: "Kharif crop — Paddy", category: "Agristack", src: "/assets/parcel-images/crop-paddy-tamilnadu.jpg" },
  { id: "crop-sugarcane", label: "Rabi crop — Sugarcane", category: "Agristack", src: "/assets/parcel-images/crop-sugarcane-maharashtra.jpg" },
  { id: "farmer-portrait", label: "Cultivator verification", category: "Agristack", src: "/assets/parcel-images/cultivator-field-tamilnadu.jpg" },
];

export type NilamagalRecord = {
  syncStatus: "live" | "stale" | "pending";
  lastSyncedAt: string;
  rows: Array<{ field: string; value: string; dbColumn: string }>;
};

export type CollablandGeometry = {
  crs: string;
  areaSqM: number;
  perimeterM: number;
  vertexCount: number;
  coordinates: Array<{ seq: number; easting: string; northing: string; lat: string; lng: string }>;
  boundaryStats: Array<{ label: string; value: string }>;
};

export type UlpinLineageEvent = {
  date: string;
  ulpin: string;
  action: string;
  linkedParcel: string;
  verification: "verified" | "pending" | "superseded";
  source: string;
};

export type UlpinLineageNode = {
  id: string;
  ulpin: string;
  label: string;
  subtitle?: string;
  kind: "ancestor" | "origin" | "split" | "merge" | "current";
  eventDate?: string;
  eventAction?: string;
  accent?: "slate" | "blue" | "green";
  onLineagePath?: boolean;
  refNo?: number;
};

export type UlpinLineageLevel = {
  id: string;
  label: string;
  nodes: UlpinLineageNode[];
  edges: Array<{ from: string; to: string }>;
};

export type UlpinLineageTreeData = {
  ancestorParent?: UlpinLineageNode;
  levels: UlpinLineageLevel[];
  rootId: string;
  binaryChildren: Record<string, { left?: string; right?: string }>;
  lineagePathIds: string[];
};

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

export function generateNilamagalData(parcel: ParcelRecord): NilamagalRecord {
  const surveyLabel = `${parcel.surveyNo}${parcel.subDiv ? `/${parcel.subDiv}` : ""}`;
  const areaHa = (parcel.areaSqM / 10000).toFixed(4);
  const areaAres = (parcel.areaSqM / 100).toFixed(2);

  return {
    syncStatus: "live",
    lastSyncedAt: "2026-06-27 14:32:08 IST",
    rows: [
      { field: "DISTRICT_CD", value: parcel.districtCode, dbColumn: "VARCHAR(4)" },
      { field: "TALUK_NM", value: parcel.taluk, dbColumn: "VARCHAR(64)" },
      { field: "VILLAGE_NM", value: parcel.village, dbColumn: "VARCHAR(128)" },
      { field: "SURVEY_NO", value: surveyLabel, dbColumn: "VARCHAR(16)" },
      { field: "PATTA_NO", value: parcel.pattaNo, dbColumn: "VARCHAR(24)" },
      { field: "OWNER_NM", value: parcel.ownerMasked, dbColumn: "VARCHAR(256)" },
      { field: "CLASS_CD", value: parcel.classification, dbColumn: "CHAR(2)" },
      { field: "LAND_USE", value: parcel.landUse, dbColumn: "VARCHAR(32)" },
      { field: "EXTENT_HA", value: areaHa, dbColumn: "DECIMAL(10,4)" },
      { field: "EXTENT_ARES", value: areaAres, dbColumn: "DECIMAL(10,2)" },
      { field: "HOLDING_TYP", value: parcel.holdingType, dbColumn: "VARCHAR(24)" },
      { field: "OCCUPANCY", value: parcel.occupancyType || "Owner", dbColumn: "VARCHAR(24)" },
      { field: "MUTATION_REF", value: parcel.mutationRef, dbColumn: "VARCHAR(32)" },
      { field: "ENCUMBRANCE", value: parcel.encumbrance, dbColumn: "VARCHAR(64)" },
      { field: "CROP_SEASON", value: parcel.cropType || "Paddy", dbColumn: "VARCHAR(32)" },
      { field: "SOIL_TYPE", value: parcel.soilType, dbColumn: "VARCHAR(24)" },
      { field: "REV_BLOCK", value: parcel.revenueBlock || parcel.blockNo, dbColumn: "VARCHAR(8)" },
      { field: "FMB_SHEET", value: parcel.fmbSheet, dbColumn: "VARCHAR(16)" },
      { field: "ULPIN", value: parcel.ulpin, dbColumn: "CHAR(26)" },
      { field: "SYNC_SRC", value: "NILAMAGAL_LIVE", dbColumn: "VARCHAR(16)" },
    ],
  };
}

function ringPerimeter(ring: number[][]): number {
  let total = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[i + 1];
    const dx = (lng2 - lng1) * 111320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    const dy = (lat2 - lat1) * 110540;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

export function generateCollablandData(parcel: ParcelRecord, geometry: GeoJSON.Polygon): CollablandGeometry {
  const ring = geometry.coordinates[0];
  const perimeterM = ringPerimeter(ring);

  return {
    crs: "EPSG:4326 (WGS84) → UTM 44N",
    areaSqM: parcel.areaSqM,
    perimeterM: Math.round(perimeterM * 10) / 10,
    vertexCount: ring.length - 1,
    coordinates: ring.slice(0, -1).map((coord, index) => ({
      seq: index + 1,
      easting: (coord[0] * 111320).toFixed(2),
      northing: (coord[1] * 110540).toFixed(2),
      lng: coord[0].toFixed(6),
      lat: coord[1].toFixed(6),
    })),
    boundaryStats: [
      { label: "Survey No.", value: `${parcel.surveyNo}/${parcel.subDiv}` },
      { label: "FMB Sheet", value: parcel.fmbSheet },
      { label: "Block No.", value: parcel.blockNo },
      { label: "GPS accuracy", value: `${parcel.gpsAccuracy} m` },
      { label: "Boundary type", value: parcel.boundaryType || "Stone & hedge" },
      { label: "North adjacency", value: parcel.northBoundary || "Village road" },
      { label: "East adjacency", value: parcel.eastBoundary || "Vacant plot" },
      { label: "GIS variance", value: `${parcel.variancePct}%` },
    ],
  };
}

export function generateUlpinLineageTree(parcel: ParcelRecord): UlpinLineageTreeData {
  const districtPrefix = parcel.ulpin.replace(/\D/g, "").slice(0, 6) || "341200";
  const surveyLabel = `${parcel.surveyNo}${parcel.subDiv ? `/${parcel.subDiv}` : ""}`;
  const lineagePathIds = ["node-7", "node-3", "node-5", "node-6"];
  const pathSet = new Set(lineagePathIds);

  function ulpinForRef(ref: number): string {
    if (ref === 6) return parcel.ulpin;
    return `${districtPrefix}${String(ref).padStart(8, "0")}`;
  }

  function makeNode(
    id: string,
    ref: number,
    label: string,
    kind: UlpinLineageNode["kind"],
    eventAction: string,
    eventDate?: string,
  ): UlpinLineageNode {
    return {
      id,
      refNo: ref,
      ulpin: ulpinForRef(ref),
      label,
      subtitle: surveyLabel,
      kind,
      eventDate,
      eventAction,
      onLineagePath: pathSet.has(id),
      accent: pathSet.has(id) ? "green" : "blue",
    };
  }

  const node7 = makeNode("node-7", 7, "Parent holding — sole owner", "origin", "Original survey & registration", parcel.registeredOn || "1985-04-12");
  const node3 = makeNode("node-3", 3, "First partition — left share", "split", "Family partition deed", "2019-03-22");
  const node11 = makeNode("node-11", 11, "First partition — right share", "split", "Family partition deed", "2019-03-22");
  const node1 = makeNode("node-1", 1, "Sub-partition — left branch", "split", "Subdivision deed", "2020-01-14");
  const node5 = makeNode("node-5", 5, "Sub-partition — right branch", "split", "Subdivision deed", "2020-01-14");
  const node9 = makeNode("node-9", 9, "Sub-partition — left branch", "split", "Subdivision deed", "2020-06-08");
  const node13 = makeNode("node-13", 13, "Sub-partition — right branch", "split", "Subdivision deed", "2020-06-08");
  const node4 = makeNode("node-4", 4, "Split parcel — left share", "split", "Further subdivision", "2021-04-19");
  const node6 = makeNode("node-6", 6, "Current parcel — GIS aligned", "current", "ULPIN re-issued after subdivision", "2023-11-05");
  const node8 = makeNode("node-8", 8, "Split parcel — sole child", "split", "Further subdivision", "2021-09-02");
  const node12 = makeNode("node-12", 12, "Split parcel — left share", "split", "Further subdivision", "2022-02-11");
  const node14 = makeNode("node-14", 14, "Split parcel — right share", "split", "Further subdivision", "2022-02-11");


  const binaryChildren: UlpinLineageTreeData["binaryChildren"] = {
    "node-7": { left: "node-3", right: "node-11" },
    "node-3": { left: "node-1", right: "node-5" },
    "node-11": { left: "node-9", right: "node-13" },
    "node-5": { left: "node-4", right: "node-6" },
    "node-9": { left: "node-8" },
    "node-13": { left: "node-12", right: "node-14" },
  };

  const edges = [
    { from: "node-7", to: "node-3" },
    { from: "node-7", to: "node-11" },
    { from: "node-3", to: "node-1" },
    { from: "node-3", to: "node-5" },
    { from: "node-11", to: "node-9" },
    { from: "node-11", to: "node-13" },
    { from: "node-5", to: "node-4" },
    { from: "node-5", to: "node-6" },
    { from: "node-9", to: "node-8" },
    { from: "node-13", to: "node-12" },
    { from: "node-13", to: "node-14" },
  ];

  return {
    rootId: "node-7",
    binaryChildren,
    lineagePathIds,
    levels: [
      {
        id: "level-root",
        label: "Parent parcel (pre-partition)",
        nodes: [node7],
        edges: edges.filter((e) => e.from === "node-7"),
      },
      {
        id: "level-1",
        label: "First partition",
        nodes: [node3, node11],
        edges: edges.filter((e) => e.from === "node-3" || e.from === "node-11"),
      },
      {
        id: "level-2",
        label: "Second partition",
        nodes: [node1, node5, node9, node13],
        edges: edges.filter((e) => e.from === "node-5" || e.from === "node-9" || e.from === "node-13"),
      },
      {
        id: "level-3",
        label: "Third partition — current parcel",
        nodes: [node4, node6, node8, node12, node14],
        edges: [],
      },
    ],
  };
}

export function generateUlpinLineage(parcel: ParcelRecord, auditHistory: AuditHistoryEntry[]): UlpinLineageEvent[] {
  const surveyLabel = `${parcel.surveyNo}${parcel.subDiv ? `/${parcel.subDiv}` : ""}`;
  const events: UlpinLineageEvent[] = [
    {
      date: parcel.registeredOn || "2012-08-14",
      ulpin: "—",
      action: "Legacy survey record",
      linkedParcel: surveyLabel,
      verification: "superseded",
      source: parcel.source || "Nilamagal",
    },
    {
      date: "2019-03-22",
      ulpin: `IN-${parcel.districtCode}-LEG-${parcel.surveyNo}`,
      action: "ULPIN assigned (NLRMP Phase I)",
      linkedParcel: surveyLabel,
      verification: "superseded",
      source: "ULPIN Registry",
    },
    {
      date: "2023-11-05",
      ulpin: parcel.ulpin,
      action: "ULPIN re-issued after subdivision",
      linkedParcel: `${parcel.surveyNo}/${parcel.subDiv}`,
      verification: "verified",
      source: "DOSLR Portal",
    },
    {
      date: "2026-01-18",
      ulpin: parcel.ulpin,
      action: "Boundary correction — geometry sync",
      linkedParcel: parcel.ulpin,
      verification: "verified",
      source: "Collabland",
    },
  ];

  auditHistory.slice(0, 2).forEach((entry, index) => {
    events.push({
      date: entry.timestamp.split(" ")[0] || entry.timestamp,
      ulpin: parcel.ulpin,
      action: entry.label,
      linkedParcel: parcel.id,
      verification: index === 0 ? "verified" : "pending",
      source: "Audit workflow",
    });
  });

  return events;
}
