import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { createBasemapSource, getBasemapMaxZoom, offsetCenterForDefaultPan, type BasemapId } from "./basemaps";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style, Circle as CircleStyle, Text } from "ol/style";
import Select from "ol/interaction/Select";
import Modify from "ol/interaction/Modify";
import Draw from "ol/interaction/Draw";
import Snap from "ol/interaction/Snap";
import Feature from "ol/Feature";
import type Geometry from "ol/geom/Geometry";
import { LineString, MultiPolygon, Point, Polygon } from "ol/geom";
import type { Coordinate } from "ol/coordinate";
import * as turf from "@turf/turf";
import type { RegionDataset } from "../data/mockData";
import {
  ADMIN_BOUNDARY_LAYER_IDS,
  loadAdminBoundaryGeoJson,
  type AdminBoundaryLayerId,
} from "../data/adminBoundaries";
import { CROP_COLORS, CROP_TYPES } from "./thematicLayers";

/** Legacy demo admin bbox grids — not shown on the workbench map. */
const LEGACY_MOCK_ADMIN_LAYER_IDS = ["region", "taluk", "village", "ward"] as const;

type LayerId =
  | "region"
  | "taluk"
  | "village"
  | "ward"
  | "adminState"
  | "adminDistrict"
  | "adminTaluka"
  | "adminVillage"
  | "fmb"
  | "fmbChains"
  | "parcelBoundaries"
  | "parcels"
  | "variance"
  | "dgps"
  | "collabland"
  | "ortho"
  | "crops"
  | "buildings"
  | "trees"
  | "roads"
  | "waterBodies"
  | "forest"
  | "cadastralDimensions";

export type MapTool =
  | "none"
  | "vertex-edit"
  | "split"
  | "amalgamate"
  | "measure-distance"
  | "buffer";

type ParcelContextInfo = {
  geometryDirty: boolean;
};

type Callbacks = {
  onParcelContext?: (
    parcel: Record<string, any>,
    position: { pixel: Coordinate; mapCoord: Coordinate },
    info: ParcelContextInfo,
  ) => void;
  onParcelClick?: (parcel: Record<string, any>, pixel: Coordinate) => void;
  onFmbChainClick?: (
    data: { fmbText: string; properties: Record<string, unknown> },
    position: { pixel: Coordinate; mapCoord: Coordinate },
  ) => void;
  onMapClick?: (pixel: Coordinate, hasParcel: boolean) => void;
  onToast?: (message: string) => void;
  onSelectionChange?: (parcel: Record<string, any> | null) => void;
};

type SetDatasetOptions = {
  transitionDuration?: number;
};

type EngineInstance = {
  map: Map;
  setDataset: (dataset: RegionDataset, options?: SetDatasetOptions) => void;
  setBasemap: (id: string) => void;
  setLayerVisibility: (id: string, visible: boolean) => void;
  setTool: (tool: MapTool) => void;
  resetTools: (silent?: boolean) => void;
  runAmalgamation: () => { ok: boolean; reason?: string };
  commitParcelGeometry: (parcelId: string) => boolean;
  highlightParcels: (ids: string[], options?: { colorByVariance?: boolean }) => void;
  clearHighlights: () => void;
  clearInteractions: () => void;
  dispose: () => void;
};

function parcelToRecord(feature: Feature<Geometry>): Record<string, unknown> {
  const props = feature.getProperties();
  const { geometry, ...rest } = props as Record<string, unknown>;
  void geometry;
  return rest;
}

function countPolygonParts(feature: any) {
  if (!feature?.geometry) return 0;
  if (feature.geometry.type === "Polygon") return 1;
  if (feature.geometry.type === "MultiPolygon") return feature.geometry.coordinates.length;
  return 0;
}

function unionFeatureGroup(features: GeoJSON.Feature[], bufferMeters: number) {
  if (!features.length) return null;
  const working = features
    .map((feature) => {
      if (bufferMeters <= 0) return feature;
      return turf.buffer(feature, bufferMeters, { units: "meters" }) as GeoJSON.Feature;
    })
    .map((feature) => (turf.cleanCoords ? (turf.cleanCoords(feature) as GeoJSON.Feature) : feature))
    .filter(Boolean);

  if (working.length < 2) return working[0] ?? null;

  try {
    const merged = turf.union(turf.featureCollection(working as any) as any);
    if (!merged) return null;
    if (bufferMeters <= 0) return merged as GeoJSON.Feature;
    try {
      const shrunk = turf.buffer(merged, -bufferMeters * 0.85, { units: "meters" });
      if (shrunk && turf.area(shrunk) > 0.5) return shrunk as GeoJSON.Feature;
    } catch {
      // Keep buffered union if shrink fails.
    }
    return merged as GeoJSON.Feature;
  } catch {
    return null;
  }
}

function unionWithGapTolerance(features: GeoJSON.Feature[]) {
  const buffers = [0, 2, 5, 8, 12, 18, 25, 35];
  let best: GeoJSON.Feature | null = null;
  let bestParts = Number.POSITIVE_INFINITY;

  for (const bufferMeters of buffers) {
    const candidate = unionFeatureGroup(features, bufferMeters);
    if (!candidate) continue;
    const parts = countPolygonParts(candidate);
    if (parts === 1) return { feature: candidate, parts: 1 };
    if (parts < bestParts) {
      best = candidate;
      bestParts = parts;
    }
  }

  return { feature: best, parts: bestParts };
}

function lineSide(a: [number, number], b: [number, number], p: [number, number]) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

function intersectSegmentWithLine(
  s: [number, number],
  e: [number, number],
  a: [number, number],
  b: [number, number],
): [number, number] | null {
  const dx = e[0] - s[0];
  const dy = e[1] - s[1];
  const lx = b[0] - a[0];
  const ly = b[1] - a[1];
  const denom = dx * ly - dy * lx;
  if (Math.abs(denom) < 1e-12) return null;
  const t = ((a[0] - s[0]) * ly - (a[1] - s[1]) * lx) / denom;
  return [s[0] + t * dx, s[1] + t * dy];
}

function clipRingWithLine(
  ring: [number, number][],
  a: [number, number],
  b: [number, number],
  keepLeft: boolean,
): [number, number][] {
  const out: [number, number][] = [];
  if (!ring.length) return out;

  for (let i = 0; i < ring.length - 1; i += 1) {
    const s = ring[i];
    const e = ring[i + 1];
    const sIn = keepLeft ? lineSide(a, b, s) >= 0 : lineSide(a, b, s) <= 0;
    const eIn = keepLeft ? lineSide(a, b, e) >= 0 : lineSide(a, b, e) <= 0;

    if (sIn && eIn) {
      out.push(e);
    } else if (sIn && !eIn) {
      const ip = intersectSegmentWithLine(s, e, a, b);
      if (ip) out.push(ip);
    } else if (!sIn && eIn) {
      const ip = intersectSegmentWithLine(s, e, a, b);
      if (ip) out.push(ip);
      out.push(e);
    }
  }

  if (!out.length) return out;
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push(first);
  return out;
}

const COLLINEAR_AREA_EPS = 1e-14;
const SIMPLIFY_TOLERANCE_DEG = 5e-6;

function removeCollinearRingPoints(ring: [number, number][]): [number, number][] {
  if (ring.length < 4) return ring;
  const closed =
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const points = closed ? ring.slice(0, -1) : ring.slice();
  if (points.length < 3) return ring;

  const kept: [number, number][] = [];
  for (let i = 0; i < points.length; i += 1) {
    const a = points[(i - 1 + points.length) % points.length];
    const b = points[i];
    const c = points[(i + 1) % points.length];
    const cross = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
    if (cross > COLLINEAR_AREA_EPS) kept.push(b);
  }
  if (kept.length < 3) return ring;
  kept.push(kept[0]);
  return kept;
}

function simplifyParcelGeoJson(feature: GeoJSON.Feature): GeoJSON.Feature | null {
  const geometry = feature.geometry;
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    return null;
  }

  try {
    let candidate = turf.cleanCoords(feature) as GeoJSON.Feature;
    candidate = turf.simplify(candidate, { tolerance: SIMPLIFY_TOLERANCE_DEG, highQuality: true }) as GeoJSON.Feature;
    const geom = candidate.geometry;
    if (!geom) return null;

    if (geom.type === "Polygon") {
      const ring = removeCollinearRingPoints(geom.coordinates[0] as [number, number][]);
      candidate = turf.polygon([ring], candidate.properties ?? {});
    } else if (geom.type === "MultiPolygon") {
      const polygons = geom.coordinates.map((polyCoords) => {
        const ring = removeCollinearRingPoints(polyCoords[0] as [number, number][]);
        return [ring, ...polyCoords.slice(1)];
      });
      candidate = turf.multiPolygon(polygons, candidate.properties ?? {});
    }

    if (turf.booleanValid(candidate)) return candidate;
  } catch {
    return null;
  }
  return null;
}

function splitPolygonByLine(
  parcelGeo: GeoJSON.Feature<GeoJSON.Polygon>,
  lineCoords: [number, number][],
): [GeoJSON.Feature<GeoJSON.Polygon>, GeoJSON.Feature<GeoJSON.Polygon>] | null {
  if (lineCoords.length < 2) return null;

  const ring = parcelGeo.geometry.coordinates[0] as [number, number][];
  const a = lineCoords[0];
  const b = lineCoords[lineCoords.length - 1];
  const leftRing = clipRingWithLine(ring, a, b, true);
  const rightRing = clipRingWithLine(ring, a, b, false);
  if (leftRing.length < 4 || rightRing.length < 4) return null;

  const leftPoly = turf.polygon([leftRing]);
  const rightPoly = turf.polygon([rightRing]);
  if (turf.area(leftPoly) < 4 || turf.area(rightPoly) < 4) return null;

  return [leftPoly, rightPoly];
}

export function createMapEngine(target: HTMLElement, dataset: RegionDataset, callbacks: Callbacks = {}): EngineInstance {
  const format = new GeoJSON();

  function decoupleOlGeometry(feature: Feature<Geometry>) {
    const geometry = feature.getGeometry();
    if (!geometry) return;
    if (geometry.getType() === "Polygon") {
      (geometry as Polygon).setCoordinates(
        JSON.parse(JSON.stringify((geometry as Polygon).getCoordinates())),
      );
      return;
    }
    if (geometry.getType() === "MultiPolygon") {
      (geometry as MultiPolygon).setCoordinates(
        JSON.parse(JSON.stringify((geometry as MultiPolygon).getCoordinates())),
      );
    }
  }

  function normalizeOlParcelGeometry(feature: Feature<Geometry>) {
    const current = writeParcelGeoJson(feature);
    const simplified = simplifyParcelGeoJson(current) ?? sanitizeParcelGeoJson(current);
    if (simplified) {
      applyParcelGeoJson(feature, simplified);
    }
    decoupleOlGeometry(feature);
  }

  function sanitizeParcelGeoJson(feature: GeoJSON.Feature): GeoJSON.Feature | null {
    try {
      const simplified = simplifyParcelGeoJson(feature);
      if (simplified && turf.booleanValid(simplified)) return simplified;

      let candidate = turf.cleanCoords(feature) as GeoJSON.Feature;
      if (turf.booleanValid(candidate)) return candidate;
      const buffered = turf.buffer(candidate, 0, { units: "meters" });
      if (
        buffered?.geometry &&
        (buffered.geometry.type === "Polygon" || buffered.geometry.type === "MultiPolygon")
      ) {
        candidate = buffered as GeoJSON.Feature;
        if (turf.booleanValid(candidate)) return candidate;
      }
    } catch {
      return null;
    }
    return null;
  }

  function writeParcelGeoJson(feature: Feature<Geometry>) {
    return format.writeFeatureObject(feature, {
      featureProjection: "EPSG:3857",
      dataProjection: "EPSG:4326",
    }) as GeoJSON.Feature;
  }

  function applyParcelGeoJson(feature: Feature<Geometry>, geo: GeoJSON.Feature) {
    const geometry = format.readGeometry(geo.geometry!, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
    feature.setGeometry(geometry);
    const olGeometry = feature.getGeometry();
    if (olGeometry?.getType() === "Polygon" || olGeometry?.getType() === "MultiPolygon") {
      feature.set("areaSqM", Math.round((olGeometry as Polygon | MultiPolygon).getArea()));
    }
  }

  const analysisSource = new VectorSource();
  const parcelSource = new VectorSource();
  const genericSources: Record<LayerId, VectorSource> = {
    region: new VectorSource(),
    taluk: new VectorSource(),
    village: new VectorSource(),
    ward: new VectorSource(),
    adminState: new VectorSource(),
    adminDistrict: new VectorSource(),
    adminTaluka: new VectorSource(),
    adminVillage: new VectorSource(),
    fmb: new VectorSource(),
    fmbChains: new VectorSource(),
    parcelBoundaries: new VectorSource(),
    parcels: parcelSource,
    variance: new VectorSource(),
    dgps: new VectorSource(),
    collabland: new VectorSource(),
    ortho: new VectorSource(),
    crops: new VectorSource(),
    buildings: new VectorSource(),
    trees: new VectorSource(),
    roads: new VectorSource(),
    waterBodies: new VectorSource(),
    forest: new VectorSource(),
    cadastralDimensions: new VectorSource(),
  };

  const basemapCarto = new TileLayer({ source: createBasemapSource("basemap-carto"), visible: true });
  const basemapOSM = new TileLayer({ source: createBasemapSource("basemap-osm"), visible: false });
  const basemapImagery = new TileLayer({ source: createBasemapSource("basemap-imagery"), visible: false });
  let activeBasemapId: BasemapId = "basemap-carto";

  const styleByLayer: Record<LayerId | "analysis", Style> = {
    region: new Style({ stroke: new Stroke({ color: "#475569", width: 2 }), fill: new Fill({ color: "rgba(148,163,184,0.08)" }) }),
    taluk: new Style({ stroke: new Stroke({ color: "#64748b", width: 1.6 }), fill: new Fill({ color: "rgba(100,116,139,0.04)" }) }),
    village: new Style({ stroke: new Stroke({ color: "#0f766e", width: 1.2 }), fill: new Fill({ color: "rgba(20,184,166,0.05)" }) }),
    ward: new Style({ stroke: new Stroke({ color: "#3b82f6", width: 1.1 }), fill: new Fill({ color: "rgba(59,130,246,0.05)" }) }),
    adminState: new Style({ stroke: new Stroke({ color: "#7c3aed", width: 2.5 }) }),
    adminDistrict: new Style({ stroke: new Stroke({ color: "#9333ea", width: 2 }) }),
    adminTaluka: new Style({ stroke: new Stroke({ color: "#c4a574", width: 1.5 }) }),
    adminVillage: new Style({ stroke: new Stroke({ color: "#2563eb", width: 1 }) }),
    fmb: new Style({ stroke: new Stroke({ color: "#64748b", width: 1.1, lineDash: [5, 5] }), fill: new Fill({ color: "rgba(100,116,139,0.04)" }) }),
    fmbChains: new Style({ stroke: new Stroke({ color: "#b45309", width: 1.4, lineDash: [8, 5] }) }),
    parcels: new Style({ stroke: new Stroke({ color: "#22c55e", width: 0.8 }), fill: new Fill({ color: "#22c55e" }) }),
    parcelBoundaries: new Style({
      stroke: new Stroke({ color: "#22c55e", width: 1 }),
    }),
    variance: new Style({ stroke: new Stroke({ color: "#22c55e", width: 0.8 }), fill: new Fill({ color: "#22c55e" }) }),
    dgps: new Style({
      image: new CircleStyle({ radius: 5, fill: new Fill({ color: "#2563eb" }), stroke: new Stroke({ color: "#ffffff", width: 1.2 }) }),
    }),
    collabland: new Style({ stroke: new Stroke({ color: "#f59e0b", width: 2.5 }) }),
    ortho: new Style({ stroke: new Stroke({ color: "#94a3b8", width: 0.8 }), fill: new Fill({ color: "rgba(148,163,184,0.06)" }) }),
    crops: new Style({
      fill: new Fill({ color: "rgba(34,197,94,0.55)" }),
      stroke: new Stroke({ color: "rgba(21,128,61,0.7)", width: 0.6 }),
    }),
    buildings: new Style({
      fill: new Fill({ color: "rgba(156,163,175,0.85)" }),
      stroke: new Stroke({ color: "#374151", width: 1 }),
    }),
    trees: new Style({
      image: new CircleStyle({
        radius: 4,
        fill: new Fill({ color: "#15803d" }),
        stroke: new Stroke({ color: "#14532d", width: 1 }),
      }),
    }),
    roads: new Style({
      stroke: new Stroke({ color: "#78716c", width: 3 }),
    }),
    waterBodies: new Style({
      fill: new Fill({ color: "rgba(37,99,235,0.55)" }),
      stroke: new Stroke({ color: "#1d4ed8", width: 1 }),
    }),
    forest: new Style({
      fill: new Fill({ color: "rgba(21,128,61,0.65)" }),
      stroke: new Stroke({ color: "#14532d", width: 0.8 }),
    }),
    cadastralDimensions: new Style({
      stroke: new Stroke({ color: "#8B4513", width: 1.5, lineDash: [6, 4] }),
    }),
    analysis: new Style({
      stroke: new Stroke({ color: "#111827", width: 2, lineDash: [8, 6] }),
      fill: new Fill({ color: "rgba(59,130,246,0.08)" }),
      image: new CircleStyle({ radius: 4, fill: new Fill({ color: "#2563eb" }), stroke: new Stroke({ color: "#fff", width: 1.2 }) }),
    }),
  };

  let parcelsLayerVisible = true;
  let cropsLayerVisible = true;
  let varianceLayerVisible = false;
  /** User toggle: show green/amber/red fills on parcels (stroke always on). */
  let varianceFillVisible = false;
  let parcelEditDisplayMode = false;
  const dirtyParcelIds = new Set<string>();

  /** One opaque shade per band — no rgba, no darker stroke variants. */
  const variancePalette = {
    green: "#22c55e",
    amber: "#f59e0b",
    red: "#ef4444",
  } as const;

  const parcelBoundaryStroke = "#111827";

  type VarianceBand = keyof typeof variancePalette;

  function normalizeVarianceBand(value: unknown): VarianceBand {
    const band = String(value || "green").toLowerCase();
    if (band === "amber" || band === "red") return band;
    return "green";
  }

  function parcelVarianceBand(feature: Feature<Geometry>): VarianceBand {
    return normalizeVarianceBand(feature.get("varianceBand"));
  }

  function updateParcelBoundariesVisibility() {
    // Parcels layer owns fill + stroke; boundary overlay causes olive/brown stacking.
    layerMap.parcelBoundaries.setVisible(false);
  }

  function applyVarianceLayerVisibility() {
    const effectiveVisible = varianceFillVisible && !parcelsLayerVisible;
    varianceLayerVisible = effectiveVisible;
    layerMap.variance.setVisible(effectiveVisible);
  }

  function setVarianceFillVisible(visible: boolean) {
    varianceFillVisible = visible;
    applyVarianceLayerVisibility();
  }

  function parcelLabelGeometry(feature: Feature<Geometry>) {
    const geometry = feature.getGeometry();
    if (!geometry) return undefined;
    if (geometry.getType() === "Polygon") {
      return (geometry as Polygon).getInteriorPoint();
    }
    if (geometry.getType() === "MultiPolygon") {
      const polygons = (geometry as import("ol/geom").MultiPolygon).getPolygons();
      return polygons[0]?.getInteriorPoint();
    }
    return geometry;
  }

  function parcelLabelStyle(feature: Feature<Geometry>, resolution: number) {
    if (!parcelsLayerVisible || resolution >= 4.5) return undefined;
    const surveyNo = String(feature.get("surveyNo") || "");
    if (!surveyNo) return undefined;
    return new Text({
      text: surveyNo,
      font: "600 9px ui-monospace,Consolas,monospace",
      fill: new Fill({ color: "#1f2937" }),
      stroke: new Stroke({ color: "rgba(255,255,255,0.85)", width: 2.5 }),
      overflow: false,
      placement: "point",
      textAlign: "center",
      offsetY: cropsLayerVisible ? -6 : 0,
    });
  }

  function varianceLabelStyle(feature: Feature<Geometry>, resolution: number) {
    if (!varianceLayerVisible || parcelsLayerVisible || resolution >= 5) return undefined;
    const surveyNo = String(feature.get("surveyNo") || "");
    if (!surveyNo) return undefined;
    return new Text({
      text: surveyNo,
      font: "600 9px ui-monospace,Consolas,monospace",
      fill: new Fill({ color: "#111" }),
      stroke: new Stroke({ color: "#fff", width: 2 }),
      overflow: true,
    });
  }

  let selectedFmbChain: Feature<Geometry> | null = null;

  function fmbChainStyle(feature: Feature<Geometry>, resolution: number): Style | Style[] {
    const featureType = String(feature.get("featureType") || "chain");

    if (featureType === "boundaryPoint") {
      const label = String(feature.get("label") || "BP");
      return new Style({
        image: new CircleStyle({
          radius: 4,
          fill: new Fill({ color: "#b45309" }),
          stroke: new Stroke({ color: "#ffffff", width: 1.2 }),
        }),
        text:
          resolution < 2.5
            ? new Text({
                text: label,
                font: "600 8px ui-monospace,Consolas,monospace",
                offsetY: -10,
                fill: new Fill({ color: "#92400e" }),
                stroke: new Stroke({ color: "rgba(255,255,255,0.9)", width: 2 }),
              })
            : undefined,
      });
    }

    const selected = Boolean(feature.get("selected"));
    const bearing = String(feature.get("bearing") || "");
    const distance = String(feature.get("distance") || "");
    const geometry = feature.getGeometry();
    let labelGeometry: Point | undefined;

    if (geometry?.getType() === "LineString") {
      const coords = (geometry as LineString).getCoordinates();
      if (coords.length >= 2) {
        const mid: Coordinate = [
          (coords[0][0] + coords[coords.length - 1][0]) / 2,
          (coords[0][1] + coords[coords.length - 1][1]) / 2,
        ];
        labelGeometry = new Point(mid);
      }
    }

    const styles: Style[] = [
      new Style({
        stroke: new Stroke({
          color: selected ? "#ea580c" : "#b45309",
          width: selected ? 2.4 : 1.4,
          lineDash: selected ? [4, 4] : [8, 5],
        }),
      }),
    ];

    if (resolution < 2.8 && labelGeometry) {
      styles.push(
        new Style({
          geometry: labelGeometry,
          text: new Text({
            text: `${distance}\n${bearing}`,
            font: "500 8px ui-monospace,Consolas,monospace",
            fill: new Fill({ color: "#78350f" }),
            stroke: new Stroke({ color: "rgba(255,255,255,0.92)", width: 2.5 }),
            placement: "point",
            textAlign: "center",
          }),
        }),
      );
    }

    return styles;
  }

  const CADASTRAL_BROWN = "#8B4513";
  const CADASTRAL_BROWN_DARK = "#654321";

  function cadastralDimensionStyle(feature: Feature<Geometry>, resolution: number): Style | Style[] {
    const featureType = String(feature.get("featureType") || "chain");

    if (featureType === "boundaryPoint") {
      const label = String(feature.get("label") || "BP");
      return new Style({
        image: new CircleStyle({
          radius: 4,
          fill: new Fill({ color: CADASTRAL_BROWN }),
          stroke: new Stroke({ color: "#ffffff", width: 1.2 }),
        }),
        text:
          resolution < 2.5
            ? new Text({
                text: label,
                font: "600 8px ui-monospace,Consolas,monospace",
                offsetY: -10,
                fill: new Fill({ color: CADASTRAL_BROWN_DARK }),
                stroke: new Stroke({ color: "rgba(255,255,255,0.9)", width: 2 }),
              })
            : undefined,
      });
    }

    const bearing = String(feature.get("bearing") || "");
    const distance = String(feature.get("distance") || "");
    const geometry = feature.getGeometry();
    let labelGeometry: Point | undefined;

    if (geometry?.getType() === "LineString") {
      const coords = (geometry as LineString).getCoordinates();
      if (coords.length >= 2) {
        const mid: Coordinate = [
          (coords[0][0] + coords[coords.length - 1][0]) / 2,
          (coords[0][1] + coords[coords.length - 1][1]) / 2,
        ];
        labelGeometry = new Point(mid);
      }
    }

    const styles: Style[] = [
      new Style({
        stroke: new Stroke({
          color: CADASTRAL_BROWN,
          width: 1.5,
          lineDash: [6, 4],
        }),
      }),
    ];

    if (resolution < 2.8 && labelGeometry) {
      styles.push(
        new Style({
          geometry: labelGeometry,
          text: new Text({
            text: `${distance}\n${bearing}`,
            font: "500 8px ui-monospace,Consolas,monospace",
            fill: new Fill({ color: CADASTRAL_BROWN_DARK }),
            stroke: new Stroke({ color: "rgba(255,255,255,0.92)", width: 2.5 }),
            placement: "point",
            textAlign: "center",
          }),
        }),
      );
    }

    return styles;
  }

  function cropLabelGeometry(feature: Feature<Geometry>) {
    const geometry = feature.getGeometry();
    if (!geometry) return undefined;
    if (geometry.getType() === "Polygon") {
      return (geometry as Polygon).getInteriorPoint();
    }
    if (geometry.getType() === "MultiPolygon") {
      const polygons = (geometry as MultiPolygon).getPolygons();
      return polygons[0]?.getInteriorPoint();
    }
    return geometry;
  }

  function cropStyle(feature: Feature<Geometry>, resolution: number): Style | Style[] {
    const cropType = String(feature.get("cropType") || "Crop");
    const fillColor =
      CROP_COLORS[cropType as (typeof CROP_TYPES)[number]] ?? "rgba(34,197,94,0.55)";

    const styles: Style[] = [
      new Style({
        fill: new Fill({ color: fillColor }),
        stroke: new Stroke({ color: "rgba(21,128,61,0.75)", width: 0.7 }),
      }),
    ];

    if (resolution < 8) {
      const labelGeometry = cropLabelGeometry(feature);
      if (labelGeometry) {
        styles.push(
          new Style({
            geometry: labelGeometry,
            text: new Text({
              text: cropType,
              font: "600 8px ui-sans-serif,system-ui,sans-serif",
              fill: new Fill({ color: "#111827" }),
              stroke: new Stroke({ color: "rgba(255,255,255,0.8)", width: 2.5 }),
              overflow: false,
              placement: "point",
              textAlign: "center",
              offsetY: 8,
            }),
          }),
        );
      }
    }

    return styles;
  }

  function forestLabelGeometry(feature: Feature<Geometry>) {
    const geometry = feature.getGeometry();
    if (!geometry) return undefined;
    if (geometry.getType() === "Polygon") {
      return (geometry as Polygon).getInteriorPoint();
    }
    if (geometry.getType() === "MultiPolygon") {
      const polygons = (geometry as MultiPolygon).getPolygons();
      return polygons[0]?.getInteriorPoint();
    }
    return geometry;
  }

  function forestStyle(feature: Feature<Geometry>, resolution: number): Style | Style[] {
    const styles: Style[] = [
      new Style({
        fill: new Fill({ color: "rgba(21,128,61,0.65)" }),
        stroke: new Stroke({ color: "#14532d", width: 0.8 }),
      }),
    ];

    if (resolution < 8) {
      const labelGeometry = forestLabelGeometry(feature);
      if (labelGeometry) {
        styles.push(
          new Style({
            geometry: labelGeometry,
            text: new Text({
              text: "Forest",
              font: "600 10px ui-sans-serif,system-ui,sans-serif",
              fill: new Fill({ color: "#14532d" }),
              stroke: new Stroke({ color: "rgba(255,255,255,0.8)", width: 2.5 }),
              overflow: false,
              placement: "point",
            }),
          }),
        );
      }
    }

    return styles;
  }

  function roadStyle(feature: Feature<Geometry>): Style {
    const roadClass = String(feature.get("roadClass") || "path");
    return new Style({
      stroke: new Stroke({
        color: roadClass === "main" ? "#57534e" : "#a8a29e",
        width: roadClass === "main" ? 4 : 2,
        lineCap: "round",
        lineJoin: "round",
      }),
    });
  }

  const layerMap: Record<LayerId | "analysis", VectorLayer<VectorSource>> = {
    region: new VectorLayer({
      source: genericSources.region,
      style: styleByLayer.region,
      zIndex: 2,
      visible: false,
    }),
    taluk: new VectorLayer({
      source: genericSources.taluk,
      style: styleByLayer.taluk,
      zIndex: 3,
      visible: false,
    }),
    village: new VectorLayer({
      source: genericSources.village,
      style: styleByLayer.village,
      zIndex: 4,
      visible: false,
    }),
    ward: new VectorLayer({
      source: genericSources.ward,
      style: styleByLayer.ward,
      zIndex: 5,
      visible: false,
    }),
    adminState: new VectorLayer({
      source: genericSources.adminState,
      style: styleByLayer.adminState,
      zIndex: 2.1,
      visible: false,
    }),
    adminDistrict: new VectorLayer({
      source: genericSources.adminDistrict,
      style: styleByLayer.adminDistrict,
      zIndex: 2.2,
      visible: false,
    }),
    adminTaluka: new VectorLayer({
      source: genericSources.adminTaluka,
      style: styleByLayer.adminTaluka,
      zIndex: 2.3,
      visible: false,
    }),
    adminVillage: new VectorLayer({
      source: genericSources.adminVillage,
      style: styleByLayer.adminVillage,
      zIndex: 2.4,
      visible: false,
    }),
    fmb: new VectorLayer({ source: genericSources.fmb, style: styleByLayer.fmb, zIndex: 6 }),
    fmbChains: new VectorLayer({
      source: genericSources.fmbChains,
      zIndex: 9.5,
      visible: false,
      style: (feature, resolution) => fmbChainStyle(feature as Feature<Geometry>, resolution),
    }),
    parcelBoundaries: new VectorLayer({
      source: genericSources.parcelBoundaries,
      style: styleByLayer.parcelBoundaries,
      zIndex: 10,
    }),
    parcels: new VectorLayer({
      source: genericSources.parcels,
      zIndex: 9,
      style: (feature, resolution) => {
        const selected = Boolean(feature.get("selected"));
        const varianceHighlight = Boolean(feature.get("varianceHighlight"));
        const band = parcelVarianceBand(feature as Feature<Geometry>);
        let strokeWidth = parcelEditDisplayMode ? 1 : 0.65;
        const label = parcelLabelStyle(feature as Feature<Geometry>, resolution);
        const labelGeometry = label ? parcelLabelGeometry(feature as Feature<Geometry>) : undefined;

        if (selected) {
          strokeWidth = 1.4;
        }

        const showFill = varianceFillVisible || varianceHighlight;

        const styles = [
          new Style({
            stroke: new Stroke({ color: parcelBoundaryStroke, width: strokeWidth }),
            ...(showFill
              ? { fill: new Fill({ color: variancePalette[band] }) }
              : { fill: new Fill({ color: "rgba(0,0,0,0)" }) }),
          }),
        ];

        if (label && labelGeometry) {
          styles.push(
            new Style({
              geometry: labelGeometry,
              text: label,
            }),
          );
        }

        return styles;
      },
    }),
    variance: new VectorLayer({
      source: genericSources.variance,
      zIndex: 8,
      style: (feature, resolution) => {
        const band = normalizeVarianceBand(feature.get("band"));
        const color = variancePalette[band];
        return new Style({
          fill: new Fill({ color }),
          stroke: new Stroke({ color: parcelBoundaryStroke, width: 0.65 }),
          text: varianceLabelStyle(feature as Feature<Geometry>, resolution),
        });
      },
    }),
    dgps: new VectorLayer({
      source: genericSources.dgps,
      zIndex: 10,
      style: styleByLayer.dgps,
    }),
    collabland: new VectorLayer({ source: genericSources.collabland, style: styleByLayer.collabland, zIndex: 8 }),
    roads: new VectorLayer({
      source: genericSources.roads,
      zIndex: 6.5,
      visible: true,
      style: (feature) => roadStyle(feature as Feature<Geometry>),
    }),
    waterBodies: new VectorLayer({
      source: genericSources.waterBodies,
      style: styleByLayer.waterBodies,
      zIndex: 6.8,
      visible: true,
    }),
    forest: new VectorLayer({
      source: genericSources.forest,
      style: (feature, resolution) => forestStyle(feature as Feature<Geometry>, resolution),
      zIndex: 7,
      visible: true,
    }),
    crops: new VectorLayer({
      source: genericSources.crops,
      zIndex: 7.5,
      visible: true,
      style: (feature, resolution) => cropStyle(feature as Feature<Geometry>, resolution),
    }),
    buildings: new VectorLayer({
      source: genericSources.buildings,
      style: styleByLayer.buildings,
      zIndex: 8,
      visible: true,
    }),
    trees: new VectorLayer({
      source: genericSources.trees,
      zIndex: 8.5,
      visible: true,
      style: styleByLayer.trees,
    }),
    cadastralDimensions: new VectorLayer({
      source: genericSources.cadastralDimensions,
      zIndex: 9.6,
      visible: false,
      style: (feature, resolution) =>
        cadastralDimensionStyle(feature as Feature<Geometry>, resolution),
    }),
    ortho: new VectorLayer({ source: genericSources.ortho, style: styleByLayer.ortho, zIndex: 1 }),
    analysis: new VectorLayer({ source: analysisSource, style: styleByLayer.analysis, zIndex: 11 }),
  };

  function clearFmbChainSelection() {
    if (selectedFmbChain) {
      selectedFmbChain.set("selected", false);
      selectedFmbChain = null;
      layerMap.fmbChains.changed();
    }
  }

  function selectFmbChainFeature(feature: Feature<Geometry>) {
    clearFmbChainSelection();
    feature.set("selected", true);
    selectedFmbChain = feature;
    layerMap.fmbChains.changed();
  }

  layerMap.variance.setVisible(false);
  layerMap.parcels.setOpacity(1);
  updateParcelBoundariesVisibility();

  const map = new Map({
    target,
    controls: defaultControls({ zoom: false, attribution: false }),
    layers: [
      basemapCarto,
      basemapOSM,
      basemapImagery,
      layerMap.ortho,
      layerMap.region,
      layerMap.taluk,
      layerMap.village,
      layerMap.ward,
      layerMap.adminState,
      layerMap.adminDistrict,
      layerMap.adminTaluka,
      layerMap.adminVillage,
      layerMap.fmb,
      layerMap.roads,
      layerMap.waterBodies,
      layerMap.forest,
      layerMap.crops,
      layerMap.buildings,
      layerMap.trees,
      layerMap.variance,
      layerMap.collabland,
      layerMap.parcels,
      layerMap.fmbChains,
      layerMap.cadastralDimensions,
      layerMap.parcelBoundaries,
      layerMap.dgps,
      layerMap.analysis,
    ],
    view: new View({
      center: fromLonLat(dataset.center),
      zoom: dataset.zoom,
      minZoom: 12,
      maxZoom: getBasemapMaxZoom(activeBasemapId),
    }),
  });

  const select = new Select({ layers: [layerMap.parcels], style: null, multi: true });
  map.addInteraction(select);

  const activeInteractions: Array<Modify | Draw | Snap> = [];

  function refreshStyledLayers() {
    layerMap.parcels.changed();
    layerMap.parcelBoundaries.changed();
    layerMap.variance.changed();
  }

  function exteriorRingsFromParcel(feature: Feature<Geometry>): [number, number][][] {
    const geometry = feature.getGeometry();
    if (!geometry) return [];
    if (geometry.getType() === "Polygon") {
      return [(geometry as Polygon).getCoordinates()[0] as [number, number][]];
    }
    if (geometry.getType() === "MultiPolygon") {
      return (geometry as MultiPolygon)
        .getPolygons()
        .map((polygon) => polygon.getCoordinates()[0] as [number, number][]);
    }
    return [];
  }

  function boundaryLinesFromParcel(feature: Feature<Geometry>): Feature<Geometry>[] {
    const parcelId = feature.get("id");
    return exteriorRingsFromParcel(feature).flatMap((ring, ringIndex) => {
      if (ring.length < 2) return [];
      const closed =
        ring.length >= 4 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
          ? ring
          : [...ring, ring[0]];
      const line = new Feature(new LineString(closed));
      if (parcelId !== undefined) line.set("parcelId", parcelId);
      line.set("ringIndex", ringIndex);
      return [line];
    });
  }

  function syncParcelBoundariesFromParcels() {
    const parcels = parcelSource.getFeatures();
    genericSources.parcelBoundaries.clear();
    if (!parcels.length) {
      layerMap.parcelBoundaries.changed();
      return;
    }

    const lines = parcels.flatMap((parcel) => boundaryLinesFromParcel(parcel));
    if (lines.length) {
      genericSources.parcelBoundaries.addFeatures(lines);
    }
    updateParcelBoundariesVisibility();
    layerMap.parcelBoundaries.changed();
  }

  function syncVarianceFromParcels() {
    genericSources.variance.clear();
    const parcels = parcelSource.getFeatures();
    if (!parcels.length) {
      layerMap.variance.changed();
      return;
    }

    const varianceFeatures = parcels.flatMap((parcel) => {
      const parcelGeo = writeParcelGeoJson(parcel);
      const geometry = parcelGeo.geometry;
      if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) return [];

      const band = normalizeVarianceBand(parcel.get("varianceBand"));
      const properties = {
        band,
        pct: parcel.get("variancePct") ?? 0,
        surveyNo: parcel.get("surveyNo"),
        parcelId: parcel.get("id"),
      };

      if (geometry.type === "Polygon") {
        return [
          format.readFeature(
            { type: "Feature", properties, geometry },
            { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" },
          ) as Feature<Geometry>,
        ];
      }

      return geometry.coordinates.map((polygonCoords) =>
        format.readFeature(
          {
            type: "Feature",
            properties,
            geometry: { type: "Polygon", coordinates: polygonCoords },
          },
          { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" },
        ),
      ) as Feature<Geometry>[];
    });

    if (varianceFeatures.length) {
      genericSources.variance.addFeatures(varianceFeatures);
    }
    layerMap.variance.changed();
  }

  function markParcelDirty(feature: Feature<Geometry>) {
    const parcelId = String(feature.get("id"));
    feature.set("geometryDirty", true);
    dirtyParcelIds.add(parcelId);
  }

  function commitParcelGeometry(parcelId: string) {
    const feature = parcelSource
      .getFeatures()
      .find((parcel) => String(parcel.get("id")) === String(parcelId));
    if (!feature || !dirtyParcelIds.has(String(parcelId))) return false;

    const current = writeParcelGeoJson(feature);
    const sanitized = sanitizeParcelGeoJson(current);
    if (!sanitized) {
      callbacks.onToast?.("Invalid geometry — edit rejected");
      return false;
    }

    applyParcelGeoJson(feature, sanitized);
    decoupleOlGeometry(feature);
    feature.set("geometryDirty", false);
    dirtyParcelIds.delete(String(parcelId));
    syncParcelBoundariesFromParcels();
    syncVarianceFromParcels();
    exitParcelEditDisplayMode();
    refreshStyledLayers();
    callbacks.onToast?.("Parcel geometry saved");
    return true;
  }

  function enterParcelEditDisplayMode() {
    if (!parcelSource.getFeatures().length) return;
    parcelEditDisplayMode = true;
    updateParcelBoundariesVisibility();
    refreshStyledLayers();
  }

  function exitParcelEditDisplayMode() {
    if (!parcelEditDisplayMode) return;
    parcelEditDisplayMode = false;
    if (dirtyParcelIds.size === 0) {
      syncParcelBoundariesFromParcels();
    } else {
      updateParcelBoundariesVisibility();
    }
    refreshStyledLayers();
  }

  function clearInteractions() {
    activeInteractions.forEach((interaction) => {
      if (interaction instanceof Draw) {
        interaction.abortDrawing();
      }
      map.removeInteraction(interaction);
    });
    activeInteractions.length = 0;
    analysisSource.clear();
    exitParcelEditDisplayMode();
  }

  function resetTools(silent = false) {
    clearInteractions();
    if (!silent) callbacks.onToast?.("Tools reset");
  }

  function isValidExtent(extent: number[]) {
    return extent.length === 4 && extent.every((value) => Number.isFinite(value));
  }

  function isValidCadastralView(view?: { center: [number, number]; zoom: number }) {
    if (!view) return false;
    return view.center.every((value) => Number.isFinite(value)) && Number.isFinite(view.zoom);
  }

  function fitToParcels(fallback: RegionDataset, duration = 500) {
    const fitMaxZoom = getBasemapMaxZoom(activeBasemapId);

    if (isValidCadastralView(fallback.cadastralView)) {
      const mapSize = map.getSize();
      const viewportHeightPx = mapSize?.[1] ?? 900;
      const pannedCenter = offsetCenterForDefaultPan(
        fallback.cadastralView.center,
        fallback.cadastralView.zoom,
        viewportHeightPx,
      );
      map.getView().animate({
        center: fromLonLat(pannedCenter),
        zoom: Math.min(fallback.cadastralView.zoom, fitMaxZoom),
        duration,
      });
      return;
    }

    const extent = parcelSource.getExtent();
    if (extent && isValidExtent(extent)) {
      map.getView().fit(extent, { padding: [28, 28, 28, 28], duration, maxZoom: fitMaxZoom });
      return;
    }

    const boundaryExtent = genericSources.parcelBoundaries.getExtent();
    if (boundaryExtent && isValidExtent(boundaryExtent)) {
      map.getView().fit(boundaryExtent, { padding: [28, 28, 28, 28], duration, maxZoom: fitMaxZoom });
      return;
    }

    map.getView().animate({
      center: fromLonLat(fallback.center),
      zoom: Math.min(fallback.zoom, fitMaxZoom),
      duration,
    });
  }

  function loadDataset(next: RegionDataset, options?: SetDatasetOptions) {
    dirtyParcelIds.clear();
    clearFmbChainSelection();
    (Object.keys(genericSources) as LayerId[]).forEach((layerId) => {
      if (ADMIN_BOUNDARY_LAYER_IDS.includes(layerId as AdminBoundaryLayerId)) return;
      if (LEGACY_MOCK_ADMIN_LAYER_IDS.includes(layerId as (typeof LEGACY_MOCK_ADMIN_LAYER_IDS)[number])) {
        genericSources[layerId].clear();
        return;
      }
      genericSources[layerId].clear();
      if (layerId === "parcelBoundaries" || layerId === "variance") return;
      const collection = next.geojson[layerId];
      if (!collection) return;
      const features = format.readFeatures(collection, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      if (layerId === "parcels") {
        features.forEach((feature) => {
          const olFeature = feature as Feature<Geometry>;
          normalizeOlParcelGeometry(olFeature);
          olFeature.set("varianceBand", normalizeVarianceBand(olFeature.get("varianceBand")));
        });
      }
      genericSources[layerId].addFeatures(features);
    });
    if (parcelSource.getFeatures().length > 0) {
      syncParcelBoundariesFromParcels();
      syncVarianceFromParcels();
    }
    fitToParcels(next, options?.transitionDuration ?? 500);
    map.updateSize();
  }

  loadDataset(dataset);

  void loadAdminBoundaryGeoJson().then((collections) => {
    ADMIN_BOUNDARY_LAYER_IDS.forEach((layerId) => {
      const collection = collections[layerId];
      if (!collection?.features?.length) return;
      const features = format.readFeatures(collection, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      genericSources[layerId].addFeatures(features);
    });
  });

  select.on("select", () => {
    const selected = select.getFeatures().getArray();
    const selectedSet = new Set(selected.map((f) => f.get("id")));
    parcelSource.getFeatures().forEach((f) => f.set("selected", selectedSet.has(f.get("id"))));
    callbacks.onSelectionChange?.(selected[0] ? parcelToRecord(selected[0]) : null);
  });

  map.getViewport().addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const pixel = map.getEventPixel(event);
    const parcel = map.forEachFeatureAtPixel(pixel, (feature, layer) => {
      if (layer === layerMap.parcels) return feature;
      return null;
    });
    if (!parcel) return;
    const parcelFeature = parcel as Feature<Geometry>;
    callbacks.onParcelContext?.(
      parcelToRecord(parcelFeature),
      {
        pixel,
        mapCoord: map.getCoordinateFromPixel(pixel),
      },
      { geometryDirty: dirtyParcelIds.has(String(parcelFeature.get("id"))) },
    );
  });

  map.on("singleclick", (event) => {
    const pixel = event.pixel;
    const mapCoord = map.getCoordinateFromPixel(pixel);

    const fmbChain = map.forEachFeatureAtPixel(pixel, (feature, layer) => {
      if (layer === layerMap.fmbChains && feature.get("featureType") === "chain") return feature;
      return null;
    });

    if (fmbChain) {
      const chainFeature = fmbChain as Feature<Geometry>;
      selectFmbChainFeature(chainFeature);
      const props = chainFeature.getProperties();
      const { geometry, ...rest } = props as Record<string, unknown>;
      void geometry;
      callbacks.onFmbChainClick?.(
        {
          fmbText: String(rest.fmbText ?? ""),
          properties: rest,
        },
        { pixel, mapCoord },
      );
      return;
    }

    clearFmbChainSelection();

    const parcel = map.forEachFeatureAtPixel(pixel, (feature, layer) => {
      if (layer === layerMap.parcels) return feature;
      return null;
    });
    if (parcel) {
      callbacks.onParcelClick?.(parcelToRecord(parcel as Feature<Geometry>), mapCoord);
    }
    callbacks.onMapClick?.(pixel, Boolean(parcel));
  });

  function startVertexEdit() {
    clearInteractions();
    const selected = select.getFeatures();
    if (selected.getLength() === 0) {
      callbacks.onToast?.("Select a parcel before vertex edit");
      return;
    }

    enterParcelEditDisplayMode();
    selected.forEach((feature) => normalizeOlParcelGeometry(feature as Feature<Geometry>));
    const geometryBackup = new globalThis.Map<Feature<Geometry>, string>();

    const modify = new Modify({ features: selected });
    const snap = new Snap({ features: selected });

    modify.on("modifystart", (event) => {
      updateParcelBoundariesVisibility();
      event.features.forEach((feature) => {
        const olFeature = feature as Feature<Geometry>;
        geometryBackup.set(olFeature, JSON.stringify(writeParcelGeoJson(olFeature).geometry));
      });
    });

    modify.on("modifyend", (event) => {
      let rejected = false;
      event.features.forEach((feature) => {
        const olFeature = feature as Feature<Geometry>;
        const current = writeParcelGeoJson(olFeature);
        const sanitized = sanitizeParcelGeoJson(current);
        if (sanitized) {
          applyParcelGeoJson(olFeature, sanitized);
          decoupleOlGeometry(olFeature);
          markParcelDirty(olFeature);
          return;
        }

        const backup = geometryBackup.get(olFeature);
        if (backup) {
          applyParcelGeoJson(olFeature, {
            type: "Feature",
            properties: current.properties ?? {},
            geometry: JSON.parse(backup),
          });
          rejected = true;
        }
      });

      updateParcelBoundariesVisibility();
      callbacks.onToast?.(
        rejected
          ? "Invalid geometry rejected — edit reverted"
          : "Geometry modified — right-click parcel and Send for approval",
      );
    });

    map.addInteraction(modify);
    map.addInteraction(snap);
    activeInteractions.push(modify, snap);
    callbacks.onToast?.("Vertex edit active — selected parcel only");
  }

  function splitSelectedWithDraw() {
    clearInteractions();
    enterParcelEditDisplayMode();
    const draw = new Draw({ source: analysisSource, type: "LineString" });
    draw.on("drawend", (event) => {
      const selected = select.getFeatures().item(0);
      if (!selected) {
        callbacks.onToast?.("Select one parcel before split");
        analysisSource.clear();
        return;
      }
      const parcelGeo = format.writeFeatureObject(selected, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      }) as GeoJSON.Feature<GeoJSON.Polygon>;
      const lineGeo = format.writeFeatureObject(event.feature, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      }) as GeoJSON.Feature<GeoJSON.LineString>;
      const splitResult = splitPolygonByLine(parcelGeo, lineGeo.geometry.coordinates as [number, number][]);
      if (!splitResult) {
        callbacks.onToast?.("Split failed: line not crossing polygon");
        analysisSource.clear();
        return;
      }

      const sourceId = String(selected.get("id"));
      const sourceSurveyNo = String(selected.get("surveyNo") || sourceId);
      parcelSource.removeFeature(selected);
      select.getFeatures().clear();

      splitResult.forEach((polygon, index) => {
        const suffix = index === 0 ? "A" : "B";
        const feature = format.readFeature(polygon, {
          dataProjection: "EPSG:4326",
          featureProjection: "EPSG:3857",
        }) as Feature<Geometry>;

        Object.keys(parcelGeo.properties ?? {}).forEach((key) => {
          if (parcelGeo.properties?.[key] !== undefined) feature.set(key, parcelGeo.properties[key]);
        });

        feature.set("id", `${sourceId}${suffix}`);
        feature.set("surveyNo", `${sourceSurveyNo}${suffix}`);
        feature.set("areaSqM", Math.round((feature.getGeometry() as Polygon | null)?.getArea() ?? 0));
        feature.set("selected", index === 0);
        normalizeOlParcelGeometry(feature);
        parcelSource.addFeature(feature);
        if (index === 0) select.getFeatures().push(feature);
      });
      analysisSource.clear();
      syncParcelBoundariesFromParcels();
      syncVarianceFromParcels();
      callbacks.onToast?.("Parcel split completed");
    });
    map.addInteraction(draw);
    activeInteractions.push(draw);
    callbacks.onToast?.("Draw split line across selected parcel");
  }

  function startMeasureDistance() {
    clearInteractions();
    const draw = new Draw({ source: analysisSource, type: "LineString" });
    draw.on("drawend", (event) => {
      const geom = event.feature.getGeometry() as any;
      const length = geom?.getLength?.() ?? 0;
      callbacks.onToast?.(
        `Distance: ${length >= 1000 ? `${(length / 1000).toFixed(2)} km` : `${length.toFixed(2)} m`}`,
      );
    });
    map.addInteraction(draw);
    activeInteractions.push(draw);
    callbacks.onToast?.("Draw line to measure distance");
  }

  function startBuffer() {
    clearInteractions();
    const draw = new Draw({ source: analysisSource, type: "Point" });
    draw.on("drawend", (event) => {
      const radiusInput = window.prompt("Buffer radius in meters", "60");
      const radius = Number(radiusInput);
      if (!Number.isFinite(radius) || radius <= 0) {
        callbacks.onToast?.("Invalid buffer radius");
        analysisSource.clear();
        return;
      }
      const pointGeo = format.writeFeatureObject(event.feature, {
        featureProjection: "EPSG:3857",
        dataProjection: "EPSG:4326",
      }) as GeoJSON.Feature<GeoJSON.Point>;
      const buffered = turf.buffer(pointGeo, radius, { units: "meters" });
      const feature = format.readFeature(buffered, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }) as Feature<Geometry>;
      analysisSource.clear();
      analysisSource.addFeature(feature);
      callbacks.onToast?.(`Buffer created (${radius.toFixed(0)} m)`);
    });
    map.addInteraction(draw);
    activeInteractions.push(draw);
    callbacks.onToast?.("Click map to create buffer");
  }

  function runAmalgamation() {
    clearInteractions();
    const selected = select.getFeatures().getArray();
    if (selected.length < 2) return { ok: false, reason: "Select at least two parcels for amalgamation." };

    const turfFeatures = selected.map((feature) =>
      format.writeFeatureObject(feature, { featureProjection: "EPSG:3857", dataProjection: "EPSG:4326" }),
    ) as GeoJSON.Feature[];

    const result = unionWithGapTolerance(turfFeatures);
    if (!result.feature) return { ok: false, reason: "Union failed." };
    if (result.parts > 1) {
      return { ok: false, reason: "Parcels are too far apart; select adjacent geometries." };
    }

    const merged = format.readFeature(result.feature, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    }) as Feature<Geometry>;
    const first = selected[0];
    const mergedId = `${first.get("id").replace("-P-", "-M-")}-${Date.now().toString().slice(-4)}`;
    merged.set("id", mergedId);
    merged.set("surveyNo", `MERGED-${first.get("surveyNo")}`);
    merged.set("status", "mutation_pending");
    merged.set("varianceBand", normalizeVarianceBand(first.get("varianceBand")));
    merged.set("variancePct", first.get("variancePct") ?? 2.5);
    merged.set("selected", true);
    normalizeOlParcelGeometry(merged);
    selected.forEach((feature) => {
      dirtyParcelIds.delete(String(feature.get("id")));
      parcelSource.removeFeature(feature);
    });
    parcelSource.addFeature(merged);
    select.getFeatures().clear();
    select.getFeatures().push(merged);
    syncParcelBoundariesFromParcels();
    syncVarianceFromParcels();
    refreshStyledLayers();
    callbacks.onToast?.("Amalgamation completed");
    return { ok: true };
  }

  function highlightParcels(ids: string[], options?: { colorByVariance?: boolean }) {
    select.getFeatures().clear();
    const idSet = new Set(ids.map(String));
    const colorByVariance = options?.colorByVariance ?? false;
    parcelSource.getFeatures().forEach((feature) => {
      const isMatch = idSet.has(String(feature.get("id")));
      feature.set("selected", isMatch);
      feature.set("varianceHighlight", isMatch && colorByVariance);
    });
    refreshStyledLayers();

    const matched = parcelSource.getFeatures().filter((feature) => idSet.has(String(feature.get("id"))));
    if (!matched.length) return;

    let extent = matched[0].getGeometry()?.getExtent();
    matched.slice(1).forEach((feature) => {
      const geometry = feature.getGeometry();
      if (!geometry || !extent) return;
      extent = [
        Math.min(extent[0], geometry.getExtent()[0]),
        Math.min(extent[1], geometry.getExtent()[1]),
        Math.max(extent[2], geometry.getExtent()[2]),
        Math.max(extent[3], geometry.getExtent()[3]),
      ];
    });

    if (extent && extent.every((value) => Number.isFinite(value))) {
      map.getView().fit(extent, {
        padding: [48, 48, 48, 48],
        duration: 650,
        maxZoom: getBasemapMaxZoom(activeBasemapId),
      });
    }
  }

  function clearHighlights() {
    select.getFeatures().clear();
    parcelSource.getFeatures().forEach((feature) => {
      feature.set("selected", false);
      feature.set("varianceHighlight", false);
    });
    refreshStyledLayers();
  }

  return {
    map,
    setDataset: loadDataset,
    setBasemap: (id: string) => {
      const basemapId = id as BasemapId;
      activeBasemapId = basemapId;
      basemapCarto.setVisible(id === "basemap-carto");
      basemapOSM.setVisible(id === "basemap-osm");
      basemapImagery.setVisible(id === "basemap-imagery");
      const maxZoom = getBasemapMaxZoom(basemapId);
      const view = map.getView();
      view.setMaxZoom(maxZoom);
      const zoom = view.getZoom();
      if (zoom !== undefined && zoom > maxZoom) {
        view.setZoom(maxZoom);
      }
    },
    setLayerVisibility: (id: string, visible: boolean) => {
      if (id === "variance") {
        setVarianceFillVisible(visible);
        refreshStyledLayers();
        return;
      }

      const layer = layerMap[id as LayerId];
      if (layer) layer.setVisible(visible);
      if (id === "parcels") {
        parcelsLayerVisible = visible;
        applyVarianceLayerVisibility();
        updateParcelBoundariesVisibility();
      }
      if (id === "crops") {
        cropsLayerVisible = visible;
        layerMap.crops.changed();
      }
      refreshStyledLayers();
    },
    setTool: (tool: MapTool) => {
      if (tool === "none") {
        resetTools();
        return;
      }
      if (tool === "vertex-edit") startVertexEdit();
      if (tool === "split") splitSelectedWithDraw();
      if (tool === "measure-distance") startMeasureDistance();
      if (tool === "buffer") startBuffer();
      if (tool === "amalgamate") {
        const result = runAmalgamation();
        if (!result.ok && result.reason) callbacks.onToast?.(result.reason);
        return;
      }
    },
    runAmalgamation,
    commitParcelGeometry,
    resetTools,
    highlightParcels,
    clearHighlights,
    clearInteractions,
    dispose: () => {
      clearInteractions();
      map.setTarget(undefined);
    },
  };
}
