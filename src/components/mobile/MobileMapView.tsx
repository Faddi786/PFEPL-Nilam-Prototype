import { useEffect, useRef, useState } from "react";
import Map from "ol/Map";
import View from "ol/View";
import { defaults as defaultControls } from "ol/control";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { fromLonLat } from "ol/proj";
import { Fill, Stroke, Style, Circle as CircleStyle, Text } from "ol/style";
import type Feature from "ol/Feature";
import type { Geometry } from "ol/geom";
import {
  DEFAULT_REGION_KEY,
  PARCEL_BOUNDARY_STROKE,
  VARIANCE_BAND_COLORS_SOLID,
  type RegionDataset,
} from "../../data/mockData";
import {
  getWorkbenchRegionDatasetSync,
  loadWorkbenchRegionDataset,
} from "../../data/workbenchParcels";
import type { CapturedGnssPoint } from "../../data/mobileApp";

import {
  createBasemapSource,
  getBasemapMaxZoom,
  offsetCenterForDefaultPan,
  type BasemapId,
} from "../../lib/basemaps";

export type MobileBasemapId = BasemapId;

type Props = {
  basemapId: MobileBasemapId;
  showParcels: boolean;
  showVariance: boolean;
  showDgps: boolean;
  dgpsShowPending: boolean;
  dgpsShowUploaded: boolean;
  gnssPoints: CapturedGnssPoint[];
  onParcelClick: (parcelId: string) => void;
};

function gnssToFeatures(points: CapturedGnssPoint[]) {
  return {
    type: "FeatureCollection" as const,
    features: points.map((point) => ({
      type: "Feature" as const,
      properties: { id: point.id, label: point.label, synced: point.synced },
      geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] },
    })),
  };
}

function dgpsPointStyle(feature: Feature<Geometry>, showPending: boolean, showUploaded: boolean) {
  const uploaded = Boolean(feature.get("uploaded"));
  if ((uploaded && !showUploaded) || (!uploaded && !showPending)) return undefined;

  const color = uploaded ? "#10b981" : "#f59e0b";

  return new Style({
    image: new CircleStyle({
      radius: 5,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
    }),
    text: new Text({
      text: String(feature.get("id") || "").replace("PY-GCP-", ""),
      font: "600 8px Inter, sans-serif",
      fill: new Fill({ color: uploaded ? "#065f46" : "#92400e" }),
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
      offsetY: -12,
    }),
  });
}

function normalizeVarianceBand(value: unknown): keyof typeof VARIANCE_BAND_COLORS_SOLID {
  const band = String(value || "green").toLowerCase();
  if (band === "amber" || band === "red") return band;
  return "green";
}

function parcelStyle(feature: Feature<Geometry>, resolution: number, showVariance: boolean) {
  const surveyNo = String(feature.get("surveyNo") || "");
  const fillColor = showVariance
    ? VARIANCE_BAND_COLORS_SOLID[normalizeVarianceBand(feature.get("varianceBand"))]
    : "rgba(0,0,0,0)";
  return new Style({
    stroke: new Stroke({ color: PARCEL_BOUNDARY_STROKE, width: 0.65 }),
    fill: new Fill({ color: fillColor }),
    text:
      resolution < 6 && surveyNo
        ? new Text({
            text: surveyNo,
            font: "600 9px Inter, system-ui, sans-serif",
            fill: new Fill({ color: "#111827" }),
            stroke: new Stroke({ color: "#ffffff", width: 2.5 }),
            overflow: true,
          })
        : undefined,
  });
}

export default function MobileMapView({
  basemapId,
  showParcels,
  showVariance,
  showDgps,
  dgpsShowPending,
  dgpsShowUploaded,
  gnssPoints,
  onParcelClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const basemapLayersRef = useRef<Record<MobileBasemapId, TileLayer>>({} as Record<MobileBasemapId, TileLayer>);
  const parcelLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const dgpsLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const capturedLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const onParcelClickRef = useRef(onParcelClick);
  const dgpsFilterRef = useRef({ pending: dgpsShowPending, uploaded: dgpsShowUploaded });
  const showVarianceRef = useRef(showVariance);

  onParcelClickRef.current = onParcelClick;
  dgpsFilterRef.current = { pending: dgpsShowPending, uploaded: dgpsShowUploaded };
  showVarianceRef.current = showVariance;

  const [dataset, setDataset] = useState<RegionDataset>(() =>
    getWorkbenchRegionDatasetSync(DEFAULT_REGION_KEY),
  );

  useEffect(() => {
    let cancelled = false;
    loadWorkbenchRegionDataset(DEFAULT_REGION_KEY).then((next) => {
      if (!cancelled) setDataset(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;

    const format = new GeoJSON();

    const basemapCarto = new TileLayer({
      source: createBasemapSource("basemap-carto"),
      visible: true,
    });
    const basemapOSM = new TileLayer({ source: createBasemapSource("basemap-osm"), visible: false });
    const basemapImagery = new TileLayer({
      source: createBasemapSource("basemap-imagery"),
      visible: false,
    });

    basemapLayersRef.current = {
      "basemap-carto": basemapCarto,
      "basemap-osm": basemapOSM,
      "basemap-imagery": basemapImagery,
    };

    const parcelSource = new VectorSource({
      features: format.readFeatures(dataset.geojson.parcels, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });

    const parcelLayer = new VectorLayer({
      source: parcelSource,
      zIndex: 9,
      style: (feature, resolution) =>
        parcelStyle(feature as Feature<Geometry>, resolution, showVarianceRef.current),
    });
    parcelLayerRef.current = parcelLayer;

    const dgpsSource = new VectorSource({
      features: format.readFeatures(dataset.geojson.dgps, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      }),
    });

    const dgpsLayer = new VectorLayer({
      source: dgpsSource,
      zIndex: 10,
      style: (feature) =>
        dgpsPointStyle(
          feature as Feature<Geometry>,
          dgpsFilterRef.current.pending,
          dgpsFilterRef.current.uploaded,
        ),
    });
    dgpsLayerRef.current = dgpsLayer;

    const capturedSource = new VectorSource();
    const capturedLayer = new VectorLayer({
      source: capturedSource,
      zIndex: 11,
      style: (feature) =>
        new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({ color: feature.get("synced") ? "#10b981" : "#f59e0b" }),
            stroke: new Stroke({ color: "#ffffff", width: 2 }),
          }),
        }),
    });
    capturedLayerRef.current = capturedLayer;

    const pannedCenter = offsetCenterForDefaultPan(dataset.cadastralView.center, dataset.cadastralView.zoom);
    const initialMaxZoom = getBasemapMaxZoom("basemap-carto");

    const map = new Map({
      target,
      controls: defaultControls({ zoom: false, attribution: false }),
      layers: [basemapCarto, basemapOSM, basemapImagery, parcelLayer, dgpsLayer, capturedLayer],
      view: new View({
        center: fromLonLat(pannedCenter),
        zoom: Math.min(dataset.cadastralView.zoom, initialMaxZoom),
        minZoom: 14,
        maxZoom: initialMaxZoom,
      }),
    });

    map.once("rendercomplete", () => {
      const extent = parcelSource.getExtent();
      if (extent && extent.every((v) => Number.isFinite(v))) {
        map.getView().fit(extent, {
          padding: [36, 36, 36, 36],
          duration: 400,
          maxZoom: initialMaxZoom,
        });
      }
    });

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(
        event.pixel,
        (f) => f,
        { layerFilter: (layer) => layer === parcelLayer },
      ) as Feature<Geometry> | undefined;

      if (feature) {
        const id = String(feature.get("id") ?? feature.getId() ?? "");
        if (id) onParcelClickRef.current(id);
      }
    });

    mapRef.current = map;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      parcelLayerRef.current = null;
      dgpsLayerRef.current = null;
      capturedLayerRef.current = null;
    };
  }, [dataset]);

  useEffect(() => {
    const layers = basemapLayersRef.current;
    if (!layers["basemap-carto"]) return;
    (Object.keys(layers) as MobileBasemapId[]).forEach((id) => {
      layers[id].setVisible(id === basemapId);
    });

    const map = mapRef.current;
    if (!map) return;
    const view = map.getView();
    const maxZoom = getBasemapMaxZoom(basemapId);
    view.setMaxZoom(maxZoom);
    const zoom = view.getZoom();
    if (zoom !== undefined && zoom > maxZoom) {
      view.setZoom(maxZoom);
    }
  }, [basemapId]);

  useEffect(() => {
    parcelLayerRef.current?.setVisible(showParcels);
  }, [showParcels]);

  useEffect(() => {
    const layer = parcelLayerRef.current;
    if (!layer) return;
    layer.setStyle((feature, resolution) =>
      parcelStyle(feature as Feature<Geometry>, resolution, showVarianceRef.current),
    );
    layer.changed();
  }, [showVariance]);

  useEffect(() => {
    dgpsLayerRef.current?.setVisible(showDgps);
    capturedLayerRef.current?.setVisible(showDgps);
  }, [showDgps]);

  useEffect(() => {
    const layer = dgpsLayerRef.current;
    if (!layer) return;
    layer.setStyle((feature) =>
      dgpsPointStyle(feature as Feature<Geometry>, dgpsShowPending, dgpsShowUploaded),
    );
    layer.changed();
  }, [dgpsShowPending, dgpsShowUploaded]);

  useEffect(() => {
    const layer = capturedLayerRef.current;
    const source = layer?.getSource();
    if (!source) return;

    source.clear();
    const format = new GeoJSON();
    const features = format.readFeatures(gnssToFeatures(gnssPoints), {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });
    source.addFeatures(features);
  }, [gnssPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    requestAnimationFrame(() => map.updateSize());
  });

  return <div ref={containerRef} className="h-full w-full touch-none bg-slate-200" />;
}
