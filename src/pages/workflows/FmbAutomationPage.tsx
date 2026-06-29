import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileScan,
  Loader2,
  ScanLine,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import WorkflowSwitcher from "../../components/WorkflowSwitcher";
import FmbAttributePanel from "../../components/fmb/FmbAttributePanel";
import FmbExtractionCanvas from "../../components/fmb/FmbExtractionCanvas";
import {
  countExtractionSummary,
  createInitialFmbExtraction,
  FMB_WORKFLOW_STEPS,
  type FmbExtractionState,
} from "../../data/fmbExtractionMock";
import { getVisiblePanelWorkflows } from "../../data/workflows";

type WorkflowPhase = "upload" | "extracting" | "review" | "approved";

function FmbSketchPreview({ visible }: { visible: boolean }) {
  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-200/70 bg-[#faf8f3] shadow-inner">
      <div className="shrink-0 border-b border-amber-100 bg-amber-50/80 px-3 py-2">
        <p className="text-xs font-semibold text-amber-900">FMB Scan — Sheet 142</p>
        <p className="text-[10px] text-amber-700/80">Thirunallar, Karaikal</p>
      </div>
      <div className="relative min-h-0 flex-1 p-3">
        <svg viewBox="0 0 220 300" className="h-full w-full">
          <rect width="220" height="300" fill="#faf8f3" stroke="#d4c4a8" strokeWidth="1" />
          <text x="12" y="18" fill="#8b7355" style={{ fontSize: 8, fontFamily: "serif" }}>
            FIELD MEASUREMENT BOOK
          </text>
          <text x="12" y="30" fill="#a89070" style={{ fontSize: 7 }}>
            Village: Thirunallar | Taluk: Karaikal
          </text>
          <rect x="20" y="45" width="180" height="140" fill="none" stroke="#b8a888" strokeWidth="0.8" />
          {/* Hand-drawn parcel sketch */}
          <polygon
            points="50,155 130,145 160,85 100,60 45,95"
            fill="none"
            stroke="#4a5568"
            strokeWidth="1.2"
          />
          <text x="95" y="110" fill="#64748b" style={{ fontSize: 6 }} textAnchor="middle">
            1247.35 sq.m
          </text>
          <text x="95" y="120" fill="#64748b" style={{ fontSize: 5.5 }} textAnchor="middle">
            Sub-Div: 142/2B
          </text>
          {/* Chain lines */}
          <line x1="50" y1="155" x2="130" y2="145" stroke="#94a3b8" strokeWidth="0.6" />
          <text x="85" y="148" fill="#64748b" style={{ fontSize: 5 }}>42.6m N72°14&apos;E</text>
          <line x1="130" y1="145" x2="160" y2="85" stroke="#94a3b8" strokeWidth="0.6" />
          <text x="148" y="118" fill="#64748b" style={{ fontSize: 5 }}>28.4m</text>
          {/* Register text block */}
          <text x="20" y="205" fill="#57534e" style={{ fontSize: 6.5, fontFamily: "serif" }}>
            Owner: Rajesh Kumar Sharma
          </text>
          <text x="20" y="218" fill="#57534e" style={{ fontSize: 6.5, fontFamily: "serif" }}>
            Survey No: 142/2B | Ext: 1247.35 sq.m
          </text>
          <text x="20" y="231" fill="#57534e" style={{ fontSize: 6.5, fontFamily: "serif" }}>
            Land: Dry (Punjai) | Parcel: KAR-2024-00847
          </text>
          <text x="20" y="255" fill="#a89070" style={{ fontSize: 6 }}>
            Surveyed: 14-Mar-2024 | L.R.O. Karaikal
          </text>
        </svg>

        <AnimatePresence>
          {visible ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-3 rounded-lg border-2 border-sky-400/60"
            >
              <motion.div
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_12px_rgba(14,165,233,0.6)]"
                initial={{ top: 0 }}
                animate={{ top: "100%" }}
                transition={{ duration: 2.2, ease: "easeInOut", repeat: 1 }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function FmbAutomationPage() {
  const visibleWorkflows = useMemo(() => getVisiblePanelWorkflows(), []);
  const [phase, setPhase] = useState<WorkflowPhase>("upload");
  const [extractionState, setExtractionState] = useState<FmbExtractionState>(() =>
    createInitialFmbExtraction(),
  );
  const [selectedVertexId, setSelectedVertexId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const summary = useMemo(() => countExtractionSummary(extractionState), [extractionState]);
  const currentStepIndex =
    phase === "upload" ? 0 : phase === "extracting" ? 1 : phase === "review" ? 2 : 3;

  const startExtraction = useCallback(() => {
    setPhase("extracting");
    window.setTimeout(() => setPhase("review"), 2400);
  }, []);

  useEffect(() => {
    if (phase !== "review") return;
    setExtractionState(createInitialFmbExtraction());
  }, [phase]);

  function handleFieldChange(fieldId: string, value: string) {
    setExtractionState((prev) => ({
      ...prev,
      textFields: prev.textFields.map((f) =>
        f.id === fieldId ? { ...f, correctedValue: value } : f,
      ),
    }));
  }

  function handleSubmit() {
    setSubmitted(true);
    setPhase("approved");
  }

  const surveyField = extractionState.textFields.find((f) => f.id === "surveySubDiv");
  const surveyFixed =
    surveyField?.correctedValue === surveyField?.correctHint ||
    (!surveyField?.intentionalError && surveyField?.value === surveyField?.correctHint);

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
                <FileScan className="h-5 w-5 text-sky-600" />
                <h1 className="text-lg font-semibold">FMB Automation — AI-assisted parcel creation</h1>
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                Extract geometry and attributes from Field Measurement Books, review confidence scores, and create parcels.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {phase === "upload" ? (
              <button
                type="button"
                onClick={startExtraction}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
              >
                <Upload className="h-4 w-4" />
                Upload &amp; Extract
              </button>
            ) : phase === "extracting" ? (
              <span className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI extraction running…
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitted}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitted ? "Parcel created" : "Accept & Create Parcel"}
              </button>
            )}
            <WorkflowSwitcher
              currentWorkflowId="fmb-automation"
              workflows={visibleWorkflows}
            />
          </div>
        </div>

        {/* Step indicator */}
        <div className="mx-auto mt-4 flex max-w-[1800px] items-center gap-2">
          {FMB_WORKFLOW_STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isDone = index < currentStepIndex || (submitted && index === 3);
            return (
              <div key={step} className="flex flex-1 items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isDone
                      ? "bg-emerald-500 text-white"
                      : isActive
                        ? "bg-sky-600 text-white"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`text-xs font-medium ${isActive ? "text-sky-700" : isDone ? "text-emerald-700" : "text-slate-400"}`}
                >
                  {step}
                </span>
                {index < FMB_WORKFLOW_STEPS.length - 1 ? (
                  <div className={`mx-1 h-px flex-1 ${isDone ? "bg-emerald-300" : "bg-slate-200"}`} />
                ) : null}
              </div>
            );
          })}
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-[1800px] flex-1 flex-col gap-3 p-3 lg:p-4">
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(200px,240px)_1fr_minmax(260px,300px)]">
          {/* Left: FMB preview */}
          <div className="hidden min-h-0 lg:block">
            <FmbSketchPreview visible={phase === "extracting"} />
          </div>

          {/* Center: Canvas */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-2.5">
              <ScanLine className="h-4 w-4 text-sky-600" />
              <span className="text-sm font-semibold">Geometry canvas</span>
              {phase === "extracting" ? (
                <span className="ml-auto text-xs text-sky-600 animate-pulse">Detecting boundaries…</span>
              ) : null}
            </div>
            <div className="min-h-0 flex-1">
              <FmbExtractionCanvas
                state={extractionState}
                onStateChange={setExtractionState}
                selectedVertexId={selectedVertexId}
                selectedEdgeId={selectedEdgeId}
                onSelectVertex={setSelectedVertexId}
                onSelectEdge={setSelectedEdgeId}
                imageVisible={phase !== "upload"}
                geometryVisible={phase !== "upload"}
              />
            </div>
          </div>

          {/* Right: Attributes */}
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <FmbAttributePanel
              state={extractionState}
              onFieldChange={handleFieldChange}
              selectedVertexId={selectedVertexId}
              selectedEdgeId={selectedEdgeId}
            />
          </div>
        </div>

        {/* Bottom summary */}
        <div className="shrink-0 rounded-2xl border border-white/70 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span>
                <strong>{summary.total}</strong> elements extracted
              </span>
              <span className="text-amber-700">
                <strong>{summary.needsReview}</strong> need review
              </span>
              <span className="text-red-700">
                <strong>{summary.errors}</strong> error{summary.errors !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> High ≥85%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Medium 65–84%
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> Low &lt;65%
              </span>
            </div>
          </div>
          {phase === "review" && !surveyFixed ? (
            <p className="mt-2 text-xs text-red-600">
              Fix the low-confidence <strong>Survey subdivision</strong> field before accepting the parcel.
            </p>
          ) : null}
          {submitted ? (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Parcel KAR-2024-00847 created with corrected attributes and geometry.
            </motion.p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
