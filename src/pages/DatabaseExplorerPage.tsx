import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DatabaseSearchBar,
  WorkflowFilterDropdown,
} from "../components/database/DatabaseFilters";
import ParcelDatabaseTable from "../components/database/ParcelDatabaseTable";
import {
  buildFilterOptions,
  computeDatabaseStats,
  DEFAULT_DATABASE_FILTERS,
  filterParcels,
  loadAllWorkbenchParcels,
  loadAllWorkbenchParcelsSync,
  type DatabaseFilterState,
  type DatabaseParcel,
} from "../data/parcelDatabase";

function InlineStatsBar({ parcels }: { parcels: DatabaseParcel[] }) {
  const stats = useMemo(() => computeDatabaseStats(parcels), [parcels]);
  const items = [
    { label: "Total parcels", value: stats.total },
    { label: "Mutation pending", value: stats.mutationPending },
    { label: "Disputed", value: stats.disputed },
    { label: "Green variance", value: stats.greenVariance },
    { label: "Amber variance", value: stats.amberVariance },
    { label: "Red variance", value: stats.redVariance },
    { label: "With encumbrance", value: stats.withEncumbrance },
  ];

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-slate-600">
      {items.map((item, index) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-slate-300">|</span> : null}
          <span>
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="text-slate-400"> — </span>
            <span className="font-semibold text-[#1A1A1A]">{item.value.toLocaleString()}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

export default function DatabaseExplorerPage() {
  const [parcels, setParcels] = useState<DatabaseParcel[]>(() => loadAllWorkbenchParcelsSync());
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DatabaseFilterState>({ ...DEFAULT_DATABASE_FILTERS });

  useEffect(() => {
    let cancelled = false;
    loadAllWorkbenchParcels()
      .then((next) => {
        if (!cancelled) setParcels(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filterOptions = useMemo(() => buildFilterOptions(parcels), [parcels]);
  const filteredParcels = useMemo(() => filterParcels(parcels, filters), [parcels, filters]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] p-2 lg:p-3">
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)] lg:p-3">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <Link
            to="/app"
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to map workbench
          </Link>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {loading ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </span>
            ) : null}
            <WorkflowFilterDropdown
              value={filters.workflow}
              onChange={(workflow) => setFilters({ ...filters, workflow })}
            />
            <DatabaseSearchBar
              value={filters.search}
              onChange={(search) => setFilters({ ...filters, search })}
            />
          </div>
        </div>

        <div className="mb-2 shrink-0">
          <InlineStatsBar parcels={filteredParcels} />
        </div>

        <ParcelDatabaseTable
          parcels={filteredParcels}
          filters={filters}
          filterOptions={filterOptions}
          onFiltersChange={setFilters}
        />
      </main>
    </div>
  );
}
