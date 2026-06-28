import { Check, Layers } from "lucide-react";
import { BASEMAP_OPTIONS } from "../lib/basemaps";
import { useDropdownOpen } from "../hooks/useDropdownOpen";

type Props = {
  activeBasemapId: string;
  onBasemapChange: (id: string) => void;
};

export default function BasemapDropdown({ activeBasemapId, onBasemapChange }: Props) {
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
        aria-label="Basemap"
        aria-expanded={open}
        onClick={onButtonClick}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/95 text-slate-700 shadow-lg backdrop-blur-md transition hover:border-slate-200 hover:text-slate-900 ${
          open ? "border-slate-200 text-slate-900" : ""
        }`}
      >
        <Layers className="h-4 w-4 text-slate-600" />
      </button>

      <div
        className={`absolute right-0 top-full z-30 pt-1 transition-all duration-150 ${
          open
            ? "pointer-events-auto visible opacity-100"
            : "pointer-events-none invisible opacity-0"
        }`}
      >
        <div className="min-w-[188px] overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur-md">
          {BASEMAP_OPTIONS.map((option) => {
            const active = activeBasemapId === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onBasemapChange(option.id)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition ${
                  active ? "bg-[#1A1A1A] text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{option.label}</span>
                {active ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
