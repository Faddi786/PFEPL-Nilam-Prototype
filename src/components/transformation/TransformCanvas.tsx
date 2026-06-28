import { useCallback, useMemo, useRef, useState } from "react";
import type {
  AffineParams,
  GcpPoint,
  PolynomialOrder,
  TransformMethod,
} from "../../data/transformationMock";
import {
  FMB_MESH,
  FMB_PARCELS,
  PROJECTIVE_CORNERS,
} from "../../data/transformationMock";
import {
  applyAffine,
  applyPolynomial,
  applyProjective,
  applyTps,
  clampPoint,
  fitAffineFromGcps,
  fitPolynomial,
  fitProjective,
  type Point,
} from "../../lib/transformMath";

type ViewMode = "overlay" | "before" | "after" | "split";

type TransformCanvasProps = {
  method: TransformMethod;
  gcps: GcpPoint[];
  onGcpsChange: (gcps: GcpPoint[]) => void;
  onAddGcp?: (source: Point, target: Point) => void;
  affineParams: AffineParams;
  onAffineChange: (p: AffineParams) => void;
  polynomialOrder: PolynomialOrder;
  projectiveDst: Point[];
  onProjectiveDstChange: (corners: Point[]) => void;
  applied: boolean;
  viewMode: ViewMode;
  overlayOpacity: number;
};

function toPoints(vertices: Point[]) {
  return vertices.map(([x, y]) => `${x},${y}`).join(" ");
}

type DragKind =
  | { type: "gcp-target"; id: string }
  | { type: "gcp-source"; id: string }
  | { type: "affine-translate" }
  | { type: "affine-rotate" }
  | { type: "affine-scale" }
  | { type: "affine-skew" }
  | { type: "projective-corner"; index: number };

function DroneUnderlay() {
  return (
    <>
      <rect width="100" height="100" fill="url(#tx-drone-grid)" rx="1" />
      <ellipse cx="35" cy="40" rx="18" ry="12" fill="#2d5a3d" opacity="0.5" />
      <ellipse cx="65" cy="55" rx="22" ry="14" fill="#3d6b4a" opacity="0.45" />
      <path d="M0 52 Q30 48 55 54 T100 50" fill="none" stroke="#4a90c2" strokeWidth="0.6" opacity="0.7" />
      <polygon
        points="30,34 44,32 48,46 34,48"
        fill="none"
        stroke="#86efac"
        strokeWidth="0.5"
        strokeDasharray="1 0.5"
        opacity="0.7"
      />
      <polygon
        points="52,36 64,34 68,50 56,52"
        fill="none"
        stroke="#86efac"
        strokeWidth="0.5"
        strokeDasharray="1 0.5"
        opacity="0.7"
      />
      <text x="50" y="6" fill="#a7f3d0" fontSize="2.8" textAnchor="middle" opacity="0.85">
        Drone Orthomosaic — Khutal DGPS 2025
      </text>
    </>
  );
}

function FmbSketch({
  mesh,
  parcels,
  opacity = 0.85,
}: {
  mesh: Point[];
  parcels: Point[][];
  opacity?: number;
}) {
  return (
    <g opacity={opacity}>
      <polygon points={toPoints(mesh)} fill="url(#tx-fmb-paper)" stroke="#b45309" strokeWidth="0.7" />
      {parcels.map((ring, i) => (
        <polygon key={i} points={toPoints(ring)} fill="none" stroke="#78716c" strokeWidth="0.45" />
      ))}
    </g>
  );
}

export default function TransformCanvas({
  method,
  gcps,
  onGcpsChange,
  onAddGcp,
  affineParams,
  onAffineChange,
  polynomialOrder,
  projectiveDst,
  onProjectiveDstChange,
  applied,
  viewMode,
  overlayOpacity,
}: TransformCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<DragKind | null>(null);
  const [addMode, setAddMode] = useState<"source" | "target" | null>(null);
  const [pendingSource, setPendingSource] = useState<Point | null>(null);

  const effectiveAffine = useMemo(() => {
    if (method === "affine" && gcps.length >= 3) return fitAffineFromGcps(gcps);
    return affineParams;
  }, [method, gcps, affineParams]);

  const polyFit = useMemo(() => fitPolynomial(gcps, polynomialOrder), [gcps, polynomialOrder]);

  const projectiveFit = useMemo(() => {
    if (method !== "projective") return null;
    return fitProjective(PROJECTIVE_CORNERS, projectiveDst);
  }, [method, projectiveDst]);

  const transformPoint = useCallback(
    (p: Point): Point => {
      if (!applied && method !== "overview") {
        // live preview always on for demo
      }
      switch (method) {
        case "affine":
          return applyAffine(p, effectiveAffine);
        case "polynomial":
          if (polyFit) return applyPolynomial(p, polyFit.coeffX, polyFit.coeffY, polynomialOrder);
          return p;
        case "tps":
          return applyTps(p, gcps);
        case "projective":
          if (projectiveFit) return applyProjective(p, projectiveFit);
          return p;
        default:
          return p;
      }
    },
    [method, effectiveAffine, polyFit, polynomialOrder, gcps, projectiveFit, applied],
  );

  const warpedMesh = useMemo(() => FMB_MESH.map(transformPoint), [transformPoint]);
  const warpedParcels = useMemo(
    () => FMB_PARCELS.map((ring) => ring.map(transformPoint)),
    [transformPoint],
  );

  const clientToSvg = useCallback((clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return clampPoint([svgPt.x, svgPt.y]);
  }, []);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (method === "overview" || method === "projective") return;
    if (!onAddGcp || !addMode) return;
    const pos = clientToSvg(e.clientX, e.clientY);
    if (!pos) return;

    if (addMode === "source") {
      setPendingSource(pos);
      setAddMode("target");
    } else if (addMode === "target" && pendingSource) {
      onAddGcp(pendingSource, pos);
      setPendingSource(null);
      setAddMode(null);
    }
  };

  const handlePointerDown = (kind: DragKind) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setDragging(kind);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const pos = clientToSvg(e.clientX, e.clientY);
    if (!pos) return;

    if (dragging.type === "gcp-target") {
      onGcpsChange(gcps.map((g) => (g.id === dragging.id ? { ...g, target: pos } : g)));
    } else if (dragging.type === "gcp-source") {
      onGcpsChange(gcps.map((g) => (g.id === dragging.id ? { ...g, source: pos } : g)));
    } else if (dragging.type === "projective-corner") {
      const next = [...projectiveDst] as Point[];
      next[dragging.index] = pos;
      onProjectiveDstChange(next);
    } else if (
      dragging.type === "affine-translate" ||
      dragging.type === "affine-rotate" ||
      dragging.type === "affine-scale" ||
      dragging.type === "affine-skew"
    ) {
      const cx = 50;
      const cy = 50;
      const p = { ...affineParams };
      if (dragging.type === "affine-translate") {
        p.tx = pos[0] - cx;
        p.ty = pos[1] - cy;
      } else if (dragging.type === "affine-rotate") {
        const angle = Math.atan2(pos[1] - cy, pos[0] - cx);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const scale = Math.hypot(affineParams.a, affineParams.c) || 1;
        p.a = cos * scale;
        p.c = sin * scale;
        p.b = -sin * scale * 0.8;
        p.d = cos * scale * 0.8;
      } else if (dragging.type === "affine-scale") {
        const dist = Math.hypot(pos[0] - cx, pos[1] - cy) / 25;
        p.a = dist;
        p.d = dist;
      } else if (dragging.type === "affine-skew") {
        p.b = (pos[0] - cx) * 0.02;
        p.c = (pos[1] - cy) * 0.02;
      }
      onAffineChange(p);
    }
  };

  const handlePointerUp = () => setDragging(null);

  const showBefore = viewMode === "before" || viewMode === "split";
  const showAfter = viewMode === "after" || viewMode === "overlay" || viewMode === "split";
  const fmbOpacity = viewMode === "overlay" ? overlayOpacity : viewMode === "before" ? 1 : 0.92;

  const affineHandles = useMemo(() => {
    const { tx, ty, a, b, c, d } = effectiveAffine;
    const cx = 50;
    const cy = 50;
    return {
      translate: [cx + tx, cy + ty] as Point,
      rotate: [cx + 22 * a, cy + 22 * c] as Point,
      scale: [cx + 28 * (a + b), cy + 28 * (c + d)] as Point,
      skew: [cx + b * 40, cy + d * 40] as Point,
    };
  }, [effectiveAffine]);

  const renderInteractive = (clipId?: string) => (
    <g clipPath={clipId ? `url(#${clipId})` : undefined}>
      <DroneUnderlay />

      {showBefore && method !== "projective" && (
        <FmbSketch mesh={FMB_MESH} parcels={FMB_PARCELS} opacity={viewMode === "split" ? 0.35 : 0.4} />
      )}

      {showAfter && method !== "overview" && (
        <FmbSketch mesh={warpedMesh} parcels={warpedParcels} opacity={fmbOpacity} />
      )}

      {method === "projective" && (
        <>
          <FmbSketch mesh={FMB_MESH} parcels={FMB_PARCELS} opacity={0.35} />
          {projectiveFit && (
            <FmbSketch mesh={warpedMesh} parcels={warpedParcels} opacity={fmbOpacity} />
          )}
          {PROJECTIVE_CORNERS.map((src, i) => (
            <g key={`proj-${i}`}>
              <line
                x1={src[0]}
                y1={src[1]}
                x2={projectiveDst[i]![0]}
                y2={projectiveDst[i]![1]}
                stroke="#38bdf8"
                strokeWidth="0.35"
                strokeDasharray="0.8 0.4"
              />
              <circle cx={src[0]} cy={src[1]} r="1.5" fill="#dc2626" stroke="#fff" strokeWidth="0.25" />
              <circle
                cx={projectiveDst[i]![0]}
                cy={projectiveDst[i]![1]}
                r="2.2"
                fill="#8b5cf6"
                stroke="#fff"
                strokeWidth="0.35"
                className="cursor-grab"
                onPointerDown={handlePointerDown({ type: "projective-corner", index: i })}
              />
              <text
                x={projectiveDst[i]![0]}
                y={projectiveDst[i]![1] - 3}
                fontSize="2.5"
                textAnchor="middle"
                fill="#fff"
              >
                {i + 1}
              </text>
            </g>
          ))}
        </>
      )}

      {method !== "projective" &&
        gcps.map((gcp) => (
          <g key={gcp.id}>
            <line
              x1={gcp.source[0]}
              y1={gcp.source[1]}
              x2={gcp.target[0]}
              y2={gcp.target[1]}
              stroke="#38bdf8"
              strokeWidth="0.35"
              strokeDasharray="0.8 0.4"
            />
            <circle
              cx={gcp.source[0]}
              cy={gcp.source[1]}
              r="1.8"
              fill="#dc2626"
              stroke="#fff"
              strokeWidth="0.3"
              className={method !== "overview" ? "cursor-grab" : undefined}
              onPointerDown={
                method !== "overview" ? handlePointerDown({ type: "gcp-source", id: gcp.id }) : undefined
              }
            />
            <circle
              cx={gcp.target[0]}
              cy={gcp.target[1]}
              r="2.2"
              fill="#16a34a"
              stroke="#fff"
              strokeWidth="0.35"
              className={method !== "overview" ? "cursor-grab" : undefined}
              onPointerDown={
                method !== "overview" ? handlePointerDown({ type: "gcp-target", id: gcp.id }) : undefined
              }
            />
          </g>
        ))}

      {method === "affine" && (
        <g>
          {(
            [
              ["translate", "#f59e0b", "T"],
              ["rotate", "#3b82f6", "R"],
              ["scale", "#10b981", "S"],
              ["skew", "#ec4899", "K"],
            ] as const
          ).map(([key, color, label]) => {
            const pos = affineHandles[key];
            const dragType = `affine-${key}` as DragKind["type"];
            return (
              <g key={key}>
                <line x1={50} y1={50} x2={pos[0]} y2={pos[1]} stroke={color} strokeWidth="0.3" opacity="0.6" />
                <circle
                  cx={pos[0]}
                  cy={pos[1]}
                  r="2.5"
                  fill={color}
                  stroke="#fff"
                  strokeWidth="0.35"
                  className="cursor-grab"
                  onPointerDown={handlePointerDown({ type: dragType } as DragKind)}
                />
                <text x={pos[0]} y={pos[1] - 3.5} fontSize="2.5" textAnchor="middle" fill="#fff">
                  {label}
                </text>
              </g>
            );
          })}
          <circle cx={50} cy={50} r="1.2" fill="#fff" opacity="0.8" />
        </g>
      )}

      {pendingSource && (
        <circle cx={pendingSource[0]} cy={pendingSource[1]} r="2" fill="none" stroke="#fbbf24" strokeWidth="0.5" />
      )}
    </g>
  );

  return (
    <div className="relative h-full min-h-[360px] w-full">
      <div className="absolute left-3 top-3 z-10 flex gap-1.5">
        {method !== "overview" && method !== "projective" && onAddGcp && (
          <button
            type="button"
            onClick={() => {
              setAddMode(addMode ? null : "source");
              setPendingSource(null);
            }}
            className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${
              addMode ? "bg-amber-500 text-white" : "bg-black/50 text-white hover:bg-black/70"
            }`}
          >
            {addMode ? (addMode === "source" ? "Click source…" : "Click target…") : "+ Add GCP"}
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="h-full w-full touch-none select-none rounded-xl"
        onClick={handleCanvasClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <pattern id="tx-drone-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#1a3d2e" />
            <rect width="2" height="2" fill="#234d38" />
          </pattern>
          <pattern id="tx-fmb-paper" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#faf8f3" />
            <path d="M0 6 L6 0" stroke="#e8e0d0" strokeWidth="0.15" />
          </pattern>
          {viewMode === "split" && (
            <>
              <clipPath id="tx-split-left">
                <rect x="0" y="0" width="50" height="100" />
              </clipPath>
              <clipPath id="tx-split-right">
                <rect x="50" y="0" width="50" height="100" />
              </clipPath>
            </>
          )}
        </defs>

        {viewMode === "split" ? (
          <>
            <g>{renderInteractive()}</g>
            <line x1="50" y1="0" x2="50" y2="100" stroke="#fff" strokeWidth="0.5" opacity="0.8" />
            <text x="25" y="96" fill="#fff" fontSize="2.5" textAnchor="middle" opacity="0.7">
              Before
            </text>
            <text x="75" y="96" fill="#fff" fontSize="2.5" textAnchor="middle" opacity="0.7">
              After
            </text>
          </>
        ) : (
          renderInteractive()
        )}
      </svg>

      <div className="absolute bottom-3 right-3 flex gap-2 text-[9px] text-white/80">
        <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Source
        </span>
        <span className="flex items-center gap-1 rounded bg-black/40 px-1.5 py-0.5">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Target
        </span>
      </div>
    </div>
  );
}

export type { ViewMode };
