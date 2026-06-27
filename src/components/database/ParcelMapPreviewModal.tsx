import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { createBasemapSource, getBasemapMaxZoom } from "../../lib/basemaps";
import { Fill, Stroke, Style } from "ol/style";
import type { DatabaseParcel } from "../../data/parcelDatabase";

type Props = {
  parcel: DatabaseParcel;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  onClose: () => void;
};

const parcelStyle = new Style({
  fill: new Fill({ color: "rgba(34,197,94,0.35)" }),
  stroke: new Stroke({ color: "#15803d", width: 2.5 }),
});

export default function ParcelMapPreviewModal({ parcel, geometry, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const [visible, setVisible] = useState(true);

  function requestClose() {
    setVisible(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    const format = new GeoJSON();
    const source = new VectorSource({
      features: format.readFeatures(
        { type: "Feature", geometry, properties: {} },
        { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" },
      ),
    });

    const vectorLayer = new VectorLayer({ source, style: parcelStyle });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: createBasemapSource("basemap-carto") }),
        vectorLayer,
      ],
      view: new View({ maxZoom: getBasemapMaxZoom("basemap-carto") }),
      controls: [],
    });

    mapInstanceRef.current = map;

    const extent = source.getExtent();
    if (extent && extent.every(Number.isFinite)) {
      map.getView().fit(extent, { padding: [48, 48, 48, 48], maxZoom: 18, duration: 0 });
    }

    requestAnimationFrame(() => map.updateSize());

    return () => {
      map.setTarget(undefined);
      mapInstanceRef.current = null;
    };
  }, [geometry]);

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          key="parcel-map-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10002] flex flex-col bg-black/40 p-3 backdrop-blur-[2px] sm:p-4"
          role="presentation"
          onClick={requestClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Parcel map — Survey ${parcel.surveyNo}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  Survey {parcel.surveyNo} · {parcel.village}
                </p>
                <p className="text-xs text-slate-500">
                  ULPIN {parcel.ulpin} · {parcel.regionLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Close map preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div ref={mapRef} className="min-h-0 flex-1 bg-slate-100" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
