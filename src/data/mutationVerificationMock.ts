export type VerificationOutcome = "pass" | "warning" | "review";

export type RequiredDocument = {
  id: string;
  label: string;
  description: string;
};

export type VerificationCheck = {
  id: string;
  label: string;
  detail: string;
  outcome: VerificationOutcome;
  delayMs: number;
};

export type MutationParcelContext = {
  surveyNo: string;
  village: string;
  ulpin: string;
  ownerName: string;
};

export type ExtractionFieldOutcome = "pass" | "warning";

export type ExtractionField = {
  key: string;
  value: string;
  outcome?: ExtractionFieldOutcome;
};

export type DocumentExtractionPlan = {
  id: string;
  label: string;
  searchTerms: string;
  fields: ExtractionField[];
};

export type CrossVerificationItem = {
  id: string;
  label: string;
  detail: string;
  outcome: VerificationOutcome;
  delayMs: number;
};

export const EXTRACTION_FIELD_PAUSE_MS = 40;
export const EXTRACTION_CHAR_MS = 0;
export const DOC_SEARCH_MS = 120;
export const DOC_TRANSITION_MS = 150;
export const CROSS_VERIFY_ITEM_MS = 1050;

export const REQUIRED_MUTATION_DOCUMENTS: RequiredDocument[] = [
  {
    id: "sale-deed",
    label: "Registered Sale Deed",
    description: "Stamped sale deed with sub-registrar reference (Form 17 / 18)",
  },
  {
    id: "aadhaar",
    label: "Aadhaar (Transferee)",
    description: "UIDAI e-KYC copy — front and back",
  },
  {
    id: "ror",
    label: "Record of Rights (RoR)",
    description: "Current khata / RoR extract from revenue portal",
  },
  {
    id: "photos",
    label: "Applicant photographs",
    description: "Passport-size photo + live capture for liveness",
  },
  {
    id: "encumbrance",
    label: "Encumbrance Certificate",
    description: "EC for last 13 years from sub-registrar office",
  },
];

export function buildDocumentExtractions(context: MutationParcelContext): DocumentExtractionPlan[] {
  const maskedUid = "XXXX-XXXX-4829";

  return [
    {
      id: "sale-deed",
      label: "Registered Sale Deed",
      searchTerms: "vendor name, purchaser name, survey number, deed no, registration date…",
      fields: [
        { key: "Survey No", value: context.surveyNo },
        { key: "Purchaser", value: context.ownerName },
        { key: "Vendor", value: "Lakshmi Devi (seller)" },
        { key: "Deed No", value: "REG/KR/2019/4421" },
        { key: "Registered", value: "14 Mar 2019" },
      ],
    },
    {
      id: "aadhaar",
      label: "Aadhaar (Transferee)",
      searchTerms: "UID, name, DOB, address match…",
      fields: [
        { key: "Name", value: context.ownerName },
        { key: "UID", value: `${maskedUid} (masked)` },
        { key: "DOB match", value: "✓" },
        { key: "Address", value: `${context.village}, Karaikal — district match ✓` },
      ],
    },
    {
      id: "ror",
      label: "Record of Rights (RoR)",
      searchTerms: "khata no, owner name, survey, extent, classification…",
      fields: [
        { key: "Khata No", value: "KR-1184/2024" },
        { key: "Owner", value: context.ownerName },
        { key: "Survey", value: context.surveyNo },
        { key: "Extent", value: "0.42 ha · Punjai" },
        { key: "Village", value: context.village },
      ],
    },
    {
      id: "photos",
      label: "Applicant photographs",
      searchTerms: "liveness score, face detection, passport photo match…",
      fields: [
        { key: "Liveness", value: "92% — live capture confirmed" },
        { key: "Face detection", value: "Partial match", outcome: "warning" },
        { key: "Passport photo", value: "Resolution 480×640 — acceptable" },
        { key: "Quality note", value: "Face partially obscured — manual review flagged", outcome: "warning" },
      ],
    },
    {
      id: "encumbrance",
      label: "Encumbrance Certificate",
      searchTerms: "EC period, mortgage entries, deed chain, sub-registrar seal…",
      fields: [
        { key: "Period", value: "13 years (2013–2026)" },
        { key: "Encumbrance", value: "Nil — no active mortgage" },
        { key: "Deed ref", value: "REG/KR/2019/4421 — chain intact" },
        { key: "SR Office", value: "Karaikal Sub-Registrar" },
      ],
    },
  ];
}

export function buildCrossVerificationItems(context: MutationParcelContext): CrossVerificationItem[] {
  return [
    {
      id: "owner-match",
      label: `Owner name (Deed) ↔ Aadhaar ↔ RoR`,
      detail: `"${context.ownerName}" — consistent across all three documents`,
      outcome: "pass",
      delayMs: CROSS_VERIFY_ITEM_MS,
    },
    {
      id: "survey-parcel",
      label: `Survey ${context.surveyNo} ↔ Parcel ULPIN ${context.ulpin}`,
      detail: `Cadastral linkage confirmed via NIC registry mirror · ${context.village}`,
      outcome: "pass",
      delayMs: CROSS_VERIFY_ITEM_MS,
    },
    {
      id: "photo-liveness",
      label: "Photo liveness ↔ Aadhaar portrait",
      detail: "Face partially obscured — manual review flagged",
      outcome: "warning",
      delayMs: 900,
    },
    {
      id: "ec-deed",
      label: "Encumbrance ↔ Sale deed chain",
      detail: "No active encumbrance; deed chain unbroken for 13-year window",
      outcome: "pass",
      delayMs: 850,
    },
    {
      id: "parcel-lock",
      label: "Parcel scope lock",
      detail: `Mutation scoped to ULPIN ${context.ulpin} only — adjacent parcels excluded`,
      outcome: "pass",
      delayMs: 750,
    },
  ];
}

export function buildVerificationChecks(context: MutationParcelContext): VerificationCheck[] {
  return [
    {
      id: "authenticity",
      label: "Document authenticity checks",
      detail: "Sale deed stamp paper, notary seal, and sub-registrar QR verified against NIC registry mirror.",
      outcome: "pass",
      delayMs: 900,
    },
    {
      id: "photo-quality",
      label: "Image quality analysis",
      detail: "Photo quality: face not clearly identifiable — flagged for manual review.",
      outcome: "warning",
      delayMs: 750,
    },
    {
      id: "aadhaar-verify",
      label: "Aadhaar verification",
      detail: `Name match: ${context.ownerName} ✓ · DOB match ✓ · Authenticity score 94/100`,
      outcome: "pass",
      delayMs: 850,
    },
    {
      id: "cross-verify",
      label: "Cross-verification (Deed ↔ Aadhaar ↔ RoR)",
      detail: `Deed owner "${context.ownerName}" matches Aadhaar and RoR khata for Survey ${context.surveyNo}, ${context.village}.`,
      outcome: "pass",
      delayMs: 950,
    },
    {
      id: "parcel-lock",
      label: "Parcel scope lock",
      detail: `Mutation scoped to ULPIN ${context.ulpin} only — adjacent parcels excluded from edit session.`,
      outcome: "pass",
      delayMs: 700,
    },
  ];
}

export function deriveOverallOutcome(checks: VerificationCheck[]): VerificationOutcome {
  if (checks.some((c) => c.outcome === "review")) return "review";
  if (checks.some((c) => c.outcome === "warning")) return "warning";
  return "pass";
}

export const OUTCOME_LABELS: Record<VerificationOutcome, { label: string; emoji: string; tone: string }> = {
  pass: {
    label: "Pass",
    emoji: "🟢",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  warning: {
    label: "Warning",
    emoji: "🟠",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
  },
  review: {
    label: "Needs Review",
    emoji: "🔴",
    tone: "border-rose-200 bg-rose-50 text-rose-800",
  },
};
