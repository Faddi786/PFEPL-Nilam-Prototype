import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyResults, ResultsHeader, RunAnalysisButton, ToolShell } from "./MoreToolsShared";
import { SPATIAL_CONTEXT, STATISTICS_BY_SCOPE, type StatisticsScope } from "../../data/moreToolsMock";

const SCOPE_OPTIONS: { value: StatisticsScope; label: string }[] = [
  { value: "village", label: "Village" },
  { value: "taluk", label: "Taluk" },
  { value: "district", label: "District" },
  { value: "ut", label: "UT (Puducherry)" },
];

export default function StatisticsTool() {
  const [scope, setScope] = useState<StatisticsScope>("village");
  const [analyzed, setAnalyzed] = useState(false);
  const [running, setRunning] = useState(false);

  const stats = useMemo(
    () => STATISTICS_BY_SCOPE.find((s) => s.scope === scope) ?? STATISTICS_BY_SCOPE[0],
    [scope],
  );

  function runAnalysis() {
    setRunning(true);
    window.setTimeout(() => {
      setAnalyzed(true);
      setRunning(false);
    }, 500);
  }

  return (
    <ToolShell
      title="Cadastral Statistics"
      description="Aggregate parcel summaries at village, taluk, district, or UT scope — not individual parcel records. Supports executive dashboards and planning."
      useCases={[
        "Village-level parcel inventory",
        "Government vs private land ratio",
        "Pending mutation backlog tracking",
      ]}
      controls={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Scope</span>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as StatisticsScope);
                setAnalyzed(false);
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              {SCOPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <RunAnalysisButton onClick={runAnalysis} running={running} label="Generate statistics" />
        </div>
      }
      map={
        <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-6 text-center">
          <div>
            <p className="text-sm font-medium text-slate-700">{SPATIAL_CONTEXT.ut} — {stats.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[#1A1A1A]">
              {analyzed ? stats.totalParcels.toLocaleString() : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Total parcels</p>
          </div>
        </div>
      }
      results={
        analyzed ? (
          <>
            <ResultsHeader title={`${stats.label} — Cadastral summary`} badge={scope.toUpperCase()} />
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: "Total parcels", value: stats.totalParcels, hint: "All cadastral units" },
                { label: "Government", value: stats.govtParcels, hint: "Poramboke & govt" },
                { label: "Private", value: stats.privateParcels, hint: "Patta holdings" },
                { label: "Avg size", value: `${stats.avgSizeSqM} sq.m`, hint: "Mean parcel area" },
                { label: "Pending mutations", value: stats.pendingMutations, hint: "Awaiting approval" },
                { label: "Total area", value: `${stats.totalAreaHa} ha`, hint: "Aggregate extent" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-1 text-xl font-semibold text-[#1A1A1A]">
                    {typeof card.value === "number" ? card.value.toLocaleString() : card.value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">{card.hint}</p>
                </div>
              ))}
            </div>
            <div className="h-56 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {stats.chartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <EmptyResults message="Select scope and generate statistics for aggregate cadastral summaries." />
        )
      }
    />
  );
}
