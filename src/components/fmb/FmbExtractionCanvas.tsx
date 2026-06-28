import { useRef, useState } from "react";
import clsx from "clsx";
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

type Props = {
  state: FmbExtractionState;
  onStateChange: (state: FmbExtractionState) => void;
  selectedVertexId: string | null;
  selectedEdgeId: string | null;
  onSelectVertex: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  extractionVisible: boolean;
};

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

export default function FmbExtractionCanvas({
  state,
  onStateChange,
  selectedVertexId,
  selectedEdgeId,
  onSelectVertex,
  onSelectEdge,
  extractionVisible,
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
    e.stopPropagation();
    setDragVertexId(vertexId);
    onSelectVertex(vertexId);
    onSelectEdge(null);
  }

  function handleEdgeClick(e: React.MouseEvent, edgeId: string) {
    e.stopPropagation();
    onSelectEdge(edgeId);
    onSelectVertex(null);
    setEditingLabelId(null);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragVertexId) return;
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

  return (
    <div className="relative h-full min-h-[min(50.4vh,468px)] w-full flex-1 overflow-hidden bg-[#e8e4dc]">
      <svg
        ref={svgRef}
        className={clsx("h-full w-full", dragVertexId ? "cursor-grabbing" : "cursor-default")}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <image
          href={FMB_BACKGROUND_URL}
          x={0}
          y={0}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid meet"
        />

        <g opacity={extractionVisible ? 1 : 0.12} style={{ transition: "opacity 0.6s ease" }}>
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
                    onClick={(e) => startLabelEdit(label, e)}
                  >
                    {label.text}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {extractionVisible ? (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md bg-white/85 px-2 py-1 text-[10px] text-slate-600 shadow-sm backdrop-blur-sm">
          Drag vertices · Click labels to edit
        </div>
      ) : null}
    </div>
  );
}
