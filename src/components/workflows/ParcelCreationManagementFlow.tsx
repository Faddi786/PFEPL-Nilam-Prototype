import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  Play,
  Save,
  ScanLine,
} from "lucide-react";
import FmbExtractionCanvas from "../fmb/FmbExtractionCanvas";
import WarpCanvas from "../warp/WarpCanvas";
import WarpProcessingPanel from "../warp/WarpProcessingPanel";
import AnomalyPipelineFlow from "./AnomalyPipelineFlow";
import AutocadWorkflowFlow from "./AutocadWorkflowFlow";
import AutocadStepSwitcher from "./AutocadStepSwitcher";
import MutationDocumentVerification from "./MutationDocumentVerification";
import {
  createInitialFmbExtraction,
  type FmbExtractionState,
} from "../../data/fmbExtractionMock";
import {
  buildFmbWorkflowGeometry,
  buildGcpsFromFmb,
  buildWarpMeshFromFmb,
  buildFmbParcelContext,
  fmbParcelsToGeoJSON,
  FMB_RECORD_MAP_CHECKS,
  type FmbWorkflowGeometry,
} from "../../lib/fmbWorkflowGeometry";
import {
  computeRmsError,
  GDAL_PANEL_DEFAULTS,
  TRANSFORM_MODES,
  WARP_CONTEXT,
  type GcpAnchor,
  type TransformMode,
} from "../../data/warpMock";

const PHASE_LABELS = [
  "FMB Extract",
  "Georeference",
  "Anomaly QC",
  "Mutation & Documents",
  "Cadastral Edit",
] as const;

export type FmbDemoNavState = {
  phase: "idle" | "uploaded" | "digitizing" | "review" | "approved";
  description: string;
  onUpload: () => void;
  onDigitize: () => void;
  onAccept: () => void;
  canUpload: boolean;
  canDigitize: boolean;
  isDigitizing: boolean;
  showAccept: boolean;
  acceptDisabled: boolean;
  acceptLabel: string;
};

export type ParcelWorkflowNavState = {
  phase: number;
  phaseCount: number;
  phaseLabel: string;
  pageTitle: string;
  pageDescription?: string;
  canGoBack: boolean;
  canGoNext: boolean;
  nextLabel: string;
  goBack: () => void;
  goNext: () => void;
  fmbDemo?: FmbDemoNavState | null;
};

type ParcelCreationManagementFlowProps = {
  onNavStateChange?: (state: ParcelWorkflowNavState) => void;
};

type FmbPhase = "idle" | "uploaded" | "digitizing" | "review" | "approved";

const EMPTY_FMB_EXTRACTION: FmbExtractionState = {
  vertices: [],
  edges: [],
  textFields: [],
  parcelNumber: { value: "", confidence: 0 },
  canvasLabels: [],
};

function noopFmbStateChange(_state: FmbExtractionState) {}

function fmbPhaseDescription(phase: FmbPhase): string {
  switch (phase) {
    case "idle":
      return "Upload an FMB scan, then digitize to extract geometry for review.";
    case "uploaded":
      return "Document loaded — run digitization to extract parcel geometry.";
    case "digitizing":
      return "AI digitization in progress…";
    default:
      return "Review extracted geometry on the canvas, then accept to continue.";
  }
}

function fmbDemoNavScalarsEqual(
  a: FmbDemoNavState | null | undefined,
  b: FmbDemoNavState | null | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.phase === b.phase &&
    a.description === b.description &&
    a.canUpload === b.canUpload &&
    a.canDigitize === b.canDigitize &&
    a.isDigitizing === b.isDigitizing &&
    a.showAccept === b.showAccept &&
    a.acceptDisabled === b.acceptDisabled &&
    a.acceptLabel === b.acceptLabel
  );
}

function FmbExtractionPhase({
  onComplete,
  onStateChange,
  onFmbDemoStateChange,
}: {
  onComplete: (geometry: FmbWorkflowGeometry) => void;
  onStateChange: (state: FmbExtractionState) => void;
  onFmbDemoStateChange?: (state: FmbDemoNavState) => void;
}) {
  const [phase, setPhase] = useState<FmbPhase>("idle");
  const [extractionState, setExtractionState] = useState<FmbExtractionState>(EMPTY_FMB_EXTRACTION);
  const [selectedVertexId, setSelectedVertexId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const lastFmbDemoNavRef = useRef<FmbDemoNavState | null>(null);

  const handleUpload = useCallback(() => {
    setPhase("uploaded");
  }, []);

  const handleDigitize = useCallback(() => {
    setPhase("digitizing");
    window.setTimeout(() => {
      const initial = createInitialFmbExtraction();
      setExtractionState(initial);
      onStateChangeRef.current(initial);
      setPhase("review");
    }, 4000);
  }, []);

  const handleAccept = useCallback(() => {
    setSubmitted(true);
    setPhase("approved");
    onComplete(buildFmbWorkflowGeometry(extractionState));
  }, [extractionState, onComplete]);

  useEffect(() => {
    onStateChangeRef.current(extractionState);
  }, [extractionState]);

  useEffect(() => {
    const next: FmbDemoNavState = {
      phase,
      description: fmbPhaseDescription(phase),
      onUpload: handleUpload,
      onDigitize: handleDigitize,
      onAccept: handleAccept,
      canUpload: phase === "idle",
      canDigitize: phase === "uploaded",
      isDigitizing: phase === "digitizing",
      showAccept: phase === "review" || phase === "approved",
      acceptDisabled: submitted,
      acceptLabel: submitted ? "Extraction accepted" : "Accept extraction",
    };
    if (fmbDemoNavScalarsEqual(lastFmbDemoNavRef.current, next)) return;
    lastFmbDemoNavRef.current = next;
    onFmbDemoStateChange?.(next);
  }, [phase, submitted, handleUpload, handleDigitize, handleAccept, onFmbDemoStateChange]);

  const imageVisible = phase !== "idle";
  const geometryVisible = phase === "review" || phase === "approved";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
          <ScanLine className="h-4 w-4 text-sky-600" />
          <span className="text-xs font-semibold">Geometry canvas</span>
        </div>
        <div className="relative min-h-0 flex-1 w-full">
          <FmbExtractionCanvas
            state={extractionState}
            onStateChange={setExtractionState}
            selectedVertexId={selectedVertexId}
            selectedEdgeId={selectedEdgeId}
            onSelectVertex={setSelectedVertexId}
            onSelectEdge={setSelectedEdgeId}
            imageVisible={imageVisible}
            geometryVisible={geometryVisible}
            isDigitizing={phase === "digitizing"}
          />
        </div>
      </div>
    </div>
  );
}

function GeoreferencePhase({
  fmbGeometry,
  onComplete,
}: {
  fmbGeometry: FmbWorkflowGeometry;
  onComplete: () => void;
}) {
  const warpMesh = useMemo(() => buildWarpMeshFromFmb(fmbGeometry), [fmbGeometry]);
  const initialGcps = useMemo(() => buildGcpsFromFmb(fmbGeometry), [fmbGeometry]);

  const [gcps, setGcps] = useState<GcpAnchor[]>(() => initialGcps.map((g) => ({ ...g })));
  const [mode, setMode] = useState<TransformMode>("warp");
  const [warped, setWarped] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [stretch, setStretch] = useState<number>(GDAL_PANEL_DEFAULTS.stretch);
  const [rotateDeg, setRotateDeg] = useState<number>(GDAL_PANEL_DEFAULTS.rotateDeg);
  const [offsetX, setOffsetX] = useState<number>(GDAL_PANEL_DEFAULTS.offsetX);
  const [offsetY, setOffsetY] = useState<number>(GDAL_PANEL_DEFAULTS.offsetY);

  const rms = useMemo(() => computeRmsError(gcps, warped ? mode : "translation"), [gcps, mode, warped]);

  function runWarp() {
    setProcessing(true);
    window.setTimeout(() => {
      setWarped(true);
      setProcessing(false);
      onComplete();
    }, 1400);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Georeferencing</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {fmbGeometry.village} · FMB {fmbGeometry.parcelNumber} → {WARP_CONTEXT.orthomosaic}
          </p>
        </div>
        <button
          type="button"
          onClick={runWarp}
          disabled={processing || warped}
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run gdalwarp
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 overflow-hidden lg:grid-cols-[minmax(150px,12vw)_minmax(0,1fr)_minmax(170px,14vw)]">
        <div className="min-h-0 max-h-full space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5">
          <h4 className="text-xs font-semibold text-slate-800">Transform mode</h4>
          {TRANSFORM_MODES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={`w-full rounded-lg border px-2 py-1.5 text-left text-[10px] transition ${
                mode === t.id
                  ? "border-violet-300 bg-violet-50 ring-1 ring-violet-200"
                  : "border-slate-100 bg-slate-50"
              }`}
            >
              <span className="font-semibold text-slate-800">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-3 py-1.5">
            <span className="text-xs font-semibold text-white">Before / after overlay</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              RMS {warped ? `${rms.toFixed(2)} m` : "—"}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-1.5">
            <div className="h-full w-full max-h-full min-h-0 max-w-full">
              <WarpCanvas
              gcps={gcps}
              onGcpsChange={setGcps}
              mode={mode}
              warped={warped}
              meshVertices={warpMesh.meshVertices}
              innerParcels={warpMesh.innerParcels}
              stretch={stretch}
              rotateDeg={rotateDeg}
              offsetX={offsetX}
              offsetY={offsetY}
              livePreview
            />
            </div>
          </div>
        </div>

        <div className="min-h-0 max-h-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2.5">
          <WarpProcessingPanel
            stretch={stretch}
            rotateDeg={rotateDeg}
            offsetX={offsetX}
            offsetY={offsetY}
            onStretchChange={setStretch}
            onRotateChange={setRotateDeg}
            onOffsetXChange={setOffsetX}
            onOffsetYChange={setOffsetY}
            processing={processing}
          />
          {warped ? (
            <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Georeferenced — residual {rms.toFixed(2)} m within QC threshold.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ParcelCreationManagementFlow({
  onNavStateChange,
}: ParcelCreationManagementFlowProps = {}) {
  const [phase, setPhase] = useState(0);
  const [completedThrough, setCompletedThrough] = useState(-1);
  const [parcelSaved, setParcelSaved] = useState(false);
  const [mutationAccepted, setMutationAccepted] = useState(false);
  const [autocadStep, setAutocadStep] = useState(0);
  const [, setMutationSopStep] = useState(0);
  const [fmbGeometry, setFmbGeometry] = useState<FmbWorkflowGeometry | null>(null);
  const [fmbDemoNav, setFmbDemoNav] = useState<FmbDemoNavState | null>(null);

  const fmbParcels = useMemo(
    () => (fmbGeometry ? fmbParcelsToGeoJSON(fmbGeometry) : undefined),
    [fmbGeometry],
  );

  const parcelContext = useMemo(
    () => (fmbGeometry ? buildFmbParcelContext(fmbGeometry) : null),
    [fmbGeometry],
  );

  function markPhaseComplete(phaseIndex: number) {
    setCompletedThrough((prev) => Math.max(prev, phaseIndex));
  }

  const goBack = useCallback(() => {
    setPhase((p) => (p > 0 ? p - 1 : p));
  }, []);

  const goNext = useCallback(() => {
    setPhase((p) => (p < PHASE_LABELS.length - 1 ? p + 1 : p));
  }, []);

  function handleSaveParcel() {
    setParcelSaved(true);
    markPhaseComplete(2);
  }

  const canGoBack = phase > 0;
  const canGoNext = phase < PHASE_LABELS.length - 1;

  const nextLabel =
    phase === 2
      ? "Continue to mutation"
      : phase === 3
        ? "Continue to cadastral edit"
        : "Next";

  const lastNavReportRef = useRef<{
    phase: number;
    phaseCount: number;
    phaseLabel: string;
    pageTitle: string;
    pageDescription?: string;
    canGoBack: boolean;
    canGoNext: boolean;
    nextLabel: string;
    fmbDemo: FmbDemoNavState | null;
  } | null>(null);

  const pageTitle = phase === 0 ? "FMB extraction" : "";
  const pageDescription = phase === 0 ? fmbDemoNav?.description : undefined;

  useLayoutEffect(() => {
    const fmbDemo = phase === 0 ? fmbDemoNav : null;
    const prev = lastNavReportRef.current;
    if (
      prev &&
      prev.phase === phase &&
      prev.phaseCount === PHASE_LABELS.length &&
      prev.phaseLabel === PHASE_LABELS[phase] &&
      prev.pageTitle === pageTitle &&
      prev.pageDescription === pageDescription &&
      prev.canGoBack === canGoBack &&
      prev.canGoNext === canGoNext &&
      prev.nextLabel === nextLabel &&
      fmbDemoNavScalarsEqual(prev.fmbDemo, fmbDemo)
    ) {
      return;
    }
    lastNavReportRef.current = {
      phase,
      phaseCount: PHASE_LABELS.length,
      phaseLabel: PHASE_LABELS[phase],
      pageTitle,
      pageDescription,
      canGoBack,
      canGoNext,
      nextLabel,
      fmbDemo,
    };
    onNavStateChange?.({
      phase,
      phaseCount: PHASE_LABELS.length,
      phaseLabel: PHASE_LABELS[phase],
      pageTitle,
      pageDescription,
      canGoBack,
      canGoNext,
      nextLabel,
      goBack,
      goNext,
      fmbDemo,
    });
  }, [
    onNavStateChange,
    phase,
    pageTitle,
    pageDescription,
    canGoBack,
    canGoNext,
    nextLabel,
    goBack,
    goNext,
    fmbDemoNav,
  ]);

  const showSaveAfterAnomaly = phase === 2 && completedThrough >= 2 && !parcelSaved;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {phase === 0 ? (
            <FmbExtractionPhase
              onStateChange={noopFmbStateChange}
              onFmbDemoStateChange={setFmbDemoNav}
              onComplete={(geometry) => {
                setFmbGeometry(geometry);
                markPhaseComplete(0);
                setPhase(1);
              }}
            />
          ) : null}

          {phase === 1 && fmbGeometry ? (
            <GeoreferencePhase fmbGeometry={fmbGeometry} onComplete={() => markPhaseComplete(1)} />
          ) : null}

          {phase === 2 && fmbGeometry ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="shrink-0">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Anomaly quality control</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Variance bands and record-map checks on FMB sub-parcels (
                  {Object.keys(fmbGeometry.parcelPolygons).join(", ")}).
                </p>
              </div>
              <AnomalyPipelineFlow
                parcels={fmbParcels}
                recordMapChecks={FMB_RECORD_MAP_CHECKS}
                fillViewport
              />
              {!completedThrough || completedThrough < 2 ? (
                <button
                  type="button"
                  onClick={() => markPhaseComplete(2)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark anomaly QC complete
                </button>
              ) : showSaveAfterAnomaly ? (
                <button
                  type="button"
                  onClick={handleSaveParcel}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save parcel
                </button>
              ) : null}
            </div>
          ) : null}

          {phase === 3 && parcelContext ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="shrink-0">
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Mutation &amp; document verification</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Upload mutation documents, run AI verification, and accept before cadastral editing.
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide">
              {!mutationAccepted ? (
                <MutationDocumentVerification
                  parcelContext={parcelContext}
                  onSopStepChange={setMutationSopStep}
                  onAccepted={() => {
                    setMutationAccepted(true);
                    markPhaseComplete(3);
                  }}
                />
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="mb-1 inline h-4 w-4" /> Documents verified and accepted. Continue to
                  cadastral editing.
                </div>
              )}
              </div>
            </div>
          ) : null}

          {phase === 4 && fmbGeometry ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">Cadastral edit</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Bhunaksha cadastral tools — split, digitise, baseline/offset, subdivision, and merge on FMB geometry.
                  </p>
                </div>
                <AutocadStepSwitcher step={autocadStep} onStepChange={setAutocadStep} />
              </div>
              <AutocadWorkflowFlow
                step={autocadStep}
                onStepChange={setAutocadStep}
                fmbGeometry={fmbGeometry}
                fillViewport
              />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {parcelSaved ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="mb-1 inline h-4 w-4" />
          Parcel {fmbGeometry?.parcelNumber ?? "KAR-2024-00847"} saved after anomaly QC. Mutation and cadastral edit
          remain available when needed.
        </motion.div>
      ) : null}
    </div>
  );
}
