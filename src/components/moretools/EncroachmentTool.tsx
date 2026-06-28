import { useMemo, useState } from "react";
import MoreToolsMap, { type MapOverlay } from "./MoreToolsMap";
import { EmptyResults, ResultsHeader, RunAnalysisButton, ToolShell } from "./MoreToolsShared";
import { DEMO_PARCELS, ENCROACHMENT_CASES, GOVT_LAND_RING } from "../../data/moreToolsMock";

export default function EncroachmentTool() {
  const [analyzed, setAnalyzed] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = ENCROACHMENT_CASES.find((c) => c.id === selectedId) ?? ENCROACHMENT_CASES[0];
  const totalEncroached = ENCROACHMENT_CASES.reduce((s, c) => s + c.encroachedAreaSqM, 0);

  const overlays = useMemo((): MapOverlay[] => {
    const items: MapOverlay[] = DEMO_PARCELS.slice(0, 6).map((p) => ({
      id: `parcel-${p.id}`,
      type: "polygon",
      coordinates: p.ring,
      fill: "rgba(148,163,184,0.15)",
      stroke: "#94a3b8",
      strokeWidth: 1,
      zIndex: 1,
    }));

    items.push({
      id: "govt-land",
      type: "polygon",
      coordinates: GOVT_LAND_RING,
      fill: analyzed ? "rgba(245,158,11,0.3)" : "rgba(245,158,11,0.15)",
      stroke: "#d97706",
      strokeWidth: 2,
      zIndex: 2,
    });

    if (analyzed) {
      const highlight = selected ?? ENCROACHMENT_CASES[0];
      items.push({
        id: "encroachment",
        type: "polygon",
        coordinates: highlight.ring,
        fill: "rgba(239,68,68,0.55)",
        stroke: "#dc2626",
        strokeWidth: 2.5,
        zIndex: 4,
      });
    }

    return items;
  }, [analyzed, selected]);

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      setAnalyzed(true);
      setSelectedId(ENCROACHMENT_CASES[0].id);
      setRunning(false);
    }, 650);
  }

  return (
    <ToolShell
      title="Encroachment Detection"
      description="Detects building footprints or private parcel boundaries overlapping government land polygons — poramboke, canal bunds, highway setbacks."
      useCases={[
        "Buildings crossing government boundaries",
        "Roads encroaching on private land",
        "Canal bund occupation screening",
      ]}
      controls={<RunAnalysisButton onClick={runAnalysis} running={running} label="Detect encroachments" />}
      map={<MoreToolsMap overlays={overlays} />}
      results={
        analyzed ? (
          <>
            <ResultsHeader
              title={`${ENCROACHMENT_CASES.length} encroachment cases found`}
              badge={`${totalEncroached} sq.m total`}
              badgeTone="danger"
            />
            <p className="mb-3 text-sm text-slate-600">
              Primary case: Survey <strong>{selected.surveyNo}</strong> on{" "}
              <strong>{selected.govtLandType}</strong> — encroached area{" "}
              <strong className="text-rose-600">{selected.encroachedAreaSqM} sq.m</strong> (
              {selected.buildingType})
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Survey No</th>
                    <th className="py-2 pr-3">Govt land</th>
                    <th className="py-2 pr-3">Building</th>
                    <th className="py-2 pr-3">Area (sq.m)</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ENCROACHMENT_CASES.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={`cursor-pointer border-b border-slate-50 transition hover:bg-slate-50 ${
                        selectedId === row.id ? "bg-rose-50" : ""
                      }`}
                    >
                      <td className="py-2 pr-3 font-medium">{row.surveyNo}</td>
                      <td className="py-2 pr-3">{row.govtLandType}</td>
                      <td className="py-2 pr-3">{row.buildingType}</td>
                      <td className="py-2 pr-3 font-medium text-rose-600">{row.encroachedAreaSqM}</td>
                      <td className="py-2 capitalize">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyResults message="Run detection to highlight government land encroachments on the map." />
        )
      }
    />
  );
}
