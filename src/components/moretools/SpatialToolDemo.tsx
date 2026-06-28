import { useMemo, useState } from "react";
import MoreToolsMap from "./MoreToolsMap";
import SpatialToolDiagram from "./SpatialToolDiagram";
import { EmptyResults, ResultsHeader, RunAnalysisButton, ToolShell } from "./MoreToolsShared";
import { SPATIAL_TOOL_CATALOG } from "../../data/spatialToolCatalog";
import { runSpatialToolDemo, type SpatialDemoOutput } from "../../data/spatialToolDemos";

type SpatialToolDemoProps = {
  toolId: string;
};

export default function SpatialToolDemo({ toolId }: SpatialToolDemoProps) {
  const meta = SPATIAL_TOOL_CATALOG.find((t) => t.id === toolId);
  const [analyzed, setAnalyzed] = useState(false);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<SpatialDemoOutput | null>(null);

  const diagram = meta?.diagram;

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      const result = runSpatialToolDemo(toolId);
      setOutput(result);
      setAnalyzed(true);
      setRunning(false);
    }, 550);
  }

  const overlays = useMemo(
    () => (analyzed && output ? output.overlays : []),
    [analyzed, output],
  );

  if (!meta) return null;

  return (
    <ToolShell
      title={meta.title}
      description={meta.description}
      howItWorks={meta.howItWorks}
      useCases={meta.useCases}
      diagram={diagram ? <SpatialToolDiagram type={diagram} /> : undefined}
      controls={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <p className="flex-1 text-xs text-slate-500">
            Demo uses mock Khutal / Karaikal parcel data from the workbench dataset.
          </p>
          <RunAnalysisButton onClick={runAnalysis} running={running} label={meta.runLabel ?? "Run analysis"} />
        </div>
      }
      map={<MoreToolsMap overlays={overlays} />}
      results={
        analyzed && output ? (
          <>
            <ResultsHeader
              title={output.summary}
              badge={output.badge}
              badgeTone={output.badgeTone ?? "neutral"}
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[400px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    {output.columns.map((col) => (
                      <th key={col.key} className="py-2 pr-3">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {output.rows.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {output.columns.map((col) => (
                        <td key={col.key} className="py-2 pr-3 text-slate-700">
                          {typeof row[col.key] === "number"
                            ? (row[col.key] as number).toLocaleString()
                            : String(row[col.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyResults message={meta.emptyMessage} />
        )
      }
    />
  );
}
