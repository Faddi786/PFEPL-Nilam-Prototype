import { Minus, Plus, RotateCcw } from "lucide-react";

type Props = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  zoom?: number;
  variant?: "light" | "dark";
  className?: string;
};

export default function CanvasZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  zoom,
  variant = "light",
  className = "",
}: Props) {
  const isDark = variant === "dark";

  return (
    <div
      className={`absolute right-2 top-2 z-10 flex flex-col overflow-hidden rounded-lg border shadow-sm backdrop-blur-sm ${
        isDark ? "border-white/20 bg-black/55" : "border-slate-200/80 bg-white/92"
      } ${className}`}
    >
      <button
        type="button"
        onClick={onZoomIn}
        aria-label="Zoom in"
        className={`flex h-8 w-8 items-center justify-center transition hover:bg-black/10 ${
          isDark ? "text-white hover:bg-white/15" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        <Plus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onZoomOut}
        aria-label="Zoom out"
        className={`flex h-8 w-8 items-center justify-center border-t transition ${
          isDark
            ? "border-white/15 text-white hover:bg-white/15"
            : "border-slate-200 text-slate-700 hover:bg-slate-100"
        }`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        aria-label="Reset zoom"
        title={zoom != null ? `${Math.round(zoom * 100)}%` : "Reset zoom"}
        className={`flex h-8 w-8 items-center justify-center border-t transition ${
          isDark
            ? "border-white/15 text-white hover:bg-white/15"
            : "border-slate-200 text-slate-700 hover:bg-slate-100"
        }`}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
