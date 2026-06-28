import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, GitCompare, RotateCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import GcpEditor from "../components/transformation/GcpEditor";
import MethodSelector from "../components/transformation/MethodSelector";
import TransformCanvas, { type ViewMode } from "../components/transformation/TransformCanvas";
import TransformParamsPanel from "../components/transformation/TransformParamsPanel";
import {
  DEFAULT_AFFINE,
  INITIAL_GCPS,
  OVERVIEW_METHODS,
  PROJECTIVE_CORNERS,
  TRANSFORM_CONTEXT,
  type AffineParams,
  type GcpPoint,
  type PolynomialOrder,
  type TransformMethod,
} from "../data/transformationMock";
import {
  applyAffine,
  applyPolynomial,
  applyProjective,
  applyTps,
  computeRmsError,
  fitAffineFromGcps,
  fitPolynomial,
  fitProjective,
  type Point,
} from "../lib/transformMath";

let gcpCounter = 100;

export default function TransformationPage() {
  const [method, setMethod] = useState<TransformMethod>("overview");
  const [gcps, setGcps] = useState<GcpPoint[]>(() => INITIAL_GCPS.map((g) => ({ ...g })));
  const [affineParams, setAffineParams] = useState<AffineParams>({ ...DEFAULT_AFFINE });
  const [polynomialOrder, setPolynomialOrder] = useState<PolynomialOrder>(2);
  const [projectiveDst, setProjectiveDst] = useState<Point[]>(() =>
    PROJECTIVE_CORNERS.map(([x, y]) => [x + 4, y - 2] as Point),
  );
  const [applied, setApplied] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");
  const [overlayOpacity, setOverlayOpacity] = useState(0.75);
  const [selectedGcp, setSelectedGcp] = useState<string | null>(null);

  const effectiveAffine = useMemo(() => {
    if (method === "affine" && gcps.length >= 3) return fitAffineFromGcps(gcps);
    return affineParams;
  }, [method, gcps, affineParams]);

  const polyFit = useMemo(() => fitPolynomial(gcps, polynomialOrder), [gcps, polynomialOrder]);
  const projectiveFit = useMemo(
    () => (method === "projective" ? fitProjective(PROJECTIVE_CORNERS, projectiveDst) : null),
    [method, projectiveDst],
  );

  const transformFn = useCallback(
    (p: Point): Point => {
      switch (method) {
        case "affine":
          return applyAffine(p, effectiveAffine);
        case "polynomial":
          if (polyFit) return applyPolynomial(p, polyFit.coeffX, polyFit.coeffY, polynomialOrder);
          return p;
        case "tps":
          return applyTps(p, gcps);
        case "projective":
          if (projectiveFit) return applyProjective(p, projectiveFit);
          return p;
        default:
          return p;
      }
    },
    [method, effectiveAffine, polyFit, polynomialOrder, gcps, projectiveFit],
  );

  const rmsError = useMemo(() => {
    if (method === "overview") return 0;
    if (method === "projective" && projectiveFit) {
      return computeRmsError(
        PROJECTIVE_CORNERS.map((src, i) => ({
          id: `c-${i}`,
          label: `Corner ${i + 1}`,
          source: src,
          target: projectiveDst[i]!,
        })),
        transformFn,
      );
    }
    return computeRmsError(gcps, transformFn);
  }, [method, gcps, projectiveFit, projectiveDst, transformFn]);

  function handleReset() {
    setGcps(INITIAL_GCPS.map((g) => ({ ...g })));
    setAffineParams({ ...DEFAULT_AFFINE });
    setProjectiveDst(PROJECTIVE_CORNERS.map(([x, y]) => [x + 4, y - 2] as Point));
    setApplied(false);
    setSelectedGcp(null);
  }

  function handleAddGcp(source: Point, target: Point) {
    gcpCounter += 1;
    setGcps((prev) => [
      ...prev,
      { id: `gcp-${gcpCounter}`, label: "New GCP", source, target },
    ]);
  }

  function handleDeleteGcp(id: string) {
    setGcps((prev) => prev.filter((g) => g.id !== id));
    if (selectedGcp === id) setSelectedGcp(null);
  }

  function handleMethodChange(next: TransformMethod) {
    setMethod(next);
    setApplied(false);
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
                <GitCompare className="h-5 w-5 text-violet-600" />
                <h1 className="text-lg font-semibold">Transformation Tools</h1>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {TRANSFORM_CONTEXT.village} · {TRANSFORM_CONTEXT.sheet} → {TRANSFORM_CONTEXT.orthomosaic}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => setApplied(true)}
              disabled={method === "overview"}
              className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Apply Transform
            </button>
          </div>
        </div>

        <div className="mx-auto mt-3 max-w-[1800px]">
          <MethodSelector active={method} onChange={handleMethodChange} />
        </div>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 gap-3 p-3 lg:grid-cols-[minmax(220px,260px)_1fr_minmax(240px,280px)] lg:p-4">
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          {method === "overview" ? (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">When to use each method</h2>
              {OVERVIEW_METHODS.map((m) => (
                <motion.button
                  key={m.id}
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleMethodChange(m.id)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 text-left transition hover:border-violet-200 hover:bg-violet-50/50"
                >
                  <span className="text-lg">{m.icon}</span>
                  <p className="mt-1 text-xs font-bold text-slate-800">{m.title}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-violet-600">{m.when}</p>
                  <p className="mt-1 text-[10px] leading-snug text-slate-500">{m.useCase}</p>
                </motion.button>
              ))}
            </div>
          ) : (
            <>
              <h2 className="text-sm font-semibold text-slate-800">Ground control points</h2>
              <GcpEditor
                gcps={method === "projective" ? [] : gcps}
                onDelete={handleDeleteGcp}
                onSelect={setSelectedGcp}
                selectedId={selectedGcp}
              />
              {method === "projective" && (
                <p className="text-xs text-slate-500">
                  Drag the 4 purple corner handles on the canvas for perspective correction.
                </p>
              )}

              {method === "polynomial" && (
                <div className="mt-2">
                  <label className="text-xs font-semibold text-slate-700">Polynomial order</label>
                  <div className="mt-1.5 flex gap-1.5">
                    {([1, 2, 3] as PolynomialOrder[]).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setPolynomialOrder(o)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-bold ${
                          polynomialOrder === o
                            ? "bg-violet-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {o}
                        {o === 1 ? "st" : o === 2 ? "nd" : "rd"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {method === "affine" && (
                <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-[10px] text-slate-600">
                  <p className="font-semibold text-slate-700">Affine handles</p>
                  <p className="mt-1">T = translate · R = rotate · S = scale · K = skew</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-4 py-2">
            <span className="text-sm font-semibold text-white">Interactive canvas</span>
            <div className="flex flex-wrap items-center gap-2">
              {(["overlay", "before", "after", "split"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold capitalize ${
                    viewMode === mode ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  {mode}
                </button>
              ))}
              {viewMode === "overlay" && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  <SlidersHorizontal className="h-3 w-3" />
                  <input
                    type="range"
                    min={0.2}
                    max={1}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-16"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 p-2">
            <TransformCanvas
              method={method}
              gcps={gcps}
              onGcpsChange={setGcps}
              onAddGcp={handleAddGcp}
              affineParams={affineParams}
              onAffineChange={setAffineParams}
              polynomialOrder={polynomialOrder}
              projectiveDst={projectiveDst}
              onProjectiveDstChange={setProjectiveDst}
              applied={applied}
              viewMode={viewMode}
              overlayOpacity={overlayOpacity}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto rounded-2xl border border-white/70 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <TransformParamsPanel
            method={method}
            affine={effectiveAffine}
            polynomialOrder={polynomialOrder}
            polyCoeffCount={polyFit ? polyFit.coeffX.length : null}
            projective={projectiveFit}
            rmsError={rmsError}
            applied={applied}
          />

          {method !== "overview" && (
            <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/50 p-3 text-[10px] leading-relaxed text-slate-600">
              <p className="font-semibold text-violet-800">GeoNilam RFP context</p>
              <p className="mt-1">
                Align legacy FMB scans to drone orthomosaic and DGPS survey control. Drag GCPs or handles — preview
                updates in real time.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
