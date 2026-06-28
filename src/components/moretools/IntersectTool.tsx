import { useMemo, useState } from "react";
import MoreToolsMap, { type MapOverlay } from "./MoreToolsMap";
import { EmptyResults, ResultsHeader, RunAnalysisButton, ToolShell } from "./MoreToolsShared";
import { INTERSECT_LAYER_PAIRS } from "../../data/moreToolsMock";

export default function IntersectTool() {
  const [pairId, setPairId] = useState(INTERSECT_LAYER_PAIRS[0].id);
  const [analyzed, setAnalyzed] = useState(false);
  const [running, setRunning] = useState(false);

  const pair = INTERSECT_LAYER_PAIRS.find((p) => p.id === pairId) ?? INTERSECT_LAYER_PAIRS[0];

  const overlays = useMemo((): MapOverlay[] => {
    if (!analyzed) return [];

    return [
      {
        id: "layer-a",
        type: "polygon",
        coordinates: pair.layerARing,
        fill: "rgba(59,130,246,0.25)",
        stroke: "#2563eb",
        strokeWidth: 2,
        zIndex: 2,
      },
      {
        id: "layer-b",
        type: "polygon",
        coordinates: pair.layerBRing,
        fill: "rgba(16,185,129,0.2)",
        stroke: "#059669",
        strokeWidth: 2,
        lineDash: [5, 4],
        zIndex: 2,
      },
      {
        id: "intersect",
        type: "polygon",
        coordinates: pair.intersectRing,
        fill: "rgba(234,179,8,0.55)",
        stroke: "#ca8a04",
        strokeWidth: 2.5,
        zIndex: 4,
      },
    ];
  }, [analyzed, pair]);

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      setAnalyzed(true);
      setRunning(false);
    }, 600);
  }

  return (
    <ToolShell
      title="Intersect Analysis"
      description="Computes the common area between two spatial layers — private parcels inside forest reserves, flood zones, municipal limits, or road project corridors."
      useCases={[
        "Private parcels inside forest boundary",
        "Flood zone impact assessment",
        "Municipal ward boundary conflicts",
        "Road acquisition corridor screening",
      ]}
      controls={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Layer pair</span>
            <select
              value={pairId}
              onChange={(e) => {
                setPairId(e.target.value);
                setAnalyzed(false);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {INTERSECT_LAYER_PAIRS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <RunAnalysisButton onClick={runAnalysis} running={running} label="Compute intersection" />
        </div>
      }
      map={<MoreToolsMap overlays={overlays} />}
      results={
        analyzed ? (
          <>
            <ResultsHeader
              title={`Intersection: ${pair.intersectAreaSqM.toLocaleString()} sq.m`}
              badge={`${pair.parcelCount} parcels affected`}
              badgeTone="warning"
            />
            <p className="mb-3 text-sm text-slate-600">{pair.description}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Layer A</dt>
                <dd className="mt-0.5 text-sm font-medium">{pair.layerA}</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Layer B</dt>
                <dd className="mt-0.5 text-sm font-medium">{pair.layerB}</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Intersect area</dt>
                <dd className="mt-0.5 text-sm font-medium">{pair.intersectAreaSqM.toLocaleString()} sq.m</dd>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Parcels in intersection</dt>
                <dd className="mt-0.5 text-sm font-medium">{pair.parcelCount}</dd>
              </div>
            </dl>
          </>
        ) : (
          <EmptyResults message="Select a layer pair and compute intersection to highlight the common area." />
        )
      }
    />
  );
}
