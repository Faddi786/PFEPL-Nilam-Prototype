import { useCallback, useMemo, useRef, useState } from "react";
import {
  computeRmsError,
  FMB_INNER_PARCELS,
  FMB_MESH_VERTICES,
  type GcpAnchor,
  type TransformMode,
} from "../../data/warpMock";

type WarpCanvasProps = {
  gcps: GcpAnchor[];
  onGcpsChange: (gcps: GcpAnchor[]) => void;
  mode: TransformMode;
  warped: boolean;
};

function idwWarp(
  point: [number, number],
  gcps: GcpAnchor[],
  mode: TransformMode,
): [number, number] {
  const [x, y] = point;
  if (mode === "translation") {
    const avgDx = gcps.reduce((s, g) => s + (g.drone[0] - g.fmb[0]), 0) / gcps.length;
    const avgDy = gcps.reduce((s, g) => s + (g.drone[1] - g.fmb[1]), 0) / gcps.length;
    return [x + avgDx * 0.85, y + avgDy * 0.85];
  }
  if (mode === "rotation") {
    const cx = gcps.reduce((s, g) => s + g.fmb[0], 0) / gcps.length;
    const cy = gcps.reduce((s, g) => s + g.fmb[1], 0) / gcps.length;
    const angle = -0.035;
    const dx = x - cx;
    const dy = y - cy;
    const avgDx = gcps.reduce((s, g) => s + (g.drone[0] - g.fmb[0]), 0) / gcps.length;
    const avgDy = gcps.reduce((s, g) => s + (g.drone[1] - g.fmb[1]), 0) / gcps.length;
    return [
      cx + dx * Math.cos(angle) - dy * Math.sin(angle) + avgDx * 0.5,
      cy + dx * Math.sin(angle) + dy * Math.cos(angle) + avgDy * 0.5,
    ];
  }
  if (mode === "scale") {
    const cx = 50;
    const cy = 50;
    const scale = 1.04;
    const avgDx = gcps.reduce((s, g) => s + (g.drone[0] - g.fmb[0]), 0) / gcps.length;
    const avgDy = gcps.reduce((s, g) => s + (g.drone[1] - g.fmb[1]), 0) / gcps.length;
    return [cx + (x - cx) * scale + avgDx * 0.4, cy + (y - cy) * scale + avgDy * 0.4];
  }

  let sumW = 0;
  let offX = 0;
  let offY = 0;
  for (const gcp of gcps) {
    const dist = Math.hypot(x - gcp.fmb[0], y - gcp.fmb[1]);
    const w = 1 / Math.max(dist * dist, 2);
    offX += (gcp.drone[0] - gcp.fmb[0]) * w;
    offY += (gcp.drone[1] - gcp.fmb[1]) * w;
    sumW += w;
  }
  return [x + offX / sumW, y + offY / sumW];
}

function toPoints(vertices: [number, number][]) {
  return vertices.map(([x, y]) => `${x},${y}`).join(" ");
}

function GcpIcon({ icon }: { icon: GcpAnchor["icon"] }) {
  if (icon === "temple") return <text fontSize="3.5" textAnchor="middle">⛩</text>;
  if (icon === "canal") return <text fontSize="3.5" textAnchor="middle">〰</text>;
  return <text fontSize="3.5" textAnchor="middle">⊕</text>;
}

export default function WarpCanvas({ gcps, onGcpsChange, mode, warped }: WarpCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const mesh = useMemo(() => {
    if (!warped) return FMB_MESH_VERTICES;
    return FMB_MESH_VERTICES.map((v) => idwWarp(v, gcps, mode));
  }, [gcps, mode, warped]);

  const innerParcels = useMemo(() => {
    if (!warped) return FMB_INNER_PARCELS;
    return FMB_INNER_PARCELS.map((ring) => ring.map((v) => idwWarp(v, gcps, mode)));
  }, [gcps, mode, warped]);

  const rms = useMemo(() => computeRmsError(gcps, warped ? mode : "translation"), [gcps, mode, warped]);

  const clientToSvg = useCallback((clientX: number, clientY: number): [number, number] | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPt = pt.matrixTransform(ctm.inverse());
    return [Math.max(2, Math.min(98, svgPt.x)), Math.max(2, Math.min(98, svgPt.y))];
  }, []);

  const handlePointerDown = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    setDraggingId(id);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId) return;
    const pos = clientToSvg(e.clientX, e.clientY);
    if (!pos) return;
    onGcpsChange(gcps.map((g) => (g.id === draggingId ? { ...g, drone: pos } : g)));
  };

  const handlePointerUp = () => setDraggingId(null);

  return (
    <div className="relative h-full min-h-[320px] w-full">
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="h-full w-full touch-none select-none rounded-xl"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <pattern id="drone-grid" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="4" fill="#1a3d2e" />
            <rect width="2" height="2" fill="#234d38" />
          </pattern>
          <pattern id="fmb-paper" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#faf8f3" />
            <path d="M0 6 L6 0" stroke="#e8e0d0" strokeWidth="0.15" />
          </pattern>
        </defs>

        <rect width="100" height="100" fill="url(#drone-grid)" rx="1" />
        <ellipse cx="35" cy="40" rx="18" ry="12" fill="#2d5a3d" opacity="0.5" />
        <ellipse cx="65" cy="55" rx="22" ry="14" fill="#3d6b4a" opacity="0.45" />
        <path d="M0 52 Q30 48 55 54 T100 50" fill="none" stroke="#4a90c2" strokeWidth="0.6" opacity="0.7" />
        <text x="50" y="6" fill="#a7f3d0" fontSize="2.8" textAnchor="middle" opacity="0.85">
          Drone Orthomosaic — Khutal DGPS 2025
        </text>

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

        <g opacity={warped ? 0.92 : 0.75}>
          <polygon points={toPoints(mesh)} fill="url(#fmb-paper)" stroke="#b45309" strokeWidth="0.7" />
          {innerParcels.map((ring, i) => (
            <polygon key={i} points={toPoints(ring)} fill="none" stroke="#78716c" strokeWidth="0.45" />
          ))}
        </g>

        {gcps.map((gcp) => (
          <g key={gcp.id}>
            <line
              x1={gcp.fmb[0]}
              y1={gcp.fmb[1]}
              x2={gcp.drone[0]}
              y2={gcp.drone[1]}
              stroke={warped ? "#38bdf8" : "#f97316"}
              strokeWidth="0.35"
              strokeDasharray="0.8 0.4"
            />
            <circle cx={gcp.fmb[0]} cy={gcp.fmb[1]} r="1.8" fill="#dc2626" stroke="#fff" strokeWidth="0.3" />
            <circle
              cx={gcp.drone[0]}
              cy={gcp.drone[1]}
              r="2.2"
              fill="#16a34a"
              stroke="#fff"
              strokeWidth="0.35"
              className="cursor-grab"
              onPointerDown={handlePointerDown(gcp.id)}
            />
            <g transform={`translate(${gcp.drone[0]}, ${gcp.drone[1] - 3.5})`}>
              <GcpIcon icon={gcp.icon} />
            </g>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-3 left-3 rounded-lg border border-white/20 bg-black/50 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-sm">
        <span className="font-semibold text-sky-300">RMS residual:</span>{" "}
        {warped ? `${rms.toFixed(2)} m` : `${(rms * 4.2).toFixed(2)} m (pre-warp)`}
      </div>
      <div className="absolute bottom-3 right-3 flex gap-2 text-[9px] text-white/80">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> FMB GCP
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" /> Drone anchor (drag)
        </span>
      </div>
    </div>
  );
}
