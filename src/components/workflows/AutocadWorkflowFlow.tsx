import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MapPin, Plus, Ruler, Save } from "lucide-react";
import CanvasZoomControls from "../ui/CanvasZoomControls";
import { useSvgCanvasZoom } from "../../hooks/useSvgCanvasZoom";
import {
  FMB_LAYER_OPTIONS,
  KHUTAL_PARCEL,
  LADDER_TABLE_SEED,
  MERGE_CANDIDATE_PLOTS,
  POLYGON_TABLE_SEED,
} from "../../data/autocadWorkflowMock";
import {
  buildArcAdjacentPreview,
  buildArcOppositePreview,
  buildDistanceAnglePreview,
  buildFmbPreview,
  buildLadderPreview,
  buildMergePreview,
  buildPointMeasurePreview,
  buildSubdivisionPreview,
  computeMergeUnionRing,
  MERGE_ANIM_DURATION_S,
  PARCEL_SVG_RING,
  PARCEL_SVG_VERTICES,
  pointsToSvgString,
  polygonCentroid,
  type MapPreview,
  type SvgPoint,
} from "../../lib/autocadWorkflowGeometry";
import { buildFmbAutocadMap, createMapGeometryContext, type FmbAutocadMap, type FmbWorkflowGeometry } from "../../lib/fmbWorkflowGeometry";

export const AUTOCAD_WORKFLOW_STEPS = [
  "Distance angle method",
  "Arc method (adjacent)",
  "Arc method (opposite)",
  "Point measurement",
  "FMB / Tippon map",
  "Baseline / offset",
  "Subdivision & layers",
  "Merging plot",
] as const;

const STEPS = AUTOCAD_WORKFLOW_STEPS;

const MERGE_ANIM_MS = Math.round(MERGE_ANIM_DURATION_S * 1000);
const MERGE_EASE = [0.4, 0, 0.2, 1] as const;

type MergedPlotOverlay = {
  ring: SvgPoint[];
  label: string;
  sourcePlots: string[];
};

type MergeAnimTarget = {
  unionRing: SvgPoint[];
  center: SvgPoint;
  selectedPlots: string[];
  label: string;
};

type LadderRow = { from: string; to: string; offsetDistance: string; chainage: string };
type PointMeasureRow = { from1: string; dist1: string; from2: string; dist2: string };

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[11px] font-medium text-slate-600">{children}</label>;
}

function TextInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 ${className}`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full bg-[#1A1A1A] px-4 py-2 text-xs font-medium text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MapWorkspace({
  title,
  preview,
  fmbMap,
  mergeInteractive = false,
  mergeSelectedPlots = [],
  onMergePlotClick,
  mergeAnimTarget = null,
  mergedOverlays = [],
}: {
  title: string;
  preview: MapPreview;
  fmbMap?: FmbAutocadMap | null;
  mergeInteractive?: boolean;
  mergeSelectedPlots?: string[];
  onMergePlotClick?: (label: string) => void;
  mergeAnimTarget?: MergeAnimTarget | null;
  mergedOverlays?: MergedPlotOverlay[];
}) {
  const outerRing = fmbMap?.outerRing ?? PARCEL_SVG_RING;
  const viewW = fmbMap?.viewBox.width ?? 320;
  const viewH = fmbMap?.viewBox.height ?? 240;
  const subParcels = fmbMap?.subParcels ?? [];
  const vertexEntries = fmbMap
    ? (Object.entries(fmbMap.vertices).filter(([key]) => !key.startsWith("v")) as [string, [number, number]][])
    : (Object.entries(PARCEL_SVG_VERTICES) as [string, [number, number]][]);
  const plotLabel = fmbMap?.parcelNumber ?? KHUTAL_PARCEL.plotNo;
  const villageLabel = fmbMap?.village ?? KHUTAL_PARCEL.village;
  const useFmbBase = Boolean(fmbMap);
  const previewPolygons = useFmbBase ? undefined : preview.polygons;
  const previewMarkers = useFmbBase
    ? preview.markers?.filter((m) => m.r !== 0)
    : preview.markers;
  const absorbedPlots = useMemo(
    () => new Set(mergedOverlays.flatMap((overlay) => overlay.sourcePlots)),
    [mergedOverlays],
  );
  const mergeAnimating = Boolean(mergeAnimTarget);
  const unionCenter = mergeAnimTarget?.center ?? null;
  const unionRing = mergeAnimTarget?.unionRing ?? null;
  const animatingPlots = useMemo(
    () => new Set(mergeAnimTarget?.selectedPlots ?? []),
    [mergeAnimTarget],
  );
  const {
    viewBox,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    wheelTargetRef,
    isPanning,
    spacePanActive,
    onPanMouseDown,
    onPanMouseMove,
    onPanMouseUp,
  } = useSvgCanvasZoom(viewW, viewH);

  const canvasCursor = isPanning ? "cursor-grabbing" : spacePanActive ? "cursor-grab" : "cursor-grab";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
        <p className="text-xs font-semibold text-[#1A1A1A]">{title}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
          {fmbMap ? `FMB ${plotLabel} · ${villageLabel}` : `Plot ${plotLabel} · ${villageLabel}`}
        </span>
      </div>
      <div
        ref={wheelTargetRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2"
        onMouseDown={onPanMouseDown}
        onMouseMove={onPanMouseMove}
        onMouseUp={onPanMouseUp}
        onMouseLeave={onPanMouseUp}
      >
        <CanvasZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} zoom={zoom} />
        <svg
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          className={`h-full max-h-full w-full max-w-full ${canvasCursor}`}
        >
          <rect data-pan-background="true" x={0} y={0} width={viewW} height={viewH} fill="transparent" />
          <polygon
            points={pointsToSvgString(outerRing)}
            fill="#e0f2fe"
            stroke="#0284c7"
            strokeWidth="2"
          />
          {outerRing.map((pt, i) => {
            const next = outerRing[(i + 1) % outerRing.length];
            return (
              <line
                key={`edge-${i}`}
                x1={pt[0]}
                y1={pt[1]}
                x2={next[0]}
                y2={next[1]}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            );
          })}

          {subParcels.map((sp) => {
            if (absorbedPlots.has(sp.label)) return null;

            const selected = mergeSelectedPlots.includes(sp.label);
            const isAnimating = mergeAnimating && animatingPlots.has(sp.label);
            const fill = selected
              ? "rgba(34,197,94,0.35)"
              : mergeInteractive
                ? "rgba(249,115,22,0.08)"
                : "rgba(249,115,22,0.12)";
            const stroke = selected ? "#16a34a" : "#f97316";
            const strokeWidth = selected ? 2.5 : 1;
            const centroidX = sp.ring.reduce((s, p) => s + p[0], 0) / sp.ring.length;
            const centroidY = sp.ring.reduce((s, p) => s + p[1], 0) / sp.ring.length;
            const convergeX = unionCenter ? unionCenter[0] - centroidX : 0;
            const convergeY = unionCenter ? unionCenter[1] - centroidY : 0;

            const parcelGroup = (
              <>
                <polygon
                  points={pointsToSvgString(sp.ring)}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  style={mergeInteractive && !mergeAnimating ? { cursor: "pointer" } : undefined}
                  data-canvas-interactive={mergeInteractive && !mergeAnimating ? true : undefined}
                  onClick={
                    mergeInteractive && !mergeAnimating && onMergePlotClick
                      ? () => onMergePlotClick(sp.label)
                      : undefined
                  }
                />
                <text
                  x={centroidX}
                  y={centroidY}
                  fontSize="8"
                  fill={selected ? "#15803d" : "#c2410c"}
                  fontWeight="600"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {sp.label}
                </text>
              </>
            );

            if (isAnimating) {
              return (
                <motion.g
                  key={sp.label}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: convergeX, y: convergeY, opacity: 0, scale: 0.72 }}
                  transition={{ duration: MERGE_ANIM_DURATION_S, ease: MERGE_EASE }}
                  style={{ transformBox: "fill-box", transformOrigin: `${centroidX}px ${centroidY}px` }}
                >
                  {parcelGroup}
                </motion.g>
              );
            }

            return <g key={sp.label}>{parcelGroup}</g>;
          })}

          {mergeAnimating && unionRing && unionCenter ? (
            <motion.g
              key="merge-active"
              initial={{ opacity: 0, scale: 0.35 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.4, ease: MERGE_EASE }}
              style={{ transformBox: "fill-box", transformOrigin: `${unionCenter[0]}px ${unionCenter[1]}px` }}
            >
              <polygon
                points={pointsToSvgString(unionRing)}
                fill="rgba(34,197,94,0.42)"
                stroke="#15803d"
                strokeWidth="2.5"
              />
              <text
                x={unionCenter[0]}
                y={unionCenter[1]}
                fontSize="10"
                fill="#14532d"
                fontWeight="700"
                textAnchor="middle"
                pointerEvents="none"
              >
                {mergeAnimTarget?.label}
              </text>
            </motion.g>
          ) : null}

          {mergedOverlays.map((overlay) => {
            const cx = polygonCentroid(overlay.ring)[0];
            const cy = polygonCentroid(overlay.ring)[1];
            return (
              <g key={`merged-${overlay.label}-${overlay.sourcePlots.join("-")}`}>
                <polygon
                  points={pointsToSvgString(overlay.ring)}
                  fill="rgba(34,197,94,0.38)"
                  stroke="#15803d"
                  strokeWidth="2.5"
                />
                <text
                  x={cx}
                  y={cy}
                  fontSize="10"
                  fill="#14532d"
                  fontWeight="700"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {overlay.label}
                </text>
              </g>
            );
          })}

          {previewPolygons?.map((poly, i) => {
            const plotLabel = poly.label ?? `plot-${i}`;
            if (absorbedPlots.has(plotLabel)) return null;

            const centroidX = poly.points.reduce((s, p) => s + p[0], 0) / poly.points.length;
            const centroidY = poly.points.reduce((s, p) => s + p[1], 0) / poly.points.length;
            const isAnimating = mergeAnimating && animatingPlots.has(plotLabel);
            const convergeX = unionCenter ? unionCenter[0] - centroidX : 0;
            const convergeY = unionCenter ? unionCenter[1] - centroidY : 0;

            const rectGroup = (
              <>
                <polygon
                  points={pointsToSvgString(poly.points)}
                  fill={poly.fill ?? "transparent"}
                  stroke={poly.stroke ?? "#64748b"}
                  strokeWidth="1.5"
                  opacity={0.85}
                />
                {poly.label ? (
                  <text
                    x={centroidX}
                    y={centroidY}
                    fontSize="9"
                    fill="#334155"
                    textAnchor="middle"
                  >
                    {poly.label}
                  </text>
                ) : null}
              </>
            );

            if (isAnimating) {
              return (
                <motion.g
                  key={`poly-${plotLabel}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{ x: convergeX, y: convergeY, opacity: 0, scale: 0.72 }}
                  transition={{ duration: MERGE_ANIM_DURATION_S, ease: MERGE_EASE }}
                  style={{ transformBox: "fill-box", transformOrigin: `${centroidX}px ${centroidY}px` }}
                >
                  {rectGroup}
                </motion.g>
              );
            }

            return <g key={`poly-${plotLabel}`}>{rectGroup}</g>;
          })}

          {preview.circles?.map((c, i) => (
            <circle
              key={`circle-${i}`}
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={c.fill ?? "none"}
              stroke={c.stroke ?? "#94a3b8"}
              strokeWidth="1"
              strokeDasharray={c.dashed ? "4 3" : undefined}
              opacity={0.7}
            />
          ))}

          {preview.arcs?.map((a, i) => (
            <circle
              key={`arc-${i}`}
              cx={a.cx}
              cy={a.cy}
              r={a.r}
              fill="none"
              stroke={a.stroke ?? "#6366f1"}
              strokeWidth="1"
              strokeDasharray={a.dashed ? "5 4" : undefined}
              opacity={0.65}
            />
          ))}

          {preview.polylines?.map((line, i) =>
            line.length >= 2 ? (
              <polyline
                key={`multi-${i}`}
                points={pointsToSvgString(line)}
                fill="none"
                stroke={i === 0 ? "#0ea5e9" : "#64748b"}
                strokeWidth={i === 0 ? 2 : 1.5}
                strokeDasharray={i > 0 ? "4 3" : undefined}
              />
            ) : null,
          )}

          {preview.polyline && preview.polyline.length >= 2 ? (
            <polyline
              points={pointsToSvgString(preview.polyline)}
              fill="none"
              stroke="#dc2626"
              strokeWidth="2"
            />
          ) : null}

          {vertexEntries.map(([label, coords]) => (
            <g key={label}>
              <circle cx={coords[0]} cy={coords[1]} r="4" fill="#1A1A1A" />
              <text x={coords[0] + 6} y={coords[1] - 4} fontSize="9" fill="#334155">
                {label}
              </text>
            </g>
          ))}

          {previewMarkers?.map((m, i) =>
            m.r === 0 ? (
              <text key={`${m.label}-${i}`} x={m.x} y={m.y} fontSize="10" fontWeight="600" fill={m.color ?? "#dc2626"}>
                {m.label}
              </text>
            ) : (
              <g key={`${m.label}-${i}`}>
                <circle cx={m.x} cy={m.y} r={m.r ?? 4} fill={m.color ?? "#dc2626"} />
                <text x={m.x + 6} y={m.y - 4} fontSize="9" fill={m.color ?? "#dc2626"}>
                  {m.label}
                </text>
              </g>
            ),
          )}
        </svg>
      </div>
      <p className="border-t border-slate-200 bg-white px-3 py-2 text-[10px] text-slate-500">{preview.hint}</p>
    </div>
  );
}

function StepNav({
  step,
  onPrev,
  onSave,
  status,
}: {
  step: number;
  onPrev: () => void;
  onSave: () => void;
  status?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
      <div className="flex gap-2">
        <SecondaryButton onClick={onPrev} disabled={step === 0}>
          Back
        </SecondaryButton>
        {step === STEPS.length - 1 ? (
          <PrimaryButton onClick={onSave}>
            <span className="inline-flex items-center gap-1">
              <Save className="h-3.5 w-3.5" />
              Save mutation
            </span>
          </PrimaryButton>
        ) : null}
      </div>
      {status ? <p className="text-[11px] text-emerald-700">{status}</p> : null}
    </div>
  );
}

type AutocadWorkflowFlowProps = {
  step: number;
  onStepChange: (step: number) => void;
  /** When set, pre-loads FMB extracted parcel geometry in the map workspace. */
  fmbGeometry?: FmbWorkflowGeometry | null;
  /** Fill parent flex column — used inside Parcel Creation workflow. */
  fillViewport?: boolean;
};

export default function AutocadWorkflowFlow({
  step,
  onStepChange,
  fmbGeometry = null,
  fillViewport = false,
}: AutocadWorkflowFlowProps) {
  const fmbMap = useMemo(
    () => (fmbGeometry ? buildFmbAutocadMap(fmbGeometry) : null),
    [fmbGeometry],
  );
  const geometryCtx = useMemo(
    () => (fmbMap && fmbGeometry ? createMapGeometryContext(fmbMap, fmbGeometry) : undefined),
    [fmbMap, fmbGeometry],
  );
  const [status, setStatus] = useState<string | null>(null);

  const defaultVertex = fmbGeometry
    ? (fmbGeometry.extraction.vertices.find((v) => v.label)?.label ?? "A")
    : "V1";
  const defaultVertex2 = fmbGeometry
    ? (fmbGeometry.extraction.vertices.filter((v) => v.label)[1]?.label ?? "B")
    : "V14";

  // Step 0 — Distance Angle
  const [firstTerminal, setFirstTerminal] = useState(defaultVertex);
  const [lastTerminal, setLastTerminal] = useState(defaultVertex2);
  const [betweenVertices, setBetweenVertices] = useState(false);
  const [terminalDistance, setTerminalDistance] = useState("6.50");
  const [refRows, setRefRows] = useState([
    { refPoint: "V1", distance: "12.00", angle: "45.0" },
    { refPoint: "V5", distance: "8.50", angle: "120.0" },
  ]);

  // Step 1 — Arc Adjacent
  const [cornerPoint, setCornerPoint] = useState("V1");
  const [adjDist1, setAdjDist1] = useState("12");
  const [adjTowards1, setAdjTowards1] = useState("V14");
  const [adjDist2, setAdjDist2] = useState("15");
  const [adjTowards2, setAdjTowards2] = useState("V4");
  const [adjArc1, setAdjArc1] = useState("10");
  const [adjArc2, setAdjArc2] = useState("14");
  const [adjIntersection, setAdjIntersection] = useState("P1");

  // Step 2 — Arc Opposite
  const [oppPoint1, setOppPoint1] = useState("V5");
  const [oppDist1, setOppDist1] = useState("5");
  const [oppTowards1, setOppTowards1] = useState("V6");
  const [oppPoint2, setOppPoint2] = useState("V14");
  const [oppDist2, setOppDist2] = useState("6");
  const [oppTowards2, setOppTowards2] = useState("V13");
  const [oppArc1, setOppArc1] = useState("20");
  const [oppArc2, setOppArc2] = useState("30");
  const [oppIntersection, setOppIntersection] = useState("P2");

  // Step 3 — Point Measurement
  const [measureRows, setMeasureRows] = useState<PointMeasureRow[]>([
    { from1: "V5", dist1: "10.0", from2: "V8", dist2: "12.5" },
    { from1: "V1", dist1: "8.0", from2: "V14", dist2: "9.5" },
  ]);

  // Step 4 — FMB
  const [baselineStart, setBaselineStart] = useState("G1");
  const [baselineEnd, setBaselineEnd] = useState("G2");
  const [baselineLength, setBaselineLength] = useState("45.60");
  const [trianglePoint, setTrianglePoint] = useState("T1");
  const [triDist1, setTriDist1] = useState("22.30");
  const [triDist2, setTriDist2] = useState("18.70");

  // Step 5 — Baseline / Offset
  const [ladderRows, setLadderRows] = useState<LadderRow[]>([...LADDER_TABLE_SEED]);
  const [hangDist1, setHangDist1] = useState("4.20");
  const [hangDist2, setHangDist2] = useState("5.10");
  const [hangPoint1, setHangPoint1] = useState("18");
  const [hangPoint2, setHangPoint2] = useState("19");

  // Step 6 — Subdivision & Layers
  const [polygons, setPolygons] = useState<{ polygon: string; area: string; label: string }[]>(() =>
    fmbGeometry
      ? Object.keys(fmbGeometry.parcelPolygons).map((label, i) => ({
          polygon: `Sub-${i + 1}`,
          area: (1247.35 / Object.keys(fmbGeometry.parcelPolygons).length).toFixed(2),
          label,
        }))
      : [...POLYGON_TABLE_SEED],
  );
  const [selectedLayer, setSelectedLayer] = useState<string>(FMB_LAYER_OPTIONS[0]);
  const [layerLabel, setLayerLabel] = useState("");

  // Step 7 — Merge
  const [selectedPlots, setSelectedPlots] = useState<string[]>(() =>
    fmbGeometry ? ["1A1", "1B"] : ["142/1", "142/2"],
  );
  const [newKhasra, setNewKhasra] = useState("142");
  const [mergedOverlays, setMergedOverlays] = useState<MergedPlotOverlay[]>([]);
  const [mergeAnimTarget, setMergeAnimTarget] = useState<MergeAnimTarget | null>(null);
  const mergeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const absorbedPlotSet = useMemo(
    () => new Set(mergedOverlays.flatMap((overlay) => overlay.sourcePlots)),
    [mergedOverlays],
  );

  useEffect(() => {
    return () => {
      if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (step !== 7) {
      setMergeAnimTarget(null);
      setMergedOverlays([]);
    }
  }, [step]);

  const vertexOptions = useMemo(
    () =>
      fmbGeometry
        ? fmbGeometry.extraction.vertices
            .filter((v) => v.label)
            .map((v) => v.label)
        : [...KHUTAL_PARCEL.vertices],
    [fmbGeometry],
  );

  const mergeCandidates = useMemo(
    () => (fmbGeometry ? Object.keys(fmbGeometry.parcelPolygons) : [...MERGE_CANDIDATE_PLOTS]),
    [fmbGeometry],
  );

  const mapPreview = useMemo((): MapPreview => {
    switch (step) {
      case 0:
        return buildDistanceAnglePreview(
          firstTerminal,
          lastTerminal,
          betweenVertices,
          terminalDistance,
          refRows,
          geometryCtx,
        );
      case 1:
        return buildArcAdjacentPreview(
          cornerPoint,
          adjDist1,
          adjTowards1,
          adjDist2,
          adjTowards2,
          adjArc1,
          adjArc2,
          adjIntersection,
          geometryCtx,
        );
      case 2:
        return buildArcOppositePreview(
          oppPoint1,
          oppDist1,
          oppTowards1,
          oppPoint2,
          oppDist2,
          oppTowards2,
          oppArc1,
          oppArc2,
          oppIntersection,
          geometryCtx,
        );
      case 3:
        return buildPointMeasurePreview(measureRows, geometryCtx);
      case 4:
        return buildFmbPreview(baselineLength, triDist1, triDist2, trianglePoint, geometryCtx);
      case 5:
        return buildLadderPreview(ladderRows, hangDist1, hangDist2, geometryCtx);
      case 6:
        return buildSubdivisionPreview(polygons, selectedLayer, layerLabel, geometryCtx);
      case 7:
        return buildMergePreview(selectedPlots, mergeCandidates, geometryCtx);
      default:
        return { hint: "Map preview" };
    }
  }, [
    step,
    geometryCtx,
    firstTerminal,
    lastTerminal,
    betweenVertices,
    terminalDistance,
    refRows,
    cornerPoint,
    adjDist1,
    adjTowards1,
    adjDist2,
    adjTowards2,
    adjArc1,
    adjArc2,
    adjIntersection,
    oppPoint1,
    oppDist1,
    oppTowards1,
    oppPoint2,
    oppDist2,
    oppTowards2,
    oppArc1,
    oppArc2,
    oppIntersection,
    measureRows,
    baselineLength,
    triDist1,
    triDist2,
    trianglePoint,
    ladderRows,
    hangDist1,
    hangDist2,
    polygons,
    selectedLayer,
    layerLabel,
    selectedPlots,
    mergeCandidates,
  ]);

  function goNext() {
    setStatus(`Step "${STEPS[step]}" saved.`);
    onStepChange(Math.min(STEPS.length - 1, step + 1));
  }

  function goPrev() {
    onStepChange(Math.max(0, step - 1));
  }

  function saveMutation() {
    setStatus(`Step "${STEPS[step]}" saved.`);
  }

  function togglePlot(plot: string) {
    if (mergeAnimTarget || absorbedPlotSet.has(plot)) return;
    setSelectedPlots((prev) => {
      if (prev.includes(plot)) return prev.filter((p) => p !== plot);
      if (prev.length >= 12) return prev;
      return [...prev, plot];
    });
  }

  const handleMerge = useCallback(() => {
    if (mergeAnimTarget) return;

    const plotsToMerge = selectedPlots.filter((plot) => !absorbedPlotSet.has(plot));
    if (plotsToMerge.length < 2) {
      setStatus("Select at least 2 plots to merge.");
      return;
    }

    const union = computeMergeUnionRing(plotsToMerge, {
      fmbSubParcels: fmbMap?.subParcels,
      candidatePlots: mergeCandidates,
    });
    if (!union) {
      setStatus("Could not compute merge geometry for selected plots.");
      return;
    }

    setMergeAnimTarget({
      unionRing: union.ring,
      center: union.center,
      selectedPlots: [...plotsToMerge],
      label: newKhasra,
    });

    if (mergeTimerRef.current) clearTimeout(mergeTimerRef.current);
    mergeTimerRef.current = setTimeout(() => {
      setMergedOverlays((prev) => [
        ...prev,
        { ring: union.ring, label: newKhasra, sourcePlots: [...plotsToMerge] },
      ]);
      setMergeAnimTarget(null);
      setSelectedPlots([]);
      setStatus(`Merged ${plotsToMerge.length} plots into khasra ${newKhasra}.`);
    }, MERGE_ANIM_MS);
  }, [
    mergeAnimTarget,
    selectedPlots,
    absorbedPlotSet,
    fmbMap,
    mergeCandidates,
    newKhasra,
  ]);

  return (
    <div className={fillViewport ? "min-h-0 flex-1 overflow-hidden" : "space-y-4"}>
      <div
        className={
          fillViewport
            ? "grid min-h-0 flex-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
            : "grid gap-4 xl:grid-cols-[1fr_1.05fr]"
        }
      >
        <AnimatePresence mode="wait">
          <motion.section
            key={step}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.22 }}
            className={`rounded-2xl border border-slate-200 bg-white p-4 ${
              fillViewport ? "min-h-0 overflow-y-auto scrollbar-hide" : ""
            }`}
          >
            {step === 0 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Distance Angle Method</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Create a division line by specifying distance and angle of each point with respect to known reference
                  points. Line may start/end on plot border or inside the plot.
                </p>

                <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">First terminal point</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Vertex</FieldLabel>
                      <SelectInput value={firstTerminal} onChange={setFirstTerminal} options={vertexOptions} />
                    </div>
                    <div>
                      <FieldLabel>Distance (ground m)</FieldLabel>
                      <TextInput value={terminalDistance} onChange={setTerminalDistance} />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={betweenVertices}
                      onChange={(e) => setBetweenVertices(e.target.checked)}
                    />
                    Point between two vertices
                  </label>
                </div>

                <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Last terminal point</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Vertex</FieldLabel>
                      <SelectInput value={lastTerminal} onChange={setLastTerminal} options={vertexOptions} />
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <FieldLabel>Intermediate points — Reference Point / Distance / Angle</FieldLabel>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[360px] text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Reference Point</th>
                          <th className="px-2 py-2">Distance (m)</th>
                          <th className="px-2 py-2">Angle (°)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {refRows.map((row, i) => (
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-2 py-1.5">
                              <SelectInput
                                value={row.refPoint}
                                onChange={(v) =>
                                  setRefRows((rows) => rows.map((r, j) => (j === i ? { ...r, refPoint: v } : r)))
                                }
                                options={vertexOptions}
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <TextInput
                                value={row.distance}
                                onChange={(v) =>
                                  setRefRows((rows) => rows.map((r, j) => (j === i ? { ...r, distance: v } : r)))
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <TextInput
                                value={row.angle}
                                onChange={(v) =>
                                  setRefRows((rows) => rows.map((r, j) => (j === i ? { ...r, angle: v } : r)))
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setRefRows((rows) => [...rows, { refPoint: "V1", distance: "", angle: "" }])
                    }
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-700"
                  >
                    <Plus className="h-3 w-3" /> Add row
                  </button>
                </div>

                <div className="mt-3 flex gap-2">
                  <PrimaryButton onClick={goNext}>OK</PrimaryButton>
                  <SecondaryButton>Cancel</SecondaryButton>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Arc Method (Adjacent Side)</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Create division line at a plot corner. End points by distance from corner; third point as intersection
                  of two arcs.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Corner point (V1)</FieldLabel>
                    <SelectInput value={cornerPoint} onChange={setCornerPoint} options={vertexOptions} />
                  </div>
                  <div>
                    <FieldLabel>Distance to first end A1 (m)</FieldLabel>
                    <TextInput value={adjDist1} onChange={setAdjDist1} />
                  </div>
                  <div>
                    <FieldLabel>Towards</FieldLabel>
                    <SelectInput value={adjTowards1} onChange={setAdjTowards1} options={vertexOptions} />
                  </div>
                  <div>
                    <FieldLabel>Distance to end A3 (m)</FieldLabel>
                    <TextInput value={adjDist2} onChange={setAdjDist2} />
                  </div>
                  <div>
                    <FieldLabel>Towards</FieldLabel>
                    <SelectInput value={adjTowards2} onChange={setAdjTowards2} options={vertexOptions} />
                  </div>
                  <div>
                    <FieldLabel>Arc radius from A1 (m)</FieldLabel>
                    <TextInput value={adjArc1} onChange={setAdjArc1} />
                  </div>
                  <div>
                    <FieldLabel>Arc radius from A3 (m)</FieldLabel>
                    <TextInput value={adjArc2} onChange={setAdjArc2} />
                  </div>
                  <div>
                    <FieldLabel>Intersection point</FieldLabel>
                    <SelectInput value={adjIntersection} onChange={setAdjIntersection} options={["P1", "P2"]} />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <PrimaryButton onClick={goNext}>OK</PrimaryButton>
                  <SecondaryButton>Cancel</SecondaryButton>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Arc Method (Opposite Side)</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Division line between two sides. End points by distance from known points; third point via arc
                  intersection.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <FieldLabel>First point</FieldLabel>
                    <SelectInput value={oppPoint1} onChange={setOppPoint1} options={vertexOptions} />
                  </div>
                  <div>
                    <FieldLabel>Distance (m)</FieldLabel>
                    <TextInput value={oppDist1} onChange={setOppDist1} />
                  </div>
                  <div>
                    <FieldLabel>Towards</FieldLabel>
                    <SelectInput value={oppTowards1} onChange={setOppTowards1} options={vertexOptions} />
                  </div>
                  <div>
                    <FieldLabel>Second point</FieldLabel>
                    <SelectInput value={oppPoint2} onChange={setOppPoint2} options={vertexOptions} />
                  </div>
                  <div>
                    <FieldLabel>Distance (m)</FieldLabel>
                    <TextInput value={oppDist2} onChange={setOppDist2} />
                  </div>
                  <div>
                    <FieldLabel>Towards</FieldLabel>
                    <SelectInput value={oppTowards2} onChange={setOppTowards2} options={vertexOptions} />
                  </div>
                  <div>
                    <FieldLabel>Arc radius from A1 (m)</FieldLabel>
                    <TextInput value={oppArc1} onChange={setOppArc1} />
                  </div>
                  <div>
                    <FieldLabel>Arc radius from A3 (m)</FieldLabel>
                    <TextInput value={oppArc2} onChange={setOppArc2} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Select intersection point</FieldLabel>
                    <SelectInput value={oppIntersection} onChange={setOppIntersection} options={["P1", "P2"]} />
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <PrimaryButton onClick={goNext}>OK</PrimaryButton>
                  <SecondaryButton>Cancel</SecondaryButton>
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Point Measurement Method</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Each division line point identified by measuring from two known points. Complex arcs for multiple
                  intermediate points; usable for holes inside plot.
                </p>

                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[420px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="px-2 py-2">From Point 1</th>
                        <th className="px-2 py-2">Distance 1 (m)</th>
                        <th className="px-2 py-2">From Point 2</th>
                        <th className="px-2 py-2">Distance 2 (m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {measureRows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          {(["from1", "dist1", "from2", "dist2"] as const).map((field) => (
                            <td key={field} className="px-2 py-1.5">
                              {field.startsWith("from") ? (
                                <SelectInput
                                  value={row[field]}
                                  onChange={(v) =>
                                    setMeasureRows((rows) =>
                                      rows.map((r, j) => (j === i ? { ...r, [field]: v } : r)),
                                    )
                                  }
                                  options={vertexOptions}
                                />
                              ) : (
                                <TextInput
                                  value={row[field]}
                                  onChange={(v) =>
                                    setMeasureRows((rows) =>
                                      rows.map((r, j) => (j === i ? { ...r, [field]: v } : r)),
                                    )
                                  }
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setMeasureRows((rows) => [...rows, { from1: "V1", dist1: "", from2: "V2", dist2: "" }])
                  }
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-sky-700"
                >
                  <Plus className="h-3 w-3" /> Add point
                </button>

                <div className="mt-3 flex gap-2">
                  <PrimaryButton onClick={goNext}>OK</PrimaryButton>
                  <SecondaryButton>Cancel</SecondaryButton>
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Creating Map from FMB / Tippon Data</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Maps created interactively from FMB data and tippon sketch. Select village details, then build
                  triangulation.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div>
                    <FieldLabel>District</FieldLabel>
                    <TextInput value={KHUTAL_PARCEL.district} onChange={() => {}} />
                  </div>
                  <div>
                    <FieldLabel>Taluk</FieldLabel>
                    <TextInput value={KHUTAL_PARCEL.taluk} onChange={() => {}} />
                  </div>
                  <div>
                    <FieldLabel>Village</FieldLabel>
                    <TextInput value={KHUTAL_PARCEL.village} onChange={() => {}} />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Draw Base Line</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div>
                      <FieldLabel>Start point name</FieldLabel>
                      <TextInput value={baselineStart} onChange={setBaselineStart} />
                    </div>
                    <div>
                      <FieldLabel>End point name</FieldLabel>
                      <TextInput value={baselineEnd} onChange={setBaselineEnd} />
                    </div>
                    <div>
                      <FieldLabel>Length (m)</FieldLabel>
                      <TextInput value={baselineLength} onChange={setBaselineLength} />
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <PrimaryButton>Insert</PrimaryButton>
                    <SecondaryButton>Draw Base Line</SecondaryButton>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Draw Triangle</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    <div>
                      <FieldLabel>Third point name</FieldLabel>
                      <TextInput value={trianglePoint} onChange={setTrianglePoint} />
                    </div>
                    <div>
                      <FieldLabel>Distance from baseline point 1 (m)</FieldLabel>
                      <TextInput value={triDist1} onChange={setTriDist1} />
                    </div>
                    <div>
                      <FieldLabel>Distance from baseline point 2 (m)</FieldLabel>
                      <TextInput value={triDist2} onChange={setTriDist2} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <SecondaryButton>Draw Triangle</SecondaryButton>
                    <SecondaryButton>Create Offset Points</SecondaryButton>
                    <SecondaryButton>Join Boundary</SecondaryButton>
                    <SecondaryButton>Create Sub division</SecondaryButton>
                  </div>
                </div>
              </>
            ) : null}

            {step === 5 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Real Time Base Line / Offset Points</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Baseline and offset points drawn in map area while entering ladder table data. Hanging baseline from
                  two offset points supported.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  <SecondaryButton>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> select point
                    </span>
                  </SecondaryButton>
                  <PrimaryButton>OK</PrimaryButton>
                </div>

                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[400px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Point From</th>
                        <th className="px-2 py-2">Point To</th>
                        <th className="px-2 py-2">Offset Distance (m)</th>
                        <th className="px-2 py-2">Chainage (m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ladderRows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          {(["from", "to", "offsetDistance", "chainage"] as const).map((field) => (
                            <td key={field} className="px-2 py-1.5">
                              <TextInput
                                value={row[field]}
                                onChange={(v) =>
                                  setLadderRows((rows) =>
                                    rows.map((r, j) => (j === i ? { ...r, [field]: v } : r)),
                                  )
                                }
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-700">Hanging Base Line</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div>
                      <FieldLabel>Distance from point 1 (m)</FieldLabel>
                      <TextInput value={hangDist1} onChange={setHangDist1} />
                    </div>
                    <div>
                      <FieldLabel>Distance from point 2 (m)</FieldLabel>
                      <TextInput value={hangDist2} onChange={setHangDist2} />
                    </div>
                    <div>
                      <FieldLabel>Point name 1</FieldLabel>
                      <TextInput value={hangPoint1} onChange={setHangPoint1} />
                    </div>
                    <div>
                      <FieldLabel>Point name 2</FieldLabel>
                      <TextInput value={hangPoint2} onChange={setHangPoint2} />
                    </div>
                  </div>
                  <div className="mt-2">
                    <FieldLabel>Select hanging baseline</FieldLabel>
                    <SelectInput value="HB-1" onChange={() => {}} options={["HB-1", "HB-2"]} />
                  </div>
                </div>
              </>
            ) : null}

            {step === 6 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Subdivision and Layers</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Interactively create subdivision and place point, line, or polygon layers in the map area.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {["Create Sub division", "Insert Point Layer", "Insert Line Layer", "Insert Polygon Layer"].map(
                    (tool) => (
                      <SecondaryButton key={tool}>{tool}</SecondaryButton>
                    ),
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <FieldLabel>Layer</FieldLabel>
                    <SelectInput value={selectedLayer} onChange={setSelectedLayer} options={FMB_LAYER_OPTIONS} />
                  </div>
                  <div>
                    <FieldLabel>Label</FieldLabel>
                    <TextInput value={layerLabel} onChange={setLayerLabel} placeholder="Plot / feature label" />
                  </div>
                </div>
                <PrimaryButton>Insert</PrimaryButton>

                <div className="mt-4">
                  <FieldLabel>Polygons table</FieldLabel>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Polygon</th>
                          <th className="px-2 py-2">Area (sq.m)</th>
                          <th className="px-2 py-2">Label (Plot No)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {polygons.map((row, i) => (
                          <tr key={row.polygon} className="border-t border-slate-100">
                            <td className="px-2 py-1.5">{row.polygon}</td>
                            <td className="px-2 py-1.5">{row.area}</td>
                            <td className="px-2 py-1.5">
                              <TextInput
                                value={row.label}
                                onChange={(v) =>
                                  setPolygons((rows) => rows.map((r, j) => (j === i ? { ...r, label: v } : r)))
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}

            {step === 7 ? (
              <>
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Merging Plot</h3>
                <p className="mt-1 text-[11px] text-slate-500">
                  Merge up to 12 khasra&apos;s in a village and assign a new khasra number to the newly created plot.
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div>
                    <FieldLabel>Village</FieldLabel>
                    <TextInput value={KHUTAL_PARCEL.village} onChange={() => {}} />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>New Khasra Number</FieldLabel>
                    <TextInput value={newKhasra} onChange={setNewKhasra} placeholder="e.g. 142" />
                  </div>
                </div>

                <div className="mt-3">
                  <FieldLabel>
                    {fmbGeometry
                      ? `Select plots to merge on the map (${selectedPlots.length}/12)`
                      : `Select plots to merge (${selectedPlots.length}/12)`}
                  </FieldLabel>
                  {fmbGeometry ? (
                    <p className="mt-1 text-[11px] text-slate-500">
                      Click sub-parcel pieces in the map workspace to select or deselect them, then press Merge.
                      {selectedPlots.length > 0 ? ` Selected: ${selectedPlots.join(", ")}` : ""}
                    </p>
                  ) : (
                    <div className="mt-2 grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                      {mergeCandidates.map((plot) => {
                        const selected = selectedPlots.includes(plot);
                        return (
                          <button
                            key={plot}
                            type="button"
                            onClick={() => togglePlot(plot)}
                            className={`rounded-lg border px-2 py-2 text-xs ${
                              selected
                                ? "border-[#1A1A1A] bg-[#1A1A1A] text-white"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            {plot}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <PrimaryButton
                    onClick={handleMerge}
                    disabled={mergeAnimTarget !== null || selectedPlots.length < 2}
                  >
                    Merge
                  </PrimaryButton>
                  <SecondaryButton>Cancel</SecondaryButton>
                </div>
              </>
            ) : null}

            <StepNav step={step} onPrev={goPrev} onSave={saveMutation} status={status ?? undefined} />
          </motion.section>
        </AnimatePresence>

        <section
          className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-4 ${
            fillViewport ? "min-h-0 overflow-hidden" : ""
          }`}
        >
          <div className="mb-3 flex shrink-0 items-center gap-2">
            <Ruler className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Map workspace</h3>
          </div>
          <div className={fillViewport ? "min-h-0 flex-1" : "h-[min(58vh,520px)]"}>
            <MapWorkspace
              title={STEPS[step]}
              preview={mapPreview}
              fmbMap={fmbMap}
              mergeInteractive={step === 7 && Boolean(fmbMap)}
              mergeSelectedPlots={selectedPlots}
              onMergePlotClick={togglePlot}
              mergeAnimTarget={step === 7 ? mergeAnimTarget : null}
              mergedOverlays={step === 7 ? mergedOverlays : []}
            />
          </div>

          {step === 7 && status ? (
            <div className="mt-3 flex shrink-0 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
              <Check className="h-3.5 w-3.5" />
              {status}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
