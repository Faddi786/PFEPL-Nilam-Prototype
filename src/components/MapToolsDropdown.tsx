import { useEffect, useRef, useState } from "react";
import { Gauge, Merge, Move3d, Ruler, Scissors, Wrench } from "lucide-react";
import type { MapTool } from "../lib/mapEngine";

type ToolItem = { id: MapTool; label: string; icon: typeof Move3d };

const toolItems: ToolItem[] = [
  { id: "vertex-edit", label: "Vertex Edit", icon: Move3d },
  { id: "split", label: "Split", icon: Scissors },
  { id: "amalgamate", label: "Amalgamate", icon: Merge },
  { id: "measure-distance", label: "Measure", icon: Ruler },
  { id: "buffer", label: "Buffer", icon: Gauge },
];

type Props = {
  activeTool: MapTool;
  onSelectTool: (tool: MapTool) => void;
};

export default function MapToolsDropdown({ activeTool, onSelectTool }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Map tools"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/95 shadow-lg backdrop-blur-md transition hover:border-slate-200 ${
          open || activeTool !== "none" ? "border-slate-200 text-sky-700" : "text-slate-700"
        }`}
      >
        <Wrench className="h-4 w-4 text-slate-600" />
      </button>

      <div
        className={`absolute right-0 top-full z-30 pt-1 transition-all duration-150 ${
          open
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        }`}
      >
        <div className="min-w-[168px] overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md">
          {toolItems.map((item) => {
            const Icon = item.icon;
            const active = activeTool === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTool(item.id)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition ${
                  active ? "bg-[#1A1A1A] text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
