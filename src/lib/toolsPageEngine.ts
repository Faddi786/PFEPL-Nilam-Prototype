import * as turf from "@turf/turf";
import Draw from "ol/interaction/Draw";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString, Polygon } from "ol/geom";
import GeoJSON from "ol/format/GeoJSON";
import { boundingExtent } from "ol/extent";
import { fromLonLat, toLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import type Map from "ol/Map";
import type { Coordinate } from "ol/coordinate";
import type { RegionDataset } from "../data/mockData";
import type { MapOverlay } from "../components/moretools/MoreToolsMap";
import type { TransformMethod } from "../data/transformationMock";
import { getSpatialContext, getTransformPreviewParcel } from "../data/cadastralSpatialData";
import { createMapEngine } from "./mapEngine";

type EngineInstance = ReturnType<typeof createMapEngine>;

export type ToolsEngineCallbacks = {
  onToast?: (message: string) => void;
  onParcelSelect?: (count: number, ids: string[]) => void;
};

const format = new GeoJSON();
let overlayLayer: VectorLayer<VectorSource> | null = null;
let overlaySource: VectorSource | null = null;
let customDraw: Draw | null = null;

const TRANSFORM_LABELS: Record<Exclude<TransformMethod, "overview">, string> = {
  affine: "Affine — translation, rotation, scale & skew",
  polynomial: "Polynomial — moderate non-linear distortion",
  tps: "Thin Plate Spline — local rubber-sheet warp",
  projective: "Projective — perspective / homography",
};

const TRANSFORM_STROKE: Record<Exclude<TransformMethod, "overview">, string> = {
  affine: "#2563eb",
  polynomial: "#7c3aed",
  tps: "#0d9488",
  projective: "#d97706",
};

let activeTransformMethod: Exclude<TransformMethod, "overview"> | null = null;
let transformGcpCount = 0;

function clearTransformMode() {
  activeTransformMethod = null;
  transformGcpCount = 0;
}

function overlayToFeature(overlay: MapOverlay): Feature {
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

function fitMapToOverlays(map: Map, overlays: MapOverlay[]) {
  const coords = overlays.flatMap((overlay) => overlay.coordinates);
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

function buildTransformPreviewOverlays(method: Exclude<TransformMethod, "overview">): MapOverlay[] {
  const previewParcel = getTransformPreviewParcel();
  const sourceRing = previewParcel?.ring ?? [];
  if (sourceRing.length < 4) {
    const center = getSpatialContext().center;
    const scale = 0.00012;
    const fallbackRing: [number, number][] = [
      [center[0] - scale * 2, center[1] - scale],
      [center[0] + scale * 2, center[1] - scale * 0.6],
      [center[0] + scale * 1.8, center[1] + scale * 1.4],
      [center[0] - scale * 1.6, center[1] + scale * 1.2],
      [center[0] - scale * 2, center[1] - scale],
    ];
    return buildTransformPreviewFromRing(method, fallbackRing);
  }
  return buildTransformPreviewFromRing(method, sourceRing);
}

function buildTransformPreviewFromRing(
  method: Exclude<TransformMethod, "overview">,
  sourceRing: [number, number][],
): MapOverlay[] {
  const scale = 0.00012;
  const warp = {
    affine: [scale * 0.35, scale * 0.2],
    polynomial: [scale * 0.45, scale * 0.35],
    tps: [scale * 0.3, scale * 0.4],
    projective: [scale * 0.55, scale * 0.15],
  }[method];
  const targetRing = sourceRing.map(([lon, lat], index) => {
    if (index === sourceRing.length - 1) return [lon, lat] as [number, number];
    return [lon + warp[0] * (1 + index * 0.08), lat + warp[1] * (1 - index * 0.06)] as [number, number];
  });

  return [
    {
      id: "transform-fmb-source",
      type: "polygon",
      coordinates: sourceRing,
      fill: "rgba(148,163,184,0.22)",
      stroke: "#64748b",
      strokeWidth: 2,
      zIndex: 1,
    },
    {
      id: "transform-fmb-target",
      type: "polygon",
      coordinates: targetRing,
      fill: "rgba(59,130,246,0.18)",
      stroke: TRANSFORM_STROKE[method],
      strokeWidth: 2,
      lineDash: [5, 4],
      zIndex: 2,
    },
  ];
}

function pointMarkerOverlay(
  id: string,
  center: [number, number],
  fill: string,
  zIndex: number,
): MapOverlay {
  const radius = 0.000018;
  const ring: [number, number][] = [
    [center[0] - radius, center[1]],
    [center[0], center[1] + radius],
    [center[0] + radius, center[1]],
    [center[0], center[1] - radius],
    [center[0] - radius, center[1]],
  ];
  return { id, type: "polygon", coordinates: ring, fill, stroke: "#ffffff", strokeWidth: 1.5, zIndex };
}

function appendTransformGcp(map: Map, lonLat: [number, number], index: number) {
  const source = ensureOverlayLayer(map);
  const offset: [number, number] = [0.000045, 0.000028];
  const target: [number, number] = [lonLat[0] + offset[0], lonLat[1] + offset[1]];
  const markers: MapOverlay[] = [
    pointMarkerOverlay(`gcp-${index}-source`, lonLat, "rgba(220,38,38,0.9)", 10),
    pointMarkerOverlay(`gcp-${index}-target`, target, "rgba(37,99,235,0.9)", 11),
    {
      id: `gcp-${index}-link`,
      type: "line",
      coordinates: [lonLat, target],
      stroke: "#94a3b8",
      strokeWidth: 1.5,
      lineDash: [4, 3],
      zIndex: 9,
    },
  ];
  source.addFeatures(markers.map(overlayToFeature));
  overlayLayer?.changed();
  map.render();
}

export function applySpatialOverlays(map: Map, overlays: MapOverlay[]) {
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
    map.removeInteraction(customDraw);
    customDraw = null;
  }
}

export function handleToolsMapClick(
  engine: EngineInstance,
  mapCoord: Coordinate,
  activeTransform: TransformMethod | null | undefined,
  callbacks: ToolsEngineCallbacks,
): boolean {
  if (!activeTransform || activeTransform === "overview") return false;
  if (activeTransformMethod !== activeTransform) return false;

  transformGcpCount += 1;
  const lonLat = toLonLat(mapCoord) as [number, number];
  appendTransformGcp(engine.map, lonLat, transformGcpCount);
  callbacks.onToast?.(
    `GCP ${transformGcpCount} placed — ${TRANSFORM_LABELS[activeTransform].split(" — ")[0]} preview`,
  );
  return true;
}

export function activateTransformMode(
  engine: EngineInstance,
  method: Exclude<TransformMethod, "overview">,
  callbacks: ToolsEngineCallbacks,
) {
  activeTransformMethod = method;
  transformGcpCount = 0;
  engine.resetTools(true);
  clearCustomInteractions(engine.map);
  engine.clearHighlights();

  const overlays = buildTransformPreviewOverlays(method);
  applySpatialOverlays(engine.map, overlays);
  fitMapToOverlays(engine.map, overlays);
  callbacks.onToast?.(`${TRANSFORM_LABELS[method]} — click map to place GCPs`);
}

export function activateSpatialTool(
  engine: EngineInstance,
  overlays: MapOverlay[],
  summary: string,
  callbacks: ToolsEngineCallbacks,
) {
  clearTransformMode();
  engine.resetTools(true);
  clearCustomInteractions(engine.map);
  engine.clearHighlights();
  applySpatialOverlays(engine.map, overlays);
  fitMapToOverlays(engine.map, overlays);

  const highlightIds = extractHighlightParcelIds(overlays);
  if (highlightIds.length > 0) {
    engine.highlightParcels(highlightIds);
  }

  callbacks.onToast?.(summary);
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

    engine.highlightParcels(matchedIds);
    callbacks.onParcelSelect?.(matchedIds.length, matchedIds);
    callbacks.onToast?.(`${matchedIds.length} parcel${matchedIds.length === 1 ? "" : "s"} inside selection`);
    engine.map.removeInteraction(customDraw!);
    customDraw = null;
  });

  engine.map.addInteraction(customDraw);
  callbacks.onToast?.("Draw a polygon to select parcels inside");
}

export function activateMutationTool(
  engine: EngineInstance,
  tool: "split" | "merge" | "vertex-edit",
  callbacks: ToolsEngineCallbacks,
) {
  clearTransformMode();
  clearCustomInteractions(engine.map);
  clearSpatialOverlays(engine.map);

  if (tool === "split") {
    engine.setTool("split");
    callbacks.onToast?.("Draw a split line across the selected parcel");
    return;
  }
  if (tool === "merge") {
    engine.setTool("amalgamate");
    callbacks.onToast?.("Select adjacent parcels, then run amalgamation");
    return;
  }
  engine.setTool("vertex-edit");
  callbacks.onToast?.("Click a parcel to edit its vertices");
}

export function resetToolsPageState(engine: EngineInstance) {
  clearTransformMode();
  engine.resetTools(true);
  clearCustomInteractions(engine.map);
  clearSpatialOverlays(engine.map);
  engine.clearHighlights();
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
