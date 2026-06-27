import { KHUTAL_PARCEL } from "../data/autocadWorkflowMock";

/** SVG pixels per ground meter for demo map scaling. */
export const SVG_METERS_SCALE = 4;

export type SvgPoint = [number, number];

/** Demo parcel vertex positions in 320×240 SVG space (V1–V14). */
export const PARCEL_SVG_VERTICES: Record<string, SvgPoint> = {
  V1: [40, 200],
  V2: [120, 40],
  V3: [280, 60],
  V4: [260, 180],
  V5: [80, 220],
  V6: [160, 130],
  V7: [100, 80],
  V8: [200, 45],
  V9: [240, 70],
  V10: [270, 140],
  V11: [220, 190],
  V12: [170, 210],
  V13: [60, 215],
  V14: [55, 205],
};

/** Exterior ring used to draw the plot polygon (V1→V2→V3→V4→V5). */
export const PARCEL_SVG_RING: SvgPoint[] = [
  PARCEL_SVG_VERTICES.V1,
  PARCEL_SVG_VERTICES.V2,
  PARCEL_SVG_VERTICES.V3,
  PARCEL_SVG_VERTICES.V4,
  PARCEL_SVG_VERTICES.V5,
];

export type MapMarker = {
  x: number;
  y: number;
  label: string;
  color?: string;
  r?: number;
};

export type MapArc = {
  cx: number;
  cy: number;
  r: number;
  stroke?: string;
  dashed?: boolean;
};

export type MapCircle = {
  cx: number;
  cy: number;
  r: number;
  stroke?: string;
  fill?: string;
  dashed?: boolean;
};

export type MapPreview = {
  hint: string;
  polyline?: SvgPoint[];
  polylines?: SvgPoint[][];
  markers?: MapMarker[];
  arcs?: MapArc[];
  circles?: MapCircle[];
  polygons?: { points: SvgPoint[]; fill?: string; stroke?: string; label?: string }[];
  dashedEdges?: SvgPoint[][];
};

export function parseGroundMeters(value: string, fallback = 0): number {
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export function parseAngleDeg(value: string, fallback = 0): number {
  return parseGroundMeters(value, fallback);
}

export function getVertexCoord(vertexId: string): SvgPoint {
  return PARCEL_SVG_VERTICES[vertexId] ?? [160, 120];
}

export function polygonCentroid(ring: SvgPoint[]): SvgPoint {
  const n = ring.length;
  if (n === 0) return [160, 120];
  const sum = ring.reduce(([sx, sy], [x, y]) => [sx + x, sy + y], [0, 0] as SvgPoint);
  return [sum[0] / n, sum[1] / n];
}

const RING_ORDER = ["V1", "V2", "V3", "V4", "V5"] as const;

export function nextRingVertex(vertexId: string): string {
  const idx = RING_ORDER.indexOf(vertexId as (typeof RING_ORDER)[number]);
  if (idx >= 0) return RING_ORDER[(idx + 1) % RING_ORDER.length];
  const all = KHUTAL_PARCEL.vertices;
  const i = all.indexOf(vertexId as (typeof all)[number]);
  if (i < 0) return "V2";
  return all[(i + 1) % all.length];
}

export function metersToSvg(meters: number): number {
  return meters * SVG_METERS_SCALE;
}

export function polarFrom(ref: SvgPoint, distanceM: number, angleDeg: number): SvgPoint {
  const r = metersToSvg(distanceM);
  const rad = (angleDeg * Math.PI) / 180;
  return [ref[0] + r * Math.cos(rad), ref[1] - r * Math.sin(rad)];
}

export function pointAlongSegment(a: SvgPoint, b: SvgPoint, distanceM: number): SvgPoint {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const edgeLenSvg = Math.hypot(dx, dy);
  if (edgeLenSvg < 1e-6) return a;
  const edgeLenM = edgeLenSvg / SVG_METERS_SCALE;
  const t = Math.min(1, Math.max(0, distanceM / edgeLenM));
  return [a[0] + dx * t, a[1] + dy * t];
}

export function pointTowards(fromId: string, towardsId: string, distanceM: number): SvgPoint {
  return pointAlongSegment(getVertexCoord(fromId), getVertexCoord(towardsId), distanceM);
}

export function pointTowardsCentroid(fromId: string, distanceM: number): SvgPoint {
  const from = getVertexCoord(fromId);
  const c = polygonCentroid(PARCEL_SVG_RING);
  return pointAlongSegment(from, c, distanceM);
}

export function circleCircleIntersections(
  p1: SvgPoint,
  r1m: number,
  p2: SvgPoint,
  r2m: number,
): SvgPoint[] {
  const r1 = metersToSvg(r1m);
  const r2 = metersToSvg(r2m);
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const d = Math.hypot(dx, dy);
  if (d < 1e-6 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const hSq = r1 * r1 - a * a;
  if (hSq < 0) return [];
  const h = Math.sqrt(hSq);
  const mx = p1[0] + (a * dx) / d;
  const my = p1[1] + (a * dy) / d;
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;

  const pA: SvgPoint = [mx + rx, my + ry];
  const pB: SvgPoint = [mx - rx, my - ry];
  if (Math.hypot(pA[0] - pB[0], pA[1] - pB[1]) < 1e-6) return [pA];
  return [pA, pB];
}

export function pickIntersection(
  candidates: SvgPoint[],
  preference: "P1" | "P2",
  hint?: SvgPoint,
): SvgPoint | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  if (!hint) return preference === "P1" ? candidates[0] : candidates[1];
  const [a, b] = candidates;
  const da = Math.hypot(a[0] - hint[0], a[1] - hint[1]);
  const db = Math.hypot(b[0] - hint[0], b[1] - hint[1]);
  if (preference === "P1") return da <= db ? a : b;
  return da > db ? a : b;
}

export function pointsToSvgString(points: SvgPoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

export function offsetPointPerpendicular(a: SvgPoint, b: SvgPoint, from: SvgPoint, offsetM: number): SvgPoint {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const t =
    ((from[0] - a[0]) * dx + (from[1] - a[1]) * dy) / (len * len);
  const px = a[0] + t * dx;
  const py = a[1] + t * dy;
  const om = metersToSvg(offsetM);
  return [px + nx * om, py + ny * om];
}

type RefRow = { refPoint: string; distance: string; angle: string };
type MeasureRow = { from1: string; dist1: string; from2: string; dist2: string };
type LadderRow = { from: string; to: string; offsetDistance: string; chainage: string };

export function buildDistanceAnglePreview(
  firstTerminal: string,
  lastTerminal: string,
  betweenVertices: boolean,
  terminalDistance: string,
  refRows: RefRow[],
): MapPreview {
  const dist = parseGroundMeters(terminalDistance);
  const first = betweenVertices
    ? pointAlongSegment(
        getVertexCoord(firstTerminal),
        getVertexCoord(nextRingVertex(firstTerminal)),
        dist,
      )
    : pointTowardsCentroid(firstTerminal, dist);

  const intermediate: SvgPoint[] = [];
  const markers: MapMarker[] = [
    { x: first[0], y: first[1], label: "A1", color: "#dc2626" },
  ];

  refRows.forEach((row, i) => {
    const d = parseGroundMeters(row.distance);
    const ang = parseAngleDeg(row.angle);
    if (d <= 0 && ang === 0 && !row.distance && !row.angle) return;
    const pt = polarFrom(getVertexCoord(row.refPoint), d, ang);
    intermediate.push(pt);
    markers.push({ x: pt[0], y: pt[1], label: `P${i + 1}`, color: "#ea580c" });
  });

  const last = getVertexCoord(lastTerminal);
  markers.push({ x: last[0], y: last[1], label: "A2", color: "#dc2626" });

  const polyline = [first, ...intermediate, last];
  const validRows = refRows.filter((r) => parseGroundMeters(r.distance) > 0 || r.angle);
  const hint =
    validRows.length > 0
      ? `Division line: ${firstTerminal} → ${validRows.length} intermediate → ${lastTerminal}`
      : `Division line: ${firstTerminal} (${dist.toFixed(2)} m) → ${lastTerminal}`;

  return { hint, polyline, markers };
}

export function buildArcAdjacentPreview(
  cornerPoint: string,
  dist1: string,
  towards1: string,
  dist2: string,
  towards2: string,
  arc1: string,
  arc2: string,
  intersection: string,
): MapPreview {
  const a1 = pointTowards(cornerPoint, towards1, parseGroundMeters(dist1));
  const a3 = pointTowards(cornerPoint, towards2, parseGroundMeters(dist2));
  const r1 = parseGroundMeters(arc1);
  const r2 = parseGroundMeters(arc2);
  const hits = circleCircleIntersections(a1, r1, a3, r2);
  const hintPt = getVertexCoord(cornerPoint);
  const mid = pickIntersection(hits, intersection as "P1" | "P2", hintPt);

  const arcs: MapArc[] = [
    { cx: a1[0], cy: a1[1], r: metersToSvg(r1), stroke: "#6366f1", dashed: true },
    { cx: a3[0], cy: a3[1], r: metersToSvg(r2), stroke: "#6366f1", dashed: true },
  ];

  const markers: MapMarker[] = [
    { x: getVertexCoord(cornerPoint)[0], y: getVertexCoord(cornerPoint)[1], label: cornerPoint, color: "#1A1A1A" },
    { x: a1[0], y: a1[1], label: "A1", color: "#dc2626" },
    { x: a3[0], y: a3[1], label: "A3", color: "#dc2626" },
  ];

  const polyline = mid ? [a1, mid, a3] : [a1, a3];
  if (mid) markers.push({ x: mid[0], y: mid[1], label: intersection, color: "#7c3aed" });

  return {
    hint: `Arc adjacent at ${cornerPoint}: A1↔${intersection}↔A3`,
    polyline,
    markers,
    arcs,
  };
}

export function buildArcOppositePreview(
  point1: string,
  dist1: string,
  towards1: string,
  point2: string,
  dist2: string,
  towards2: string,
  arc1: string,
  arc2: string,
  intersection: string,
): MapPreview {
  const a1 = pointTowards(point1, towards1, parseGroundMeters(dist1));
  const a3 = pointTowards(point2, towards2, parseGroundMeters(dist2));
  const r1 = parseGroundMeters(arc1);
  const r2 = parseGroundMeters(arc2);
  const hits = circleCircleIntersections(a1, r1, a3, r2);
  const c = polygonCentroid(PARCEL_SVG_RING);
  const mid = pickIntersection(hits, intersection as "P1" | "P2", c);

  const arcs: MapArc[] = [
    { cx: a1[0], cy: a1[1], r: metersToSvg(r1), stroke: "#6366f1", dashed: true },
    { cx: a3[0], cy: a3[1], r: metersToSvg(r2), stroke: "#6366f1", dashed: true },
  ];

  const markers: MapMarker[] = [
    { x: a1[0], y: a1[1], label: "A1", color: "#dc2626" },
    { x: a3[0], y: a3[1], label: "A3", color: "#dc2626" },
  ];
  if (mid) markers.push({ x: mid[0], y: mid[1], label: intersection, color: "#7c3aed" });

  return {
    hint: `Arc opposite sides: ${point1} & ${point2} → ${intersection}`,
    polyline: mid ? [a1, mid, a3] : [a1, a3],
    markers,
    arcs,
  };
}

export function buildPointMeasurePreview(rows: MeasureRow[]): MapPreview {
  const markers: MapMarker[] = [];
  const polyline: SvgPoint[] = [];
  const circles: MapCircle[] = [];

  rows.forEach((row, i) => {
    const d1 = parseGroundMeters(row.dist1);
    const d2 = parseGroundMeters(row.dist2);
    if (d1 <= 0 && d2 <= 0) return;

    const p1 = getVertexCoord(row.from1);
    const p2 = getVertexCoord(row.from2);
    circles.push(
      { cx: p1[0], cy: p1[1], r: metersToSvg(d1), stroke: "#94a3b8", dashed: true },
      { cx: p2[0], cy: p2[1], r: metersToSvg(d2), stroke: "#94a3b8", dashed: true },
    );

    const hits = circleCircleIntersections(p1, d1, p2, d2);
    const pt = pickIntersection(hits, "P1", polygonCentroid(PARCEL_SVG_RING));
    if (pt) {
      polyline.push(pt);
      markers.push({ x: pt[0], y: pt[1], label: `M${i + 1}`, color: "#dc2626" });
    }
  });

  return {
    hint:
      polyline.length > 0
        ? `${polyline.length} measured point(s) from distance intersections`
        : "Enter distances to locate division points",
    polyline: polyline.length >= 2 ? polyline : polyline.length === 1 ? polyline : undefined,
    polylines: polyline.length >= 2 ? [polyline] : undefined,
    markers,
    circles,
  };
}

const FMB_G1: SvgPoint = [50, 210];

export function buildFmbPreview(
  baselineLength: string,
  triDist1: string,
  triDist2: string,
  trianglePoint: string,
): MapPreview {
  const len = parseGroundMeters(baselineLength, 45.6);
  const g2: SvgPoint = [FMB_G1[0] + metersToSvg(len), FMB_G1[1]];
  const d1 = parseGroundMeters(triDist1);
  const d2 = parseGroundMeters(triDist2);
  const hits = circleCircleIntersections(FMB_G1, d1, g2, d2);
  const tPt = pickIntersection(hits, "P1", [160, 100]);

  const markers: MapMarker[] = [
    { x: FMB_G1[0], y: FMB_G1[1], label: "G1", color: "#1A1A1A" },
    { x: g2[0], y: g2[1], label: "G2", color: "#1A1A1A" },
  ];

  const circles: MapCircle[] = [];
  if (d1 > 0) circles.push({ cx: FMB_G1[0], cy: FMB_G1[1], r: metersToSvg(d1), stroke: "#94a3b8", dashed: true });
  if (d2 > 0) circles.push({ cx: g2[0], cy: g2[1], r: metersToSvg(d2), stroke: "#94a3b8", dashed: true });

  if (tPt) {
    markers.push({ x: tPt[0], y: tPt[1], label: trianglePoint, color: "#dc2626" });
    return {
      hint: `Baseline ${len.toFixed(2)} m · Triangle point ${trianglePoint}`,
      polyline: [FMB_G1, g2],
      polylines: [[FMB_G1, tPt], [g2, tPt]],
      markers,
      circles,
    };
  }

  return {
    hint: `Baseline ${len.toFixed(2)} m — adjust triangle distances`,
    polyline: [FMB_G1, g2],
    markers,
    circles,
  };
}

export function buildLadderPreview(
  ladderRows: LadderRow[],
  hangDist1: string,
  hangDist2: string,
): MapPreview {
  const baseA: SvgPoint = [60, 190];
  const baseB: SvgPoint = [260, 190];
  const polylines: SvgPoint[][] = [[baseA, baseB]];
  const markers: MapMarker[] = [
    { x: baseA[0], y: baseA[1], label: "BL-0", color: "#1A1A1A" },
    { x: baseB[0], y: baseB[1], label: "BL-1", color: "#1A1A1A" },
  ];

  let chainCursor = 0;
  ladderRows.forEach((row, i) => {
    const offset = parseGroundMeters(row.offsetDistance);
    if (offset <= 0) return;
    const chain = parseGroundMeters(row.chainage);
    chainCursor = chain;
    const t = Math.min(1, chain / 45);
    const onBase: SvgPoint = [baseA[0] + (baseB[0] - baseA[0]) * t, baseA[1]];
    const off = offsetPointPerpendicular(baseA, baseB, onBase, offset);
    polylines.push([onBase, off]);
    markers.push({ x: off[0], y: off[1], label: row.to || `${i + 1}`, color: "#0284c7" });
  });

  const h1 = parseGroundMeters(hangDist1);
  const h2 = parseGroundMeters(hangDist2);
  if (h1 > 0 && h2 > 0 && polylines.length > 1) {
    const p1 = polylines[1][1];
    const p2 = polylines.length > 2 ? polylines[2][1] : polylines[1][1];
    polylines.push([p1, p2]);
  }

  return {
    hint: `${ladderRows.length} ladder row(s) · chainage ${chainCursor.toFixed(1)} m · hanging ${h1.toFixed(1)}/${h2.toFixed(1)} m`,
    polylines,
    markers,
  };
}

export function buildSubdivisionPreview(
  polygons: { polygon: string; area: string; label: string }[],
  selectedLayer: string,
  layerLabel: string,
): MapPreview {
  const divLine: SvgPoint[] = [
    getVertexCoord("V1"),
    getVertexCoord("V6"),
    getVertexCoord("V4"),
  ];

  const subA: SvgPoint[] = [PARCEL_SVG_VERTICES.V1, PARCEL_SVG_VERTICES.V2, PARCEL_SVG_VERTICES.V3, PARCEL_SVG_VERTICES.V6];
  const subB: SvgPoint[] = [PARCEL_SVG_VERTICES.V6, PARCEL_SVG_VERTICES.V4, PARCEL_SVG_VERTICES.V5, PARCEL_SVG_VERTICES.V1];

  const labelA = polygons.find((p) => p.polygon.includes("Subdivision-1"))?.label ?? "142/3A";
  const labelB = polygons.find((p) => p.polygon.includes("Subdivision-2"))?.label ?? "142/3B";

  return {
    hint: `Layer ${selectedLayer}${layerLabel ? ` · ${layerLabel}` : ""} · ${polygons.length} polygon(s)`,
    polyline: divLine,
    polygons: [
      { points: subA, fill: "#dbeafe", stroke: "#0284c7", label: labelA },
      { points: subB, fill: "#fef3c7", stroke: "#d97706", label: labelB },
    ],
    markers: [
      { x: 160, y: 90, label: labelA, color: "#0284c7", r: 0 },
      { x: 160, y: 170, label: labelB, color: "#d97706", r: 0 },
    ],
  };
}

const MERGE_GRID_COLS = 4;
const MERGE_CELL_W = 68;
const MERGE_CELL_H = 48;
const MERGE_ORIGIN: SvgPoint = [24, 50];

function mergePlotRect(index: number): SvgPoint[] {
  const col = index % MERGE_GRID_COLS;
  const row = Math.floor(index / MERGE_GRID_COLS);
  const x = MERGE_ORIGIN[0] + col * MERGE_CELL_W;
  const y = MERGE_ORIGIN[1] + row * MERGE_CELL_H;
  return [
    [x, y],
    [x + MERGE_CELL_W - 8, y],
    [x + MERGE_CELL_W - 8, y + MERGE_CELL_H - 8],
    [x, y + MERGE_CELL_H - 8],
  ];
}

export function buildMergePreview(selectedPlots: string[], candidatePlots: readonly string[]): MapPreview {
  const polygons = candidatePlots.map((plot, i) => {
    const rect = mergePlotRect(i);
    const selected = selectedPlots.includes(plot);
    return {
      points: rect,
      fill: selected ? "#bbf7d0" : "#f1f5f9",
      stroke: selected ? "#16a34a" : "#cbd5e1",
      label: plot,
    };
  });

  return {
    hint: `${selectedPlots.length} plot(s) selected for merge`,
    polygons,
  };
}
