import { useState } from "react";
import { ArrowLeft, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import HeatmapMap from "../components/heatmap/HeatmapMap";
import HeatmapStatsPanel from "../components/heatmap/HeatmapStatsPanel";
import { HEATMAP_CONTEXT, type HeatmapPeriod } from "../data/heatmapMock";

const PERIOD_OPTIONS: { id: HeatmapPeriod; label: string }[] = [
  { id: "month", label: "Last month" },
  { id: "year", label: "Last year" },
  { id: "all", label: "All time" },
];

export default function MutationHeatmapPage() {
  const [period, setPeriod] = useState<HeatmapPeriod>("year");
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] text-[#1A1A1A]">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm lg:px-6">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Link
              to="/app"
              aria-label="Back to workbench"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-600" />
                <h1 className="text-lg font-semibold">Mutation Heatmap</h1>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Village-level mutation density — {HEATMAP_CONTEXT.district}, {HEATMAP_CONTEXT.ut}
              </p>
            </div>
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeriod(opt.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  period === opt.id
                    ? "bg-orange-500 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 gap-3 p-3 lg:grid-cols-[1fr_minmax(260px,300px)] lg:p-4">
        <div className="min-h-0 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <HeatmapMap
            period={period}
            selectedVillageId={selectedVillageId}
            onSelectVillage={setSelectedVillageId}
          />
        </div>
        <div className="min-h-0 overflow-y-auto rounded-2xl border border-white/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Director dashboard</h2>
          <HeatmapStatsPanel period={period} selectedVillageId={selectedVillageId} />
        </div>
      </main>
    </div>
  );
}
