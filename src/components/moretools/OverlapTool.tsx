import { useMemo, useState } from "react";
import MoreToolsMap, { type MapOverlay } from "./MoreToolsMap";
import { EmptyResults, ResultsHeader, RunAnalysisButton, ToolShell } from "./MoreToolsShared";
import { DEMO_PARCELS, OVERLAP_CASES } from "../../data/moreToolsMock";

export default function OverlapTool() {
  const [analyzed, setAnalyzed] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = OVERLAP_CASES.find((c) => c.id === selectedId) ?? OVERLAP_CASES[0];

  const overlays = useMemo((): MapOverlay[] => {
    if (!analyzed) {
      return DEMO_PARCELS.slice(0, 6).map((p) => ({
        id: `parcel-${p.id}`,
        type: "polygon" as const,
        coordinates: p.ring,
        fill: "rgba(148,163,184,0.2)",
        stroke: "#64748b",
        strokeWidth: 1,
        zIndex: 1,
      }));
    }

    const c = selected ?? OVERLAP_CASES[0];
    return [
      {
        id: "parcel-a",
        type: "polygon" as const,
        coordinates: c.ringA,
        fill: "rgba(59,130,246,0.3)",
        stroke: "#2563eb",
        strokeWidth: 2,
        zIndex: 2,
      },
      {
        id: "parcel-b",
        type: "polygon" as const,
        coordinates: c.ringB,
        fill: "rgba(168,85,247,0.3)",
        stroke: "#9333ea",
        strokeWidth: 2,
        zIndex: 2,
      },
      {
        id: "overlap",
        type: "polygon" as const,
        coordinates: c.overlapRing,
        fill: "rgba(239,68,68,0.6)",
        stroke: "#dc2626",
        strokeWidth: 2.5,
        zIndex: 4,
      },
    ];
  }, [analyzed, selected]);

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      setAnalyzed(true);
      setSelectedId(OVERLAP_CASES[0].id);
      setRunning(false);
    }, 700);
  }

  return (
    <ToolShell
      title="Overlap Detection"
      description="Scans cadastral parcels for geometric overlaps — critical for maintaining parcel integrity and resolving double-allocation disputes."
      useCases={[
        "Village-wide overlap scan",
        "Sub-division boundary validation",
        "Mutation boundary conflict checks",
      ]}
      controls={<RunAnalysisButton onClick={runAnalysis} running={running} label="Scan for overlaps" />}
      map={<MoreToolsMap overlays={overlays} />}
      results={
        analyzed ? (
          <>
            <ResultsHeader
              title={`Overlap found — Area = ${selected.overlapAreaSqM} sq.m`}
              badge={`${OVERLAP_CASES.length} pairs in Khutal`}
              badgeTone="danger"
            />
            <p className="mb-3 text-sm text-slate-600">
              Parcels <strong>{selected.parcelA}</strong> and <strong>{selected.parcelB}</strong> in{" "}
              {selected.village} share overlapping geometry. Severity:{" "}
              <strong className="capitalize">{selected.severity}</strong>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Parcel A</th>
                    <th className="py-2 pr-3">Parcel B</th>
                    <th className="py-2 pr-3">Village</th>
                    <th className="py-2 pr-3">Overlap (sq.m)</th>
                    <th className="py-2">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {OVERLAP_CASES.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={`cursor-pointer border-b border-slate-50 transition hover:bg-slate-50 ${
                        selectedId === row.id ? "bg-rose-50" : ""
                      }`}
                    >
                      <td className="py-2 pr-3 font-medium">{row.parcelA}</td>
                      <td className="py-2 pr-3 font-medium">{row.parcelB}</td>
                      <td className="py-2 pr-3">{row.village}</td>
                      <td className="py-2 pr-3 font-medium text-rose-600">{row.overlapAreaSqM}</td>
                      <td className="py-2 capitalize">{row.severity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyResults message="Run village scan to detect overlapping parcel pairs." />
        )
      }
    />
  );
}
