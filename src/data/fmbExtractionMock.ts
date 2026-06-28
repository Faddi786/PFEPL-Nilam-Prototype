export type ConfidenceLevel = "high" | "medium" | "low";

export type FmbPoint = { id: string; x: number; y: number; confidence: number; label: string };

export type FmbEdge = {
  id: string;
  from: string;
  to: string;
  lengthM: number;
  lengthConfidence: number;
  bearing: string;
  bearingConfidence: number;
};

export type FmbTextField = {
  id: string;
  label: string;
  value: string;
  correctedValue?: string;
  confidence: number;
  /** Deliberately wrong OCR value for demo correction */
  intentionalError?: boolean;
  correctHint?: string;
};

export type FmbExtractionState = {
  vertices: FmbPoint[];
  edges: FmbEdge[];
  textFields: FmbTextField[];
  parcelNumber: { value: string; confidence: number };
};

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 85) return "high";
  if (score >= 65) return "medium";
  return "low";
}

export function confidenceLabel(score: number): string {
  const level = getConfidenceLevel(score);
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Low";
}

export function confidenceColorClass(score: number): string {
  const level = getConfidenceLevel(score);
  if (level === "high") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (level === "medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function confidenceStrokeColor(score: number): string {
  const level = getConfidenceLevel(score);
  if (level === "high") return "#10b981";
  if (level === "medium") return "#f59e0b";
  return "#ef4444";
}

export const FMB_WORKFLOW_STEPS = ["Upload", "Extract", "Review", "Approve"] as const;

export function createInitialFmbExtraction(): FmbExtractionState {
  return {
    vertices: [
      { id: "v1", x: 120, y: 280, confidence: 96, label: "P1" },
      { id: "v2", x: 320, y: 260, confidence: 94, label: "P2" },
      { id: "v3", x: 380, y: 140, confidence: 91, label: "P3" },
      { id: "v4", x: 240, y: 80, confidence: 88, label: "P4" },
      { id: "v5", x: 100, y: 160, confidence: 93, label: "P5" },
    ],
    edges: [
      {
        id: "e1",
        from: "v1",
        to: "v2",
        lengthM: 42.6,
        lengthConfidence: 89,
        bearing: "N 72° 14′ E",
        bearingConfidence: 78,
      },
      {
        id: "e2",
        from: "v2",
        to: "v3",
        lengthM: 28.4,
        lengthConfidence: 82,
        bearing: "N 18° 06′ E",
        bearingConfidence: 74,
      },
      {
        id: "e3",
        from: "v3",
        to: "v4",
        lengthM: 35.1,
        lengthConfidence: 91,
        bearing: "N 58° 42′ W",
        bearingConfidence: 81,
      },
      {
        id: "e4",
        from: "v4",
        to: "v5",
        lengthM: 31.8,
        lengthConfidence: 75,
        bearing: "S 82° 30′ W",
        bearingConfidence: 70,
      },
      {
        id: "e5",
        from: "v5",
        to: "v1",
        lengthM: 38.2,
        lengthConfidence: 86,
        bearing: "S 24° 08′ E",
        bearingConfidence: 85,
      },
    ],
    textFields: [
      { id: "owner", label: "Owner name", value: "Rajesh Kumar Sharma", confidence: 94 },
      { id: "area", label: "Area (sq.m)", value: "1247.35", confidence: 91 },
      {
        id: "surveySubDiv",
        label: "Survey subdivision",
        value: "142/3A",
        confidence: 58,
        intentionalError: true,
        correctHint: "142/2B",
      },
      { id: "village", label: "Village", value: "Thirunallar", confidence: 88 },
      { id: "taluk", label: "Taluk", value: "Karaikal", confidence: 92 },
      { id: "landUse", label: "Land use", value: "Dry (Punjai)", confidence: 76 },
    ],
    parcelNumber: { value: "KAR-2024-00847", confidence: 96 },
  };
}

export function countExtractionSummary(state: FmbExtractionState) {
  const geometryElements = state.vertices.length + state.edges.length * 2;
  const textElements = state.textFields.length + 1;
  const total = geometryElements + textElements;
  const needsReview = [
    ...state.vertices.filter((v) => getConfidenceLevel(v.confidence) !== "high"),
    ...state.edges.filter(
      (e) =>
        getConfidenceLevel(e.lengthConfidence) !== "high" ||
        getConfidenceLevel(e.bearingConfidence) !== "high",
    ),
    ...state.textFields.filter((f) => getConfidenceLevel(f.confidence) !== "high"),
  ].length;
  const errors = state.textFields.filter((f) => f.intentionalError).length;
  return { total, needsReview, errors };
}
