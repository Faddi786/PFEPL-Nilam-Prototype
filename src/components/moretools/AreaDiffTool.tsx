import { useMemo, useState } from "react";
import MoreToolsMap, { type MapOverlay } from "./MoreToolsMap";
import { EmptyResults, ResultsHeader, RunAnalysisButton, ToolShell } from "./MoreToolsShared";
import { AREA_DIFF_CASES, DEMO_PARCELS } from "../../data/moreToolsMock";

const STATUS_TONE = {
  minor: "success" as const,
  moderate: "warning" as const,
  critical: "danger" as const,
};

export default function AreaDiffTool() {
  const [analyzed, setAnalyzed] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = AREA_DIFF_CASES.find((c) => c.id === selectedId) ?? AREA_DIFF_CASES[0];

  const overlays = useMemo((): MapOverlay[] => {
    const base: MapOverlay[] = DEMO_PARCELS.slice(0, 8).map((p, i) => ({
      id: `parcel-${p.id}`,
      type: "polygon",
      coordinates: p.ring,
      fill:
        analyzed && AREA_DIFF_CASES[i % AREA_DIFF_CASES.length]?.status === "critical"
          ? "rgba(239,68,68,0.35)"
          : analyzed && AREA_DIFF_CASES[i % AREA_DIFF_CASES.length]?.status === "moderate"
            ? "rgba(245,158,11,0.35)"
            : "rgba(148,163,184,0.2)",
      stroke: "#64748b",
      strokeWidth: 1,
      zIndex: 1,
    }));

    if (analyzed && selected) {
      const idx = AREA_DIFF_CASES.indexOf(selected);
      const parcel = DEMO_PARCELS[idx % DEMO_PARCELS.length];
      if (parcel) {
        base.push({
          id: "highlight",
          type: "polygon",
          coordinates: parcel.ring,
          fill: "rgba(236,72,153,0.35)",
          stroke: "#db2777",
          strokeWidth: 2.5,
          zIndex: 3,
        });
      }
    }
    return base;
  }, [analyzed, selected]);

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      setAnalyzed(true);
      setSelectedId(AREA_DIFF_CASES[0].id);
      setRunning(false);
    }, 700);
  }

  const totalDiff = AREA_DIFF_CASES.reduce((s, c) => s + c.diffSqM, 0);

  return (
    <ToolShell
      title="Area Difference (FMB vs DGPS)"
      description="Compares Field Measurement Book (FMB) area against DGPS survey area to identify digitization errors, survey discrepancies, or post-mutation boundary changes."
      useCases={[
        "Survey error identification",
        "Digitization QA after FMB scanning",
        "Post-mutation area reconciliation",
      ]}
      controls={<RunAnalysisButton onClick={runAnalysis} running={running} label="Compare FMB vs DGPS" />}
      map={<MoreToolsMap overlays={overlays} />}
      results={
        analyzed ? (
          <>
            <ResultsHeader
              title={`${AREA_DIFF_CASES.length} parcels with area mismatch`}
              badge={`Total Δ ${totalDiff} sq.m`}
              badgeTone="warning"
            />
            <p className="mb-3 text-sm text-slate-600">
              Example: Survey <strong>{selected.surveyNo}</strong> — FMB {selected.fmbAreaSqM} sq.m vs DGPS{" "}
              {selected.dgpsAreaSqM} sq.m → difference <strong>{selected.diffSqM} sq.m</strong> (
              {selected.variancePct}%)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Survey No</th>
                    <th className="py-2 pr-3">Village</th>
                    <th className="py-2 pr-3">FMB (sq.m)</th>
                    <th className="py-2 pr-3">DGPS (sq.m)</th>
                    <th className="py-2 pr-3">Diff (sq.m)</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {AREA_DIFF_CASES.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={`cursor-pointer border-b border-slate-50 transition hover:bg-slate-50 ${
                        selectedId === row.id ? "bg-sky-50" : ""
                      }`}
                    >
                      <td className="py-2 pr-3 font-medium">{row.surveyNo}</td>
                      <td className="py-2 pr-3">{row.village}</td>
                      <td className="py-2 pr-3">{row.fmbAreaSqM.toLocaleString()}</td>
                      <td className="py-2 pr-3">{row.dgpsAreaSqM.toLocaleString()}</td>
                      <td className="py-2 pr-3 font-medium text-rose-600">{row.diffSqM}</td>
                      <td className="py-2 capitalize">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_TONE[row.status] === "danger"
                              ? "bg-rose-100 text-rose-800"
                              : STATUS_TONE[row.status] === "warning"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyResults message="Run comparison to list parcels where FMB and DGPS areas diverge." />
        )
      }
    />
  );
}
