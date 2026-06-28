import { AlertTriangle, CheckCircle2, Pencil } from "lucide-react";
import {
  confidenceColorClass,
  confidenceLabel,
  getConfidenceLevel,
  type FmbExtractionState,
  type FmbTextField,
} from "../../data/fmbExtractionMock";

type Props = {
  state: FmbExtractionState;
  onFieldChange: (fieldId: string, value: string) => void;
  selectedVertexId: string | null;
  selectedEdgeId: string | null;
};

function ConfidenceBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${confidenceColorClass(score)}`}
    >
      {confidenceLabel(score)} {score}%
    </span>
  );
}

function TextFieldRow({
  field,
  onChange,
}: {
  field: FmbTextField;
  onChange: (value: string) => void;
}) {
  const isLow = getConfidenceLevel(field.confidence) === "low";
  const displayValue = field.correctedValue ?? field.value;
  const isFixed = field.intentionalError && field.correctedValue === field.correctHint;

  return (
    <div
      className={`rounded-xl border p-3 transition ${
        field.intentionalError
          ? "border-red-200 bg-red-50/60"
          : isLow
            ? "border-amber-200 bg-amber-50/40"
            : "border-slate-100 bg-white"
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{field.label}</span>
        <ConfidenceBadge score={field.confidence} />
      </div>
      <div className="relative">
        <input
          type="text"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 pr-8 text-sm font-medium outline-none transition focus:ring-2 ${
            field.intentionalError
              ? "border-red-300 bg-white text-red-900 focus:border-red-400 focus:ring-red-200"
              : isLow
                ? "border-amber-300 bg-white focus:border-amber-400 focus:ring-amber-200"
                : "border-slate-200 bg-white focus:border-sky-400 focus:ring-sky-100"
          }`}
        />
        <Pencil className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
      {field.intentionalError ? (
        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-red-700">
          {isFixed ? (
            <>
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>Corrected — matches FMB register entry.</span>
            </>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                OCR mismatch detected. Expected <strong>{field.correctHint}</strong> per FMB sketch.
              </span>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function FmbAttributePanel({ state, onFieldChange, selectedVertexId, selectedEdgeId }: Props) {
  const selectedVertex = state.vertices.find((v) => v.id === selectedVertexId);
  const selectedEdge = state.edges.find((e) => e.id === selectedEdgeId);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-[#1A1A1A]">Extracted attributes</h2>
        <p className="mt-0.5 text-xs text-slate-500">Review confidence scores and edit any field.</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Parcel number</span>
            <ConfidenceBadge score={state.parcelNumber.confidence} />
          </div>
          <p className="text-sm font-semibold text-[#1A1A1A]">{state.parcelNumber.value}</p>
        </div>

        {state.textFields.map((field) => (
          <TextFieldRow
            key={field.id}
            field={field}
            onChange={(value) => onFieldChange(field.id, value)}
          />
        ))}

        {selectedVertex ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Selected vertex</p>
            <p className="mt-1 text-sm font-medium">{selectedVertex.label}</p>
            <div className="mt-2 flex items-center gap-2">
              <ConfidenceBadge score={selectedVertex.confidence} />
              <span className="text-xs text-slate-500">
                ({Math.round(selectedVertex.x)}, {Math.round(selectedVertex.y)})
              </span>
            </div>
          </div>
        ) : null}

        {selectedEdge ? (
          <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Selected edge</p>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Length</span>
                <span className="flex items-center gap-2 font-medium">
                  {selectedEdge.lengthM} m
                  <ConfidenceBadge score={selectedEdge.lengthConfidence} />
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Bearing</span>
                <span className="flex items-center gap-2 font-medium">
                  {selectedEdge.bearing}
                  <ConfidenceBadge score={selectedEdge.bearingConfidence} />
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
