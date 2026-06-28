import type { ReactNode } from "react";
import {
  BoxSelect,
  GitCompare,
  Merge,
  Move3d,
  PenTool,
  Ruler,
  Scissors,
  Shapes,
} from "lucide-react";
import { useDropdownOpen } from "../../hooks/useDropdownOpen";
import { OVERVIEW_METHODS } from "../../data/transformationMock";
import { SPATIAL_TOOL_CATALOG, type ToolCategory } from "../../data/spatialToolCatalog";
import type { TransformMethod } from "../../data/transformationMock";
import type { MoreToolsTabId } from "../../data/spatialToolCatalog";

type DropdownProps = {
  label: string;
  icon: typeof GitCompare;
  active?: boolean;
  children: ReactNode;
};

function ToolDropdown({ label, icon: Icon, active, children }: DropdownProps) {
  const { open, rootRef, onRootMouseEnter, onRootMouseLeave, onButtonClick } = useDropdownOpen();

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={onRootMouseEnter}
      onMouseLeave={onRootMouseLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onButtonClick}
        className={`inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition hover:border-slate-200 ${
          open || active ? "border-slate-200 text-sky-700" : "text-slate-700"
        }`}
      >
        <Icon className="h-3.5 w-3.5 text-slate-600" />
        {label}
      </button>

      <div
        className={`absolute right-0 top-full z-40 pt-1 transition-all duration-150 ${
          open ? "pointer-events-auto visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
      >
        <div className="max-h-[min(420px,70vh)] min-w-[200px] overflow-y-auto rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}

function MenuButton({
  label,
  icon: Icon,
  onClick,
  active,
}: {
  label: string;
  icon?: typeof GitCompare;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
        active ? "bg-[#1A1A1A] text-white" : "text-slate-700 hover:bg-slate-50"
      }`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      {label}
    </button>
  );
}

function SectionDivider() {
  return <div className="tools-section-divider" role="separator" />;
}

function CategoryLabel({ label }: { label: string }) {
  return <p className="tools-section-label">{label}</p>;
}

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  queries: "Queries",
  operations: "Operations",
  analysis: "Analysis",
  quality: "Quality",
};

const SPATIAL_BY_CATEGORY = (["queries", "operations", "analysis", "quality"] as ToolCategory[]).map(
  (cat) => ({
    category: cat,
    tools: SPATIAL_TOOL_CATALOG.filter((t) => t.category === cat),
  }),
);

type Props = {
  activeTransform?: TransformMethod | null;
  activeSpatial?: MoreToolsTabId | null;
  activeMeasurement?: "distance" | "draw-polygon" | null;
  activeMutation?: "split" | "merge" | "vertex-edit" | null;
  onTransformSelect: (method: Exclude<TransformMethod, "overview">) => void;
  onSpatialSelect: (toolId: MoreToolsTabId) => void;
  onMeasurementSelect: (tool: "distance" | "draw-polygon") => void;
  onMutationSelect: (tool: "split" | "merge" | "vertex-edit") => void;
};

export default function ToolsFloatingBar({
  activeTransform,
  activeSpatial,
  activeMeasurement,
  activeMutation,
  onTransformSelect,
  onSpatialSelect,
  onMeasurementSelect,
  onMutationSelect,
}: Props) {
  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-30 flex flex-wrap items-center justify-end gap-2">
      <ToolDropdown label="Measurement" icon={Ruler} active={Boolean(activeMeasurement)}>
        <MenuButton
          label="Distance measure"
          icon={Ruler}
          onClick={() => onMeasurementSelect("distance")}
          active={activeMeasurement === "distance"}
        />
        <MenuButton
          label="Draw polygon → count parcels"
          icon={BoxSelect}
          onClick={() => onMeasurementSelect("draw-polygon")}
          active={activeMeasurement === "draw-polygon"}
        />
      </ToolDropdown>

      <ToolDropdown label="Mutation" icon={PenTool} active={Boolean(activeMutation)}>
        <MenuButton
          label="Split parcel"
          icon={Scissors}
          onClick={() => onMutationSelect("split")}
          active={activeMutation === "split"}
        />
        <MenuButton
          label="Merge parcels"
          icon={Merge}
          onClick={() => onMutationSelect("merge")}
          active={activeMutation === "merge"}
        />
        <MenuButton
          label="Edit vertex"
          icon={Move3d}
          onClick={() => onMutationSelect("vertex-edit")}
          active={activeMutation === "vertex-edit"}
        />
      </ToolDropdown>

      <ToolDropdown label="Spatial" icon={Shapes} active={Boolean(activeSpatial)}>
        <div className="tools-spatial-menu py-1">
          {SPATIAL_BY_CATEGORY.filter(({ tools }) => tools.length > 0).map(({ category, tools }, sectionIndex) => (
            <div key={category}>
              {sectionIndex > 0 ? <SectionDivider /> : null}
              <CategoryLabel label={CATEGORY_LABELS[category]} />
              {tools.map((tool) => (
                <MenuButton
                  key={tool.id}
                  label={tool.label}
                  onClick={() => onSpatialSelect(tool.id)}
                  active={activeSpatial === tool.id}
                />
              ))}
            </div>
          ))}
        </div>
      </ToolDropdown>

      <ToolDropdown label="Transform" icon={GitCompare} active={Boolean(activeTransform && activeTransform !== "overview")}>
        {OVERVIEW_METHODS.map((m) => (
          <MenuButton
            key={m.id}
            label={m.title}
            onClick={() => onTransformSelect(m.id)}
            active={activeTransform === m.id}
          />
        ))}
      </ToolDropdown>
    </div>
  );
}
