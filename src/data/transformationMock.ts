export type TransformMethod = "overview" | "affine" | "polynomial" | "tps" | "projective";

export type PolynomialOrder = 1 | 2 | 3;

export type GcpPoint = {
  id: string;
  label: string;
  /** Source position on misaligned FMB scan */
  source: [number, number];
  /** Target position on reference orthomosaic */
  target: [number, number];
};

export type AffineParams = {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
};

export type ProjectiveParams = {
  h: number[][];
};

export const TRANSFORM_CONTEXT = {
  village: "Khutal (Thirunallar)",
  sheet: "FMB Sheet 142/3A",
  orthomosaic: "Drone Orthomosaic — Feb 2025 DGPS",
} as const;

export const METHOD_TABS: { id: TransformMethod; label: string; short: string }[] = [
  { id: "overview", label: "Overview", short: "Overview" },
  { id: "affine", label: "Affine", short: "Affine" },
  { id: "polynomial", label: "Polynomial", short: "Polynomial" },
  { id: "tps", label: "Thin Plate Spline", short: "TPS" },
  { id: "projective", label: "Projective", short: "Projective" },
];

export const OVERVIEW_METHODS = [
  {
    id: "affine" as const,
    title: "Affine",
    when: "Global translation, rotation, scale, and skew",
    useCase: "Sheet shifted uniformly on scanner bed; no local fold or perspective.",
    icon: "↔",
  },
  {
    id: "polynomial" as const,
    title: "Polynomial",
    when: "Moderate non-linear distortion across the sheet",
    useCase: "Paper stretch, humidity warp, moderate scan barrel distortion.",
    icon: "∿",
  },
  {
    id: "tps" as const,
    title: "Thin Plate Spline",
    when: "Local rubber-sheet deformation",
    useCase: "Folded corners, creases, uneven scan pressure — GeoNilam FMB alignment.",
    icon: "◎",
  },
  {
    id: "projective" as const,
    title: "Projective (Homography)",
    when: "Perspective / camera angle on scanned maps",
    useCase: "Photo of FMB on table, angled scanner, keystone distortion.",
    icon: "◇",
  },
];

export const INITIAL_GCPS: GcpPoint[] = [
  { id: "gcp-1", label: "Temple corner", source: [28, 38], target: [32, 36] },
  { id: "gcp-2", label: "Road junction", source: [62, 28], target: [66, 30] },
  { id: "gcp-3", label: "Canal bund", source: [48, 72], target: [52, 68] },
  { id: "gcp-4", label: "Survey stone", source: [22, 62], target: [26, 60] },
];

/** Default affine handle positions (translate, rotate, scale, skew corners) */
export const AFFINE_HANDLES = {
  translate: [50, 50] as [number, number],
  rotate: [72, 38] as [number, number],
  scale: [78, 62] as [number, number],
  skew: [38, 68] as [number, number],
};

/** Four corners for projective demo — source quad on FMB */
export const PROJECTIVE_CORNERS: [number, number][] = [
  [20, 24],
  [74, 20],
  [78, 70],
  [16, 68],
];

export const FMB_MESH: [number, number][] = [
  [18, 22],
  [42, 18],
  [68, 24],
  [78, 42],
  [72, 58],
  [55, 68],
  [32, 72],
  [14, 55],
];

export const FMB_PARCELS: [number, number][][] = [
  [
    [24, 30],
    [38, 28],
    [40, 42],
    [26, 44],
  ],
  [
    [46, 32],
    [60, 30],
    [62, 48],
    [48, 50],
  ],
  [
    [34, 52],
    [52, 50],
    [54, 64],
    [36, 66],
  ],
];

export const DEFAULT_AFFINE: AffineParams = {
  a: 1.02,
  b: -0.03,
  c: 0.02,
  d: 1.01,
  tx: 3.5,
  ty: -1.2,
};
