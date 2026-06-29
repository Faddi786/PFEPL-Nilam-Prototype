export type ConfidenceLevel = "high" | "medium" | "low";

export type FmbPoint = {
  id: string;
  x: number;
  y: number;
  confidence: number;
  label: string;
  /** Larger green anchor handle (A, B, F) */
  isAnchor?: boolean;
};

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

export type FmbCanvasLabel = {
  id: string;
  text: string;
  x: number;
  y: number;
  confidence: number;
  kind: "parcel" | "measurement" | "anchor" | "adjacent";
  /** When set, editing this label updates the linked edge length */
  linkedEdgeId?: string;
};

export type FmbExtractionState = {
  vertices: FmbPoint[];
  edges: FmbEdge[];
  textFields: FmbTextField[];
  parcelNumber: { value: string; confidence: number };
  canvasLabels: FmbCanvasLabel[];
};

/** SVG viewBox matches fmb-extract-full.png (606×382) */
export const FMB_CANVAS_VIEWBOX = { width: 606, height: 382 } as const;

export const FMB_BACKGROUND_URL = "/assets/fmb/fmb-extract-full.png";

/** Canvas overlay palette — matches FMB extraction reference diagram */
export const FMB_ORANGE = "#f97316";
export const FMB_GREEN = "#22c55e";
export const FMB_BLUE = "#2563eb";
export const FMB_HIGHLIGHTED_EDGE_ID = "eAF";

/** Attribute panel fields shown in the extraction review demo */
export const FMB_PANEL_FIELD_IDS = ["owner", "area", "surveySubDiv"] as const;

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
      { id: "vA", x: 98, y: 52, confidence: 96, label: "A", isAnchor: true },
      { id: "vB", x: 518, y: 128, confidence: 94, label: "B", isAnchor: true },
      { id: "vBR", x: 528, y: 178, confidence: 91, label: "" },
      { id: "vBD", x: 492, y: 238, confidence: 88, label: "" },
      { id: "vD", x: 328, y: 342, confidence: 93, label: "D" },
      { id: "vE", x: 102, y: 322, confidence: 95, label: "E" },
      { id: "vF", x: 100, y: 178, confidence: 92, label: "F", isAnchor: true },
      { id: "vI1", x: 118, y: 198, confidence: 84, label: "" },
      { id: "vI2", x: 358, y: 102, confidence: 79, label: "" },
      { id: "vI3", x: 452, y: 182, confidence: 82, label: "" },
      { id: "vI4", x: 192, y: 278, confidence: 86, label: "" },
      { id: "vI5", x: 162, y: 238, confidence: 80, label: "" },
      { id: "vI6", x: 392, y: 202, confidence: 77, label: "" },
    ],
    edges: [
      {
        id: "eAB",
        from: "vA",
        to: "vB",
        lengthM: 138.2,
        lengthConfidence: 91,
        bearing: "N 82° E",
        bearingConfidence: 78,
      },
      {
        id: "eAF",
        from: "vA",
        to: "vF",
        lengthM: 24.2,
        lengthConfidence: 89,
        bearing: "S 12° W",
        bearingConfidence: 85,
      },
      {
        id: "eFE",
        from: "vF",
        to: "vE",
        lengthM: 34.2,
        lengthConfidence: 87,
        bearing: "S 8° E",
        bearingConfidence: 82,
      },
      {
        id: "eED",
        from: "vE",
        to: "vD",
        lengthM: 60.4,
        lengthConfidence: 90,
        bearing: "N 78° E",
        bearingConfidence: 80,
      },
      {
        id: "eBR",
        from: "vB",
        to: "vBR",
        lengthM: 73.0,
        lengthConfidence: 88,
        bearing: "S 6° E",
        bearingConfidence: 76,
      },
      {
        id: "eBRBD",
        from: "vBR",
        to: "vBD",
        lengthM: 54.2,
        lengthConfidence: 72,
        bearing: "S 22° W",
        bearingConfidence: 68,
      },
      {
        id: "eBDD",
        from: "vBD",
        to: "vD",
        lengthM: 69.4,
        lengthConfidence: 74,
        bearing: "S 38° W",
        bearingConfidence: 70,
      },
      {
        id: "eI1I2",
        from: "vI1",
        to: "vI2",
        lengthM: 71.0,
        lengthConfidence: 76,
        bearing: "N 72° E",
        bearingConfidence: 71,
      },
      {
        id: "eI2B",
        from: "vI2",
        to: "vB",
        lengthM: 13.6,
        lengthConfidence: 69,
        bearing: "N 15° E",
        bearingConfidence: 65,
      },
      {
        id: "eI1F",
        from: "vI1",
        to: "vF",
        lengthM: 27.0,
        lengthConfidence: 83,
        bearing: "S 18° W",
        bearingConfidence: 79,
      },
      {
        id: "eI1I5",
        from: "vI1",
        to: "vI5",
        lengthM: 54.2,
        lengthConfidence: 78,
        bearing: "S 5° E",
        bearingConfidence: 74,
      },
      {
        id: "eI5E",
        from: "vI5",
        to: "vE",
        lengthM: 34.4,
        lengthConfidence: 81,
        bearing: "S 12° W",
        bearingConfidence: 77,
      },
      {
        id: "eI1I4",
        from: "vI1",
        to: "vI4",
        lengthM: 41.2,
        lengthConfidence: 75,
        bearing: "S 42° E",
        bearingConfidence: 72,
      },
      {
        id: "eI4D",
        from: "vI4",
        to: "vD",
        lengthM: 18.4,
        lengthConfidence: 79,
        bearing: "S 28° E",
        bearingConfidence: 73,
      },
      {
        id: "eI4I3",
        from: "vI4",
        to: "vI3",
        lengthM: 51.2,
        lengthConfidence: 71,
        bearing: "N 35° E",
        bearingConfidence: 67,
      },
      {
        id: "eI3BR",
        from: "vI3",
        to: "vBR",
        lengthM: 27.0,
        lengthConfidence: 77,
        bearing: "N 22° W",
        bearingConfidence: 73,
      },
      {
        id: "eI4I6",
        from: "vI4",
        to: "vI6",
        lengthM: 48.0,
        lengthConfidence: 73,
        bearing: "S 18° E",
        bearingConfidence: 69,
      },
      {
        id: "eI6D",
        from: "vI6",
        to: "vD",
        lengthM: 18.4,
        lengthConfidence: 68,
        bearing: "S 45° W",
        bearingConfidence: 64,
      },
    ],
    canvasLabels: [
      { id: "lbl138", text: "138.2", x: 306, y: 82, confidence: 91, kind: "measurement", linkedEdgeId: "eAB" },
      { id: "lbl24", text: "24.2", x: 82, y: 112, confidence: 89, kind: "measurement", linkedEdgeId: "eAF" },
      { id: "lbl342", text: "34.2", x: 82, y: 252, confidence: 87, kind: "measurement", linkedEdgeId: "eFE" },
      { id: "lbl604", text: "60.4", x: 210, y: 338, confidence: 90, kind: "measurement", linkedEdgeId: "eED" },
      { id: "lbl694", text: "69.4", x: 418, y: 298, confidence: 74, kind: "measurement", linkedEdgeId: "eBDD" },
      { id: "lbl73", text: "73.0", x: 538, y: 148, confidence: 88, kind: "measurement", linkedEdgeId: "eBR" },
      { id: "lbl71", text: "71.0", x: 238, y: 142, confidence: 76, kind: "measurement", linkedEdgeId: "eI1I2" },
      { id: "lbl542", text: "54.2", x: 512, y: 202, confidence: 72, kind: "measurement", linkedEdgeId: "eBRBD" },
      { id: "lbl412", text: "41.2", x: 148, y: 242, confidence: 75, kind: "measurement", linkedEdgeId: "eI1I4" },
      { id: "lbl184", text: "18.4", x: 368, y: 278, confidence: 68, kind: "measurement", linkedEdgeId: "eI6D" },
      { id: "lbl1A1", text: "1A1", x: 148, y: 258, confidence: 92, kind: "parcel" },
      { id: "lbl1A2", text: "1A2", x: 268, y: 118, confidence: 90, kind: "parcel" },
      { id: "lbl1B", text: "1B", x: 428, y: 118, confidence: 88, kind: "parcel" },
      { id: "lbl2A1A", text: "2A1A", x: 398, y: 168, confidence: 85, kind: "parcel" },
      { id: "lbl2A1B", text: "2A1B", x: 478, y: 198, confidence: 82, kind: "parcel" },
      { id: "lbl2B1B", text: "2B1B", x: 448, y: 248, confidence: 80, kind: "parcel" },
      { id: "lbl2B1C", text: "2B1C", x: 248, y: 298, confidence: 78, kind: "parcel" },
      { id: "lbl2B2", text: "2B2", x: 268, y: 228, confidence: 76, kind: "parcel" },
      { id: "lbl109", text: "109", x: 72, y: 88, confidence: 72, kind: "adjacent" },
      { id: "lbl108", text: "108", x: 72, y: 248, confidence: 72, kind: "adjacent" },
      { id: "lbl107", text: "107", x: 72, y: 348, confidence: 72, kind: "adjacent" },
      { id: "lbl113", text: "113", x: 328, y: 368, confidence: 72, kind: "adjacent" },
      { id: "lbl112", text: "112", x: 468, y: 348, confidence: 72, kind: "adjacent" },
      { id: "lbl111", text: "111", x: 558, y: 248, confidence: 72, kind: "adjacent" },
    ],
    textFields: [
      { id: "owner", label: "Owner name", value: "Rajesh Kumar Sharma", confidence: 94 },
      { id: "area", label: "Area (sq.m)", value: "1247.35", confidence: 91 },
      {
        id: "surveySubDiv",
        label: "Survey subdivision",
        value: "asd",
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
  const labelElements = state.canvasLabels.length;
  const textElements = state.textFields.length + 1;
  const total = geometryElements + labelElements + textElements;
  const needsReview = [
    ...state.vertices.filter((v) => getConfidenceLevel(v.confidence) !== "high"),
    ...state.edges.filter(
      (e) =>
        getConfidenceLevel(e.lengthConfidence) !== "high" ||
        getConfidenceLevel(e.bearingConfidence) !== "high",
    ),
    ...state.canvasLabels.filter((l) => getConfidenceLevel(l.confidence) !== "high"),
    ...state.textFields.filter((f) => getConfidenceLevel(f.confidence) !== "high"),
  ].length;
  const errors = state.textFields.filter((f) => f.intentionalError).length;
  return { total, needsReview, errors };
}
