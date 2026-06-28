import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import SpatialToolDemo from "../components/moretools/SpatialToolDemo";
import { RunAnalysisButton } from "../components/moretools/MoreToolsShared";
import { SPATIAL_TOOL_CATALOG, type MoreToolsTabId } from "../data/spatialToolCatalog";
import { getBaseParcelOverlays, runSpatialToolDemo } from "../data/spatialToolDemos";
import type { MapOverlay } from "../components/moretools/MoreToolsMap";

export default function MoreToolsPage() {
  const [selectedToolId, setSelectedToolId] = useState<MoreToolsTabId>("buffer");
  const [running, setRunning] = useState(false);
  const [overlays, setOverlays] = useState<MapOverlay[]>(() => getBaseParcelOverlays());
  const [mapSummary, setMapSummary] = useState<string | null>(null);

  const selectedTool = useMemo(
    () => SPATIAL_TOOL_CATALOG.find((t) => t.id === selectedToolId) ?? SPATIAL_TOOL_CATALOG[0],
    [selectedToolId],
  );

  function handleToolChange(toolId: MoreToolsTabId) {
    setSelectedToolId(toolId);
    setOverlays(getBaseParcelOverlays());
    setMapSummary(null);
  }

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      const result = runSpatialToolDemo(selectedToolId);
      setOverlays(result.overlays);
      setMapSummary(result.summary);
      setRunning(false);
    }, 550);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] p-3 text-[#1A1A1A] lg:p-4">
      <Link
        to="/app"
        className="absolute left-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-white/70 bg-white/90 text-slate-600 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:bg-white hover:text-slate-900 lg:left-6 lg:top-6"
        aria-label="Back to workbench"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <main className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <div className="flex shrink-0 flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-start lg:justify-between lg:px-6">
          <div className="min-w-0 flex-1 lg:max-w-[55%]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              GeoNilam use cases
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              {selectedTool.useCases.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex min-w-[220px] flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Spatial tool</span>
              <select
                value={selectedToolId}
                onChange={(e) => handleToolChange(e.target.value as MoreToolsTabId)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                {SPATIAL_TOOL_CATALOG.map((tool) => (
                  <option key={tool.id} value={tool.id}>
                    {tool.label}
                  </option>
                ))}
              </select>
            </label>
            <RunAnalysisButton
              onClick={runAnalysis}
              running={running}
              label={selectedTool.runLabel ?? "Run analysis"}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 p-4 lg:p-5">
          <SpatialToolDemo overlays={overlays} summary={mapSummary} />
        </div>
      </main>
    </div>
  );
}
