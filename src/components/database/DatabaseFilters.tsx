import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Filter, RotateCcw, Search } from "lucide-react";
import {
  type DatabaseFilterOptions,
  type DatabaseFilterState,
  type WorkflowBucket,
} from "../../data/parcelDatabase";

export const WORKFLOW_OPTIONS: Array<{ value: WorkflowBucket; label: string }> = [
  { value: "all", label: "All workflows" },
  { value: "mutation_pending", label: "Mutation pending" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "has_encumbrance", label: "Has encumbrance" },
  { value: "disputed", label: "Disputed parcels" },
  { value: "variance_green", label: "Variance — Green" },
  { value: "variance_amber", label: "Variance — Amber" },
  { value: "variance_red", label: "Variance — Red" },
];

export function hasActiveFilters(filters: DatabaseFilterState): boolean {
  return (
    filters.region !== "" ||
    filters.taluk !== "" ||
    filters.village !== "" ||
    filters.ward !== "" ||
    filters.status !== "" ||
    filters.varianceBand !== "" ||
    filters.classification !== "" ||
    filters.landUse !== "" ||
    filters.workflow !== "all" ||
    filters.search.trim() !== ""
  );
}

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export function DatabaseSearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative w-[220px] max-w-[280px] shrink-0">
      <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        placeholder="Survey no, ULPIN..."
        className="w-full rounded-md border border-slate-200 bg-white py-1 pl-7 pr-2 text-xs text-slate-800 outline-none transition focus:border-slate-400"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};

type WorkflowFilterProps = {
  value: WorkflowBucket;
  onChange: (value: WorkflowBucket) => void;
};

export function WorkflowFilterDropdown({ value, onChange }: WorkflowFilterProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = value !== "all";
  const label = WORKFLOW_OPTIONS.find((opt) => opt.value === value)?.label ?? "Workflow";

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 240;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8 && rect.top > spaceBelow;
    setMenuStyle({
      position: "fixed",
      right: window.innerWidth - rect.right,
      minWidth: Math.max(rect.width, 180),
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open, updatePosition]);

  const menu = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="max-h-[280px] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
    >
      {WORKFLOW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onChange(option.value);
            setOpen(false);
          }}
          className={`flex w-full items-center px-2.5 py-1.5 text-left text-xs transition ${
            value === option.value ? "bg-[#1A1A1A] text-white" : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Workflow filter"
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition hover:border-slate-300 ${
          active ? "border-slate-400 bg-slate-50 text-slate-800" : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        <Filter className="h-3 w-3" />
        <span className="max-w-[100px] truncate">{active ? label : "Workflow"}</span>
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A]" /> : null}
        <ChevronDown className={`h-3 w-3 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

type ClearFiltersProps = {
  filters: DatabaseFilterState;
  onClear: () => void;
};

export function ClearFiltersButton({ filters, onClear }: ClearFiltersProps) {
  if (!hasActiveFilters(filters)) return null;
  return (
    <button
      type="button"
      onClick={onClear}
      title="Clear all filters"
      className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <RotateCcw className="h-3 w-3" />
      Clear
    </button>
  );
}

type HeaderFilterProps = {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  align?: "left" | "right";
  sortActive?: boolean;
  sortDir?: "asc" | "desc";
  onSort?: () => void;
};

export function HeaderColumnFilter({
  label,
  value,
  options,
  onChange,
  align = "left",
  sortActive,
  sortDir,
  onSort,
}: HeaderFilterProps) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const active = value !== "";
  const allOptions = [{ value: "", label: "All" }, ...options];

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < menuHeight + 8 && rect.top > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left: align === "right" ? undefined : rect.left,
      right: align === "right" ? window.innerWidth - rect.right : undefined,
      minWidth: Math.max(rect.width, 140),
      top: openUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      zIndex: 9999,
    });
  }, [align]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open, updatePosition]);

  const menu = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      className="max-h-[240px] overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
    >
      {allOptions.map((option) => (
        <button
          key={option.value || "__all__"}
          type="button"
          onClick={() => {
            onChange(option.value);
            setOpen(false);
          }}
          className={`flex w-full items-center px-2.5 py-1.5 text-left text-xs transition ${
            value === option.value ? "bg-[#1A1A1A] text-white" : "text-slate-700 hover:bg-slate-50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`flex items-center gap-0.5 ${align === "right" ? "justify-end" : ""}`}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition hover:bg-slate-100 hover:text-slate-800 ${
          active || open ? "text-slate-800" : "text-slate-500"
        }`}
      >
        {label}
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-[#1A1A1A]" /> : null}
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className={`rounded p-0.5 transition hover:bg-slate-100 ${
            sortActive ? "text-slate-800" : "text-slate-400"
          }`}
          title={`Sort by ${label}`}
        >
          <ChevronDown
            className={`h-3 w-3 transition ${sortActive && sortDir === "asc" ? "rotate-180" : ""} ${
              sortActive ? "opacity-100" : "opacity-40"
            }`}
          />
        </button>
      ) : null}
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

export type { DatabaseFilterOptions, DatabaseFilterState };
