type Props = {
  toolLabel: string | null;
  useCases: string[];
};

export default function ToolsUseCasePanel({ toolLabel, useCases }: Props) {
  if (!toolLabel || useCases.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-6 left-4 z-30 max-w-[280px] rounded-xl border border-white/80 bg-white/90 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {toolLabel} — use cases
      </p>
      <ul className="space-y-1.5">
        {useCases.map((useCase) => (
          <li key={useCase} className="flex gap-2 text-xs leading-snug text-slate-600">
            <span className="mt-0.5 shrink-0 text-slate-300" aria-hidden>
              •
            </span>
            <span>{useCase}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
