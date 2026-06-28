import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { fromLonLat } from "ol/proj";
import Feature from "ol/Feature";
import { Polygon } from "ol/geom";
import { Fill, Stroke, Style, Text } from "ol/style";
import { defaults as defaultControls } from "ol/control";
import { createBasemapSource } from "../../lib/basemaps";
import {
  getMutationColor,
  HEATMAP_CONTEXT,
  HEATMAP_VILLAGES,
  type HeatmapPeriod,
} from "../../data/heatmapMock";

type HeatmapMapProps = {
  period: HeatmapPeriod;
  selectedVillageId: string | null;
  onSelectVillage: (id: string | null) => void;
};

function villageStyle(count: number, selected: boolean): Style {
  const color = getMutationColor(count);
  return new Style({
    fill: new Fill({ color: color + (selected ? "cc" : "99") }),
    stroke: new Stroke({ color: selected ? "#1e293b" : "#ffffff", width: selected ? 2.5 : 1.2 }),
    text: new Text({
      text: String(count),
      font: "bold 11px system-ui",
      fill: new Fill({ color: "#1e293b" }),
      stroke: new Stroke({ color: "#ffffff", width: 3 }),
    }),
  });
}

export default function HeatmapMap({ period, selectedVillageId, onSelectVillage }: HeatmapMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const layerRef = useRef<VectorLayer<VectorSource> | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const features = HEATMAP_VILLAGES.map((v) => {
      return new Feature({
        geometry: new Polygon([v.ring.map((c) => fromLonLat(c))]),
        villageId: v.id,
        name: v.name,
        count: v.counts.month,
      });
    });

    const vector = new VectorLayer({
      source: new VectorSource({ features }),
      style: (feature) => {
        const id = feature.get("villageId") as string;
        const count = feature.get("count") as number;
        return villageStyle(count, id === selectedVillageId);
      },
    });
    layerRef.current = vector;

    const map = new Map({
      target: containerRef.current,
      controls: defaultControls({ zoom: true, rotate: false, attribution: false }),
      layers: [new TileLayer({ source: createBasemapSource("basemap-carto") }), vector],
      view: new View({ center: fromLonLat(HEATMAP_CONTEXT.center), zoom: HEATMAP_CONTEXT.zoom }),
    });

    map.on("click", (evt) => {
      const hit = map.forEachFeatureAtPixel(evt.pixel, (f) => f);
      onSelectVillage(hit ? (hit.get("villageId") as string) : null);
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
    const layer = layerRef.current;
    if (!layer) return;
    const source = layer.getSource();
    if (!source) return;
    source.getFeatures().forEach((f) => {
      const id = f.get("villageId") as string;
      const village = HEATMAP_VILLAGES.find((v) => v.id === id);
      if (village) f.set("count", village.counts[period]);
    });
    layer.setStyle((feature) => {
      const vid = feature.get("villageId") as string;
      const count = feature.get("count") as number;
      return villageStyle(count, vid === selectedVillageId);
    });
    layer.changed();
  }, [period, selectedVillageId]);

  return <div ref={containerRef} className="h-full min-h-[360px] w-full rounded-xl" />;
}
