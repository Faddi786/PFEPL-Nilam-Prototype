/** Mock Khutal parcel context for Bhunaksha AutoCAD workflow demo. */

export const KHUTAL_PARCEL = {
  village: "Khutal",
  taluk: "Karaikal",
  district: "Puducherry",
  gisCode: "0612000101",
  plotNo: "142/3",
  surveyNo: "142/3",
  ownerName: "Rajesh Kumar Sharma",
  areaSqM: 1248.6,
  vertices: ["V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14"],
} as const;

export const DIVISION_METHODS = [
  "Free hand drawing",
  "Distance and angle method",
  "Arc method",
  "Straight line method for joining two sides",
  "Methods based on area fractions",
  "Point measurement method",
  "Division with help of grid and background image",
] as const;

export const MERGE_CANDIDATE_PLOTS = [
  "138/1",
  "138/2",
  "139/1",
  "140/4",
  "141/2",
  "142/1",
  "142/2",
  "142/3",
  "143/1",
  "144/2",
  "145/1",
  "146/3",
] as const;

export const FMB_LAYER_OPTIONS = ["POLY_PARCEL", "ROAD", "WELL", "TEMPLE", "RIVER"] as const;

export const LADDER_TABLE_SEED = [
  { from: "10", to: "13", offsetDistance: "4.50", chainage: "0.00" },
  { from: "13", to: "10", offsetDistance: "6.20", chainage: "12.40" },
  { from: "10", to: "7", offsetDistance: "3.80", chainage: "24.10" },
] as const;

export const POLYGON_TABLE_SEED = [
  { polygon: "Boundary-1", area: "1248.60", label: "142/3" },
  { polygon: "Subdivision-1", area: "624.30", label: "142/3A" },
  { polygon: "Subdivision-2", area: "624.30", label: "142/3B" },
] as const;
