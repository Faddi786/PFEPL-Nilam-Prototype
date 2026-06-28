import { Flame, TrendingUp } from "lucide-react";
import {
  getHeatmapKpis,
  HEATMAP_COLOR_SCALE,
  HEATMAP_VILLAGES,
  type HeatmapPeriod,
} from "../../data/heatmapMock";

type HeatmapStatsPanelProps = {
  period: HeatmapPeriod;
  selectedVillageId: string | null;
};

const PERIOD_LABELS: Record<HeatmapPeriod, string> = {
  month: "Last month",
  year: "Last year",
  all: "All time",
};

export default function HeatmapStatsPanel({ period, selectedVillageId }: HeatmapStatsPanelProps) {
  const kpis = getHeatmapKpis(period);
  const selected = HEATMAP_VILLAGES.find((v) => v.id === selectedVillageId);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Total mutations</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{kpis.totalMutations}</p>
          <p className="text-[10px] text-slate-400">{PERIOD_LABELS[period]}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Hotspot villages</p>
          <p className="mt-1 text-2xl font-bold text-orange-600">{kpis.hotspots}</p>
          <p className="text-[10px] text-slate-400">≥150 mutations</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Avg / village</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{kpis.avgPerVillage}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Coverage</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{kpis.villageCount}</p>
          <p className="text-[10px] text-slate-400">Karaikal villages</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-semibold text-slate-800">Top 5 villages</h3>
        </div>
        <ul className="space-y-1.5">
          {kpis.top5.map((v, i) => (
            <li
              key={v.id}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                v.id === selectedVillageId ? "bg-orange-50 ring-1 ring-orange-200" : "bg-white"
              }`}
            >
              <span className="font-medium text-slate-700">
                {i + 1}. {v.name}
              </span>
              <span className="font-bold text-slate-900">{v.count}</span>
            </li>
          ))}
        </ul>
      </div>

      {selected ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-3">
          <p className="text-xs font-semibold text-orange-900">{selected.name}</p>
          <p className="text-[10px] text-orange-700">{selected.nameTa}</p>
          <p className="mt-2 text-lg font-bold text-orange-800">{selected.counts[period]} mutations</p>
        </div>
      ) : null}

      <div>
        <div className="mb-2 flex items-center gap-2">
          <Flame className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold text-slate-800">Density legend</h3>
        </div>
        <div className="space-y-1.5">
          {HEATMAP_COLOR_SCALE.map((band) => (
            <div key={band.label} className="flex items-center gap-2 text-xs text-slate-600">
              <span className="h-3 w-6 shrink-0 rounded" style={{ backgroundColor: band.color }} />
              {band.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
