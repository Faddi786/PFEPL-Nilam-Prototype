import { useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Search, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import BufferTool from "../components/moretools/BufferTool";
import AreaDiffTool from "../components/moretools/AreaDiffTool";
import EncroachmentTool from "../components/moretools/EncroachmentTool";
import OverlapTool from "../components/moretools/OverlapTool";
import IntersectTool from "../components/moretools/IntersectTool";
import StatisticsTool from "../components/moretools/StatisticsTool";
import SpatialToolDemo from "../components/moretools/SpatialToolDemo";
import {
  SPATIAL_CONTEXT,
  MORE_TOOLS_TABS,
  type MoreToolsTabId,
} from "../data/moreToolsMock";
import {
  GENERIC_TOOL_IDS,
  TOOL_CATEGORIES,
  type ToolCategory,
} from "../data/spatialToolCatalog";

const LEGACY_COMPONENTS: Partial<Record<MoreToolsTabId, () => ReactNode>> = {
  buffer: () => <BufferTool />,
  "area-diff": () => <AreaDiffTool />,
  encroachment: () => <EncroachmentTool />,
  overlap: () => <OverlapTool />,
  intersect: () => <IntersectTool />,
  statistics: () => <StatisticsTool />,
};

function renderTool(id: MoreToolsTabId): ReactNode {
  if (LEGACY_COMPONENTS[id]) return LEGACY_COMPONENTS[id]!();
  if (GENERIC_TOOL_IDS.has(id)) return <SpatialToolDemo toolId={id} />;
  return null;
}

export default function MoreToolsPage() {
  const [activeTab, setActiveTab] = useState<MoreToolsTabId>("buffer");
  const [category, setCategory] = useState<ToolCategory | "all">("all");
  const [search, setSearch] = useState("");

  const filteredTabs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MORE_TOOLS_TABS.filter((tab) => {
      if (category !== "all" && tab.category !== category) return false;
      if (!q) return true;
      return (
        tab.label.toLowerCase().includes(q) ||
        tab.title.toLowerCase().includes(q) ||
        tab.description.toLowerCase().includes(q)
      );
    });
  }, [category, search]);

  const activeMeta = MORE_TOOLS_TABS.find((t) => t.id === activeTab);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] p-3 text-[#1A1A1A] lg:p-4">
      <Link
        to="/app"
        className="absolute left-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-lg border border-white/70 bg-white/90 text-slate-600 shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition hover:bg-white hover:text-slate-900 lg:left-6 lg:top-6"
        aria-label="Back to workbench"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <main className="mx-auto flex min-h-0 w-full max-w-[1200px] flex-1 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <header className="shrink-0 border-b border-slate-100 px-4 py-4 lg:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold">More Tools</h1>
              <p className="mt-0.5 text-sm text-slate-600">
                Spatial tools catalog — {SPATIAL_CONTEXT.village}, {SPATIAL_CONTEXT.district},{" "}
                {SPATIAL_CONTEXT.ut} · {MORE_TOOLS_TABS.length} tools
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search spatial tools…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {TOOL_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={clsx(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                    category === cat.id
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <nav
            className="mt-3 flex gap-1 overflow-x-auto pb-1"
            aria-label="Spatial analysis tools"
          >
            {filteredTabs.length === 0 ? (
              <p className="px-2 py-2 text-sm text-slate-500">No tools match your search.</p>
            ) : (
              filteredTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
                    activeTab === tab.id
                      ? "bg-[#1A1A1A] text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  {tab.label}
                </button>
              ))
            )}
          </nav>

          {activeMeta ? (
            <p className="mt-2 text-xs text-slate-400">
              {activeMeta.category.charAt(0).toUpperCase() + activeMeta.category.slice(1)} ·{" "}
              {filteredTabs.length} of {MORE_TOOLS_TABS.length} tools shown
            </p>
          ) : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
          {renderTool(activeTab)}
        </div>
      </main>
    </div>
  );
}
