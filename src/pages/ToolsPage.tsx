import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import ToolsMap, { type ToolsMapHandle } from "../components/tools/ToolsMap";
import ToolsFloatingBar from "../components/tools/ToolsFloatingBar";
import ToolsUseCasePanel from "../components/tools/ToolsUseCasePanel";
import {
  getToolsPageToolLabel,
  getToolsPageUseCases,
  resolveActiveTool,
} from "../data/toolsPageUseCases";
import {
  activateMeasurementTool,
  activateMutationTool,
  activateSpatialTool,
  activateTransformMode,
  refreshActiveTransformPreview,
  setTransformPolynomialOrder,
  type TransformStats,
} from "../lib/toolsPageEngine";
import { syncCadastralSpatialDataset } from "../data/cadastralSpatialData";
import { getWorkbenchRegionDatasetSync } from "../data/workbenchParcels";
import { runSpatialToolDemo } from "../data/spatialToolDemos";
import type { RegionDataset } from "../data/mockData";
import type { TransformMethod } from "../data/transformationMock";
import type { MoreToolsTabId } from "../data/spatialToolCatalog";

export default function ToolsPage() {
  const engineRef = useRef<ToolsMapHandle | null>(null);
  const [activeTransform, setActiveTransform] = useState<TransformMethod | null>(null);
  const [activeSpatial, setActiveSpatial] = useState<MoreToolsTabId | null>(null);
  const [activeMeasurement, setActiveMeasurement] = useState<"distance" | "draw-polygon" | null>(null);
  const [activeMutation, setActiveMutation] = useState<"split" | "merge" | "vertex-edit" | null>(null);
  const [parcelCount, setParcelCount] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [transformStats, setTransformStats] = useState<TransformStats | null>(null);
  const [regionDataset, setRegionDataset] = useState<RegionDataset>(() =>
    getWorkbenchRegionDatasetSync("karaikal"),
  );

  const showStatus = useCallback((message: string) => {
    setSummary(message);
  }, []);

  const engineCallbacks = {
    onToast: showStatus,
    onParcelSelect: (count: number) => {
      setParcelCount(count > 0 ? count : null);
      setSummary(count > 0 ? `${count} parcel${count === 1 ? "" : "s"} selected` : null);
    },
    onTransformUpdate: setTransformStats,
  };

  function applySpatialDemo(toolId: MoreToolsTabId) {
    const engine = engineRef.current;
    if (!engine) return;
    const result = runSpatialToolDemo(toolId);
    setSummary(result.summary);
    activateSpatialTool(engine, result.overlays, result.summary, engineCallbacks, {
      highlightParcelIds: result.highlightParcelIds,
      highlightOptions: result.highlightOptions,
    });
  }

  useEffect(() => {
    syncCadastralSpatialDataset(regionDataset);
    if (activeSpatial) {
      applySpatialDemo(activeSpatial);
    } else if (activeTransform && activeTransform !== "overview") {
      const engine = engineRef.current;
      if (engine) {
        activateTransformMode(engine, activeTransform, engineCallbacks);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionDataset]);

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
    setTransformStats(null);
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
    setTransformStats(null);
    applySpatialDemo(toolId);
  }

  function handleMeasurementSelect(tool: "distance" | "draw-polygon") {
    setActiveMeasurement(tool);
    setActiveTransform(null);
    setActiveSpatial(null);
    setActiveMutation(null);
    setParcelCount(null);
    setSummary(null);
    setTransformStats(null);
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
    setTransformStats(null);
    const engine = engineRef.current;
    if (!engine) return;
    activateMutationTool(engine, tool, engineCallbacks);
  }

  const activeTool = resolveActiveTool(
    activeSpatial,
    activeMeasurement,
    activeMutation,
    activeTransform,
  );
  const useCases = getToolsPageUseCases(activeTool);
  const useCaseToolLabel = getToolsPageToolLabel(activeTool);

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
          activeMeasurement={activeMeasurement}
          activeMutation={activeMutation}
          onEngineReady={handleEngineReady}
          onToast={showStatus}
          onParcelSelect={engineCallbacks.onParcelSelect}
          onDatasetChange={setRegionDataset}
        />
      </div>

      <ToolsUseCasePanel toolLabel={useCaseToolLabel} useCases={useCases} />

      {(transformStats || parcelCount !== null || summary) && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
          {transformStats && (
            <div className="pointer-events-auto max-w-lg rounded-xl border border-white/80 bg-white/95 px-4 py-3 text-center shadow-lg backdrop-blur-md">
              <p className="text-sm font-semibold text-slate-800">
                {transformStats.methodLabel} · Survey {transformStats.surveyNo}
              </p>
              <p className="mt-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700">
                {transformStats.stepHint}
              </p>
              <p className="mt-2 text-xs text-slate-600">
                Fit{" "}
                <span
                  className={
                    transformStats.rmsQuality === "excellent" || transformStats.rmsQuality === "good"
                      ? "font-semibold text-emerald-700"
                      : transformStats.rmsQuality === "fair"
                        ? "font-semibold text-amber-700"
                        : "font-semibold text-rose-700"
                  }
                >
                  {transformStats.rmsQuality}
                </span>
                {" · "}
                RMS {transformStats.rmsError.toFixed(5)}° · {transformStats.gcpCount} control point
                {transformStats.gcpCount === 1 ? "" : "s"}
                {transformStats.method === "polynomial"
                  ? ` · order ${transformStats.polynomialOrder}`
                  : ""}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{transformStats.hint}</p>
              {transformStats.method === "polynomial" && (
                <div className="mt-2 flex justify-center gap-1.5">
                  {(
                    [
                      [1, "1st · Linear"],
                      [2, "2nd · Quadratic"],
                      [3, "3rd · Cubic"],
                    ] as const
                  ).map(([order, label]) => (
                    <button
                      key={order}
                      type="button"
                      onClick={() => {
                        setTransformPolynomialOrder(order);
                        const engine = engineRef.current;
                        if (engine) {
                          refreshActiveTransformPreview(engine, engineCallbacks);
                          setTransformStats((prev) =>
                            prev ? { ...prev, polynomialOrder: order } : prev,
                          );
                        }
                      }}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        transformStats.polynomialOrder === order
                          ? "bg-violet-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {parcelCount !== null && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-lg backdrop-blur-md">
              {parcelCount} parcel{parcelCount === 1 ? "" : "s"} selected
            </div>
          )}
          {summary && !parcelCount && !transformStats && (
            <div className="max-w-md rounded-xl border border-white/80 bg-white/90 px-4 py-2 text-center text-sm text-slate-700 shadow-lg backdrop-blur-md">
              {summary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
