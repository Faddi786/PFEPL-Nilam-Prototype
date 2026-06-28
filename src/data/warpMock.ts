export type TransformMode = "translation" | "rotation" | "scale" | "warp";

export type GcpAnchor = {
  id: string;
  label: string;
  icon: "temple" | "road" | "canal";
  /** FMB scan position (misaligned) in SVG coords 0–100 */
  fmb: [number, number];
  /** Drone/DGPS target position */
  drone: [number, number];
};

export const WARP_CONTEXT = {
  village: "Khutal (Thirunallar)",
  taluk: "Karaikal",
  sheet: "FMB Sheet 142/3A",
  orthomosaic: "Drone Orthomosaic — Feb 2025 DGPS",
} as const;

export const WARP_WORKFLOW_STEPS = [
  "Load FMB scan",
  "Place GCPs",
  "Run warp",
  "Verify alignment",
] as const;

export const TRANSFORM_MODES: { id: TransformMode; label: string; description: string }[] = [
  {
    id: "translation",
    label: "Translation",
    description: "Shift entire sheet uniformly — cannot fix local twist.",
  },
  {
    id: "rotation",
    label: "Rotation",
    description: "Rotate about centroid — residual skew remains at edges.",
  },
  {
    id: "scale",
    label: "Scaling",
    description: "Uniform stretch — scale mismatch only, no local bend.",
  },
  {
    id: "warp",
    label: "Rubber-sheet warp",
    description: "Thin-plate style deformation — locally fits FMB to drone anchors.",
  },
];

export const GDAL_PANEL_DEFAULTS = {
  stretch: 1.12,
  compress: "LZW",
  rotateDeg: -2.4,
  offsetX: 4.2,
  offsetY: -1.8,
} as const;

export const INITIAL_GCPS: GcpAnchor[] = [
  {
    id: "gcp-temple",
    label: "Sri Varadaraja Temple corner",
    icon: "temple",
    fmb: [28, 38],
    drone: [32, 36],
  },
  {
    id: "gcp-road",
    label: "NH-32 / Karaikal road junction",
    icon: "road",
    fmb: [62, 28],
    drone: [66, 30],
  },
  {
    id: "gcp-canal",
    label: "Arasalar canal bund",
    icon: "canal",
    fmb: [48, 72],
    drone: [52, 68],
  },
  {
    id: "gcp-field",
    label: "Survey stone — Plot 142/2B",
    icon: "road",
    fmb: [22, 62],
    drone: [26, 60],
  },
];

/** Base FMB parcel mesh before warp (normalized 0–100 viewBox). */
export const FMB_MESH_VERTICES: [number, number][] = [
  [18, 22],
  [42, 18],
  [68, 24],
  [78, 42],
  [72, 58],
  [55, 68],
  [32, 72],
  [14, 55],
];

export const FMB_INNER_PARCELS: [number, number][][] = [
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

export function computeRmsError(gcps: GcpAnchor[], mode: TransformMode): number {
  if (gcps.length === 0) return 0;
  const residuals = gcps.map((gcp) => {
    const dx = gcp.drone[0] - gcp.fmb[0];
    const dy = gcp.drone[1] - gcp.fmb[1];
    const dist = Math.hypot(dx, dy);
    if (mode === "warp") return dist * 0.08;
    if (mode === "translation") return dist * 0.55;
    if (mode === "rotation") return dist * 0.35;
    return dist * 0.42;
  });
  const avg = residuals.reduce((a, b) => a + b, 0) / residuals.length;
  return Math.max(0.05, avg * 0.22);
}
