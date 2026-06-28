import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Grid3x3, Loader2, Play } from "lucide-react";
import { Link } from "react-router-dom";
import WarpCanvas from "../components/warp/WarpCanvas";
import WarpProcessingPanel from "../components/warp/WarpProcessingPanel";
import {
  computeRmsError,
  GDAL_PANEL_DEFAULTS,
  INITIAL_GCPS,
  TRANSFORM_MODES,
  WARP_CONTEXT,
  WARP_WORKFLOW_STEPS,
  type GcpAnchor,
  type TransformMode,
} from "../data/warpMock";

export default function WarpPage() {
  const [step, setStep] = useState(0);
  const [gcps, setGcps] = useState<GcpAnchor[]>(() => INITIAL_GCPS.map((g) => ({ ...g })));
  const [mode, setMode] = useState<TransformMode>("warp");
  const [warped, setWarped] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stretch, setStretch] = useState<number>(GDAL_PANEL_DEFAULTS.stretch);
  const [rotateDeg, setRotateDeg] = useState<number>(GDAL_PANEL_DEFAULTS.rotateDeg);
  const [offsetX, setOffsetX] = useState<number>(GDAL_PANEL_DEFAULTS.offsetX);
  const [offsetY, setOffsetY] = useState<number>(GDAL_PANEL_DEFAULTS.offsetY);

  const rms = useMemo(() => computeRmsError(gcps, warped ? mode : "translation"), [gcps, mode, warped]);

  function runWarp() {
    setProcessing(true);
    window.setTimeout(() => {
      setWarped(true);
      setStep(3);
      setProcessing(false);
    }, 1400);
  }

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
                <Grid3x3 className="h-5 w-5 text-violet-600" />
                <h1 className="text-lg font-semibold">Georeferencing — Rubber-sheet warp</h1>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {WARP_CONTEXT.village} · {WARP_CONTEXT.sheet} aligned to {WARP_CONTEXT.orthomosaic}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={runWarp}
            disabled={processing || step < 1}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Run gdalwarp
          </button>
        </div>

        <div className="mx-auto mt-4 flex max-w-[1800px] items-center gap-2">
          {WARP_WORKFLOW_STEPS.map((label, index) => {
            const done = index < step || (warped && index === 3);
            const active = index === step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </button>
                <span className={`text-xs font-medium ${active ? "text-violet-700" : done ? "text-emerald-700" : "text-slate-400"}`}>
                  {label}
                </span>
                {index < WARP_WORKFLOW_STEPS.length - 1 ? (
                  <div className={`mx-1 h-px flex-1 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 gap-3 p-3 lg:grid-cols-[minmax(220px,260px)_1fr_minmax(240px,280px)] lg:p-4">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <h2 className="text-sm font-semibold text-slate-800">Transform mode</h2>
          <div className="space-y-2">
            {TRANSFORM_MODES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setMode(t.id);
                  if (warped) setWarped(true);
                }}
                className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                  mode === t.id
                    ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200"
                    : "border-slate-100 bg-slate-50 hover:border-slate-200"
                }`}
              >
                <span className="font-semibold text-slate-800">{t.label}</span>
                <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{t.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-2 rounded-xl bg-slate-900 p-3 text-[10px] text-slate-300">
            <p className="font-semibold text-emerald-300">GCP anchors</p>
            <ul className="mt-2 space-y-1">
              {gcps.map((g) => (
                <li key={g.id}>• {g.label}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-4 py-2">
            <span className="text-sm font-semibold text-white">Before / after overlay</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              RMS {warped ? `${rms.toFixed(2)} m` : "—"}
            </span>
          </div>
          <div className="min-h-0 flex-1 p-2">
            <WarpCanvas gcps={gcps} onGcpsChange={setGcps} mode={mode} warped={warped} />
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-white/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <WarpProcessingPanel
            stretch={stretch}
            rotateDeg={rotateDeg}
            offsetX={offsetX}
            offsetY={offsetY}
            onStretchChange={setStretch}
            onRotateChange={setRotateDeg}
            onOffsetXChange={setOffsetX}
            onOffsetYChange={setOffsetY}
            processing={processing}
          />
          {warped ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              FMB sheet georeferenced — residual {rms.toFixed(2)} m within 0.25 m QC threshold.
            </p>
          ) : (
            <p className="mt-3 text-xs text-slate-500">
              Drag green drone anchors, then run gdalwarp to apply rubber-sheet deformation.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
