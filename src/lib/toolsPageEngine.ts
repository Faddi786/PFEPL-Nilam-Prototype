import * as turf from "@turf/turf";
import Draw from "ol/interaction/Draw";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString, Point as OlPoint, Polygon } from "ol/geom";
import GeoJSON from "ol/format/GeoJSON";
import { boundingExtent } from "ol/extent";
import { fromLonLat, toLonLat } from "ol/proj";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import DragPan from "ol/interaction/DragPan";
import type Map from "ol/Map";
import type { MapBrowserEvent } from "ol";
import type { Coordinate } from "ol/coordinate";
import type { RegionDataset } from "../data/mockData";
import type { MapOverlay } from "../components/moretools/MoreToolsMap";
import type { GcpPoint, PolynomialOrder, TransformMethod } from "../data/transformationMock";
import { getSpatialContext, getTransformPreviewParcel } from "../data/cadastralSpatialData";
import {
  applyAffine,
  applyPolynomial,
  applyProjective,
  applyTps,
  computeRmsError,
  fitAffineFromGcps,
  fitPolynomial,
  fitProjective,
  type Point,
} from "./transformMath";
import { createMapEngine } from "./mapEngine";

type EngineInstance = ReturnType<typeof createMapEngine>;
type ActiveTransformMethod = Exclude<TransformMethod, "overview">;

export type TransformStats = {
  method: ActiveTransformMethod;
  methodLabel: string;
  rmsError: number;
  rmsQuality: "excellent" | "good" | "fair" | "poor";
  gcpCount: number;
  surveyNo: string;
  polynomialOrder: PolynomialOrder;
  hint: string;
  stepHint: string;
};

type ToolsPointOverlay = {
  id: string;
  type: "point";
  center: [number, number];
  fill: string;
  stroke?: string;
  radius: number;
  label?: string;
  zIndex?: number;
};

type ToolsMapOverlay = MapOverlay | ToolsPointOverlay;

const HANDLE_HIT_RADIUS_PX = 24;
const VISUAL_HANDLE_RADIUS_PX = 11;

export type ToolsEngineCallbacks = {
  onToast?: (message: string) => void;
  onParcelSelect?: (count: number, ids: string[]) => void;
  onTransformUpdate?: (stats: TransformStats) => void;
};

const format = new GeoJSON();
let overlayLayer: VectorLayer<VectorSource> | null = null;
let overlaySource: VectorSource | null = null;
let customDraw: Draw | null = null;

const TRANSFORM_LABELS: Record<ActiveTransformMethod, string> = {
  affine: "Affine",
  polynomial: "Polynomial",
  tps: "Thin Plate Spline",
  projective: "Projective",
};

const TRANSFORM_STROKE: Record<ActiveTransformMethod, string> = {
  affine: "#2563eb",
  polynomial: "#7c3aed",
  tps: "#0d9488",
  projective: "#d97706",
};

let activeTransformMethod: ActiveTransformMethod | null = null;
let sourceRing: [number, number][] = [];
let transformGcps: GcpPoint[] = [];
let projectiveSrcCorners: Point[] = [];
let projectiveDstCorners: Point[] = [];
let polynomialOrder: PolynomialOrder = 2;
let previewSurveyNo = "—";
let gcpCounter = 0;

type DragKind =
  | { type: "gcp-target"; id: string }
  | { type: "affine-corner"; index: number }
  | { type: "affine-edge"; index: number }
  | { type: "projective-corner"; index: number };

let activeDrag: DragKind | null = null;
let transformMapListeners: Array<() => void> = [];
let lastCallbacks: ToolsEngineCallbacks = {};
let dragPanInteraction: DragPan | null = null;
let refreshTransformRaf = 0;
let innerReferenceRing: [number, number][] = [];

function clearTransformMode() {
  if (refreshTransformRaf) {
    cancelAnimationFrame(refreshTransformRaf);
    refreshTransformRaf = 0;
  }
  activeTransformMethod = null;
  sourceRing = [];
  transformGcps = [];
  projectiveSrcCorners = [];
  projectiveDstCorners = [];
  innerReferenceRing = [];
  activeDrag = null;
  detachTransformMapListeners();
}

function detachTransformMapListeners() {
  for (const detach of transformMapListeners) detach();
  transformMapListeners = [];
}

function overlayToFeature(overlay: ToolsMapOverlay): Feature {
  if (overlay.type === "point") {
    const feature = new Feature({
      geometry: new OlPoint(fromLonLat(overlay.center)),
      overlayId: overlay.id,
    });
    feature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: overlay.radius,
          fill: new Fill({ color: overlay.fill }),
          stroke: new Stroke({ color: overlay.stroke ?? "#ffffff", width: 2 }),
        }),
        text: overlay.label
          ? new Text({
              text: overlay.label,
              font: "bold 11px system-ui,sans-serif",
              fill: new Fill({ color: "#ffffff" }),
              offsetY: -1,
            })
          : undefined,
      }),
    );
    return feature;
  }

  const coords = overlay.coordinates.map((c) => fromLonLat(c));

  const geom =
    overlay.type === "line"
      ? new LineString(coords)
      : new Polygon([coords]);

  const feature = new Feature({ geometry: geom, overlayId: overlay.id });
  feature.setStyle(
    new Style({
      fill: overlay.fill ? new Fill({ color: overlay.fill }) : undefined,
      stroke: new Stroke({
        color: overlay.stroke ?? "#334155",
        width: overlay.strokeWidth ?? 2,
        lineDash: overlay.lineDash,
      }),
    }),
  );
  return feature;
}

function ensureOverlayLayer(map: Map): VectorSource {
  const onMap = overlayLayer ? map.getLayers().getArray().includes(overlayLayer) : false;
  if (overlayLayer && !onMap) {
    overlayLayer = null;
    overlaySource = null;
  }
  if (!overlayLayer || !overlaySource) {
    overlaySource = new VectorSource();
    overlayLayer = new VectorLayer({
      source: overlaySource,
      zIndex: 20,
      properties: { name: "tools-overlay" },
    });
    map.addLayer(overlayLayer);
  }
  return overlaySource;
}

function fitMapToSourceRing(map: Map, ring: [number, number][]) {
  const open = ringWithoutClosing(ring);
  if (open.length < 3) return;
  const extent = boundingExtent(open.map((coord) => fromLonLat(coord)));
  if (!extent.every((value) => Number.isFinite(value))) return;
  map.getView().fit(extent, { padding: [72, 72, 140, 72], duration: 550, maxZoom: 19 });
}

function fitMapToOverlays(map: Map, overlays: ToolsMapOverlay[]) {
  const coords = overlays.flatMap((overlay) =>
    overlay.type === "point" ? [overlay.center] : overlay.coordinates,
  );
  if (!coords.length) return;
  const extent = boundingExtent(coords.map((coord) => fromLonLat(coord)));
  if (!extent.every((value) => Number.isFinite(value))) return;
  map.getView().fit(extent, { padding: [48, 48, 48, 48], duration: 550, maxZoom: 18 });
}

function extractHighlightParcelIds(overlays: MapOverlay[]): string[] {
  return overlays
    .filter((overlay) => overlay.id.startsWith("parcel-") && (overlay.zIndex ?? 0) >= 3)
    .map((overlay) => overlay.id.slice("parcel-".length))
    .filter(Boolean);
}

function closedRing(ring: [number, number][]): [number, number][] {
  if (ring.length < 3) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

function ringWithoutClosing(ring: [number, number][]): [number, number][] {
  if (ring.length < 2) return ring;
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
  return ring;
}

function parcelBboxCorners(ring: [number, number][]): Point[] {
  const coords = ringWithoutClosing(ring);
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of coords) {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
  ];
}

function defaultTargetOffset(source: Point, index: number): Point {
  const scale = 0.000045;
  const sign = index % 2 === 0 ? 1 : -1;
  return [source[0] + scale * sign, source[1] + scale * 0.65];
}

function edgeMidpoints(corners: Point[]): Point[] {
  const mids: Point[] = [];
  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i]!;
    const b = corners[(i + 1) % corners.length]!;
    mids.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  }
  return mids;
}

function initGcpsFromRing(ring: [number, number][]): GcpPoint[] {
  const corners = parcelBboxCorners(ring);
  const labels = ["SW corner", "SE corner", "NE corner", "NW corner"];
  return corners.map((source, idx) => {
    gcpCounter += 1;
    return {
      id: `gcp-${gcpCounter}`,
      label: labels[idx] ?? `Corner ${idx + 1}`,
      source,
      target: defaultTargetOffset(source, idx),
    };
  });
}

function initAffineGcpsFromRings(
  source: [number, number][],
  inner: [number, number][],
): GcpPoint[] {
  const srcCorners = parcelBboxCorners(source);
  const innerCorners = parcelBboxCorners(inner);
  const labels = ["SW", "SE", "NE", "NW"];
  const misalign = 0.000028;
  return srcCorners.map((src, idx) => {
    gcpCounter += 1;
    const ref = innerCorners[idx]!;
    const signX = idx % 2 === 0 ? -1 : 1;
    const signY = idx < 2 ? -1 : 1;
    return {
      id: `gcp-${gcpCounter}`,
      label: labels[idx] ?? `Corner ${idx + 1}`,
      source: src,
      target: [ref[0] + misalign * signX, ref[1] + misalign * signY * 0.7] as [number, number],
    };
  });
}

function warpedBboxCorners(): Point[] {
  const transformFn = buildTransformFn();
  if (!transformFn || sourceRing.length < 4) return [];
  return parcelBboxCorners(sourceRing).map((pt) => transformFn(pt));
}

function initProjectiveCorners(ring: [number, number][]) {
  projectiveSrcCorners = parcelBboxCorners(ring);
  const offset = 0.00004;
  projectiveDstCorners = projectiveSrcCorners.map(([lon, lat], i) => {
    if (i === 2) return [lon + offset, lat + offset * 0.55] as Point;
    return [lon, lat] as Point;
  });
}

function buildTransformFn(): ((p: Point) => Point) | null {
  if (!activeTransformMethod) return null;

  switch (activeTransformMethod) {
    case "affine":
      return (p) => applyAffine(p, fitAffineFromGcps(transformGcps));
    case "polynomial": {
      const fit = fitPolynomial(transformGcps, polynomialOrder);
      if (!fit) return (p) => p;
      return (p) => applyPolynomial(p, fit.coeffX, fit.coeffY, polynomialOrder);
    }
    case "tps":
      return (p) => applyTps(p, transformGcps);
    case "projective": {
      const fit = fitProjective(projectiveSrcCorners, projectiveDstCorners);
      if (!fit) return (p) => p;
      return (p) => applyProjective(p, fit);
    }
    default:
      return (p) => p;
  }
}

function warpRing(ring: [number, number][], transformFn: (p: Point) => Point): [number, number][] {
  const open = ringWithoutClosing(ring);
  const warped = open.map((pt) => transformFn(pt as Point) as [number, number]);
  return closedRing(warped);
}

function pointHandleOverlay(
  id: string,
  center: [number, number],
  fill: string,
  zIndex: number,
  label?: string,
): ToolsPointOverlay {
  return {
    id,
    type: "point",
    center,
    fill,
    stroke: "#ffffff",
    radius: VISUAL_HANDLE_RADIUS_PX,
    label,
    zIndex,
  };
}

function bboxRingFromCorners(corners: Point[]): [number, number][] {
  return closedRing(corners.map((pt) => pt as [number, number]));
}

function buildTransformOverlays(): ToolsMapOverlay[] {
  if (!activeTransformMethod || sourceRing.length < 4) return [];

  const method = activeTransformMethod;
  const transformFn = buildTransformFn();
  if (!transformFn) return [];

  const warpedRing = warpRing(sourceRing, transformFn);
  const overlays: ToolsMapOverlay[] = [];

  if (method === "affine" && innerReferenceRing.length >= 4) {
    overlays.push(
      {
        id: "transform-inner-reference",
        type: "polygon",
        coordinates: closedRing(innerReferenceRing),
        fill: "rgba(16,185,129,0.18)",
        stroke: "#059669",
        strokeWidth: 2.5,
        zIndex: 1,
      },
      {
        id: "transform-outer-warped",
        type: "polygon",
        coordinates: warpedRing,
        fill: "rgba(59,130,246,0.22)",
        stroke: TRANSFORM_STROKE.affine,
        strokeWidth: 3,
        lineDash: [8, 5],
        zIndex: 2,
      },
    );

    const outerCorners = warpedBboxCorners();
    const cornerLabels = ["1", "2", "3", "4"];
    for (let i = 0; i < outerCorners.length; i += 1) {
      const corner = outerCorners[i]!;
      overlays.push(
        pointHandleOverlay(
          `affine-corner-${i}`,
          corner as [number, number],
          "rgba(37,99,235,0.96)",
          12,
          cornerLabels[i],
        ),
      );
    }

    const edgeMids = edgeMidpoints(outerCorners);
    const edgeLabels = ["E", "N", "W", "S"];
    for (let i = 0; i < edgeMids.length; i += 1) {
      overlays.push(
        pointHandleOverlay(
          `affine-edge-${i}`,
          edgeMids[i] as [number, number],
          "rgba(96,165,250,0.92)",
          9,
          edgeLabels[i],
        ),
      );
    }
  } else {
    overlays.push(
      {
        id: "transform-fmb-source",
        type: "polygon",
        coordinates: closedRing(sourceRing),
        fill: "rgba(148,163,184,0.32)",
        stroke: "#64748b",
        strokeWidth: 2,
        zIndex: 1,
      },
      {
        id: "transform-fmb-warped",
        type: "polygon",
        coordinates: warpedRing,
        fill: "rgba(59,130,246,0.28)",
        stroke: TRANSFORM_STROKE[method],
        strokeWidth: 3,
        lineDash: [8, 5],
        zIndex: 2,
      },
    );
  }

  if (method === "projective") {
    overlays.push({
      id: "projective-bbox",
      type: "polygon",
      coordinates: bboxRingFromCorners(projectiveSrcCorners),
      fill: "rgba(217,119,6,0.1)",
      stroke: "#d97706",
      strokeWidth: 1.5,
      lineDash: [5, 4],
      zIndex: 3,
    });

    const cornerLabels = ["1", "2", "3", "4"];
    for (let i = 0; i < 4; i += 1) {
      const src = projectiveSrcCorners[i]!;
      const dst = projectiveDstCorners[i]!;
      overlays.push(
        pointHandleOverlay(
          `projective-src-${i}`,
          src as [number, number],
          "rgba(220,38,38,0.9)",
          8,
        ),
        pointHandleOverlay(
          `projective-corner-${i}`,
          dst as [number, number],
          "rgba(217,119,6,0.96)",
          12,
          cornerLabels[i],
        ),
        {
          id: `projective-link-${i}`,
          type: "line",
          coordinates: [src as [number, number], dst as [number, number]],
          stroke: "#94a3b8",
          strokeWidth: 2,
          lineDash: [5, 4],
          zIndex: 9,
        },
      );
    }
  } else if (method !== "affine") {
    for (const gcp of transformGcps) {
      overlays.push(
        pointHandleOverlay(`gcp-${gcp.id}-source`, gcp.source, "rgba(220,38,38,0.92)", 10),
        pointHandleOverlay(`gcp-${gcp.id}-target`, gcp.target, "rgba(37,99,235,0.96)", 11),
        {
          id: `gcp-${gcp.id}-link`,
          type: "line",
          coordinates: [gcp.source, gcp.target],
          stroke: "#94a3b8",
          strokeWidth: 2,
          lineDash: [5, 4],
          zIndex: 9,
        },
      );
    }
  }

  return overlays;
}

function rmsQualityLabel(rms: number): TransformStats["rmsQuality"] {
  if (rms < 0.00001) return "excellent";
  if (rms < 0.00005) return "good";
  if (rms < 0.0002) return "fair";
  return "poor";
}

function computeTransformStats(): TransformStats | null {
  if (!activeTransformMethod) return null;
  const transformFn = buildTransformFn();
  if (!transformFn) return null;

  let rmsError = 0;
  let gcpCount = transformGcps.length;

  if (activeTransformMethod === "projective") {
    const gcpsForRms: GcpPoint[] = projectiveSrcCorners.map((src, i) => ({
      id: `c-${i}`,
      label: `Corner ${i + 1}`,
      source: src,
      target: projectiveDstCorners[i]!,
    }));
    rmsError = computeRmsError(gcpsForRms, transformFn);
    gcpCount = 4;
  } else {
    rmsError = computeRmsError(transformGcps, transformFn);
  }

  const hints: Record<ActiveTransformMethod, string> = {
    affine: "Inner green = cadastral reference · Drag blue outer corners/edges to fit FMB onto parcel",
    polynomial: "Drag blue handles — higher order allows more flexible warp",
    tps: "Drag blue handles for local rubber-sheet deformation",
    projective: "Drag numbered orange corners for perspective correction",
  };

  const stepHints: Record<ActiveTransformMethod, string> = {
    affine: "Inner (green) = fixed reference · Outer (blue dashed) = drag numbered corners & edge handles",
    polynomial: "Step 1: Pick order below · Step 2: Drag blue circles to warp",
    tps: "Step 1: Gray = source · Step 2: Drag blue circles (Shift+click adds GCP)",
    projective: "Step 1: Red = fixed bbox · Step 2: Drag orange 1–4 corner handles",
  };

  return {
    method: activeTransformMethod,
    methodLabel: TRANSFORM_LABELS[activeTransformMethod],
    rmsError,
    rmsQuality: rmsQualityLabel(rmsError),
    gcpCount,
    surveyNo: previewSurveyNo,
    polynomialOrder,
    hint: hints[activeTransformMethod],
    stepHint: stepHints[activeTransformMethod],
  };
}

function scheduleRefreshTransformPreview(map: Map) {
  if (refreshTransformRaf) return;
  refreshTransformRaf = requestAnimationFrame(() => {
    refreshTransformRaf = 0;
    refreshTransformPreview(map);
  });
}

function refreshTransformPreview(map: Map) {
  const overlays = buildTransformOverlays();
  applySpatialOverlays(map, overlays);
  const stats = computeTransformStats();
  if (stats) lastCallbacks.onTransformUpdate?.(stats);
}

function pixelDistance(map: Map, a: Point, b: Point): number {
  const pa = map.getPixelFromCoordinate(fromLonLat(a));
  const pb = map.getPixelFromCoordinate(fromLonLat(b));
  return Math.hypot(pa[0]! - pb[0]!, pa[1]! - pb[1]!);
}

function hitTransformHandle(map: Map, pixel: Coordinate): DragKind | null {
  if (!activeTransformMethod) return null;
  const lonLat = toLonLat(map.getCoordinateFromPixel(pixel)) as Point;

  if (activeTransformMethod === "projective") {
    let best: { index: number; dist: number } | null = null;
    for (let i = 0; i < projectiveDstCorners.length; i += 1) {
      const dist = pixelDistance(map, lonLat, projectiveDstCorners[i]!);
      if (dist <= HANDLE_HIT_RADIUS_PX && (!best || dist < best.dist)) {
        best = { index: i, dist };
      }
    }
    return best ? { type: "projective-corner", index: best.index } : null;
  }

  if (activeTransformMethod === "affine" && innerReferenceRing.length >= 4) {
    const outerCorners = warpedBboxCorners();
    let bestCorner: { index: number; dist: number } | null = null;
    for (let i = 0; i < outerCorners.length; i += 1) {
      const dist = pixelDistance(map, lonLat, outerCorners[i]!);
      if (dist <= HANDLE_HIT_RADIUS_PX && (!bestCorner || dist < bestCorner.dist)) {
        bestCorner = { index: i, dist };
      }
    }
    if (bestCorner) return { type: "affine-corner", index: bestCorner.index };

    const edgeMids = edgeMidpoints(outerCorners);
    let bestEdge: { index: number; dist: number } | null = null;
    for (let i = 0; i < edgeMids.length; i += 1) {
      const dist = pixelDistance(map, lonLat, edgeMids[i]!);
      if (dist <= HANDLE_HIT_RADIUS_PX && (!bestEdge || dist < bestEdge.dist)) {
        bestEdge = { index: i, dist };
      }
    }
    return bestEdge ? { type: "affine-edge", index: bestEdge.index } : null;
  }

  let bestGcp: { id: string; dist: number } | null = null;
  for (const gcp of transformGcps) {
    const dist = pixelDistance(map, lonLat, gcp.target);
    if (dist <= HANDLE_HIT_RADIUS_PX && (!bestGcp || dist < bestGcp.dist)) {
      bestGcp = { id: gcp.id, dist };
    }
  }
  return bestGcp ? { type: "gcp-target", id: bestGcp.id } : null;
}

function ensureDragPan(map: Map): DragPan | null {
  if (dragPanInteraction) return dragPanInteraction;
  for (const interaction of map.getInteractions().getArray()) {
    if (interaction instanceof DragPan) {
      dragPanInteraction = interaction;
      break;
    }
  }
  return dragPanInteraction;
}

function setMapPanEnabled(map: Map, enabled: boolean) {
  ensureDragPan(map)?.setActive(enabled);
}

function attachTransformMapListeners(map: Map, callbacks: ToolsEngineCallbacks) {
  detachTransformMapListeners();
  lastCallbacks = callbacks;
  ensureDragPan(map);

  const viewport = map.getViewport();

  const finishDrag = () => {
    if (!activeDrag) return;
    activeDrag = null;
    setMapPanEnabled(map, true);
    map.getTargetElement().style.cursor = "";
    map.getTargetElement().classList.remove("tools-transform-dragging");
    const stats = computeTransformStats();
    if (stats) callbacks.onTransformUpdate?.(stats);
  };

  const onWindowPointerMove = (event: PointerEvent) => {
    if (!activeTransformMethod || !activeDrag) return;
    const drag = activeDrag;
    const pixel = map.getEventPixel(event);
    const lonLat = toLonLat(map.getCoordinateFromPixel(pixel)) as Point;
    if (drag.type === "gcp-target") {
      transformGcps = transformGcps.map((gcp) =>
        gcp.id === drag.id ? { ...gcp, target: lonLat as [number, number] } : gcp,
      );
    } else if (drag.type === "affine-corner") {
      transformGcps = transformGcps.map((gcp, i) =>
        i === drag.index ? { ...gcp, target: lonLat as [number, number] } : gcp,
      );
    } else if (drag.type === "affine-edge") {
      const outerCorners = warpedBboxCorners();
      const i = drag.index;
      const prev = (i + outerCorners.length - 1) % outerCorners.length;
      const next = (i + 1) % outerCorners.length;
      const prevCorner = outerCorners[prev]!;
      const nextCorner = outerCorners[next]!;
      const prevDelta: Point = [lonLat[0] - (prevCorner[0] + nextCorner[0]) / 2, lonLat[1] - (prevCorner[1] + nextCorner[1]) / 2];
      transformGcps = transformGcps.map((gcp, idx) => {
        if (idx === prev) {
          return { ...gcp, target: [gcp.target[0] + prevDelta[0] * 0.5, gcp.target[1] + prevDelta[1] * 0.5] as [number, number] };
        }
        if (idx === next) {
          return { ...gcp, target: [gcp.target[0] + prevDelta[0] * 0.5, gcp.target[1] + prevDelta[1] * 0.5] as [number, number] };
        }
        return gcp;
      });
    } else {
      projectiveDstCorners = projectiveDstCorners.map((pt, i) =>
        i === drag.index ? lonLat : pt,
      );
    }
    scheduleRefreshTransformPreview(map);
  };

  const onWindowPointerUp = () => finishDrag();

  const onPointerDown = (event: PointerEvent) => {
    if (!activeTransformMethod || event.button !== 0) return;
    const pixel = map.getEventPixel(event);
    const drag = hitTransformHandle(map, pixel);
    if (!drag) return;

    activeDrag = drag;
    event.preventDefault();
    event.stopPropagation();
    setMapPanEnabled(map, false);
    map.getTargetElement().style.cursor = "grabbing";
    map.getTargetElement().classList.add("tools-transform-dragging");
    viewport.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: MapBrowserEvent) => {
    if (!activeTransformMethod || activeDrag) return;
    const hover = hitTransformHandle(map, event.pixel);
    map.getTargetElement().style.cursor = hover ? "grab" : "";
  };

  viewport.addEventListener("pointerdown", onPointerDown, { capture: true });
  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("pointercancel", onWindowPointerUp);
  map.on("pointermove", onPointerMove);

  transformMapListeners.push(() => {
    viewport.removeEventListener("pointerdown", onPointerDown, { capture: true });
    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);
    window.removeEventListener("pointercancel", onWindowPointerUp);
    map.un("pointermove", onPointerMove);
    setMapPanEnabled(map, true);
    map.getTargetElement().style.cursor = "";
    map.getTargetElement().classList.remove("tools-transform-dragging");
    activeDrag = null;
  });
}

function resolveInnerReferenceRing(): [number, number][] {
  const previewParcel = getTransformPreviewParcel();
  if (previewParcel?.ring && previewParcel.ring.length >= 4) {
    return closedRing(previewParcel.ring);
  }
  const center = getSpatialContext().center;
  const scale = 0.0001;
  return closedRing([
    [center[0] - scale * 1.8, center[1] - scale * 0.9],
    [center[0] + scale * 1.8, center[1] - scale * 0.9],
    [center[0] + scale * 1.8, center[1] + scale * 0.9],
    [center[0] - scale * 1.8, center[1] + scale * 0.9],
  ]);
}

function resolveSourceRing(): [number, number][] {
  const previewParcel = getTransformPreviewParcel();
  if (previewParcel?.ring && previewParcel.ring.length >= 4) {
    previewSurveyNo = previewParcel.surveyNo;
    return closedRing(previewParcel.ring);
  }

  previewSurveyNo = "Demo";
  const center = getSpatialContext().center;
  const scale = 0.00012;
  return closedRing([
    [center[0] - scale * 2, center[1] - scale],
    [center[0] + scale * 2, center[1] - scale * 0.6],
    [center[0] + scale * 1.8, center[1] + scale * 1.4],
    [center[0] - scale * 1.6, center[1] + scale * 1.2],
  ]);
}

export function applySpatialOverlays(map: Map, overlays: ToolsMapOverlay[]) {
  const source = ensureOverlayLayer(map);
  source.clear();
  const sorted = [...overlays].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  source.addFeatures(sorted.map(overlayToFeature));
  overlayLayer?.changed();
  map.render();
}

export function clearSpatialOverlays(_map: Map) {
  if (overlaySource) {
    overlaySource.clear();
    overlayLayer?.changed();
  }
}

export function clearCustomInteractions(map: Map) {
  if (customDraw) {
    customDraw.abortDrawing();
    map.removeInteraction(customDraw);
    customDraw = null;
  }
}

function abortCustomDraw(map: Map): boolean {
  if (!customDraw) return false;
  customDraw.abortDrawing();
  map.removeInteraction(customDraw);
  customDraw = null;
  return true;
}

export function handleToolsMapClick(
  engine: EngineInstance,
  mapCoord: Coordinate,
  activeTransform: TransformMethod | null | undefined,
  callbacks: ToolsEngineCallbacks,
  options?: { shiftKey?: boolean },
): boolean {
  if (!activeTransform || activeTransform === "overview") return false;
  if (activeTransformMethod !== activeTransform) return false;
  if (activeTransform === "projective") return false;
  if (!options?.shiftKey) return false;

  const lonLat = toLonLat(mapCoord) as Point;
  gcpCounter += 1;
  transformGcps = [
    ...transformGcps,
    {
      id: `gcp-${gcpCounter}`,
      label: `GCP ${transformGcps.length + 1}`,
      source: lonLat as [number, number],
      target: defaultTargetOffset(lonLat, transformGcps.length),
    },
  ];
  refreshTransformPreview(engine.map);
  callbacks.onToast?.(`GCP ${transformGcps.length} added — drag blue handle to adjust`);
  return true;
}

export function setTransformPolynomialOrder(order: PolynomialOrder) {
  polynomialOrder = order;
}

export function refreshActiveTransformPreview(
  engine: EngineInstance,
  callbacks: ToolsEngineCallbacks,
) {
  if (!activeTransformMethod) return;
  lastCallbacks = callbacks;
  refreshTransformPreview(engine.map);
  const stats = computeTransformStats();
  if (stats) callbacks.onTransformUpdate?.(stats);
}

export function activateTransformMode(
  engine: EngineInstance,
  method: ActiveTransformMethod,
  callbacks: ToolsEngineCallbacks,
) {
  clearTransformMode();
  clearSpatialOverlays(engine.map);

  activeTransformMethod = method;
  gcpCounter = 0;
  polynomialOrder = 2;
  engine.resetTools(true);
  clearCustomInteractions(engine.map);
  engine.clearHighlights();

  sourceRing = resolveSourceRing();
  innerReferenceRing = method === "affine" ? resolveInnerReferenceRing() : [];
  if (method === "projective") {
    initProjectiveCorners(sourceRing);
    transformGcps = [];
  } else if (method === "affine") {
    transformGcps = initAffineGcpsFromRings(sourceRing, innerReferenceRing);
    projectiveSrcCorners = [];
    projectiveDstCorners = [];
  } else {
    transformGcps = initGcpsFromRing(sourceRing);
    projectiveSrcCorners = [];
    projectiveDstCorners = [];
  }

  attachTransformMapListeners(engine.map, callbacks);
  refreshTransformPreview(engine.map);
  fitMapToSourceRing(
    engine.map,
    method === "affine" && innerReferenceRing.length >= 4 ? innerReferenceRing : sourceRing,
  );

  const previewParcel = getTransformPreviewParcel();
  if (previewParcel?.id) {
    engine.highlightParcels([previewParcel.id]);
  }

  const stats = computeTransformStats();
  if (stats) callbacks.onTransformUpdate?.(stats);
  callbacks.onToast?.(
    method === "projective"
      ? `${TRANSFORM_LABELS[method]} ready — drag numbered orange corners`
      : method === "affine"
        ? `${TRANSFORM_LABELS[method]} ready — drag outer layer corners & edges onto inner reference`
        : `${TRANSFORM_LABELS[method]} ready — drag blue handles (Shift+click to add GCP)`,
  );
}

export function activateSpatialTool(
  engine: EngineInstance,
  overlays: MapOverlay[],
  _summary: string,
  _callbacks: ToolsEngineCallbacks,
  options?: {
    highlightParcelIds?: string[];
    highlightOptions?: { colorByVariance?: boolean };
  },
) {
  clearTransformMode();
  engine.resetTools(true);
  clearCustomInteractions(engine.map);
  engine.clearHighlights();
  applySpatialOverlays(engine.map, overlays);

  const highlightIds =
    options?.highlightParcelIds ??
    extractHighlightParcelIds(overlays);

  if (highlightIds.length > 0) {
    engine.highlightParcels(highlightIds, options?.highlightOptions);
  } else if (overlays.length > 0) {
    fitMapToOverlays(engine.map, overlays);
  }
}

export function activateMeasurementTool(
  engine: EngineInstance,
  tool: "distance" | "draw-polygon",
  dataset: RegionDataset,
  callbacks: ToolsEngineCallbacks,
) {
  clearTransformMode();
  engine.resetTools(true);
  clearCustomInteractions(engine.map);
  clearSpatialOverlays(engine.map);
  engine.clearHighlights();

  if (tool === "distance") {
    engine.setTool("measure-distance");
    return;
  }

  const drawSource = ensureOverlayLayer(engine.map);
  customDraw = new Draw({ source: drawSource, type: "Polygon" });
  customDraw.on("drawend", (event) => {
    const drawn = format.writeFeatureObject(event.feature, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    }) as GeoJSON.Feature<GeoJSON.Polygon>;

    const selectionPoly = turf.polygon(drawn.geometry!.coordinates);
    const parcelFc = dataset.geojson.parcels;
    const matchedIds: string[] = [];

    for (const pf of parcelFc.features) {
      if (!pf.geometry || (pf.geometry.type !== "Polygon" && pf.geometry.type !== "MultiPolygon")) continue;
      try {
        if (turf.booleanIntersects(pf as GeoJSON.Feature, selectionPoly)) {
          const id = String((pf.properties as Record<string, unknown>)?.id ?? "");
          if (id) matchedIds.push(id);
        }
      } catch {
        // skip invalid geometries
      }
    }

    engine.highlightParcels(matchedIds, { areaSelect: true });
    callbacks.onParcelSelect?.(matchedIds.length, matchedIds);
    engine.map.removeInteraction(customDraw!);
    customDraw = null;
  });

  engine.map.addInteraction(customDraw);
  callbacks.onToast?.("Draw a polygon to select parcels inside");
}

export function activateMutationTool(
  engine: EngineInstance,
  tool: "split" | "merge" | "vertex-edit",
  _callbacks: ToolsEngineCallbacks,
) {
  clearTransformMode();
  clearCustomInteractions(engine.map);
  clearSpatialOverlays(engine.map);
  engine.clearOverlayHighlights();
  engine.resetTools(true);

  if (tool === "split") {
    engine.setTool("split");
    return;
  }
  if (tool === "merge") {
    engine.setTool("amalgamate");
    return;
  }
  engine.setTool("vertex-edit");
}

export function resetToolsPageState(engine: EngineInstance) {
  clearTransformMode();
  engine.resetTools(true);
  clearCustomInteractions(engine.map);
  clearSpatialOverlays(engine.map);
  engine.clearHighlights();
}

export type ToolsEscapeContext = {
  activeMeasurement?: "distance" | "draw-polygon" | null;
  activeMutation?: "split" | "merge" | "vertex-edit" | null;
};

/** ESC: cancel in-progress draw first; preserve click-selected parcel in mutation mode. */
export function handleToolsEscape(
  engine: EngineInstance,
  context: ToolsEscapeContext,
  callbacks: ToolsEngineCallbacks = {},
): boolean {
  if (abortCustomDraw(engine.map)) {
    callbacks.onToast?.("Drawing cancelled");
    return true;
  }

  if (engine.abortActiveDrawing()) {
    callbacks.onToast?.("Drawing cancelled");
    return true;
  }

  if (engine.hasAreaSelection()) {
    engine.clearAreaSelection();
    if (context.activeMeasurement === "draw-polygon") {
      clearSpatialOverlays(engine.map);
    }
    callbacks.onParcelSelect?.(0, []);
    callbacks.onToast?.("Area selection cleared");
    return true;
  }

  if (context.activeMutation && engine.getSelectedParcelCount() > 0) {
    return true;
  }

  if (engine.getSelectedParcelCount() > 0) {
    engine.clearHighlights();
    callbacks.onParcelSelect?.(0, []);
    return true;
  }

  return false;
}

export function disposeToolsPageEngine(map: Map) {
  clearTransformMode();
  clearCustomInteractions(map);
  if (overlayLayer) {
    map.removeLayer(overlayLayer);
    overlayLayer = null;
    overlaySource = null;
  }
}
