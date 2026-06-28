import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { createMapEngine } from "../../lib/mapEngine";
import { DEFAULT_REGION_KEY, type RegionDataset } from "../../data/mockData";
import {
  getWorkbenchRegionDatasetSync,
  loadWorkbenchRegionDataset,
} from "../../data/workbenchParcels";

export type NilAiMapHandle = {
  highlightParcels: (ids: string[], options?: { colorByVariance?: boolean }) => void;
  clearHighlights: () => void;
};

/** Cadastral-only view: parcel outlines + survey labels on Carto Positron. */
const NIL_AI_HIDDEN_LAYERS = [
  "ortho",
  "region",
  "taluk",
  "village",
  "ward",
  "adminState",
  "adminDistrict",
  "adminTaluka",
  "adminVillage",
  "fmb",
  "fmbChains",
  "parcelBoundaries",
  "variance",
  "dgps",
  "collabland",
  "crops",
  "buildings",
  "trees",
  "roads",
  "waterBodies",
  "forest",
  "cadastralDimensions",
] as const;

const NilAiMap = forwardRef<NilAiMapHandle>(function NilAiMap(_, ref) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ReturnType<typeof createMapEngine> | null>(null);
  const initialDatasetRef = useRef<RegionDataset | null>(null);
  const [regionDataset, setRegionDataset] = useState(() =>
    getWorkbenchRegionDatasetSync(DEFAULT_REGION_KEY),
  );

  useImperativeHandle(ref, () => ({
    highlightParcels: (ids, options) => engineRef.current?.highlightParcels(ids, options),
    clearHighlights: () => engineRef.current?.clearHighlights(),
  }));

  useEffect(() => {
    let cancelled = false;
    setRegionDataset(getWorkbenchRegionDatasetSync(DEFAULT_REGION_KEY));
    loadWorkbenchRegionDataset(DEFAULT_REGION_KEY).then((dataset) => {
      if (!cancelled) setRegionDataset(dataset);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || engineRef.current) return;

    initialDatasetRef.current = regionDataset;
    engineRef.current = createMapEngine(mapRef.current, regionDataset, {});

    engineRef.current.setBasemap("basemap-carto");
    NIL_AI_HIDDEN_LAYERS.forEach((layerId) => {
      engineRef.current?.setLayerVisibility(layerId, false);
    });
    engineRef.current.setLayerVisibility("parcels", true);

    const map = engineRef.current.map;
    const resize = () => map.updateSize();
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);

    const observer = new ResizeObserver(resize);
    observer.observe(mapRef.current);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    if (initialDatasetRef.current === regionDataset) return;
    initialDatasetRef.current = regionDataset;
    engineRef.current.setDataset(regionDataset, { transitionDuration: 800 });
    requestAnimationFrame(() => {
      engineRef.current?.map.updateSize();
    });
  }, [regionDataset]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  );
});

export default NilAiMap;
