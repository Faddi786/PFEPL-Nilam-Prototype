import { SPATIAL_TOOL_CATALOG, type MoreToolsTabId } from "./spatialToolCatalog";
import type { TransformMethod } from "./transformationMock";

export type ToolsPageActiveTool =
  | { kind: "spatial"; id: MoreToolsTabId }
  | { kind: "measurement"; id: "distance" | "draw-polygon" }
  | { kind: "mutation"; id: "split" | "merge" | "vertex-edit" }
  | { kind: "transform"; id: Exclude<TransformMethod, "overview"> };

/** Demo-focused cadastral GIS use cases — 3 bullets per tool for client walkthroughs. */
const SPATIAL_DEMO_USE_CASES: Record<MoreToolsTabId, [string, string, string]> = {
  buffer: [
    "Flag parcels within setback of NH widening corridor",
    "Screen holdings inside canal bund protection zone",
    "Acquisition impact zone around new survey road",
  ],
  "contains-within": [
    "List parcels fully inside village revenue boundary",
    "Validate ULPIN jurisdiction within municipal ward",
    "Find cadastral units wholly within forest fringe limit",
  ],
  touches: [
    "Identify adjacent survey numbers for boundary dispute",
    "Verify sub-division shares common boundary only",
    "Map neighbor holdings for amalgamation eligibility",
  ],
  disjoint: [
    "Find parcels clear of flood hazard overlay",
    "Screen holdings with no forest reserve overlap",
    "Isolate plots outside acquisition reference layer",
  ],
  crosses: [
    "Detect road corridor cutting through parcel geometry",
    "Flag canal line crossing private patta boundary",
    "Utility ROW impact on cadastral polygons",
  ],
  "distance-query": [
    "Notify owners within X m of proposed road widening",
    "Find parcels near DGPS control for field verification",
    "Identify encroachment risk around dispute point",
  ],
  "nearest-neighbor": [
    "Anchor field survey to closest survey number",
    "Match mutation applicant plot to nearest holding",
    "Locate nearest parcel to DGPS stake in dense layout",
  ],
  "point-in-polygon": [
    "Identify survey number at citizen GPS complaint",
    "Field check — which patta contains this coordinate?",
    "Resolve grievance location to owner record",
  ],
  "bounding-box": [
    "Export all parcels in current map viewport",
    "Bulk QC on visible village sheet extent",
    "Quick selection for taluk-level reporting batch",
  ],
  intersect: [
    "Parcels overlapping forest reserve boundary",
    "Flood zone straddle on private holdings",
    "Municipal ward overlap on cadastral units",
  ],
  union: [
    "Merge fragmented sub-divisions of same owner",
    "Consolidate adjacent patta for mutation filing",
    "Combine encroachment outline with original parcel",
  ],
  difference: [
    "Net area after subtracting encroachment polygon",
    "Remove road acquisition strip from parcel area",
    "Valid geometry after overlap removal",
  ],
  clip: [
    "Trim parcels to village administrative boundary",
    "Prepare sheet data within taluk extent only",
    "Clip spillover geometry for revenue reporting",
  ],
  dissolve: [
    "Total holding area per owner across fragments",
    "Aggregate government poramboke parcels",
    "Consolidated extent for mutation documentation",
  ],
  "convex-hull": [
    "Minimum envelope around scattered owner holdings",
    "Simplified boundary for acquisition planning map",
    "Extent box for executive summary overlay",
  ],
  centroid: [
    "ULPIN label placement on irregular parcels",
    "Map annotation for survey number placement",
    "Center point for village statistics weighting",
  ],
  "symmetrical-diff": [
    "Areas changed between FMB and DGPS surveys",
    "Exclusive portions of two boundary versions",
    "Highlight non-shared govt vs private geometry",
  ],
  "spatial-join": [
    "Attach village and ward to each parcel record",
    "Enrich holdings with taluk for MIS export",
    "Copy administrative attributes from boundary layer",
  ],
  "select-by-location": [
    "Private parcels inside flood hazard zone",
    "Pending mutations within municipal limit",
    "Government land within highway buffer",
  ],
  "k-nearest": [
    "Rank candidate parcels near boundary dispute",
    "Five nearest holdings to field survey stake",
    "Proximity shortlist for acquisition negotiation",
  ],
  "route-proximity": [
    "NH widening affected parcels along corridor",
    "Canal bund acquisition ROW screening",
    "Utility line impact on adjacent survey numbers",
  ],
  statistics: [
    "Village parcel inventory for revenue meeting",
    "Government vs private land ratio dashboard",
    "Pending mutation backlog by taluk scope",
  ],
  "area-diff": [
    "FMB vs DGPS area variance audit",
    "Flag parcels exceeding 3% survey tolerance",
    "Mutation area validation before approval",
  ],
  encroachment: [
    "Private structure on revenue poramboke land",
    "Canal bund violation on adjacent patta",
    "Highway setback breach detection",
  ],
  overlap: [
    "Adjacent survey number boundary conflicts",
    "Sub-division overlap integrity check",
    "Cadastral sliver and double-mapping audit",
  ],
};

const MEASUREMENT_USE_CASES: Record<"distance" | "draw-polygon", [string, string, string]> = {
  distance: [
    "Verify setback from road centerline in field",
    "Measure boundary segment for dispute affidavit",
    "Check minimum distance between two survey stones",
  ],
  "draw-polygon": [
    "Count parcels inside proposed acquisition zone",
    "Select holdings in village meeting map sketch",
    "Bulk highlight area for encroachment drive",
  ],
};

const MUTATION_USE_CASES: Record<"split" | "merge" | "vertex-edit", [string, string, string]> = {
  split: [
    "Sub-divide patta for inheritance mutation",
    "Carve acquisition strip from parent survey number",
    "Split irregular holding along natural boundary",
  ],
  merge: [
    "Amalgamate adjacent fragments of same owner",
    "Combine sub-divisions after family settlement",
    "Merge poramboke adjacency for clean geometry",
  ],
  "vertex-edit": [
    "Correct boundary vertex after DGPS resurvey",
    "Snap misaligned FMB corner to survey stone",
    "Fix sliver polygon before mutation approval",
  ],
};

const TRANSFORM_USE_CASES: Record<
  Exclude<TransformMethod, "overview">,
  [string, string, string]
> = {
  affine: [
    "Align shifted FMB scan to orthomosaic globally",
    "Correct uniform rotation on digitized sheet",
    "Register village map after scanner misfeed",
  ],
  polynomial: [
    "Fix paper stretch on aged revenue maps",
    "Correct moderate humidity warp on FMB sheet",
    "Align scan with barrel distortion across taluk",
  ],
  tps: [
    "Rubber-sheet folded corner on creased FMB",
    "Local warp from uneven scan bed pressure",
    "GeoNilam FMB alignment with crease correction",
  ],
  projective: [
    "Correct keystone from angled phone photo of map",
    "Homography for perspective-scanned FMB sheet",
    "Register photo-captured boundary sketch to GIS",
  ],
};

export function getToolsPageUseCases(tool: ToolsPageActiveTool | null): string[] {
  if (!tool) return [];

  switch (tool.kind) {
    case "spatial":
      return [...(SPATIAL_DEMO_USE_CASES[tool.id] ?? fallbackSpatialUseCases(tool.id))];
    case "measurement":
      return [...MEASUREMENT_USE_CASES[tool.id]];
    case "mutation":
      return [...MUTATION_USE_CASES[tool.id]];
    case "transform":
      return [...TRANSFORM_USE_CASES[tool.id]];
  }
}

export function getToolsPageToolLabel(tool: ToolsPageActiveTool | null): string | null {
  if (!tool) return null;

  switch (tool.kind) {
    case "spatial":
      return SPATIAL_TOOL_CATALOG.find((t) => t.id === tool.id)?.label ?? tool.id;
    case "measurement":
      return tool.id === "distance" ? "Distance measure" : "Draw polygon";
    case "mutation":
      return (
        { split: "Split parcel", merge: "Merge parcels", "vertex-edit": "Edit vertex" }[tool.id] ??
        tool.id
      );
    case "transform":
      return (
        { affine: "Affine", polynomial: "Polynomial", tps: "Thin Plate Spline", projective: "Projective" }[
          tool.id
        ] ?? tool.id
      );
  }
}

function fallbackSpatialUseCases(id: MoreToolsTabId): [string, string, string] {
  const meta = SPATIAL_TOOL_CATALOG.find((t) => t.id === id);
  const fromCatalog = meta?.useCases.slice(0, 3) ?? [];
  while (fromCatalog.length < 3) fromCatalog.push("Cadastral spatial analysis on parcel layer");
  return [fromCatalog[0], fromCatalog[1], fromCatalog[2]];
}

export function resolveActiveTool(
  activeSpatial: MoreToolsTabId | null,
  activeMeasurement: "distance" | "draw-polygon" | null,
  activeMutation: "split" | "merge" | "vertex-edit" | null,
  activeTransform: TransformMethod | null,
): ToolsPageActiveTool | null {
  if (activeSpatial) return { kind: "spatial", id: activeSpatial };
  if (activeMeasurement) return { kind: "measurement", id: activeMeasurement };
  if (activeMutation) return { kind: "mutation", id: activeMutation };
  if (activeTransform && activeTransform !== "overview") {
    return { kind: "transform", id: activeTransform };
  }
  return null;
}
