import { useCallback, useRef, useState } from "react";
import {
  Hand,
  MousePointer2,
  Move,
  PenLine,
  Plus,
  Trash2,
  Undo2,
} from "lucide-react";
import clsx from "clsx";
import {
  confidenceStrokeColor,
  type FmbEdge,
  type FmbExtractionState,
  type FmbPoint,
} from "../../data/fmbExtractionMock";

export type CanvasTool = "select" | "move" | "addPoint" | "drawLine" | "delete" | "pan";

type Props = {
  state: FmbExtractionState;
  onStateChange: (state: FmbExtractionState) => void;
  selectedVertexId: string | null;
  selectedEdgeId: string | null;
  onSelectVertex: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  activeTool: CanvasTool;
  onToolChange: (tool: CanvasTool) => void;
  extractionVisible: boolean;
};

type HistoryEntry = FmbExtractionState;

const TOOLS: { id: CanvasTool; label: string; icon: typeof MousePointer2 }[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "move", label: "Move vertex", icon: Move },
  { id: "addPoint", label: "Add point", icon: Plus },
  { id: "drawLine", label: "Draw boundary", icon: PenLine },
  { id: "delete", label: "Delete", icon: Trash2 },
  { id: "pan", label: "Pan", icon: Hand },
];

function edgeMidpoint(from: FmbPoint, to: FmbPoint) {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

export default function FmbExtractionCanvas({
  state,
  onStateChange,
  selectedVertexId,
  selectedEdgeId,
  onSelectVertex,
  onSelectEdge,
  activeTool,
  onToolChange,
  extractionVisible,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragVertexId, setDragVertexId] = useState<string | null>(null);
  const [drawFromId, setDrawFromId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const pushHistory = useCallback(
    (prev: FmbExtractionState) => {
      setHistory((h) => [...h.slice(-19), structuredClone(prev)]);
    },
    [],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const last = h[h.length - 1];
      onStateChange(last);
      return h.slice(0, -1);
    });
  }, [onStateChange]);

  const vertexMap = Object.fromEntries(state.vertices.map((v) => [v.id, v]));

  function svgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const inv = ctm.inverse();
    const local = pt.matrixTransform(inv);
    return { x: local.x - pan.x, y: local.y - pan.y };
  }

  function addVertex(x: number, y: number) {
    pushHistory(state);
    const id = `v${Date.now()}`;
    const newVertex: FmbPoint = {
      id,
      x,
      y,
      confidence: 72,
      label: `P${state.vertices.length + 1}`,
    };
    onStateChange({ ...state, vertices: [...state.vertices, newVertex] });
    onSelectVertex(id);
  }

  function addEdge(from: string, to: string) {
    if (from === to) return;
    const exists = state.edges.some(
      (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from),
    );
    if (exists) return;
    pushHistory(state);
    const edge: FmbEdge = {
      id: `e${Date.now()}`,
      from,
      to,
      lengthM: 0,
      lengthConfidence: 68,
      bearing: "—",
      bearingConfidence: 65,
    };
    onStateChange({ ...state, edges: [...state.edges, edge] });
    onSelectEdge(edge.id);
    setDrawFromId(null);
  }

  function deleteVertex(vertexId: string) {
    pushHistory(state);
    onStateChange({
      ...state,
      vertices: state.vertices.filter((v) => v.id !== vertexId),
      edges: state.edges.filter((e) => e.from !== vertexId && e.to !== vertexId),
    });
    onSelectVertex(null);
  }

  function deleteEdge(edgeId: string) {
    pushHistory(state);
    onStateChange({ ...state, edges: state.edges.filter((e) => e.id !== edgeId) });
    onSelectEdge(null);
  }

  function handleCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    if (activeTool === "pan" || dragVertexId) return;
    const pt = svgPoint(e.clientX, e.clientY);

    if (activeTool === "addPoint") {
      addVertex(pt.x, pt.y);
      return;
    }

    if (activeTool === "select" || activeTool === "move") {
      onSelectVertex(null);
      onSelectEdge(null);
    }
  }

  function handleVertexMouseDown(e: React.MouseEvent, vertexId: string) {
    e.stopPropagation();
    if (activeTool === "delete") {
      deleteVertex(vertexId);
      return;
    }
    if (activeTool === "drawLine") {
      if (!drawFromId) {
        setDrawFromId(vertexId);
        onSelectVertex(vertexId);
      } else {
        addEdge(drawFromId, vertexId);
      }
      return;
    }
    if (activeTool === "move" || activeTool === "select") {
      onSelectVertex(vertexId);
      onSelectEdge(null);
      if (activeTool === "move") setDragVertexId(vertexId);
    }
  }

  function handleEdgeClick(e: React.MouseEvent, edgeId: string) {
    e.stopPropagation();
    if (activeTool === "delete") {
      deleteEdge(edgeId);
      return;
    }
    if (activeTool === "select") {
      onSelectEdge(edgeId);
      onSelectVertex(null);
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning && activeTool === "pan") {
      setPan({
        x: panStart.current.panX + (e.clientX - panStart.current.x),
        y: panStart.current.panY + (e.clientY - panStart.current.y),
      });
      return;
    }
    if (dragVertexId) {
      const pt = svgPoint(e.clientX, e.clientY);
      onStateChange({
        ...state,
        vertices: state.vertices.map((v) =>
          v.id === dragVertexId ? { ...v, x: pt.x, y: pt.y } : v,
        ),
      });
    }
  }

  function handleMouseUp() {
    if (dragVertexId) {
      pushHistory(state);
    }
    setDragVertexId(null);
    setIsPanning(false);
  }

  function handlePanStart(e: React.MouseEvent) {
    if (activeTool !== "pan") return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }

  const polygonPoints = state.vertices.map((v) => `${v.x + pan.x},${v.y + pan.y}`).join(" ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-100 bg-white/90 px-3 py-2">
        {TOOLS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            title={label}
            onClick={() => {
              onToolChange(id);
              setDrawFromId(null);
            }}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
              activeTool === id
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
        <button
          type="button"
          title="Undo"
          disabled={!history.length}
          onClick={undo}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f4f1ea]">
        {/* Mock FMB sketch background */}
        <div
          className="pointer-events-none absolute inset-4 rounded-lg border border-amber-200/60 bg-[#faf8f3] opacity-90"
          style={{
            backgroundImage: `
              linear-gradient(rgba(180,160,120,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(180,160,120,0.08) 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />

        <svg
          ref={svgRef}
          className={clsx(
            "relative h-full w-full",
            activeTool === "pan" ? "cursor-grab" : activeTool === "addPoint" ? "cursor-crosshair" : "cursor-default",
            isPanning && "cursor-grabbing",
          )}
          viewBox="0 0 500 380"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseDown={handlePanStart}
        >
          <defs>
            <pattern id="fmb-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#c4b59a" strokeWidth="1" />
            </pattern>
          </defs>

          {/* FMB register annotations (static mock) */}
          <text x="16" y="24" className="fill-amber-900/50 text-[10px] font-serif" style={{ fontSize: 10 }}>
            FMB Sheet No. 142 — Thirunallar
          </text>
          <text x="16" y="38" className="fill-amber-900/40 text-[9px] font-serif" style={{ fontSize: 9 }}>
            Scale 1:1000 | Survey of India
          </text>

          <g opacity={extractionVisible ? 1 : 0.15} style={{ transition: "opacity 0.6s ease" }}>
            {state.edges.map((edge) => {
              const from = vertexMap[edge.from];
              const to = vertexMap[edge.to];
              if (!from || !to) return null;
              const avgConf = (edge.lengthConfidence + edge.bearingConfidence) / 2;
              const isSelected = selectedEdgeId === edge.id;
              const mid = edgeMidpoint(from, to);
              return (
                <g key={edge.id}>
                  <line
                    x1={from.x + pan.x}
                    y1={from.y + pan.y}
                    x2={to.x + pan.x}
                    y2={to.y + pan.y}
                    stroke={confidenceStrokeColor(avgConf)}
                    strokeWidth={isSelected ? 3 : 2}
                    strokeDasharray={avgConf < 65 ? "6 4" : undefined}
                    className="cursor-pointer"
                    onClick={(e) => handleEdgeClick(e, edge.id)}
                  />
                  <text
                    x={mid.x + pan.x}
                    y={mid.y + pan.y - 6}
                    textAnchor="middle"
                    className="pointer-events-none select-none fill-slate-700"
                    style={{ fontSize: 8 }}
                  >
                    {edge.lengthM}m
                  </text>
                  <text
                    x={mid.x + pan.x}
                    y={mid.y + pan.y + 8}
                    textAnchor="middle"
                    className="pointer-events-none select-none fill-slate-500"
                    style={{ fontSize: 7 }}
                  >
                    {edge.bearing}
                  </text>
                </g>
              );
            })}

            {state.vertices.length >= 3 ? (
              <polygon
                points={polygonPoints}
                fill="url(#fmb-hatch)"
                fillOpacity={0.35}
                stroke="#64748b"
                strokeWidth={1}
                strokeDasharray="4 2"
                className="pointer-events-none"
              />
            ) : null}

            {state.vertices.map((vertex) => {
              const isSelected = selectedVertexId === vertex.id;
              const isDrawSource = drawFromId === vertex.id;
              return (
                <g key={vertex.id}>
                  <circle
                    cx={vertex.x + pan.x}
                    cy={vertex.y + pan.y}
                    r={isSelected || isDrawSource ? 8 : 6}
                    fill={confidenceStrokeColor(vertex.confidence)}
                    stroke={isSelected ? "#0ea5e9" : "#fff"}
                    strokeWidth={2}
                    className="cursor-pointer"
                    onMouseDown={(e) => handleVertexMouseDown(e, vertex.id)}
                  />
                  <text
                    x={vertex.x + pan.x}
                    y={vertex.y + pan.y - 12}
                    textAnchor="middle"
                    className="pointer-events-none select-none fill-slate-700 font-semibold"
                    style={{ fontSize: 9 }}
                  >
                    {vertex.label}
                  </text>
                </g>
              );
            })}
          </g>

          {activeTool === "drawLine" && drawFromId ? (
            <text x="250" y="370" textAnchor="middle" className="fill-sky-600" style={{ fontSize: 10 }}>
              Click target vertex to complete boundary segment
            </text>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
