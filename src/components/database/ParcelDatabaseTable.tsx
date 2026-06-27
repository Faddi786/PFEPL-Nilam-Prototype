import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { VARIANCE_BAND_COLORS_SOLID, type ParcelRecord } from "../../data/mockData";
import {
  formatParcelStatus,
  getParcelGeometry,
  type DatabaseFilterOptions,
  type DatabaseFilterState,
  type DatabaseParcel,
} from "../../data/parcelDatabase";
import { HeaderColumnFilter } from "./DatabaseFilters";
import ParcelMapPreviewModal from "./ParcelMapPreviewModal";

type SortKey =
  | "surveyNo"
  | "ulpin"
  | "regionLabel"
  | "village"
  | "taluk"
  | "ward"
  | "ownerMasked"
  | "areaSqM"
  | "status"
  | "varianceBand"
  | "classification"
  | "landUse"
  | "mutationRef";

type FilterKey = keyof Pick<
  DatabaseFilterState,
  "region" | "taluk" | "village" | "ward" | "status" | "varianceBand" | "classification" | "landUse"
>;

type Column = {
  key: SortKey;
  label: string;
  align?: "left" | "right";
  filterKey?: FilterKey;
  render?: (parcel: DatabaseParcel) => React.ReactNode;
};

const COLUMNS: Column[] = [
  { key: "surveyNo", label: "Survey No" },
  { key: "ulpin", label: "ULPIN" },
  { key: "regionLabel", label: "Region", filterKey: "region" },
  { key: "village", label: "Village", filterKey: "village" },
  { key: "taluk", label: "Taluk", filterKey: "taluk" },
  { key: "ward", label: "Ward", filterKey: "ward" },
  { key: "ownerMasked", label: "Owner" },
  {
    key: "areaSqM",
    label: "Area (sq.m)",
    align: "right",
    render: (parcel) => parcel.areaSqM.toLocaleString(),
  },
  {
    key: "status",
    label: "Status",
    filterKey: "status",
    render: (parcel) => <StatusBadge status={parcel.status} />,
  },
  {
    key: "varianceBand",
    label: "Variance",
    filterKey: "varianceBand",
    render: (parcel) => <VarianceBadge band={parcel.varianceBand} pct={parcel.variancePct} />,
  },
  { key: "classification", label: "Classification", filterKey: "classification" },
  { key: "landUse", label: "Land use", filterKey: "landUse" },
  { key: "mutationRef", label: "Mutation ref" },
];

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "active"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : status === "mutation_pending"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-rose-50 text-rose-800 border-rose-200";
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {formatParcelStatus(status)}
    </span>
  );
}

function VarianceBadge({ band, pct }: { band: ParcelRecord["varianceBand"]; pct: number }) {
  const color = VARIANCE_BAND_COLORS_SOLID[band];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium capitalize text-slate-800">{band}</span>
      <span className="text-slate-400">({pct.toFixed(1)}%)</span>
    </span>
  );
}

function compareValues(a: DatabaseParcel, b: DatabaseParcel, key: SortKey): number {
  const av = a[key];
  const bv = b[key];
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
}

function getFilterOptions(
  filterKey: FilterKey,
  options: DatabaseFilterOptions,
): Array<{ value: string; label: string }> {
  switch (filterKey) {
    case "region":
      return options.regions;
    case "taluk":
      return options.taluks.map((t) => ({ value: t, label: t }));
    case "village":
      return options.villages.map((v) => ({ value: v, label: v }));
    case "ward":
      return options.wards.map((w) => ({ value: w, label: w }));
    case "status":
      return options.statuses.map((s) => ({
        value: s,
        label: formatParcelStatus(s),
      }));
    case "varianceBand":
      return options.varianceBands.map((b) => ({
        value: b,
        label: b.charAt(0).toUpperCase() + b.slice(1),
      }));
    case "classification":
      return options.classifications.map((c) => ({ value: c, label: c }));
    case "landUse":
      return options.landUses.map((l) => ({ value: l, label: l }));
    default:
      return [];
  }
}

function getFilterValue(filters: DatabaseFilterState, filterKey: FilterKey): string {
  if (filterKey === "region") {
    return filters.region;
  }
  return filters[filterKey];
}

function SortableHeader({
  label,
  align,
  active,
  sortDir,
  onSort,
}: {
  label: string;
  align?: "left" | "right";
  active: boolean;
  sortDir: "asc" | "desc";
  onSort: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSort}
      className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition hover:bg-slate-100 hover:text-slate-800 ${
        active ? "text-slate-800" : "text-slate-500"
      } ${align === "right" ? "ml-auto" : ""}`}
    >
      {label}
      {active ? (
        sortDir === "asc" ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )
      ) : (
        <ChevronDown className="h-3 w-3 opacity-30" />
      )}
    </button>
  );
}

type Props = {
  parcels: DatabaseParcel[];
  filters: DatabaseFilterState;
  filterOptions: DatabaseFilterOptions;
  onFiltersChange: (filters: DatabaseFilterState) => void;
};

export default function ParcelDatabaseTable({
  parcels,
  filters,
  filterOptions,
  onFiltersChange,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("surveyNo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [mapPreview, setMapPreview] = useState<{
    parcel: DatabaseParcel;
    geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  } | null>(null);

  const sorted = useMemo(() => {
    const copy = [...parcels];
    copy.sort((a, b) => {
      const cmp = compareValues(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [parcels, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  function patchFilter(partial: Partial<DatabaseFilterState>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function handleRowDoubleClick(parcel: DatabaseParcel) {
    const geometry = getParcelGeometry(parcel);
    if (!geometry) return;
    setMapPreview({ parcel, geometry });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226,232,240)]">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-2 py-1.5 ${
                    column.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {column.filterKey ? (
                    <HeaderColumnFilter
                      label={column.label}
                      value={getFilterValue(filters, column.filterKey)}
                      options={getFilterOptions(column.filterKey, filterOptions)}
                      onChange={(next) => {
                        if (column.filterKey === "region") {
                          patchFilter({ region: next });
                          return;
                        }
                        patchFilter({ [column.filterKey!]: next });
                      }}
                      align={column.align}
                      sortActive={sortKey === column.key}
                      sortDir={sortDir}
                      onSort={() => toggleSort(column.key)}
                    />
                  ) : (
                    <SortableHeader
                      label={column.label}
                      align={column.align}
                      active={sortKey === column.key}
                      sortDir={sortDir}
                      onSort={() => toggleSort(column.key)}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-slate-500">
                  No parcels match the current filters.
                </td>
              </tr>
            ) : (
              sorted.map((parcel) => (
                <tr
                  key={parcel.id}
                  className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50/80"
                  onDoubleClick={() => handleRowDoubleClick(parcel)}
                  title="Double-click to preview parcel on map"
                >
                  {COLUMNS.map((column) => (
                    <td
                      key={column.key}
                      className={`whitespace-nowrap px-2 py-1.5 text-slate-800 ${
                        column.align === "right" ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {column.render ? column.render(parcel) : String(parcel[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {mapPreview ? (
        <ParcelMapPreviewModal
          parcel={mapPreview.parcel}
          geometry={mapPreview.geometry}
          onClose={() => setMapPreview(null)}
        />
      ) : null}
    </div>
  );
}
