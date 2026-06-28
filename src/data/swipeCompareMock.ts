export type SwipeLayerId =
  | "drone-ortho"
  | "georef-fmb"
  | "before-mutation"
  | "after-mutation"
  | "survey-2020"
  | "dgps-2025"
  | "satellite"
  | "digitized-parcel"
  | "original-scan";

export type SwipeLayerOption = {
  id: SwipeLayerId;
  label: string;
  description: string;
  /** Visual style key for mock rendering */
  style: "imagery" | "fmb" | "mutation-before" | "mutation-after" | "survey" | "dgps" | "satellite" | "vector" | "scan";
};

export const SWIPE_LAYER_OPTIONS: SwipeLayerOption[] = [
  { id: "drone-ortho", label: "Drone Orthomosaic", description: "Feb 2025 RGB ortho — 3cm GSD", style: "imagery" },
  { id: "georef-fmb", label: "Georeferenced FMB", description: "Rubber-sheet warped cadastral sheet", style: "fmb" },
  { id: "before-mutation", label: "Before Mutation", description: "Pre-mutation parcel boundaries", style: "mutation-before" },
  { id: "after-mutation", label: "After Mutation", description: "Post-mutation approved geometry", style: "mutation-after" },
  { id: "survey-2020", label: "2020 Survey", description: "Legacy resurvey vectors", style: "survey" },
  { id: "dgps-2025", label: "2025 DGPS", description: "Field DGPS vertex capture", style: "dgps" },
  { id: "satellite", label: "Satellite", description: "Sentinel-2 composite", style: "satellite" },
  { id: "digitized-parcel", label: "Digitized Parcel", description: "ULPIN-linked parcel fabric", style: "vector" },
  { id: "original-scan", label: "Original Scan", description: "Ungeoreferenced FMB raster", style: "scan" },
];

export type SwipePreset = {
  id: string;
  label: string;
  description: string;
  layerA: SwipeLayerId;
  layerB: SwipeLayerId;
};

export const SWIPE_PRESETS: SwipePreset[] = [
  {
    id: "georef-qc",
    label: "Georeferencing QC",
    description: "Compare warped FMB against drone orthomosaic for Khutal sheet 142.",
    layerA: "georef-fmb",
    layerB: "drone-ortho",
  },
  {
    id: "mutation-review",
    label: "Mutation Review",
    description: "Before vs after mutation boundaries for director approval.",
    layerA: "before-mutation",
    layerB: "after-mutation",
  },
  {
    id: "dgps-survey",
    label: "DGPS vs Legacy Survey",
    description: "2025 DGPS capture overlaid on 2020 resurvey.",
    layerA: "survey-2020",
    layerB: "dgps-2025",
  },
];

export const SWIPE_CONTEXT = {
  village: "Khutal (Karaikal)",
  center: [79.8372, 10.9254] as [number, number],
  zoom: 16,
} as const;
