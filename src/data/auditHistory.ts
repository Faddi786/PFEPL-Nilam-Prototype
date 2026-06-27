import type { ParcelRecord } from "./mockData";

export function searchAuditParcel(parcels: ParcelRecord[], query: string): ParcelRecord | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  return (
    parcels.find(
      (parcel) =>
        parcel.id.toLowerCase().includes(q) ||
        parcel.surveyNo.toLowerCase().includes(q) ||
        parcel.subDiv.toLowerCase().includes(q) ||
        parcel.ulpin.toLowerCase().includes(q) ||
        parcel.village.toLowerCase().includes(q) ||
        parcel.taluk.toLowerCase().includes(q) ||
        parcel.ward.toLowerCase().includes(q) ||
        parcel.pattaNo.toLowerCase().includes(q),
    ) ?? null
  );
}

const SEARCHABLE_KEYS: Array<keyof ParcelRecord> = [
  "id",
  "surveyNo",
  "subDiv",
  "ulpin",
  "village",
  "taluk",
  "ward",
  "pattaNo",
  "deedNo",
  "owner",
  "mutationRef",
];

export function searchParcels(parcels: ParcelRecord[], query: string): ParcelRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return parcels.filter((parcel) =>
    SEARCHABLE_KEYS.some((key) => String(parcel[key]).toLowerCase().includes(q)),
  );
}

export type AuditHistoryEntry = {
  version: number;
  timestamp: string;
  label: string;
  parcel: ParcelRecord;
  geometry: GeoJSON.Polygon;
  fieldAudit: Partial<Record<keyof ParcelRecord, MutationAuditMeta>>;
  geometryAudit: GeometryAuditMeta;
};

export type MutationAuditMeta = {
  changedBy: string;
  changedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  mutationRef: string;
  notes: string;
};

export type GeometryAuditMeta = {
  changedBy: string;
  changedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  areaSqM: number;
  mutationNotes: string;
};

const AUDITORS = [
  "R. Priya (Tahsildar)",
  "S. Karthik (Surveyor)",
  "M. Devi (Revenue Inspector)",
  "A. Selvam (Mutation Clerk)",
  "V. Nandhini (Approver)",
];

const APPROVERS = [
  "District Collector Office",
  "Joint Tahsildar — Puducherry",
  "Revenue Division Officer",
  "Chief Surveyor",
];

function formatAuditTimestamp(seed: number, dayOffset: number): string {
  const day = ((seed + dayOffset) % 28) + 1;
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = months[(seed + dayOffset) % months.length];
  const hour = 9 + (seed % 9);
  const minute = (seed * 7 + dayOffset * 11) % 60;
  const period = hour >= 12 ? "pm" : "am";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${day}${suffix} ${month}, 2026 ${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function buildFieldAuditMeta(
  parcelId: string,
  version: number,
  field: keyof ParcelRecord,
): MutationAuditMeta {
  const seed = hashString(`${parcelId}-v${version}-${String(field)}`);
  const changedBy = AUDITORS[seed % AUDITORS.length];
  const approved = seed % 4 !== 0;
  return {
    changedBy,
    changedAt: formatAuditTimestamp(seed, version),
    approvedBy: approved ? APPROVERS[(seed + version) % APPROVERS.length] : null,
    approvedAt: approved ? formatAuditTimestamp(seed + 3, version + 1) : null,
    mutationRef: `MUT-${String(2400 + version * 10 + (seed % 90)).padStart(4, "0")}`,
    notes:
      seed % 2 === 0
        ? "Ownership transfer recorded after deed verification."
        : "Attribute correction from legacy register scan.",
  };
}

function buildGeometryAuditMeta(
  parcelId: string,
  version: number,
  areaSqM: number,
): GeometryAuditMeta {
  const seed = hashString(`${parcelId}-geom-v${version}`);
  const approved = seed % 5 !== 0;
  return {
    changedBy: AUDITORS[(seed + 2) % AUDITORS.length],
    changedAt: formatAuditTimestamp(seed, version + 2),
    approvedBy: approved ? APPROVERS[seed % APPROVERS.length] : null,
    approvedAt: approved ? formatAuditTimestamp(seed + 5, version + 3) : null,
    areaSqM,
    mutationNotes:
      seed % 2 === 0
        ? `Polygon adjusted by ${((seed % 8) + 1) * 0.4} m along northern edge.`
        : `Vertex shift after GPS resurvey — variance within tolerance.`,
  };
}

const TRACKED_AUDIT_FIELDS: Array<keyof ParcelRecord> = [
  "surveyNo",
  "subDiv",
  "ulpin",
  "owner",
  "ownerMasked",
  "status",
  "landUse",
  "classification",
  "holdingType",
  "areaSqM",
  "mutationRef",
  "encumbrance",
  "registeredOn",
  "lastSurvey",
  "taxDue",
  "deedNo",
  "pattaNo",
  "plotFrontageM",
  "plotDepthM",
  "roadAccess",
  "soilType",
  "variancePct",
  "varianceBand",
  "village",
  "taluk",
  "ward",
  "region",
  "fmbSheet",
  "source",
  "osmTag",
  "blockNo",
  "sheetNo",
  "mutationType",
  "approvalStatus",
  "surveyYear",
  "gpsAccuracy",
  "boundaryType",
  "irrigationSource",
  "cropType",
  "buildingFootprint",
  "districtCode",
  "revenueBlock",
  "subdivisionNo",
  "landCategory",
  "occupancyType",
  "waterSource",
  "electricityConnection",
  "drainageStatus",
  "northBoundary",
  "eastBoundary",
];

export function getFieldAuditForRevision(
  parcelId: string,
  version: number,
  field: keyof ParcelRecord,
): MutationAuditMeta {
  return buildFieldAuditMeta(parcelId, version, field);
}

export function buildCurrentFieldAudit(
  parcelId: string,
): Partial<Record<keyof ParcelRecord, MutationAuditMeta>> {
  const fieldAudit: Partial<Record<keyof ParcelRecord, MutationAuditMeta>> = {};
  for (const field of TRACKED_AUDIT_FIELDS) {
    fieldAudit[field] = buildFieldAuditMeta(parcelId, 0, field);
  }
  return fieldAudit;
}

export function buildCurrentGeometryAudit(parcelId: string, areaSqM: number): GeometryAuditMeta {
  return buildGeometryAuditMeta(parcelId, 0, areaSqM);
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function shuffleArray<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Per-field mock mutation strategies for audit history:
 * - unique: distinct value per revision (no repeats in compare modal)
 * - shuffled: pick from a limited pool in shuffled order per parcel
 * - numeric: slight numeric drift per revision
 */
type FieldStrategy = "unique" | "shuffled" | "numeric";

const FIELD_STRATEGIES: Partial<Record<keyof ParcelRecord, FieldStrategy>> = {
  owner: "unique",
  ownerMasked: "unique",
  surveyNo: "unique",
  ulpin: "unique",
  mutationRef: "unique",
  deedNo: "unique",
  pattaNo: "unique",
  landUse: "shuffled",
  classification: "shuffled",
  holdingType: "shuffled",
  status: "shuffled",
  encumbrance: "shuffled",
  soilType: "shuffled",
  roadAccess: "shuffled",
  varianceBand: "shuffled",
  areaSqM: "numeric",
  plotFrontageM: "numeric",
  plotDepthM: "numeric",
  variancePct: "numeric",
};

const OWNER_POOL = [
  "R. Venkatesh",
  "S. Meenakshi",
  "K. Arumugam",
  "G. Subramanian",
  "T. Rajalakshmi",
  "V. Murugesan",
  "D. Kavitha",
  "H. Balaji",
  "J. Anbarasi",
  "L. Thirumurugan",
  "Joint Holders Trust",
  "Municipal Housing Board",
  "C. Hemalatha",
  "B. Senthil Kumar",
  "E. Yamuna Devi",
];

const SURVEY_NO_POOL = [
  "142/3A",
  "142/3B",
  "187/1",
  "187/2A",
  "205/4",
  "219/7B",
  "231/2",
  "244/5A",
  "256/1C",
  "268/8",
  "275/3",
  "289/6",
  "301/2B",
  "314/9A",
  "327/4",
];

const ULPIN_POOL = [
  "341100142301",
  "341100187102",
  "341100205401",
  "341100219702",
  "341100231201",
  "341100244501",
  "341100256103",
  "341100268801",
  "341100275301",
  "341100289601",
  "341100301202",
  "341100314901",
  "341100327401",
  "341100338702",
  "341100349105",
];

const STATUS_POOL = [
  "active",
  "mutation_pending",
  "under_review",
  "encumbered",
  "transferred",
  "survey_hold",
  "title_clearance",
] as const;

const LAND_USE_POOL = [
  "Residential",
  "Agriculture",
  "Commercial",
  "Industrial",
  "Mixed use",
  "Institutional",
  "Vacant land",
  "Recreational",
] as const;

const CLASSIFICATION_POOL = [
  "Patta",
  "Poramboke",
  "Government",
  "Trust land",
  "Leasehold",
  "Bhoodan",
  "Inam",
] as const;

const HOLDING_TYPE_POOL = [
  "Individual",
  "Joint",
  "Company",
  "Trust",
  "Co-operative",
  "HUF",
  "Society",
] as const;

const SOIL_TYPE_POOL = [
  "Red loam",
  "Black cotton",
  "Sandy loam",
  "Alluvial",
  "Laterite",
  "Clayey",
  "Gravelly",
] as const;

const ROAD_ACCESS_POOL = [
  "Tar road — 12 m",
  "Gravel lane — 6 m",
  "No direct access",
  "Paved internal road",
  "Highway frontage",
  "Cart track — 4 m",
  "Concrete lane — 8 m",
] as const;

const ENCUMBRANCE_POOL = [
  "None",
  "Mortgage lien",
  "Bank lien (sample)",
  "Court stay",
  "Easement right",
  "Lease encumbrance",
  "Society charge",
] as const;

const VARIANCE_BAND_POOL: ParcelRecord["varianceBand"][] = ["green", "amber", "red"];

const SHUFFLED_FIELD_POOLS: Partial<
  Record<keyof ParcelRecord, readonly (string | ParcelRecord["varianceBand"])[]>
> = {
  landUse: LAND_USE_POOL,
  classification: CLASSIFICATION_POOL,
  holdingType: HOLDING_TYPE_POOL,
  status: STATUS_POOL,
  encumbrance: ENCUMBRANCE_POOL,
  soilType: SOIL_TYPE_POOL,
  roadAccess: ROAD_ACCESS_POOL,
  varianceBand: VARIANCE_BAND_POOL,
};

type RevisionSequences = {
  owner: string[];
  surveyNo: string[];
  ulpin: string[];
  mutationRef: string[];
  deedNo: string[];
  pattaNo: string[];
  shuffled: Partial<Record<keyof ParcelRecord, readonly string[]>>;
};

function buildRevisionSequences(
  parcelId: string,
  revisionCount: number,
  excludeOwner?: string,
): RevisionSequences {
  const ownerPool = excludeOwner
    ? OWNER_POOL.filter((name) => name !== excludeOwner)
    : OWNER_POOL;
  const owners = shuffleArray(ownerPool, hashString(`${parcelId}-owners`)).slice(0, revisionCount);
  const surveyNos = shuffleArray(SURVEY_NO_POOL, hashString(`${parcelId}-survey`)).slice(
    0,
    revisionCount,
  );
  const ulpins = shuffleArray(ULPIN_POOL, hashString(`${parcelId}-ulpin`)).slice(0, revisionCount);
  const mutationRefs = Array.from({ length: revisionCount }, (_, index) => {
    const seed = hashString(`${parcelId}-mut-${index}`);
    return `MUT-${String(2400 + index * 17 + (seed % 90)).padStart(4, "0")}`;
  });
  const deedNos = Array.from({ length: revisionCount }, (_, index) => {
    const seed = hashString(`${parcelId}-deed-${index}`);
    return `DEED/PY/${String(24000 + index * 113 + (seed % 500))}`;
  });
  const pattaNos = Array.from({ length: revisionCount }, (_, index) => {
    const seed = hashString(`${parcelId}-patta-${index}`);
    return `PY-PAT-${String(1000 + index * 137 + (seed % 9000)).padStart(4, "0")}`;
  });

  const shuffled: RevisionSequences["shuffled"] = {};
  for (const [field, pool] of Object.entries(SHUFFLED_FIELD_POOLS) as Array<
    [keyof ParcelRecord, readonly (string | ParcelRecord["varianceBand"])[]]
  >) {
    shuffled[field] = shuffleArray(pool, hashString(`${parcelId}-shuffle-${String(field)}`)).map(
      String,
    );
  }

  return { owner: owners, surveyNo: surveyNos, ulpin: ulpins, mutationRef: mutationRefs, deedNo: deedNos, pattaNo: pattaNos, shuffled };
}

function maskOwnerName(owner: string): string {
  return owner.replace(/(\w)\w+/g, "$1***");
}

function pickShuffledValue(
  sequences: RevisionSequences,
  field: keyof ParcelRecord,
  step: number,
): string {
  const pool = sequences.shuffled[field];
  if (!pool?.length) return "";
  return pool[(step - 1) % pool.length];
}

function mutateParcelRecord(
  base: ParcelRecord,
  step: number,
  parcelId: string,
  sequences: RevisionSequences,
): ParcelRecord {
  const seed = hashString(`${parcelId}-rev-${step}`);
  const index = step - 1;

  const owner = sequences.owner[index] ?? base.owner;
  const surveyNo = sequences.surveyNo[index] ?? base.surveyNo;
  const ulpin = sequences.ulpin[index] ?? base.ulpin;
  const mutationRef = sequences.mutationRef[index] ?? base.mutationRef;
  const deedNo = sequences.deedNo[index] ?? base.deedNo;
  const pattaNo = sequences.pattaNo[index] ?? base.pattaNo;

  const status = pickShuffledValue(sequences, "status", step) || base.status;
  const landUse = pickShuffledValue(sequences, "landUse", step) || base.landUse;
  const classification = pickShuffledValue(sequences, "classification", step) || base.classification;
  const holdingType = pickShuffledValue(sequences, "holdingType", step) || base.holdingType;
  const soilType = pickShuffledValue(sequences, "soilType", step) || base.soilType;
  const roadAccess = pickShuffledValue(sequences, "roadAccess", step) || base.roadAccess;
  const encumbrance = pickShuffledValue(sequences, "encumbrance", step) || base.encumbrance;
  const varianceBand = (pickShuffledValue(sequences, "varianceBand", step) ||
    base.varianceBand) as ParcelRecord["varianceBand"];

  const areaDelta = ((seed % 11) - 5) * 8 + step * 3;
  const areaSqM = Math.max(120, base.areaSqM + areaDelta);

  const variancePct = Number(
    Math.max(0.15, Math.min(4.8, base.variancePct + ((seed % 9) - 4) * 0.18 + step * 0.07)).toFixed(
      2,
    ),
  );

  const plotFrontageM = Math.max(6, base.plotFrontageM + ((seed + step) % 5) - 2);
  const plotDepthM = Math.max(8, base.plotDepthM + ((seed + step * 2) % 7) - 3);

  return {
    ...base,
    owner,
    ownerMasked: maskOwnerName(owner),
    surveyNo,
    ulpin,
    status,
    landUse,
    classification,
    holdingType,
    soilType,
    roadAccess,
    areaSqM,
    mutationRef,
    registeredOn: `202${Math.max(1, 5 - step)}-${String(((seed + step) % 11) + 1).padStart(2, "0")}-${String(((seed + step * 3) % 27) + 1).padStart(2, "0")}`,
    lastSurvey: `202${Math.max(0, 4 - step)}-${String(((seed + step * 2) % 11) + 1).padStart(2, "0")}-${String(((seed + step * 5) % 27) + 1).padStart(2, "0")}`,
    taxDue: (seed + step) % 4 === 0 ? "₹0" : `₹${(((seed + step * 9) % 40) + 5) * 125}`,
    encumbrance,
    deedNo,
    pattaNo,
    plotFrontageM,
    plotDepthM,
    variancePct,
    varianceBand,
  };
}

function mutatePolygon(polygon: GeoJSON.Polygon, seed: number, scale: number): GeoJSON.Polygon {
  const ring = polygon.coordinates[0];
  if (!ring?.length) return polygon;

  const mutated = ring.map(([lon, lat], index) => {
    const angle = (seed + index) * 0.73;
    const jitterLon = Math.sin(angle) * scale * (1 + (index % 3) * 0.15);
    const jitterLat = Math.cos(angle * 1.4) * scale * (1 + (index % 5) * 0.1);
    return [lon + jitterLon, lat + jitterLat] as [number, number];
  });

  if (mutated.length > 0) {
    mutated[mutated.length - 1] = [...mutated[0]];
  }

  return { type: "Polygon", coordinates: [mutated] };
}

export function findParcelGeometry(
  dataset: { geojson: Record<string, GeoJSON.FeatureCollection> },
  parcelId: string,
): GeoJSON.Polygon | null {
  const features = dataset.geojson.parcels?.features ?? [];
  const match = features.find((feature) => String(feature.properties?.id) === parcelId);
  if (!match || match.geometry.type !== "Polygon") return null;
  return match.geometry as GeoJSON.Polygon;
}

const AUDIT_HISTORY_VERSION_COUNT = 8;

export function generateAuditHistory(parcel: ParcelRecord, geometry: GeoJSON.Polygon): AuditHistoryEntry[] {
  const count = AUDIT_HISTORY_VERSION_COUNT;
  const sequences = buildRevisionSequences(parcel.id, count, parcel.owner);
  const entries: AuditHistoryEntry[] = [];
  let workingParcel = { ...parcel };
  let workingGeometry = geometry;

  for (let step = 0; step < count; step += 1) {
    workingParcel = mutateParcelRecord(workingParcel, step + 1, parcel.id, sequences);
    workingGeometry = mutatePolygon(workingGeometry, hashString(parcel.id) + step, 0.00006 * (step + 1.2));
    const version = count - step;
    const fieldAudit: Partial<Record<keyof ParcelRecord, MutationAuditMeta>> = {};
    for (const field of TRACKED_AUDIT_FIELDS) {
      fieldAudit[field] = buildFieldAuditMeta(parcel.id, version, field);
    }

    entries.push({
      version,
      timestamp: `202${Math.max(1, 4 - Math.floor(step / 3))}-${String(10 + (step % 20)).padStart(2, "0")} 14:${String(20 + step * 7).padStart(2, "0")}`,
      label: step === 0 ? "Latest prior" : `Revision ${version}`,
      parcel: workingParcel,
      geometry: workingGeometry,
      fieldAudit,
      geometryAudit: buildGeometryAuditMeta(parcel.id, version, workingParcel.areaSqM),
    });
  }

  return entries;
}

// Exported for tests / documentation of per-field strategies
export const AUDIT_FIELD_STRATEGIES = FIELD_STRATEGIES;
