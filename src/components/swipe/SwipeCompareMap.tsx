import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import type { FeatureLike } from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import * as turf from "@turf/turf";
import { defaults as defaultControls } from "ol/control";
import { createBasemapSource } from "../../lib/basemaps";
import { SWIPE_CONTEXT, type SwipeLayerId } from "../../data/swipeCompareMock";
import { getWorkbenchRegionDatasetSync } from "../../data/workbenchParcels";
import { DEFAULT_REGION_KEY } from "../../data/mockData";

const LAYER_STYLES: Record<string, Style> = {
  imagery: new Style({ fill: new Fill({ color: "rgba(34,197,94,0.15)" }), stroke: new Stroke({ color: "#16a34a", width: 2 }) }),
  fmb: new Style({ fill: new Fill({ color: "rgba(251,191,36,0.2)" }), stroke: new Stroke({ color: "#d97706", width: 2, lineDash: [6, 4] }) }),
  "mutation-before": new Style({ fill: new Fill({ color: "rgba(148,163,184,0.25)" }), stroke: new Stroke({ color: "#64748b", width: 2 }) }),
  "mutation-after": new Style({ fill: new Fill({ color: "rgba(59,130,246,0.25)" }), stroke: new Stroke({ color: "#2563eb", width: 2 }) }),
  survey: new Style({ fill: new Fill({ color: "rgba(168,85,247,0.15)" }), stroke: new Stroke({ color: "#9333ea", width: 1.5 }) }),
  dgps: new Style({ fill: new Fill({ color: "rgba(236,72,153,0.2)" }), stroke: new Stroke({ color: "#db2777", width: 2 }) }),
  satellite: new Style({ fill: new Fill({ color: "rgba(20,184,166,0.15)" }), stroke: new Stroke({ color: "#0d9488", width: 1.5 }) }),
  vector: new Style({ fill: new Fill({ color: "rgba(99,102,241,0.2)" }), stroke: new Stroke({ color: "#4f46e5", width: 2 }) }),
  scan: new Style({ fill: new Fill({ color: "rgba(234,179,8,0.2)" }), stroke: new Stroke({ color: "#ca8a04", width: 2, lineDash: [4, 6] }) }),
};

function styleForLayer(layerId: SwipeLayerId): Style {
  const map: Record<SwipeLayerId, string> = {
    "drone-ortho": "imagery",
    "georef-fmb": "fmb",
    "before-mutation": "mutation-before",
    "after-mutation": "mutation-after",
    "survey-2020": "survey",
    "dgps-2025": "dgps",
    satellite: "satellite",
    "digitized-parcel": "vector",
    "original-scan": "scan",
  };
  return LAYER_STYLES[map[layerId]] ?? LAYER_STYLES.vector;
}

function buildParcelFeatures(offsetLon = 0, offsetLat = 0): FeatureLike[] {
  const dataset = getWorkbenchRegionDatasetSync(DEFAULT_REGION_KEY);
  const format = new GeoJSON();
  const features = format.readFeatures(dataset.geojson.parcels, {
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });
  if (offsetLon === 0 && offsetLat === 0) return features.slice(0, 28);
  return features.slice(0, 28).flatMap((feature) => {
    const geom = feature.getGeometry()?.clone();
    if (!geom) return [];
    const geo = format.writeGeometryObject(geom, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
    const shifted = turf.transformTranslate(
      { type: "Feature", properties: {}, geometry: geo },
      Math.hypot(offsetLon, offsetLat) * 111000,
      Math.atan2(offsetLat, offsetLon) * (180 / Math.PI),
    );
    return format.readFeatures(shifted, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
  });
}

type SwipeCompareMapProps = {
  layerA: SwipeLayerId;
  layerB: SwipeLayerId;
  swipePercent: number;
};

export default function SwipeCompareMap({ layerA, layerB, swipePercent }: SwipeCompareMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const layerARef = useRef<VectorLayer<VectorSource<FeatureLike>> | null>(null);
  const layerBRef = useRef<VectorLayer<VectorSource<FeatureLike>> | null>(null);
  const swipeRef = useRef(swipePercent);
  swipeRef.current = swipePercent;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const vectorA = new VectorLayer({
      source: new VectorSource({ features: buildParcelFeatures(-0.00008, 0.00004) }),
      style: styleForLayer(layerA),
    });
    const vectorB = new VectorLayer({
      source: new VectorSource({ features: buildParcelFeatures(0, 0) }),
      style: styleForLayer(layerB),
    });

    vectorB.on("prerender", (event) => {
      const map = mapRef.current;
      if (!map) return;
      const ctx = event.context as CanvasRenderingContext2D;
      const size = map.getSize();
      if (!size) return;
      const clipX = (swipeRef.current / 100) * size[0];
      ctx.save();
      ctx.beginPath();
      ctx.rect(clipX, 0, size[0] - clipX, size[1]);
      ctx.clip();
    });
    vectorB.on("postrender", (event) => {
      (event.context as CanvasRenderingContext2D).restore();
    });

    layerARef.current = vectorA;
    layerBRef.current = vectorB;

    const map = new Map({
      target: containerRef.current,
      controls: defaultControls({ zoom: true, rotate: false, attribution: false }),
      layers: [new TileLayer({ source: createBasemapSource("basemap-imagery") }), vectorA, vectorB],
      view: new View({ center: fromLonLat(SWIPE_CONTEXT.center), zoom: SWIPE_CONTEXT.zoom }),
    });
    mapRef.current = map;

    const resize = () => map.updateSize();
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    layerARef.current?.setStyle(styleForLayer(layerA));
    layerBRef.current?.setStyle(styleForLayer(layerB));
    mapRef.current?.render();
  }, [layerA, layerB]);

  useEffect(() => {
    mapRef.current?.render();
  }, [swipePercent]);

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-xl">
      <div ref={containerRef} className="h-full w-full" />
      <div
        className="pointer-events-none absolute bottom-0 top-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)]"
        style={{ left: `${swipePercent}%`, transform: "translateX(-50%)" }}
      />
    </div>
  );
}
