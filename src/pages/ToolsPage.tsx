import { useCallback, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ToolsMap, { type ToolsMapHandle } from "../components/tools/ToolsMap";
import ToolsFloatingBar from "../components/tools/ToolsFloatingBar";
import {
  activateMeasurementTool,
  activateMutationTool,
  activateSpatialTool,
  activateTransformMode,
} from "../lib/toolsPageEngine";
import { getWorkbenchRegionDatasetSync } from "../data/workbenchParcels";
import { runSpatialToolDemo } from "../data/spatialToolDemos";
import type { TransformMethod } from "../data/transformationMock";
import type { MoreToolsTabId } from "../data/spatialToolCatalog";

export default function ToolsPage() {
  const engineRef = useRef<ToolsMapHandle | null>(null);
  const [activeTransform, setActiveTransform] = useState<TransformMethod | null>(null);
  const [activeSpatial, setActiveSpatial] = useState<MoreToolsTabId | null>(null);
  const [activeMeasurement, setActiveMeasurement] = useState<"distance" | "draw-polygon" | null>(null);
  const [activeMutation, setActiveMutation] = useState<"split" | "merge" | "vertex-edit" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [parcelCount, setParcelCount] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const regionDataset = getWorkbenchRegionDatasetSync("karaikal");

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }, []);

  const engineCallbacks = {
    onToast: showToast,
    onParcelSelect: (count: number) => {
      setParcelCount(count);
      setSummary(`${count} parcel${count === 1 ? "" : "s"} selected`);
    },
  };

  function handleEngineReady(engine: ToolsMapHandle) {
    engineRef.current = engine;
  }

  function handleTransformSelect(method: Exclude<TransformMethod, "overview">) {
    setActiveTransform(method);
    setActiveSpatial(null);
    setActiveMeasurement(null);
    setActiveMutation(null);
    setParcelCount(null);
    setSummary(null);
    const engine = engineRef.current;
    if (!engine) return;
    activateTransformMode(engine, method, engineCallbacks);
  }

  function handleSpatialSelect(toolId: MoreToolsTabId) {
    setActiveSpatial(toolId);
    setActiveTransform(null);
    setActiveMeasurement(null);
    setActiveMutation(null);
    setParcelCount(null);
    const engine = engineRef.current;
    if (!engine) return;
    const result = runSpatialToolDemo(toolId);
    setSummary(result.summary);
    activateSpatialTool(engine, result.overlays, result.summary, engineCallbacks);
  }

  function handleMeasurementSelect(tool: "distance" | "draw-polygon") {
    setActiveMeasurement(tool);
    setActiveTransform(null);
    setActiveSpatial(null);
    setActiveMutation(null);
    setParcelCount(null);
    setSummary(null);
    const engine = engineRef.current;
    if (!engine) return;
    activateMeasurementTool(engine, tool, regionDataset, engineCallbacks);
  }

  function handleMutationSelect(tool: "split" | "merge" | "vertex-edit") {
    setActiveMutation(tool);
    setActiveTransform(null);
    setActiveSpatial(null);
    setActiveMeasurement(null);
    setParcelCount(null);
    setSummary(null);
    const engine = engineRef.current;
    if (!engine) return;
    activateMutationTool(engine, tool, engineCallbacks);
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100">
      <Link
        to="/app"
        className="absolute left-4 top-4 z-40 flex h-9 w-9 items-center justify-center rounded-lg border border-white/70 bg-white/90 text-slate-600 shadow-lg backdrop-blur-md transition hover:bg-white hover:text-slate-900"
        aria-label="Back to workbench"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <ToolsFloatingBar
        activeTransform={activeTransform}
        activeSpatial={activeSpatial}
        activeMeasurement={activeMeasurement}
        activeMutation={activeMutation}
        onTransformSelect={handleTransformSelect}
        onSpatialSelect={handleSpatialSelect}
        onMeasurementSelect={handleMeasurementSelect}
        onMutationSelect={handleMutationSelect}
      />

      <div className="absolute inset-0 z-0">
        <ToolsMap
          activeTransform={activeTransform}
          onEngineReady={handleEngineReady}
          onToast={showToast}
        />
      </div>

      {(parcelCount !== null || summary) && (
        <div className="pointer-events-none absolute bottom-6 left-4 z-30 flex flex-col gap-2">
          {parcelCount !== null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg backdrop-blur-md">
              {parcelCount} parcel{parcelCount === 1 ? "" : "s"} selected
            </div>
          )}
          {summary && !parcelCount && (
            <div className="max-w-sm rounded-xl border border-white/80 bg-white/90 px-4 py-2 text-sm text-slate-700 shadow-lg backdrop-blur-md">
              {summary}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-xl border border-slate-200 bg-[#1A1A1A]/90 px-4 py-2 text-sm text-white shadow-xl backdrop-blur-md">
          {toast}
        </div>
      )}
    </div>
  );
}
