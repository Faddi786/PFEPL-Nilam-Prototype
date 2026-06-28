import { useCallback, useRef, useState } from "react";
import { ArrowLeft, Columns2 } from "lucide-react";
import { Link } from "react-router-dom";
import SwipeCompareMap from "../components/swipe/SwipeCompareMap";
import {
  SWIPE_LAYER_OPTIONS,
  SWIPE_PRESETS,
  type SwipeLayerId,
} from "../data/swipeCompareMock";

export default function SwipeComparePage() {
  const [layerA, setLayerA] = useState<SwipeLayerId>("georef-fmb");
  const [layerB, setLayerB] = useState<SwipeLayerId>("drone-ortho");
  const [swipePercent, setSwipePercent] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyPreset = (presetId: string) => {
    const preset = SWIPE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setLayerA(preset.layerA);
    setLayerB(preset.layerB);
  };

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setSwipePercent(Math.max(2, Math.min(98, pct)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    updateFromClientX(e.clientX);
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const labelA = SWIPE_LAYER_OPTIONS.find((l) => l.id === layerA)?.label ?? layerA;
  const labelB = SWIPE_LAYER_OPTIONS.find((l) => l.id === layerB)?.label ?? layerB;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] text-[#1A1A1A]">
      <header className="shrink-0 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-sm lg:px-6">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Link
              to="/app"
              aria-label="Back to workbench"
              className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Columns2 className="h-5 w-5 text-sky-600" />
                <h1 className="text-lg font-semibold">Swipe Compare</h1>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Side-by-side layer comparison for georeferencing QC and mutation review — Khutal, Karaikal
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-3 p-3 lg:flex-row lg:p-4">
        <aside className="flex w-full shrink-0 flex-col gap-3 lg:w-72">
          <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <h2 className="text-sm font-semibold text-slate-800">Presets</h2>
            <div className="mt-2 space-y-2">
              {SWIPE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left text-xs transition hover:border-sky-200 hover:bg-sky-50"
                >
                  <span className="font-semibold text-slate-800">{preset.label}</span>
                  <p className="mt-0.5 text-[10px] text-slate-500">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <label className="block text-xs font-semibold text-slate-700">
              Layer A (left)
              <select
                value={layerA}
                onChange={(e) => setLayerA(e.target.value as SwipeLayerId)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              >
                {SWIPE_LAYER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-700">
              Layer B (right)
              <select
                value={layerB}
                onChange={(e) => setLayerB(e.target.value as SwipeLayerId)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
              >
                {SWIPE_LAYER_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-slate-700">
              Swipe position
              <input
                type="range"
                min="0"
                max="100"
                value={swipePercent}
                onChange={(e) => setSwipePercent(Number(e.target.value))}
                className="mt-1 w-full accent-sky-600"
              />
            </label>
          </div>
        </aside>

        <div
          ref={containerRef}
          className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="absolute left-3 top-3 z-20 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium text-white">
            A: {labelA}
          </div>
          <div className="absolute right-3 top-3 z-20 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium text-white">
            B: {labelB}
          </div>
          <SwipeCompareMap layerA={layerA} layerB={layerB} swipePercent={swipePercent} />
          <div
            className="absolute bottom-0 top-0 z-30 flex w-8 cursor-ew-resize items-center justify-center"
            style={{ left: `${swipePercent}%`, transform: "translateX(-50%)" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <div className="flex h-12 w-6 items-center justify-center rounded-full border-2 border-white bg-sky-600 shadow-lg">
              <Columns2 className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
