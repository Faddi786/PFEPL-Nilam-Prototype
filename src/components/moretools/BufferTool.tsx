import { useMemo, useState } from "react";
import MoreToolsMap, { type MapOverlay } from "./MoreToolsMap";
import { EmptyResults, ResultsHeader, RunAnalysisButton, ToolShell } from "./MoreToolsShared";
import {
  BUFFER_FEATURES,
  DEMO_PARCELS,
  buildBufferPolygon,
  getParcelsInBuffer,
  type BufferFeatureType,
} from "../../data/moreToolsMock";

export default function BufferTool() {
  const [featureType, setFeatureType] = useState<BufferFeatureType>("road");
  const [distanceM, setDistanceM] = useState(50);
  const [analyzed, setAnalyzed] = useState(false);
  const [running, setRunning] = useState(false);

  const parcelsInBuffer = useMemo(
    () => (analyzed ? getParcelsInBuffer(featureType, distanceM) : []),
    [analyzed, featureType, distanceM],
  );

  const overlays = useMemo((): MapOverlay[] => {
    const items: MapOverlay[] = DEMO_PARCELS.map((p) => ({
      id: `parcel-${p.id}`,
      type: "polygon",
      coordinates: p.ring,
      fill: parcelsInBuffer.some((x) => x.id === p.id) ? "rgba(239,68,68,0.45)" : "rgba(148,163,184,0.2)",
      stroke: parcelsInBuffer.some((x) => x.id === p.id) ? "#dc2626" : "#64748b",
      strokeWidth: parcelsInBuffer.some((x) => x.id === p.id) ? 2 : 1,
      zIndex: parcelsInBuffer.some((x) => x.id === p.id) ? 4 : 1,
    }));

    if (analyzed) {
      const bufferRing = buildBufferPolygon(featureType, distanceM);
      if (bufferRing.length) {
        items.push({
          id: "buffer",
          type: "polygon",
          coordinates: bufferRing,
          fill: "rgba(59,130,246,0.25)",
          stroke: "#2563eb",
          strokeWidth: 2,
          lineDash: [6, 4],
          zIndex: 2,
        });
      }
    }

    const line = BUFFER_FEATURES[featureType].line;
    items.push({
      id: "feature-line",
      type: "line",
      coordinates: line,
      stroke: BUFFER_FEATURES[featureType].color,
      strokeWidth: 4,
      zIndex: 5,
    });

    return items;
  }, [analyzed, featureType, distanceM, parcelsInBuffer]);

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      setAnalyzed(true);
      setRunning(false);
    }, 600);
  }

  return (
    <ToolShell
      title="Buffer Analysis"
      description="Creates a boundary around a linear feature at a specified distance. Parcels within the buffer zone are highlighted for proximity review."
      useCases={[
        "Parcels near river, highway, or canal",
        "Setback compliance along government land",
        "Acquisition corridor impact screening",
      ]}
      controls={
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Feature</span>
            <select
              value={featureType}
              onChange={(e) => {
                setFeatureType(e.target.value as BufferFeatureType);
                setAnalyzed(false);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {(Object.keys(BUFFER_FEATURES) as BufferFeatureType[]).map((key) => (
                <option key={key} value={key}>
                  {BUFFER_FEATURES[key].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
              Buffer distance: <strong>{distanceM} m</strong>
            </span>
            <input
              type="range"
              min={50}
              max={100}
              step={10}
              value={distanceM}
              onChange={(e) => {
                setDistanceM(Number(e.target.value));
                setAnalyzed(false);
              }}
              className="w-full accent-slate-800"
            />
            <span className="flex justify-between text-[11px] text-slate-400">
              <span>50 m</span>
              <span>100 m</span>
            </span>
          </label>
          <RunAnalysisButton onClick={runAnalysis} running={running} />
        </div>
      }
      map={<MoreToolsMap overlays={overlays} />}
      results={
        analyzed ? (
          <>
            <ResultsHeader
              title={`${parcelsInBuffer.length} parcels within ${distanceM} m buffer`}
              badge={`${BUFFER_FEATURES[featureType].label}`}
              badgeTone={parcelsInBuffer.length > 0 ? "warning" : "success"}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Survey No</th>
                    <th className="py-2 pr-3">Owner</th>
                    <th className="py-2 pr-3">Classification</th>
                    <th className="py-2">Area (sq.m)</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelsInBuffer.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50">
                      <td className="py-2 pr-3 font-medium">{p.surveyNo}</td>
                      <td className="py-2 pr-3 text-slate-600">{p.owner}</td>
                      <td className="py-2 pr-3">{p.classification}</td>
                      <td className="py-2">{p.areaSqM.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyResults message="Adjust buffer distance and run analysis to highlight parcels within the zone." />
        )
      }
    />
  );
}
