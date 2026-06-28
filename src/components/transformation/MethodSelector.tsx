import type { TransformMethod } from "../../data/transformationMock";
import { METHOD_TABS } from "../../data/transformationMock";

type MethodSelectorProps = {
  active: TransformMethod;
  onChange: (method: TransformMethod) => void;
};

export default function MethodSelector({ active, onChange }: MethodSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {METHOD_TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            active === tab.id
              ? "bg-violet-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {tab.short}
        </button>
      ))}
    </div>
  );
}
