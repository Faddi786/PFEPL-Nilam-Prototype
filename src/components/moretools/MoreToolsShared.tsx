import type { ReactNode } from "react";
import { Play, Loader2 } from "lucide-react";
import clsx from "clsx";

export function HowItWorksBox({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-800">How it works</p>
      <p className="mt-1 text-xs leading-relaxed text-blue-900/80">{text}</p>
    </div>
  );
}

export function ToolShell({
  title,
  description,
  howItWorks,
  useCases,
  diagram,
  controls,
  map,
  results,
}: {
  title: string;
  description: string;
  howItWorks?: string;
  useCases?: string[];
  diagram?: ReactNode;
  controls: ReactNode;
  map: ReactNode;
  results: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_200px]">
        <div>
          <h2 className="text-lg font-semibold text-[#1A1A1A]">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
          {howItWorks ? <HowItWorksBox text={howItWorks} /> : null}
          {useCases?.length ? (
            <div className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                GeoNilam use cases
              </p>
              <ul className="mt-1.5 space-y-1 text-xs text-slate-500">
                {useCases.map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        {diagram ? <div className="hidden lg:block">{diagram}</div> : null}
      </div>
      {diagram ? <div className="lg:hidden">{diagram}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">{controls}</div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Map preview — {title}
        </div>
        <div className="h-[340px] p-2">{map}</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">{results}</div>
    </div>
  );
}

export function RunAnalysisButton({
  onClick,
  running,
  label = "Run analysis",
}: {
  onClick: () => void;
  running?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={running}
      className="inline-flex items-center gap-2 rounded-xl bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
    >
      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      {running ? "Analyzing…" : label}
    </button>
  );
}

export function ResultsHeader({
  title,
  badge,
  badgeTone = "neutral",
}: {
  title: string;
  badge?: string;
  badgeTone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
  };
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-[#1A1A1A]">{title}</h3>
      {badge ? (
        <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", toneClasses[badgeTone])}>
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function EmptyResults({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </p>
  );
}
