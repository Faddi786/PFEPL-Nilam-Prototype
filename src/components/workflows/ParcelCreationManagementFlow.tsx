import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Play,
  Save,
  ScanLine,
  Upload,
} from "lucide-react";
import FmbExtractionCanvas from "../fmb/FmbExtractionCanvas";
import WarpCanvas from "../warp/WarpCanvas";
import WarpProcessingPanel from "../warp/WarpProcessingPanel";
import AnomalyPipelineFlow from "./AnomalyPipelineFlow";
import AutocadWorkflowFlow from "./AutocadWorkflowFlow";
import AutocadStepSwitcher from "./AutocadStepSwitcher";
import MutationDocumentVerification from "./MutationDocumentVerification";
import { DEFAULT_REGION_KEY } from "../../data/mockData";
import { getWorkbenchRegionDatasetSync } from "../../data/workbenchParcels";
import {
  createInitialFmbExtraction,
  type FmbExtractionState,
} from "../../data/fmbExtractionMock";
import {
  computeRmsError,
  GDAL_PANEL_DEFAULTS,
  INITIAL_GCPS,
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

type FmbPhase = "upload" | "extracting" | "review" | "approved";

function FmbExtractionPhase({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<FmbPhase>("review");
  const [extractionState, setExtractionState] = useState<FmbExtractionState>(() =>
    createInitialFmbExtraction(),
  );
  const [selectedVertexId, setSelectedVertexId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const startExtraction = useCallback(() => {
    setPhase("extracting");
    window.setTimeout(() => setPhase("review"), 2400);
  }, []);

  useEffect(() => {
    if (phase !== "review") return;
    setExtractionState(createInitialFmbExtraction());
  }, [phase]);

  function handleAccept() {
    setSubmitted(true);
    setPhase("approved");
    onComplete();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A]">FMB extraction</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Upload FMB scan, run AI extraction, and review geometry on the canvas before accepting.
          </p>
        </div>
        {phase === "upload" ? (
          <button
            type="button"
            onClick={startExtraction}
            className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-2 text-xs font-medium text-white"
          >
            <Upload className="h-3.5 w-3.5" />
            Upload &amp; Extract
          </button>
        ) : phase === "extracting" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-medium text-sky-800">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            AI extraction running…
          </span>
        ) : (
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitted}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {submitted ? "Extraction accepted" : "Accept extraction"}
          </button>
        )}
      </div>

      <div className="flex min-h-[min(54vh,504px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2">
          <ScanLine className="h-4 w-4 text-sky-600" />
          <span className="text-xs font-semibold">Geometry canvas</span>
        </div>
        <div className="min-h-0 flex-1">
          <FmbExtractionCanvas
            state={extractionState}
            onStateChange={setExtractionState}
            selectedVertexId={selectedVertexId}
            selectedEdgeId={selectedEdgeId}
            onSelectVertex={setSelectedVertexId}
            onSelectEdge={setSelectedEdgeId}
            extractionVisible={phase !== "upload"}
          />
        </div>
      </div>
    </div>
  );
}

function GeoreferencePhase({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [gcps, setGcps] = useState<GcpAnchor[]>(() => INITIAL_GCPS.map((g) => ({ ...g })));
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Georeferencing</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {WARP_CONTEXT.village} · {WARP_CONTEXT.sheet} → {WARP_CONTEXT.orthomosaic}
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

      <div className="grid min-h-[min(52vh,480px)] gap-3 lg:grid-cols-[minmax(180px,220px)_1fr_minmax(200px,240px)]">
        <div className="space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
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

        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-700 px-3 py-2">
            <span className="text-xs font-semibold text-white">Before / after overlay</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              RMS {warped ? `${rms.toFixed(2)} m` : "—"}
            </span>
          </div>
          <div className="min-h-0 flex-1 p-2">
            <WarpCanvas gcps={gcps} onGcpsChange={setGcps} mode={mode} warped={warped} />
          </div>
        </div>

        <div className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
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

export default function ParcelCreationManagementFlow() {
  const [phase, setPhase] = useState(0);
  const [completedThrough, setCompletedThrough] = useState(-1);
  const [parcelSaved, setParcelSaved] = useState(false);
  const [mutationAccepted, setMutationAccepted] = useState(false);
  const [autocadStep, setAutocadStep] = useState(0);
  const [, setMutationSopStep] = useState(0);

  const demoParcel = useMemo(() => {
    const dataset = getWorkbenchRegionDatasetSync(DEFAULT_REGION_KEY);
    const parcels = dataset.geojson.parcels.features as GeoJSON.Feature<GeoJSON.Polygon>[];
    return (
      parcels.find((feature) => String(feature.properties?.surveyNo ?? "").includes("/")) ??
      parcels[0]
    );
  }, []);

  const parcelContext = useMemo(
    () => ({
      surveyNo: String(demoParcel.properties?.surveyNo ?? "—"),
      village: String(demoParcel.properties?.village ?? "—"),
      ulpin: String(demoParcel.properties?.ulpin ?? "—"),
      ownerName: String(demoParcel.properties?.ownerName ?? "Rajesh Kumar Sharma"),
    }),
    [demoParcel],
  );

  function markPhaseComplete(phaseIndex: number) {
    setCompletedThrough((prev) => Math.max(prev, phaseIndex));
  }

  function goNext() {
    if (phase < PHASE_LABELS.length - 1) {
      setPhase((p) => p + 1);
    }
  }

  function goBack() {
    if (phase > 0) {
      setPhase((p) => p - 1);
    }
  }

  function handleSaveParcel() {
    setParcelSaved(true);
    markPhaseComplete(2);
  }

  const canGoNext = phase < 2 ? completedThrough >= phase : phase === 2 ? completedThrough >= 2 : true;
  const showSaveAfterAnomaly = phase === 2 && completedThrough >= 2 && !parcelSaved;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22 }}
        >
          {phase === 0 ? (
            <FmbExtractionPhase
              onComplete={() => {
                markPhaseComplete(0);
                setPhase(1);
              }}
            />
          ) : null}

          {phase === 1 ? (
            <GeoreferencePhase onComplete={() => markPhaseComplete(1)} />
          ) : null}

          {phase === 2 ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Anomaly quality control</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Run variance bands and record-map checks before publishing the parcel.
                </p>
              </div>
              <AnomalyPipelineFlow />
              {!completedThrough || completedThrough < 2 ? (
                <button
                  type="button"
                  onClick={() => markPhaseComplete(2)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Mark anomaly QC complete
                </button>
              ) : null}
            </div>
          ) : null}

          {phase === 3 ? (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Mutation &amp; document verification</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Upload mutation documents, run AI verification, and accept before cadastral editing.
                </p>
              </div>
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
          ) : null}

          {phase === 4 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-[#1A1A1A]">Cadastral edit</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Bhunaksha cadastral tools — split, digitise, baseline/offset, subdivision, and merge.
                  </p>
                </div>
                <AutocadStepSwitcher step={autocadStep} onStepChange={setAutocadStep} />
              </div>
              <AutocadWorkflowFlow step={autocadStep} onStepChange={setAutocadStep} />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      {parcelSaved ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          <CheckCircle2 className="mb-1 inline h-4 w-4" />
          Parcel KAR-2024-00847 saved after anomaly QC. Mutation and cadastral edit remain available when needed.
        </motion.div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={goBack}
          disabled={phase === 0}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {showSaveAfterAnomaly ? (
            <button
              type="button"
              onClick={handleSaveParcel}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white"
            >
              <Save className="h-3.5 w-3.5" />
              Save parcel
            </button>
          ) : null}

          {phase === 2 && completedThrough >= 2 ? (
            <button
              type="button"
              onClick={() => setPhase(3)}
              className="inline-flex items-center gap-1.5 rounded-full border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-medium text-sky-800"
            >
              Continue to mutation
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}

          {phase < PHASE_LABELS.length - 1 && phase !== 2 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : phase === 3 && mutationAccepted ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-medium text-white"
            >
              Continue to cadastral edit
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
