import { useRef, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { FileImage } from "lucide-react";
import CanvasZoomControls from "../ui/CanvasZoomControls";
import {
  FMB_BACKGROUND_URL,
  FMB_BLUE,
  FMB_CANVAS_VIEWBOX,
  FMB_GREEN,
  FMB_HIGHLIGHTED_EDGE_ID,
  FMB_ORANGE,
  type FmbCanvasLabel,
  type FmbEdge,
  type FmbExtractionState,
  type FmbPoint,
} from "../../data/fmbExtractionMock";
import {
  SVG_WHEEL_DELTA_THRESHOLD_FINE,
  SVG_ZOOM_STEP_FINE,
  useSvgCanvasZoom,
} from "../../hooks/useSvgCanvasZoom";

type Props = {
  state: FmbExtractionState;
  onStateChange: (state: FmbExtractionState) => void;
  selectedVertexId: string | null;
  selectedEdgeId: string | null;
  onSelectVertex: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  imageVisible: boolean;
  geometryVisible: boolean;
  isDigitizing?: boolean;
};

const SCAN_DURATION_S = 4;
const scanTransition = { duration: SCAN_DURATION_S, ease: "linear" as const };

function FmbScanOverlay({ width, height }: { width: number; height: number }) {
  const beamHeight = height * 0.07;

  return (
    <motion.g
      key="fmb-scan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <defs>
        <linearGradient id="fmb-scan-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(56, 189, 248)" stopOpacity={0} />
          <stop offset="35%" stopColor="rgb(56, 189, 248)" stopOpacity={0.12} />
          <stop offset="50%" stopColor="rgb(14, 165, 233)" stopOpacity={0.55} />
          <stop offset="65%" stopColor="rgb(56, 189, 248)" stopOpacity={0.12} />
          <stop offset="100%" stopColor="rgb(56, 189, 248)" stopOpacity={0} />
        </linearGradient>
        <pattern
          id="fmb-scan-grid"
          width={28}
          height={28}
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 28 0 L 0 0 0 28"
            fill="none"
            stroke="rgb(14, 165, 233)"
            strokeWidth={0.4}
            strokeOpacity={0.18}
          />
        </pattern>
        <filter id="fmb-scan-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={2.5} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <motion.rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#fmb-scan-grid)"
        animate={{ opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="rgb(14, 165, 233)"
        fillOpacity={0.04}
      />

      <motion.g
        initial={{ y: -beamHeight }}
        animate={{ y: height }}
        transition={scanTransition}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={beamHeight}
          fill="url(#fmb-scan-beam)"
        />
        <line
          x1={0}
          y1={beamHeight / 2}
          x2={width}
          y2={beamHeight / 2}
          stroke="rgb(125, 211, 252)"
          strokeWidth={2.5}
          strokeOpacity={0.95}
          filter="url(#fmb-scan-glow)"
        />
      </motion.g>
    </motion.g>
  );
}

function edgeMidpoint(from: FmbPoint, to: FmbPoint) {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function labelFill(kind: FmbCanvasLabel["kind"]) {
  if (kind === "parcel" || kind === "anchor") return FMB_BLUE;
  return FMB_ORANGE;
}

function labelFontSize(kind: FmbCanvasLabel["kind"]) {
  if (kind === "parcel") return 11;
  if (kind === "anchor") return 12;
  return 9;
}

function labelFontWeight(kind: FmbCanvasLabel["kind"]) {
  if (kind === "parcel" || kind === "anchor") return 700;
  return 600;
}

const fadeTransition = { duration: 0.55, ease: "easeOut" as const };

export default function FmbExtractionCanvas({
  state,
  onStateChange,
  selectedVertexId,
  selectedEdgeId,
  onSelectVertex,
  onSelectEdge,
  imageVisible,
  geometryVisible,
  isDigitizing = false,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragVertexId, setDragVertexId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const vertexMap = Object.fromEntries(state.vertices.map((v) => [v.id, v]));

  function svgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const local = pt.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  function handleVertexMouseDown(e: React.MouseEvent, vertexId: string) {
    if (!geometryVisible) return;
    e.stopPropagation();
    setDragVertexId(vertexId);
    onSelectVertex(vertexId);
    onSelectEdge(null);
  }

  function handleEdgeClick(e: React.MouseEvent, edgeId: string) {
    if (!geometryVisible) return;
    e.stopPropagation();
    onSelectEdge(edgeId);
    onSelectVertex(null);
    setEditingLabelId(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragVertexId || !geometryVisible) return;
    const pt = svgPoint(e.clientX, e.clientY);
    onStateChange({
      ...state,
      vertices: state.vertices.map((v) =>
        v.id === dragVertexId ? { ...v, x: pt.x, y: pt.y } : v,
      ),
    });
  }

  function handleMouseUp() {
    setDragVertexId(null);
  }

  function startLabelEdit(label: FmbCanvasLabel, e: React.MouseEvent) {
    if (!geometryVisible) return;
    e.stopPropagation();
    setEditingLabelId(label.id);
    setEditDraft(label.text);
    onSelectVertex(null);
    onSelectEdge(null);
  }

  function commitLabelEdit() {
    if (!editingLabelId) return;
    const label = state.canvasLabels.find((l) => l.id === editingLabelId);
    if (!label) {
      setEditingLabelId(null);
      return;
    }
    const trimmed = editDraft.trim();
    let edges = state.edges;
    if (label.linkedEdgeId && trimmed) {
      const parsed = parseFloat(trimmed);
      if (!Number.isNaN(parsed)) {
        edges = state.edges.map((edge) =>
          edge.id === label.linkedEdgeId ? { ...edge, lengthM: parsed } : edge,
        ) as FmbEdge[];
      }
    }
    onStateChange({
      ...state,
      edges,
      canvasLabels: state.canvasLabels.map((l) =>
        l.id === editingLabelId ? { ...l, text: trimmed || l.text } : l,
      ),
    });
    setEditingLabelId(null);
  }

  function handleCanvasClick() {
    if (editingLabelId) {
      commitLabelEdit();
      return;
    }
    onSelectVertex(null);
    onSelectEdge(null);
  }

  const { width, height } = FMB_CANVAS_VIEWBOX;
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
  } = useSvgCanvasZoom(width, height, {
    defaultZoom: 0.65,
    zoomStep: SVG_ZOOM_STEP_FINE,
    wheelDeltaThreshold: SVG_WHEEL_DELTA_THRESHOLD_FINE,
  });

  const canvasCursor =
    dragVertexId || isPanning ? "cursor-grabbing" : spacePanActive ? "cursor-grab" : "cursor-grab";

  return (
    <div
      ref={wheelTargetRef}
      className="relative h-full min-h-0 w-full overflow-hidden bg-[#e8e4dc]"
      onMouseDown={onPanMouseDown}
      onMouseMove={(e) => {
        onPanMouseMove(e);
        handleMouseMove(e);
      }}
      onMouseUp={() => {
        onPanMouseUp();
        handleMouseUp();
      }}
      onMouseLeave={() => {
        onPanMouseUp();
        handleMouseUp();
      }}
    >
      <CanvasZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetZoom} zoom={zoom} />

      <AnimatePresence>
        {!imageVisible ? (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"
          >
            <div className="max-w-xs rounded-xl border-2 border-dashed border-slate-300 bg-white/60 px-6 py-8 text-center shadow-sm backdrop-blur-sm">
              <FileImage className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium text-slate-600">No document loaded</p>
              <p className="mt-1 text-xs text-slate-500">
                Use Upload document above to load the FMB scan
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <svg
        ref={svgRef}
        className={clsx("h-full w-full max-h-full object-contain", canvasCursor)}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleCanvasClick}
      >
        <rect
          data-pan-background="true"
          x={0}
          y={0}
          width={width}
          height={height}
          fill="transparent"
        />

        <AnimatePresence>
          {imageVisible ? (
            <motion.g
              key="fmb-image"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fadeTransition}
            >
              <image
                href={FMB_BACKGROUND_URL}
                x={0}
                y={0}
                width={width}
                height={height}
                preserveAspectRatio="xMidYMid meet"
              />
            </motion.g>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {imageVisible && isDigitizing ? (
            <FmbScanOverlay width={width} height={height} />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {geometryVisible ? (
            <motion.g
              key="fmb-geometry"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...fadeTransition, duration: 0.65 }}
            >
              {state.edges.map((edge) => {
                const from = vertexMap[edge.from];
                const to = vertexMap[edge.to];
                if (!from || !to) return null;
                const isHighlighted = edge.id === FMB_HIGHLIGHTED_EDGE_ID;
                const isSelected = selectedEdgeId === edge.id;
                const mid = edgeMidpoint(from, to);
                const hasCanvasLabel = state.canvasLabels.some((l) => l.linkedEdgeId === edge.id);
                const stroke = isHighlighted ? FMB_GREEN : FMB_ORANGE;
                return (
                  <g key={edge.id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={stroke}
                      strokeWidth={isHighlighted ? 2.8 : isSelected ? 2.4 : 2}
                      strokeOpacity={0.92}
                      className="cursor-pointer"
                      data-canvas-interactive
                      onClick={(e) => handleEdgeClick(e, edge.id)}
                    />
                    {!hasCanvasLabel ? (
                      <text
                        x={mid.x}
                        y={mid.y - 4}
                        textAnchor="middle"
                        fill={FMB_ORANGE}
                        fontWeight={600}
                        style={{ fontSize: 9 }}
                        className="pointer-events-none select-none"
                      >
                        {edge.lengthM}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {state.vertices.map((vertex) => {
                const isSelected = selectedVertexId === vertex.id;
                const isAnchor = vertex.isAnchor;
                const dotRadius = isAnchor ? (isSelected ? 10 : 8) : isSelected ? 6 : 4;
                const dotFill = isAnchor ? FMB_GREEN : FMB_ORANGE;
                return (
                  <g key={vertex.id}>
                    <circle
                      cx={vertex.x}
                      cy={vertex.y}
                      r={dotRadius}
                      fill={dotFill}
                      fillOpacity={0.95}
                      stroke={isSelected ? FMB_BLUE : "#fff"}
                      strokeWidth={isAnchor ? 2 : 1.5}
                      className="cursor-grab"
                      data-canvas-interactive
                      onMouseDown={(e) => handleVertexMouseDown(e, vertex.id)}
                    />
                    {vertex.label ? (
                      <text
                        x={vertex.x}
                        y={vertex.y - (isAnchor ? 16 : 12)}
                        textAnchor="middle"
                        fill={FMB_BLUE}
                        fontWeight={700}
                        style={{ fontSize: isAnchor ? 12 : 10 }}
                        className="pointer-events-none select-none"
                      >
                        {vertex.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}

              {state.canvasLabels.map((label) => {
                const isEditing = editingLabelId === label.id;
                const fontSize = labelFontSize(label.kind);
                const fill = labelFill(label.kind);
                const approxWidth = Math.max(label.text.length * fontSize * 0.55, 28);
                return (
                  <g key={label.id}>
                    {isEditing ? (
                      <foreignObject
                        x={label.x - approxWidth / 2}
                        y={label.y - fontSize - 2}
                        width={approxWidth + 16}
                        height={fontSize + 12}
                      >
                        <input
                          type="text"
                          value={editDraft}
                          autoFocus
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitLabelEdit();
                            if (e.key === "Escape") setEditingLabelId(null);
                            e.stopPropagation();
                          }}
                          onBlur={commitLabelEdit}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full rounded border-2 border-sky-400 bg-white px-1 py-0.5 text-center font-semibold text-sky-900 shadow-md outline-none"
                          style={{ fontSize }}
                        />
                      </foreignObject>
                    ) : (
                      <text
                        x={label.x}
                        y={label.y}
                        textAnchor="middle"
                        fill={fill}
                        fontWeight={labelFontWeight(label.kind)}
                        style={{ fontSize }}
                        className="cursor-text select-none"
                        data-canvas-interactive
                        onClick={(e) => startLabelEdit(label, e)}
                      >
                        {label.text}
                      </text>
                    )}
                  </g>
                );
              })}
            </motion.g>
          ) : null}
        </AnimatePresence>
      </svg>

      {geometryVisible ? (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/85 px-2 py-1 text-[10px] text-slate-600 shadow-sm backdrop-blur-sm">
          Drag vertices · Click labels to edit · Drag background to pan · Space+drag to pan
        </div>
      ) : null}
    </div>
  );
}
