import { AUTOCAD_WORKFLOW_STEPS } from "./AutocadWorkflowFlow";

type Props = {
  step: number;
  onStepChange: (step: number) => void;
};

export default function AutocadStepSwitcher({ step, onStepChange }: Props) {
  return (
    <select
      value={step}
      onChange={(e) => onStepChange(Number(e.target.value))}
      aria-label="AutoCAD method"
      className="inline-flex max-w-[min(260px,42vw)] appearance-none rounded-full border border-slate-200 bg-white bg-[length:12px] bg-[right_12px_center] bg-no-repeat px-3.5 py-2 pr-8 text-xs font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#1A1A1A]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
      }}
    >
      {AUTOCAD_WORKFLOW_STEPS.map((label, index) => (
        <option key={label} value={index}>
          {label}
        </option>
      ))}
    </select>
  );
}
