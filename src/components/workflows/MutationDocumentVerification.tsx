import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  ScanLine,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  buildCrossVerificationItems,
  buildDocumentExtractions,
  buildVerificationChecks,
  deriveOverallOutcome,
  DOC_SEARCH_MS,
  DOC_TRANSITION_MS,
  EXTRACTION_FIELD_PAUSE_MS,
  OUTCOME_LABELS,
  REQUIRED_MUTATION_DOCUMENTS,
  type CrossVerificationItem,
  type DocumentExtractionPlan,
  type ExtractionField,
  type MutationParcelContext,
  type VerificationCheck,
  type VerificationOutcome,
} from "../../data/mutationVerificationMock";

type CheckStatus = "pending" | "running" | "done";
type WorkflowPhase = "upload" | "extracting" | "cross-verify" | "summary" | "complete";

type FieldProgress = {
  status: "pending" | "typing" | "done";
  typedLength: number;
};

type Props = {
  parcelContext: MutationParcelContext;
  onAccepted: () => void;
  onSopStepChange: (step: number) => void;
};

function fieldIcon(field: ExtractionField, status: FieldProgress["status"]) {
  if (status !== "done") return null;
  if (field.outcome === "warning") {
    return <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />;
  }
  return <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />;
}

export default function MutationDocumentVerification({ parcelContext, onAccepted, onSopStepChange }: Props) {
  const documentPlans = useMemo(() => buildDocumentExtractions(parcelContext), [parcelContext]);
  const crossVerifyItems = useMemo(() => buildCrossVerificationItems(parcelContext), [parcelContext]);
  const checksTemplate = useMemo(() => buildVerificationChecks(parcelContext), [parcelContext]);
  const timersRef = useRef<number[]>([]);

  const [phase, setPhase] = useState<WorkflowPhase>("upload");
  const [activeDocIndex, setActiveDocIndex] = useState(-1);
  const [completedDocIndices, setCompletedDocIndices] = useState<number[]>([]);
  const [showSearching, setShowSearching] = useState(false);
  const [fieldProgress, setFieldProgress] = useState<FieldProgress[][]>(() =>
    documentPlans.map((doc) => doc.fields.map(() => ({ status: "pending", typedLength: 0 }))),
  );
  const [crossVerifyStatuses, setCrossVerifyStatuses] = useState<CheckStatus[]>(
    crossVerifyItems.map(() => "pending"),
  );
  const [visibleCrossItems, setVisibleCrossItems] = useState(0);
  const [checkStatuses, setCheckStatuses] = useState<CheckStatus[]>(checksTemplate.map(() => "pending"));
  const [visibleChecks, setVisibleChecks] = useState(0);
  const [accepted, setAccepted] = useState(false);

  const overallOutcome: VerificationOutcome | null =
    phase === "complete" ? deriveOverallOutcome(checksTemplate) : null;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timersRef.current.push(id);
  }, []);

  const handleUpload = () => {
    setPhase("extracting");
    onSopStepChange(1);
  };

  useEffect(() => {
    if (phase !== "extracting") return;

    let elapsed = DOC_TRANSITION_MS;

    documentPlans.forEach((doc, docIndex) => {
      schedule(() => {
        setActiveDocIndex(docIndex);
        setShowSearching(true);
      }, elapsed);

      elapsed += DOC_SEARCH_MS;

      doc.fields.forEach((field, fieldIndex) => {
        schedule(() => {
          setShowSearching(false);
          setFieldProgress((prev) =>
            prev.map((docFields, di) =>
              di === docIndex
                ? docFields.map((fp, fi) =>
                    fi === fieldIndex
                      ? { status: "done", typedLength: field.value.length }
                      : fp,
                  )
                : docFields,
            ),
          );
        }, elapsed);

        elapsed += EXTRACTION_FIELD_PAUSE_MS;
      });

      schedule(() => {
        setCompletedDocIndices((prev) => [...prev, docIndex]);
        setActiveDocIndex(-1);
      }, elapsed);

      elapsed += DOC_TRANSITION_MS;
    });

    schedule(() => {
      setPhase("cross-verify");
    }, elapsed);

    return clearTimers;
  }, [phase, documentPlans, schedule, clearTimers]);

  useEffect(() => {
    if (phase !== "cross-verify") return;

    let elapsed = 150;

    crossVerifyItems.forEach((item, index) => {
      schedule(() => {
        setVisibleCrossItems((v) => Math.max(v, index + 1));
        setCrossVerifyStatuses((prev) => prev.map((s, i) => (i === index ? "running" : s)));
      }, elapsed);

      schedule(() => {
        setCrossVerifyStatuses((prev) => prev.map((s, i) => (i === index ? "done" : s)));
      }, elapsed + Math.min(item.delayMs, 180));

      elapsed += Math.min(item.delayMs, 180) + 80;
    });

    schedule(() => {
      setPhase("summary");
    }, elapsed + 100);

    return clearTimers;
  }, [phase, crossVerifyItems, schedule, clearTimers]);

  useEffect(() => {
    if (phase !== "summary") return;

    let elapsed = 120;

    checksTemplate.forEach((check, index) => {
      schedule(() => {
        setVisibleChecks((v) => Math.max(v, index + 1));
        setCheckStatuses((prev) => prev.map((s, i) => (i === index ? "running" : s)));
      }, elapsed);

      schedule(() => {
        setCheckStatuses((prev) => prev.map((s, i) => (i === index ? "done" : s)));
      }, elapsed + Math.min(check.delayMs, 160));

      elapsed += Math.min(check.delayMs, 160) + 80;
    });

    schedule(() => {
      setPhase("complete");
      onSopStepChange(2);
    }, elapsed + 100);

    return clearTimers;
  }, [phase, checksTemplate, schedule, clearTimers, onSopStepChange]);

  function handleAccept() {
    setAccepted(true);
    onSopStepChange(3);
    onAccepted();
  }

  const documentProgressText =
    phase === "extracting"
      ? activeDocIndex >= 0
        ? `Document ${activeDocIndex + 1} of ${documentPlans.length}`
        : completedDocIndices.length > 0
          ? `Document ${Math.min(completedDocIndices.length + 1, documentPlans.length)} of ${documentPlans.length}`
          : `Document 1 of ${documentPlans.length}`
      : null;

  const phaseStatusText =
    phase === "cross-verify"
      ? "Cross-verification in progress"
      : phase === "summary"
        ? "Running automated pipeline checks"
        : phase === "complete"
          ? "Pipelines successful"
          : null;

  const headerBadgeLabel =
    overallOutcome != null
      ? null
      : phase === "upload"
        ? "5 documents required"
        : phase === "extracting"
          ? documentProgressText
          : phaseStatusText ?? "Verification in progress";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {overallOutcome ? (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${OUTCOME_LABELS[overallOutcome].tone}`}
          >
            {OUTCOME_LABELS[overallOutcome].emoji} {OUTCOME_LABELS[overallOutcome].label}
          </span>
        ) : phase !== "upload" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-800">
            <Loader2 className="h-3 w-3 animate-spin" />
            {headerBadgeLabel ?? "Verification in progress"}
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-600">
            5 documents required
          </span>
        )}
      </div>

      {phase === "upload" ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {REQUIRED_MUTATION_DOCUMENTS.map((doc) => (
              <li
                key={doc.id}
                className="flex min-w-[200px] max-w-[240px] shrink-0 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-[#1A1A1A]">{doc.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{doc.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleUpload}
            className="inline-flex items-center gap-2 rounded-full bg-[#1A1A1A] px-5 py-2.5 text-xs font-medium text-white"
          >
            <Upload className="h-4 w-4" />
            Upload documents
          </button>
          <p className="text-[11px] text-slate-500">
            Demo: one click simulates all required documents uploaded for mutation case DOSLR-MUT-2026-1184.
          </p>
        </motion.div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Phase 1 — uploaded document cards */}
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {REQUIRED_MUTATION_DOCUMENTS.map((doc, index) => {
              const isActive = activeDocIndex === index;
              const isDone = completedDocIndices.includes(index);
              return (
                <motion.li
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.06 }}
                  className={`relative min-w-[140px] max-w-[180px] shrink-0 overflow-hidden rounded-xl border p-2.5 transition-colors ${
                    isActive
                      ? "border-sky-300 bg-sky-50/80"
                      : isDone
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-slate-200 bg-slate-50/60"
                  }`}
                >
                  {isActive ? (
                    <motion.div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-sky-200/40 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                    />
                  ) : null}
                  <div className="relative flex items-start gap-2">
                    {isDone ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                    ) : isActive ? (
                      <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse text-sky-600" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-semibold text-[#1A1A1A]">{doc.label}</p>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {isActive ? "Scanning…" : isDone ? "Extracted" : "Received"}
                      </p>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <div className="min-h-[2.75rem] space-y-0.5" aria-live="polite">
            <p
              className={`min-h-[1.125rem] text-[11px] font-medium text-sky-700 transition-opacity ${
                documentProgressText ? "opacity-100" : "opacity-0"
              }`}
            >
              {documentProgressText ?? "\u00a0"}
            </p>
            <p
              className={`min-h-[1.125rem] text-[11px] font-medium text-indigo-700 transition-opacity ${
                phaseStatusText ? "opacity-100" : "opacity-0"
              }`}
            >
              {phaseStatusText ?? "\u00a0"}
            </p>
          </div>

          {/* Phase 2 — per-document extraction panels (horizontal row) */}
          <div className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto pb-2">
            <AnimatePresence initial={false}>
              {documentPlans.map((doc, docIndex) => {
                const isVisible =
                  completedDocIndices.includes(docIndex) ||
                  activeDocIndex === docIndex ||
                  (phase !== "extracting" && docIndex < documentPlans.length);
                if (!isVisible && phase === "extracting") return null;

                const isAnalyzing = activeDocIndex === docIndex;
                const docFields = fieldProgress[docIndex] ?? [];

                return (
                  <DocumentExtractionPanel
                    key={doc.id}
                    doc={doc}
                    isAnalyzing={isAnalyzing}
                    showSearching={isAnalyzing && showSearching}
                    fieldProgress={docFields}
                  />
                );
              })}
            </AnimatePresence>
          </div>

          {/* Phase 3 — cross-verification */}
          {(phase === "cross-verify" || phase === "summary" || phase === "complete") && visibleCrossItems > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3"
            >
              <p className="text-xs font-semibold text-indigo-900">Cross-verification</p>
              <div className="scrollbar-hide mt-2 flex gap-2 overflow-x-auto pb-1">
                <AnimatePresence initial={false}>
                  {crossVerifyItems.slice(0, visibleCrossItems).map((item, index) => (
                    <CrossVerifyRow
                      key={item.id}
                      item={item}
                      status={crossVerifyStatuses[index]}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : null}

          {/* Phase 3b — existing verification checks summary */}
          {(phase === "summary" || phase === "complete") && visibleChecks > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-slate-500">Automated pipeline checks</p>
              <div className="flex flex-wrap gap-2">
                <AnimatePresence initial={false}>
                  {checksTemplate.slice(0, visibleChecks).map((check, index) => (
                    <SummaryCheckRow key={check.id} check={check} status={checkStatuses[index]} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : null}

          {/* Phase 4 — outcome + accept */}
          {phase === "complete" && !accepted ? (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-semibold text-[#1A1A1A]">Verification complete — acceptance required</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {overallOutcome === "warning"
                      ? "One non-blocking flag detected (photo quality). Officer may proceed with documented caveat."
                      : overallOutcome === "review"
                        ? "Blocking issues require manual review before parcel edit."
                        : "All checks passed. Proceed to parcel geometry edit for this ULPIN only."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAccept}
                disabled={overallOutcome === "review"}
                className="mt-3 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
              >
                Accept &amp; continue
              </button>
            </motion.div>
          ) : null}

          {accepted ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700"
            >
              Documents accepted. Parcel edit session unlocked for ULPIN {parcelContext.ulpin}.
            </motion.div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function DocumentExtractionPanel({
  doc,
  isAnalyzing,
  showSearching,
  fieldProgress,
}: {
  doc: DocumentExtractionPlan;
  isAnalyzing: boolean;
  showSearching: boolean;
  fieldProgress: FieldProgress[];
}) {
  const hasStarted = fieldProgress.some((f) => f.status !== "pending");
  const allDone = fieldProgress.every((f) => f.status === "done");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`min-w-[220px] max-w-[280px] shrink-0 rounded-xl border p-3 ${
        isAnalyzing ? "border-sky-200 bg-sky-50/50" : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">📄</span>
        <p className="text-xs font-semibold text-[#1A1A1A]">
          {doc.label}
          {isAnalyzing ? (
            <span className="ml-1.5 font-normal text-sky-700">— Analyzing…</span>
          ) : allDone ? (
            <span className="ml-1.5 font-normal text-emerald-700">— Extracted</span>
          ) : null}
        </p>
      </div>

      {showSearching ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 text-[11px] text-slate-500"
        >
          <span className="font-medium text-slate-600">Searching:</span> {doc.searchTerms}
        </motion.p>
      ) : null}

      {hasStarted ? (
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="scrollbar-hide mt-2 max-h-40 space-y-1 overflow-y-auto"
        >
          {doc.fields.map((field, fieldIndex) => {
            const progress = fieldProgress[fieldIndex];
            if (!progress || progress.status === "pending") return null;

            const displayValue = field.value.slice(0, progress.typedLength);
            const isWarning = field.outcome === "warning" && progress.status === "done";

            return (
              <motion.li
                key={field.key}
                variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0 } }}
                className={`flex items-start gap-2 font-mono text-[11px] ${
                  isWarning ? "text-amber-800" : "text-slate-700"
                }`}
              >
                {progress.status === "typing" ? (
                  <Loader2 className="mt-0.5 h-3 w-3 shrink-0 animate-spin text-sky-500" />
                ) : (
                  fieldIcon(field, progress.status)
                )}
                <span>
                  <span className="font-semibold text-slate-600">{field.key}</span>
                  <span className="text-slate-400"> — </span>
                  <span className={progress.status === "typing" ? "text-sky-800" : ""}>
                    {displayValue}
                    {progress.status === "typing" ? (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        className="ml-px inline-block h-3 w-0.5 bg-sky-600 align-middle"
                      />
                    ) : null}
                  </span>
                </span>
              </motion.li>
            );
          })}
        </motion.ul>
      ) : null}
    </motion.div>
  );
}

function CrossVerifyRow({ item, status }: { item: CrossVerificationItem; status: CheckStatus }) {
  const outcomeMeta = OUTCOME_LABELS[item.outcome];

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="flex min-w-[220px] max-w-[280px] shrink-0 items-start gap-2 rounded-lg border border-indigo-100/80 bg-white/70 px-2.5 py-2"
    >
      <div className="mt-0.5 shrink-0">
        {status === "running" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
        ) : status === "done" ? (
          item.outcome === "warning" ? (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          )
        ) : (
          <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-200" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono text-[11px] font-medium text-[#1A1A1A]">{item.label}</p>
          {status === "done" ? (
            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${outcomeMeta.tone}`}>
              {item.outcome === "pass" ? "✓ Match" : item.outcome === "warning" ? "⚠ Flagged" : "✗ Review"}
            </span>
          ) : null}
        </div>
        <div className="scrollbar-hide mt-0.5 max-h-12 overflow-y-auto">
          {status === "done" ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-slate-500">
              {item.detail}
            </motion.p>
          ) : status === "running" ? (
            <p className="text-[10px] text-indigo-600">Cross-checking…</p>
          ) : (
            <p className="text-[10px] text-transparent" aria-hidden>
              &nbsp;
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SummaryCheckRow({ check, status }: { check: VerificationCheck; status: CheckStatus }) {
  const outcomeMeta = OUTCOME_LABELS[check.outcome];

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="min-w-[220px] max-w-[280px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          {status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          ) : status === "done" ? (
            <CheckCircle2
              className={`h-4 w-4 ${
                check.outcome === "pass"
                  ? "text-emerald-600"
                  : check.outcome === "warning"
                    ? "text-amber-600"
                    : "text-rose-600"
              }`}
            />
          ) : (
            <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-[#1A1A1A]">{check.label}</p>
            {status === "done" ? (
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${outcomeMeta.tone}`}>
                {outcomeMeta.emoji} {outcomeMeta.label}
              </span>
            ) : null}
          </div>
          {status === "done" ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-[11px] leading-relaxed text-slate-600"
            >
              {check.detail}
            </motion.p>
          ) : status === "running" ? (
            <p className="mt-1 text-[11px] text-sky-700">Analyzing…</p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
