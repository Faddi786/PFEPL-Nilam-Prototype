import { Trash2 } from "lucide-react";
import type { GcpPoint } from "../../data/transformationMock";

type GcpEditorProps = {
  gcps: GcpPoint[];
  onDelete: (id: string) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  readOnly?: boolean;
};

export default function GcpEditor({ gcps, onDelete, onSelect, selectedId, readOnly }: GcpEditorProps) {
  if (gcps.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        Click on the canvas to add GCPs (source → target pairs).
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {gcps.map((gcp, i) => (
        <li
          key={gcp.id}
          className={`flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-xs transition ${
            selectedId === gcp.id
              ? "border-violet-300 bg-violet-50"
              : "border-slate-100 bg-slate-50 hover:border-slate-200"
          }`}
        >
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => onSelect?.(gcp.id)}
            disabled={readOnly}
          >
            <span className="font-semibold text-slate-800">
              GCP {i + 1}
              {gcp.label ? ` — ${gcp.label}` : ""}
            </span>
            <span className="mt-0.5 block font-mono text-[10px] text-slate-500">
              ({gcp.source[0].toFixed(1)}, {gcp.source[1].toFixed(1)}) → (
              {gcp.target[0].toFixed(1)}, {gcp.target[1].toFixed(1)})
            </span>
          </button>
          {!readOnly && (
            <button
              type="button"
              aria-label={`Delete GCP ${i + 1}`}
              onClick={() => onDelete(gcp.id)}
              className="ml-2 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
