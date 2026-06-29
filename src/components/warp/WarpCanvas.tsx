import { useCallback, useMemo, useRef, useState } from "react";
import CanvasZoomControls from "../ui/CanvasZoomControls";
import {
  SVG_WHEEL_DELTA_THRESHOLD_FINE,
  SVG_ZOOM_STEP_FINE,
  useSvgCanvasZoom,
} from "../../hooks/useSvgCanvasZoom";
import {
  applySliderTransform,
  computeRmsError,
  esriWorldImageryTileUrl,
  FMB_INNER_PARCELS,
  FMB_MESH_VERTICES,
  GDAL_PANEL_DEFAULTS,
  gcpCentroid,
  lngLatToTile,
  WARP_SATELLITE,
  type GcpAnchor,
  type TransformMode,
} from "../../data/warpMock";

type WarpCanvasProps = {
  gcps: GcpAnchor[];
  onGcpsChange: (gcps: GcpAnchor[]) => void;
  mode: TransformMode;
  warped: boolean;
  /** When set, use FMB-extracted mesh instead of default demo polygon. */
  meshVertices?: [number, number][];
  innerParcels?: [number, number][][];
  stretch?: number;
  rotateDeg?: number;
  offsetX?: number;
  offsetY?: number;
  /** Live preview even before gdalwarp completes. */
  livePreview?: boolean;
};

function idwWarp(
  point: [number, number],
  gcps: GcpAnchor[],
  mode: TransformMode,
  strength = 1,
): [number, number] {
  const [x, y] = point;
  if (mode === "translation") {
    const avgDx = gcps.reduce((s, g) => s + (g.drone[0] - g.fmb[0]), 0) / gcps.length;
    const avgDy = gcps.reduce((s, g) => s + (g.drone[1] - g.fmb[1]), 0) / gcps.length;
    return [x + avgDx * 0.85 * strength, y + avgDy * 0.85 * strength];
  }
  if (mode === "rotation") {
    const cx = gcps.reduce((s, g) => s + g.fmb[0], 0) / gcps.length;
    const cy = gcps.reduce((s, g) => s + g.fmb[1], 0) / gcps.length;
    const angle = -0.035 * strength;
    const dx = x - cx;
    const dy = y - cy;
    const avgDx = gcps.reduce((s, g) => s + (g.drone[0] - g.fmb[0]), 0) / gcps.length;
    const avgDy = gcps.reduce((s, g) => s + (g.drone[1] - g.fmb[1]), 0) / gcps.length;
    return [
      cx + dx * Math.cos(angle) - dy * Math.sin(angle) + avgDx * 0.5 * strength,
      cy + dx * Math.sin(angle) + dy * Math.cos(angle) + avgDy * 0.5 * strength,
    ];
  }
  if (mode === "scale") {
    const cx = 50;
    const cy = 50;
    const scale = 1 + 0.04 * strength;
    const avgDx = gcps.reduce((s, g) => s + (g.drone[0] - g.fmb[0]), 0) / gcps.length;
    const avgDy = gcps.reduce((s, g) => s + (g.drone[1] - g.fmb[1]), 0) / gcps.length;
    return [cx + (x - cx) * scale + avgDx * 0.4 * strength, cy + (y - cy) * scale + avgDy * 0.4 * strength];
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
  return [x + (offX / sumW) * strength, y + (offY / sumW) * strength];
}

function toPoints(vertices: [number, number][]) {
  return vertices.map(([x, y]) => `${x},${y}`).join(" ");
}

function GcpIcon({ icon }: { icon: GcpAnchor["icon"] }) {
  if (icon === "temple") return <text fontSize="3.5" textAnchor="middle">⛩</text>;
  if (icon === "canal") return <text fontSize="3.5" textAnchor="middle">〰</text>;
  return <text fontSize="3.5" textAnchor="middle">⊕</text>;
}

function SatelliteBasemap() {
  const { center, zoom } = WARP_SATELLITE;
  const centerTile = lngLatToTile(center[0], center[1], zoom);
  const tiles = useMemo(() => {
    const grid: { x: number; y: number; px: number; py: number }[] = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        grid.push({
          x: centerTile.x + dx,
          y: centerTile.y + dy,
          px: (dx + 1) * 33.33,
          py: (dy + 1) * 33.33,
        });
      }
    }
    return grid;
  }, [centerTile.x, centerTile.y]);

  return (
    <g>
      {tiles.map((tile) => (
        <image
          key={`${tile.x}-${tile.y}`}
          href={esriWorldImageryTileUrl(zoom, tile.x, tile.y)}
          x={tile.px}
          y={tile.py}
          width={33.34}
          height={33.34}
          preserveAspectRatio="none"
          crossOrigin="anonymous"
        />
      ))}
      <rect data-pan-background="true" width="100" height="100" fill="rgba(0,0,0,0.08)" />
    </g>
  );
}

export default function WarpCanvas({
  gcps,
  onGcpsChange,
  mode,
  warped,
  meshVertices: meshOverride,
  innerParcels: innerOverride,
  stretch = GDAL_PANEL_DEFAULTS.stretch,
  rotateDeg = GDAL_PANEL_DEFAULTS.rotateDeg,
  offsetX = GDAL_PANEL_DEFAULTS.offsetX,
  offsetY = GDAL_PANEL_DEFAULTS.offsetY,
  livePreview = false,
}: WarpCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const baseMesh = meshOverride ?? FMB_MESH_VERTICES;
  const baseInner = innerOverride ?? FMB_INNER_PARCELS;
  const centroid = useMemo(() => gcpCentroid(gcps), [gcps]);
  const warpStrength = warped ? 1 : livePreview ? 0.72 : 0;

  const transformPoint = useCallback(
    (point: [number, number]): [number, number] => {
      let p: [number, number] =
        warpStrength > 0 ? idwWarp(point, gcps, mode, warpStrength) : [...point];
      p = applySliderTransform(p, stretch, rotateDeg, offsetX, offsetY, centroid);
      return p;
    },
    [gcps, mode, warpStrength, stretch, rotateDeg, offsetX, offsetY, centroid],
  );

  const mesh = useMemo(
    () => baseMesh.map((v) => transformPoint(v)),
    [baseMesh, transformPoint],
  );

  const innerParcels = useMemo(
    () => baseInner.map((ring) => ring.map((v) => transformPoint(v))),
    [baseInner, transformPoint],
  );

  const rms = useMemo(
    () => computeRmsError(gcps, warped || livePreview ? mode : "translation"),
    [gcps, mode, warped, livePreview],
  );

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
    e.stopPropagation();
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
  } = useSvgCanvasZoom(100, 100, {
    defaultZoom: 0.65,
    zoomStep: SVG_ZOOM_STEP_FINE,
    wheelDeltaThreshold: SVG_WHEEL_DELTA_THRESHOLD_FINE,
  });

  const canvasCursor =
    draggingId || isPanning ? "cursor-grabbing" : spacePanActive ? "cursor-grab" : "cursor-grab";

  return (
    <div
      ref={wheelTargetRef}
      className="relative flex h-full max-h-full min-h-0 w-full items-center justify-center overflow-hidden"
      onMouseDown={onPanMouseDown}
      onMouseMove={onPanMouseMove}
      onMouseUp={onPanMouseUp}
      onMouseLeave={onPanMouseUp}
    >
      <CanvasZoomControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onReset={resetZoom}
        zoom={zoom}
        variant="dark"
      />
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className={`h-full max-h-full w-full max-w-full touch-none select-none rounded-xl ${canvasCursor}`}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <rect data-pan-background="true" width="100" height="100" fill="transparent" />
        <SatelliteBasemap />

        <text
          x="50"
          y="5.5"
          fill="#ffffff"
          fontSize="2.6"
          textAnchor="middle"
          opacity="0.92"
          pointerEvents="none"
        >
          Drone Orthomosaic — Thirunallar DGPS 2025
        </text>

        <g opacity={warped ? 0.94 : livePreview ? 0.88 : 0.82} pointerEvents="none">
          <polygon
            points={toPoints(mesh)}
            fill="rgba(255,248,235,0.22)"
            stroke="#fbbf24"
            strokeWidth="0.55"
          />
          {innerParcels.map((ring, i) => (
            <polygon
              key={i}
              points={toPoints(ring)}
              fill="rgba(251,191,36,0.08)"
              stroke="#fde68a"
              strokeWidth="0.4"
            />
          ))}
        </g>

        {gcps.map((gcp) => (
          <g key={gcp.id} pointerEvents="none">
            <line
              x1={transformPoint(gcp.fmb)[0]}
              y1={transformPoint(gcp.fmb)[1]}
              x2={gcp.drone[0]}
              y2={gcp.drone[1]}
              stroke={warped || livePreview ? "#38bdf8" : "#f97316"}
              strokeWidth="0.35"
              strokeDasharray="0.8 0.4"
            />
            <circle
              cx={transformPoint(gcp.fmb)[0]}
              cy={transformPoint(gcp.fmb)[1]}
              r="1.8"
              fill="#dc2626"
              stroke="#fff"
              strokeWidth="0.3"
            />
            <circle
              cx={gcp.drone[0]}
              cy={gcp.drone[1]}
              r="2.2"
              fill="#16a34a"
              stroke="#fff"
              strokeWidth="0.35"
              className="cursor-grab"
              pointerEvents="all"
              data-canvas-interactive
              onPointerDown={handlePointerDown(gcp.id)}
            />
            <g transform={`translate(${gcp.drone[0]}, ${gcp.drone[1] - 3.5})`} pointerEvents="none">
              <GcpIcon icon={gcp.icon} />
            </g>
          </g>
        ))}
      </svg>

      <div className="absolute bottom-3 left-3 rounded-lg border border-white/20 bg-black/50 px-2.5 py-1.5 text-[10px] text-white backdrop-blur-sm">
        <span className="font-semibold text-sky-300">RMS residual:</span>{" "}
        {warped || livePreview ? `${rms.toFixed(2)} m` : `${(rms * 4.2).toFixed(2)} m (pre-warp)`}
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
