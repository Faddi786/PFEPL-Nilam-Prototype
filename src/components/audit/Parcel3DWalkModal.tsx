import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import centroid from "@turf/centroid";
import { ExternalLink, Loader2, MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ParcelRecord } from "../../data/mockData";
import {
  DEFAULT_STREET_VIEW,
  buildStreetViewEmbedUrl,
  buildStreetViewPanoUrl,
} from "../../data/streetViewLocations";

type Props = {
  parcel: ParcelRecord;
  geometry: GeoJSON.Polygon;
  onClose: () => void;
};

const MODAL_TRANSITION = { duration: 0.22, ease: "easeOut" as const };

function polygonCentroid(geometry: GeoJSON.Polygon): [number, number] {
  const center = centroid({ type: "Feature", geometry, properties: {} });
  const [lng, lat] = center.geometry.coordinates;
  return [lng, lat];
}

export default function Parcel3DWalkModal({ parcel, geometry, onClose }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  const surveyLabel = `${parcel.surveyNo}${parcel.subDiv ? `/${parcel.subDiv}` : ""}`;
  const [parcelLng, parcelLat] = useMemo(() => polygonCentroid(geometry), [geometry]);

  const { lat, lng, heading, pitch, label } = DEFAULT_STREET_VIEW;
  const embedUrl = useMemo(
    () => buildStreetViewEmbedUrl(lat, lng, heading, pitch),
    [lat, lng, heading, pitch],
  );
  const streetViewUrl = useMemo(() => buildStreetViewPanoUrl(lat, lng), [lat, lng]);

  function requestClose() {
    setVisible(false);
  }

  function openExternal(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    setIframeLoaded(false);
  }, [embedUrl]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          key="parcel-3d-walk"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MODAL_TRANSITION}
          className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/40 p-3 backdrop-blur-[2px] sm:p-5"
          onClick={requestClose}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("walk3D.title")}
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={MODAL_TRANSITION}
            className="flex h-[min(94vh,900px)] min-h-[70vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-[#0f1419] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-700/60 bg-[#151b22] px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {t("walk3D.title")}
                </p>
                <h2 className="truncate text-sm font-semibold text-white sm:text-base">
                  {t("walk3D.parcelLabel", { survey: surveyLabel, ulpin: parcel.ulpin })}
                </h2>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {parcelLat.toFixed(6)}, {parcelLng.toFixed(6)}
                </p>
                <p className="mt-0.5 text-[10px] text-sky-400/90">
                  {t("walk3D.demoLocation", { location: label })}
                </p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                aria-label={t("walk3D.close")}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-600 text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 bg-[#0a0e12] p-3 sm:p-4">
              <div className="relative h-full min-h-[70vh] overflow-hidden rounded-xl border border-slate-700/70 shadow-inner">
                {!iframeLoaded ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0a0e12]">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                    <p className="text-xs text-slate-500">{t("walk3D.loading")}</p>
                  </div>
                ) : null}

                <iframe
                  title={t("walk3D.iframeTitle", { survey: surveyLabel })}
                  src={embedUrl}
                  className="h-full min-h-[70vh] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                  onLoad={() => setIframeLoaded(true)}
                />
              </div>
            </div>

            <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-slate-700/60 bg-[#151b22] px-4 py-3 sm:px-5">
              <button
                type="button"
                onClick={() => openExternal(streetViewUrl)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-[11px] font-medium text-[#1A1A1A] transition hover:bg-slate-100"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("walk3D.openGoogleMaps")}
              </button>
            </footer>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
