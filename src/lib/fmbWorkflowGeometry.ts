import {
  polygonCentroid,
  type MapGeometryContext,
  type SvgPoint,
} from "./autocadWorkflowGeometry";
import {
  FMB_CANVAS_VIEWBOX,
  type FmbExtractionState,
  type FmbPoint,
} from "../data/fmbExtractionMock";

/** Accepted FMB extraction snapshot carried through the unified parcel workflow. */
export type FmbWorkflowGeometry = {
  extraction: FmbExtractionState;
  /** Outer boundary vertex ids in ring order (closed). */
  outerRingIds: string[];
  /** Sub-parcel polygons keyed by label (1A1, 1B, …). */
  parcelPolygons: Record<string, string[]>;
  parcelNumber: string;
  village: string;
  taluk: string;
};

export type FmbWarpMesh = {
  meshVertices: [number, number][];
  innerParcels: [number, number][][];
};

export type FmbAutocadMap = {
  viewBox: { width: number; height: number };
  outerRing: [number, number][];
  subParcels: { label: string; ring: [number, number][] }[];
  vertices: Record<string, [number, number]>;
  parcelNumber: string;
  village: string;
};

/** Karaikal / Thirunallar rural agricultural patch — Esri World Imagery context. */
const GEO_ANCHOR: [number, number] = [79.8418, 10.9246];
const GEO_SCALE = 0.0000115;

export const FMB_OUTER_RING_IDS = ["vA", "vB", "vBR", "vBD", "vD", "vE", "vF"] as const;

/** Sub-parcel vertex rings aligned to the FMB sketch subdivisions (no gaps). */
export const FMB_PARCEL_POLYGON_DEFS: Record<string, string[]> = {
  "1A2": ["vA", "vB", "vI2", "vI1", "vF"],
  "1A1": ["vI1", "vI5", "vE", "vI1"],
  "1B": ["vI2", "vB", "vBR", "vI3", "vI2"],
  "2A1A": ["vI2", "vI3", "vI6", "vI2"],
  "2A1B": ["vI3", "vBR", "vBD", "vI6", "vI3"],
  "2B1B": ["vI6", "vBD", "vD", "vI4", "vI6"],
  "2B1C": ["vI4", "vD", "vE", "vI5", "vI4"],
  /** Center pentagon — fills the former triangular hole (I1–I2–I6–I4–I5). */
  "2B2": ["vI1", "vI2", "vI6", "vI4", "vI5", "vI1"],
};

export function buildFmbWorkflowGeometry(extraction: FmbExtractionState): FmbWorkflowGeometry {
  const villageField = extraction.textFields.find((f) => f.id === "village");
  const talukField = extraction.textFields.find((f) => f.id === "taluk");
  return {
    extraction,
    outerRingIds: [...FMB_OUTER_RING_IDS],
    parcelPolygons: { ...FMB_PARCEL_POLYGON_DEFS },
    parcelNumber: extraction.parcelNumber.value,
    village: villageField?.value ?? "Thirunallar",
    taluk: talukField?.value ?? "Karaikal",
  };
}

function vertexMap(state: FmbExtractionState): Record<string, FmbPoint> {
  return Object.fromEntries(state.vertices.map((v) => [v.id, v]));
}

function ringFromIds(
  ids: string[],
  map: Record<string, FmbPoint>,
): [number, number][] {
  return ids.map((id) => {
    const v = map[id];
    return v ? [v.x, v.y] : [0, 0];
  });
}

export function fmbToNormalized(x: number, y: number): [number, number] {
  const { width, height } = FMB_CANVAS_VIEWBOX;
  return [(x / width) * 100, (y / height) * 100];
}

export function buildWarpMeshFromFmb(geometry: FmbWorkflowGeometry): FmbWarpMesh {
  const map = vertexMap(geometry.extraction);
  const meshVertices = ringFromIds(geometry.outerRingIds, map).map(
    ([x, y]) => fmbToNormalized(x, y),
  );
  const innerParcels = Object.values(geometry.parcelPolygons).map((ids) =>
    ringFromIds(ids, map).map(([x, y]) => fmbToNormalized(x, y)),
  );
  return { meshVertices, innerParcels };
}

export function buildGcpsFromFmb(geometry: FmbWorkflowGeometry) {
  const map = vertexMap(geometry.extraction);
  const anchors = [
    { id: "gcp-a", label: "Vertex A (NW corner)", icon: "road" as const, vertexId: "vA" },
    { id: "gcp-b", label: "Vertex B (NE corner)", icon: "temple" as const, vertexId: "vB" },
    { id: "gcp-d", label: "Vertex D (south apex)", icon: "canal" as const, vertexId: "vD" },
    { id: "gcp-e", label: "Vertex E (SW corner)", icon: "road" as const, vertexId: "vE" },
  ];
  return anchors.map((a) => {
    const v = map[a.vertexId];
    const fmb = fmbToNormalized(v?.x ?? 50, v?.y ?? 50);
    const drift: [number, number] = [
      a.vertexId === "vA" ? 4 : a.vertexId === "vB" ? 4 : a.vertexId === "vD" ? 3 : 4,
      a.vertexId === "vA" ? -2 : a.vertexId === "vB" ? -2 : a.vertexId === "vD" ? 4 : 2,
    ];
    return {
      id: a.id,
      label: a.label,
      icon: a.icon,
      fmb,
      drone: [fmb[0] + drift[0], fmb[1] + drift[1]] as [number, number],
    };
  });
}

function fmbPixelToLngLat(x: number, y: number): [number, number] {
  const { width, height } = FMB_CANVAS_VIEWBOX;
  const cx = width / 2;
  const cy = height / 2;
  return [
    GEO_ANCHOR[0] + (x - cx) * GEO_SCALE,
    GEO_ANCHOR[1] - (y - cy) * GEO_SCALE,
  ];
}

function ringToGeoPolygon(
  ring: [number, number][],
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords = ring.map(([x, y]) => fmbPixelToLngLat(x, y));
  coords.push(coords[0]);
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

export function fmbParcelsToGeoJSON(geometry: FmbWorkflowGeometry): GeoJSON.Feature<GeoJSON.Polygon>[] {
  const map = vertexMap(geometry.extraction);
  const bands: ("green" | "amber" | "red")[] = ["green", "green", "amber", "green", "green", "amber", "red", "green"];
  const labels = Object.keys(geometry.parcelPolygons);

  return labels.map((label, index) => {
    const ring = ringFromIds(geometry.parcelPolygons[label], map);
    const feature = ringToGeoPolygon(ring);
    const varianceBand = bands[index % bands.length];
    feature.properties = {
      surveyNo: label,
      parcelLabel: label,
      village: geometry.village,
      parcelNumber: geometry.parcelNumber,
      varianceBand,
      variancePct: varianceBand === "green" ? 0.4 + index * 0.1 : varianceBand === "amber" ? 2.8 : 6.2,
      demoDigitizedOffset: index % 3 === 0 ? 0.000004 : index % 3 === 1 ? -0.000003 : 0.000002,
      boundaryFlag: varianceBand !== "green",
    };
    return feature;
  });
}

export const FMB_RECORD_MAP_CHECKS = [
  {
    id: "missing-ror",
    label: "Missing RoR",
    detail: "All FMB sub-parcels (1A1–2B2) have linked RoR records",
    flaggedParcelIndices: [] as number[],
  },
  {
    id: "area-variance",
    label: "Area variance",
    detail: "Sub-parcel 2B1C exceeds 5% area variance vs FMB sketch",
    flaggedParcelIndices: [6],
  },
  {
    id: "boundary-align",
    label: "Boundary alignment",
    detail: "Outer ring A–B–D–E–F aligns within 1.2 m of georef mesh",
    flaggedParcelIndices: [] as number[],
  },
  {
    id: "label-match",
    label: "Subdivision label match",
    detail: "Parcel 2B2 label mismatch between extract and mutation docs",
    flaggedParcelIndices: [7],
  },
  {
    id: "adjacent-plots",
    label: "Adjacent plot refs",
    detail: "Neighbour refs 107–113 verified against village map",
    flaggedParcelIndices: [] as number[],
  },
];

export function buildFmbAutocadMap(geometry: FmbWorkflowGeometry): FmbAutocadMap {
  const map = vertexMap(geometry.extraction);
  const targetW = 320;
  const targetH = 240;
  const { width, height } = FMB_CANVAS_VIEWBOX;
  const scale = Math.min(targetW / width, targetH / height) * 0.88;
  const offsetX = (targetW - width * scale) / 2;
  const offsetY = (targetH - height * scale) / 2;

  function toSvg(x: number, y: number): [number, number] {
    return [offsetX + x * scale, offsetY + y * scale];
  }

  const outerRing = ringFromIds(geometry.outerRingIds, map).map(([x, y]) => toSvg(x, y));
  const subParcels = Object.entries(geometry.parcelPolygons).map(([label, ids]) => ({
    label,
    ring: ringFromIds(ids, map).map(([x, y]) => toSvg(x, y)),
  }));

  const vertices: Record<string, [number, number]> = {};
  for (const v of geometry.extraction.vertices) {
    if (v.label) vertices[v.label] = toSvg(v.x, v.y);
    vertices[v.id] = toSvg(v.x, v.y);
  }

  return {
    viewBox: { width: targetW, height: targetH },
    outerRing,
    subParcels,
    vertices,
    parcelNumber: geometry.parcelNumber,
    village: geometry.village,
  };
}

export function createMapGeometryContext(
  fmbMap: FmbAutocadMap,
  geometry: FmbWorkflowGeometry,
): MapGeometryContext {
  const byId = Object.fromEntries(geometry.extraction.vertices.map((v) => [v.id, v]));
  const outerRingKeys = geometry.outerRingIds.map((id) => byId[id]?.label || id);

  function resolveVertex(vertexId: string): SvgPoint {
    return (
      fmbMap.vertices[vertexId] ??
      fmbMap.vertices[`v${vertexId}`] ??
      fmbMap.outerRing[0] ??
      [0, 0]
    );
  }

  function nextRingVertex(vertexId: string): string {
    const idx = outerRingKeys.indexOf(vertexId);
    if (idx < 0) return outerRingKeys.find(Boolean) ?? vertexId;
    for (let step = 1; step <= outerRingKeys.length; step++) {
      const next = outerRingKeys[(idx + step) % outerRingKeys.length];
      if (next) return next;
    }
    return vertexId;
  }

  return {
    resolveVertex,
    nextRingVertex,
    outerRing: fmbMap.outerRing,
    ringCentroid: () => polygonCentroid(fmbMap.outerRing),
  };
}

export function buildFmbParcelContext(geometry: FmbWorkflowGeometry) {
  const ownerField = geometry.extraction.textFields.find((f) => f.id === "owner");
  const subDivField = geometry.extraction.textFields.find((f) => f.id === "surveySubDiv");
  const labels = Object.keys(geometry.parcelPolygons).join(", ");
  return {
    surveyNo: subDivField?.correctHint ?? subDivField?.value ?? "142/2B",
    village: geometry.village,
    ulpin: geometry.parcelNumber,
    ownerName: ownerField?.value ?? "Rajesh Kumar Sharma",
    subParcels: labels,
  };
}
