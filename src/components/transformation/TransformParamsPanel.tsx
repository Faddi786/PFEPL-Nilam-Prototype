import type { AffineParams, PolynomialOrder, ProjectiveParams, TransformMethod } from "../../data/transformationMock";

type TransformParamsPanelProps = {
  method: TransformMethod;
  affine: AffineParams;
  polynomialOrder: PolynomialOrder;
  polyCoeffCount: number | null;
  projective: ProjectiveParams | null;
  rmsError: number;
  applied: boolean;
};

export default function TransformParamsPanel({
  method,
  affine,
  polynomialOrder,
  polyCoeffCount,
  projective,
  rmsError,
  applied,
}: TransformParamsPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Transform parameters</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            applied ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {applied ? "Applied" : "Preview"}
        </span>
      </div>

      <div className="rounded-xl bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-slate-300">
        {method === "overview" && (
          <p className="text-slate-400">Select a method tab to view computed parameters.</p>
        )}

        {method === "affine" && (
          <>
            <p className="mb-2 font-semibold text-sky-300">Affine (6 params)</p>
            <p>
              a={affine.a.toFixed(4)} b={affine.b.toFixed(4)} tx={affine.tx.toFixed(3)}
            </p>
            <p>
              c={affine.c.toFixed(4)} d={affine.d.toFixed(4)} ty={affine.ty.toFixed(3)}
            </p>
            <p className="mt-2 text-emerald-300">
              |x&apos;| = |{affine.a.toFixed(3)} {affine.b.toFixed(3)} {affine.tx.toFixed(2)}| |x|
            </p>
            <p className="text-emerald-300">
              |y&apos;| = |{affine.c.toFixed(3)} {affine.d.toFixed(3)} {affine.ty.toFixed(2)}| |y|
            </p>
          </>
        )}

        {method === "polynomial" && (
          <>
            <p className="mb-2 font-semibold text-sky-300">Polynomial order {polynomialOrder}</p>
            <p>
              Coefficients: {polyCoeffCount ?? "—"} per axis
              {polynomialOrder === 1 && " (a₀ + a₁x + a₂y)"}
              {polynomialOrder === 2 && " (+ quadratic terms)"}
              {polynomialOrder === 3 && " (+ cubic terms)"}
            </p>
            <p className="mt-1 text-slate-400">
              Min GCPs: {polynomialOrder === 1 ? 3 : polynomialOrder === 2 ? 6 : 10}
            </p>
          </>
        )}

        {method === "tps" && (
          <>
            <p className="mb-2 font-semibold text-sky-300">Thin Plate Spline</p>
            <p>Radial basis U(r) = r²·log(r)</p>
            <p className="mt-1 text-slate-400">Local warp from draggable control points</p>
          </>
        )}

        {method === "projective" && projective && (
          <>
            <p className="mb-2 font-semibold text-sky-300">Homography (3×3)</p>
            <p>
              h₁₁={projective.h[0]![0]!.toFixed(3)} h₁₂={projective.h[0]![1]!.toFixed(3)} h₁₃=
              {projective.h[0]![2]!.toFixed(3)}
            </p>
            <p>
              h₂₁={projective.h[1]![0]!.toFixed(3)} h₂₂={projective.h[1]![1]!.toFixed(3)} h₂₃=
              {projective.h[1]![2]!.toFixed(3)}
            </p>
            <p>
              h₃₁={projective.h[2]![0]!.toFixed(4)} h₃₂={projective.h[2]![1]!.toFixed(4)} h₃₃=1
            </p>
          </>
        )}

        {method === "projective" && !projective && (
          <p className="text-amber-300">Drag all 4 corner handles to compute homography.</p>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">RMS error</p>
        <p className="text-lg font-bold text-violet-700">
          {rmsError.toFixed(3)} <span className="text-sm font-normal text-slate-500">units</span>
        </p>
      </div>
    </div>
  );
}
