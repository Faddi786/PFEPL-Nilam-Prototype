import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import { LineString, Polygon } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style } from "ol/style";
import { defaults as defaultControls } from "ol/control";
import { createBasemapSource } from "../../lib/basemaps";
import { getSpatialContext } from "../../data/cadastralSpatialData";

export type MapOverlay = {
  id: string;
  type: "polygon" | "line";
  coordinates: [number, number][];
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  lineDash?: number[];
  zIndex?: number;
};

type MoreToolsMapProps = {
  overlays: MapOverlay[];
  center?: [number, number];
  zoom?: number;
  className?: string;
};

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

export default function MoreToolsMap({
  overlays,
  center = getSpatialContext().center,
  zoom = getSpatialContext().zoom,
  className = "h-full min-h-[320px] w-full rounded-xl",
}: MoreToolsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const vector = new VectorLayer({
      source: new VectorSource(),
      zIndex: 10,
    });
    layerRef.current = vector;

    const map = new Map({
      target: containerRef.current,
      controls: defaultControls({ zoom: true, rotate: false, attribution: false }),
      layers: [new TileLayer({ source: createBasemapSource("basemap-carto") }), vector],
      view: new View({ center: fromLonLat(center), zoom }),
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
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const source = layer.getSource();
    if (!source) return;
    source.clear();
    const sorted = [...overlays].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    source.addFeatures(sorted.map(overlayToFeature));
    layer.changed();
  }, [overlays]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.getView().setCenter(fromLonLat(center));
    map.getView().setZoom(zoom);
  }, [center, zoom]);

  return <div ref={containerRef} className={className} />;
}
