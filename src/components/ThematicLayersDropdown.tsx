import { useEffect, useRef, useState } from "react";
import { TreePine } from "lucide-react";
import type { LayerConfig } from "../data/mockData";

type Props = {
  layers: LayerConfig[];
  onToggle: (layerId: string, visible: boolean) => void;
};

export default function ThematicLayersDropdown({ layers, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const allVisible = layers.length > 0 && layers.every((layer) => layer.visible);

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

  function handleToggleAll() {
    const nextVisible = !allVisible;
    layers.forEach((layer) => onToggle(layer.id, nextVisible));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Thematic overlays"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-700 shadow-lg backdrop-blur-md transition hover:border-slate-200 hover:text-slate-900 ${
          open ? "border-slate-200 text-slate-900" : ""
        }`}
      >
        <TreePine className="h-4 w-4 text-slate-600" />
      </button>

      <div
        className={`absolute right-0 top-full z-30 pt-1 transition-all duration-150 ${
          open
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        }`}
      >
        <div className="min-w-[196px] overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md">
          <div className="border-b border-slate-100 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Thematic Overlays
            </p>
          </div>
          {layers.map((layer) => (
            <label
              key={layer.id}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-xs text-slate-700 transition hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(event) => onToggle(layer.id, event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-[#1A1A1A] focus:ring-[#1A1A1A]/20"
              />
              <span>{layer.label}</span>
            </label>
          ))}
          <div className="border-t border-slate-100">
            <button
              type="button"
              onClick={handleToggleAll}
              className="flex w-full items-center px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-slate-50"
            >
              {allVisible ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
