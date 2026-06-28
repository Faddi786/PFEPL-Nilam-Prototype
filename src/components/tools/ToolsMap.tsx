import { useEffect, useRef, useState } from "react";
import { createMapEngine } from "../../lib/mapEngine";
import {
  disposeToolsPageEngine,
  handleToolsMapClick,
  type ToolsEngineCallbacks,
} from "../../lib/toolsPageEngine";
import {
  getWorkbenchRegionDatasetSync,
  loadWorkbenchRegionDataset,
} from "../../data/workbenchParcels";
import type { ParcelRecord, RegionDataset, RegionKey } from "../../data/mockData";
import type { TransformMethod } from "../../data/transformationMock";

export type ToolsMapHandle = ReturnType<typeof createMapEngine>;

/** Carto Positron + cadastral parcels only — no thematic overlays. */
const TOOLS_MAP_HIDDEN_LAYERS = [
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

type ParcelContextMenuState = {
  parcel: ParcelRecord;
  pixel: [number, number];
};

type Props = {
  regionKey?: RegionKey;
  activeTransform?: TransformMethod | null;
  onEngineReady?: (engine: ToolsMapHandle) => void;
  onToast?: ToolsEngineCallbacks["onToast"];
};

export default function ToolsMap({
  regionKey = "karaikal",
  activeTransform,
  onEngineReady,
  onToast,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ToolsMapHandle | null>(null);
  const activeTransformRef = useRef(activeTransform);
  const onToastRef = useRef(onToast);
  const [regionDataset, setRegionDataset] = useState<RegionDataset>(() =>
    getWorkbenchRegionDatasetSync(regionKey),
  );
  const [contextMenu, setContextMenu] = useState<ParcelContextMenuState | null>(null);

  useEffect(() => {
    activeTransformRef.current = activeTransform;
  }, [activeTransform]);

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  useEffect(() => {
    let cancelled = false;
    setRegionDataset(getWorkbenchRegionDatasetSync(regionKey));
    loadWorkbenchRegionDataset(regionKey).then((dataset) => {
      if (!cancelled) setRegionDataset(dataset);
    });
    return () => {
      cancelled = true;
    };
  }, [regionKey]);

  useEffect(() => {
    if (!mapRef.current || engineRef.current) return;

    const engine = createMapEngine(
      mapRef.current,
      regionDataset,
      {
        onToast: (message) => onToastRef.current?.(message),
        onParcelContext: (parcel, position, info) => {
          if (!info.geometryDirty) return;
          setContextMenu({
            parcel: parcel as ParcelRecord,
            pixel: [position.pixel[0], position.pixel[1]],
          });
        },
        onMapClick: (pixel, hasParcel) => {
          const currentEngine = engineRef.current;
          if (!currentEngine) return;

          const mapCoord = currentEngine.map.getCoordinateFromPixel(pixel);
          const handled = handleToolsMapClick(
            currentEngine,
            mapCoord,
            activeTransformRef.current,
            { onToast: onToastRef.current },
          );
          if (handled) return;

          if (!hasParcel) {
            setContextMenu(null);
          }
        },
      },
      { cadastralOnly: true },
    );
    engineRef.current = engine;
    engine.setBasemap("basemap-carto");
    TOOLS_MAP_HIDDEN_LAYERS.forEach((layerId) => {
      engine.setLayerVisibility(layerId, false);
    });
    engine.setLayerVisibility("parcels", true);
    onEngineReady?.(engine);

    const map = engine.map;
    const resize = () => map.updateSize();
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(mapRef.current);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      disposeToolsPageEngine(map);
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    engine.setDataset(regionDataset);
  }, [regionDataset]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      setContextMenu(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function handleSendForApproval() {
    if (!contextMenu) return;
    const submitted = engineRef.current?.submitMutationForApproval(contextMenu.parcel.id);
    if (submitted) setContextMenu(null);
  }

  const transformLabel =
    activeTransform && activeTransform !== "overview"
      ? {
          affine: "Affine transform active",
          polynomial: "Polynomial transform active",
          tps: "Thin Plate Spline active",
          projective: "Projective transform active",
        }[activeTransform]
      : null;

  return (
    <div className="relative z-0 h-full w-full">
      <div ref={mapRef} className="h-full w-full" />

      {transformLabel && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
          <div className="rounded-xl border border-white/80 bg-white/90 px-4 py-2 text-sm font-medium text-slate-700 shadow-lg backdrop-blur-md">
            {transformLabel} — click map to preview GCP placement (demo)
          </div>
        </div>
      )}

      {contextMenu ? (
        <div
          className="absolute z-30 min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm"
          style={{
            left: Math.min(contextMenu.pixel[0], (mapRef.current?.clientWidth ?? 400) - 200),
            top: Math.min(contextMenu.pixel[1], (mapRef.current?.clientHeight ?? 400) - 56),
          }}
        >
          <button
            type="button"
            onClick={handleSendForApproval}
            className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Mutation send for approval
          </button>
        </div>
      ) : null}
    </div>
  );
}
