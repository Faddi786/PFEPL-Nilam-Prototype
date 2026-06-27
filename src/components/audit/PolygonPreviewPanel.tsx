type Props = {
  geometry: GeoJSON.Polygon;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
  onDoubleClick?: () => void;
  onMouseEnter?: (event: React.MouseEvent) => void;
  onMouseMove?: (event: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  interactive?: boolean;
};

function polygonToPath(polygon: GeoJSON.Polygon, width: number, height: number, padding: number) {
  const ring = polygon.coordinates[0];
  if (!ring?.length) return "";

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [lon, lat] of ring) {
    minX = Math.min(minX, lon);
    minY = Math.min(minY, lat);
    maxX = Math.max(maxX, lon);
    maxY = Math.max(maxY, lat);
  }

  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = Math.min(innerW / spanX, innerH / spanY);

  const offsetX = padding + (innerW - spanX * scale) / 2;
  const offsetY = padding + (innerH - spanY * scale) / 2;

  return ring
    .map(([lon, lat], index) => {
      const x = offsetX + (lon - minX) * scale;
      const y = offsetY + (maxY - lat) * scale;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ")
    .concat(" Z");
}

const PREVIEW_WIDTH = 280;
const PREVIEW_HEIGHT = 88;

export default function PolygonPreviewPanel({
  geometry,
  label,
  className = "",
  style,
  onDoubleClick,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  interactive = false,
}: Props) {
  const path = polygonToPath(geometry, PREVIEW_WIDTH, PREVIEW_HEIGHT, 12);

  return (
    <div
      style={style}
      className={`shrink-0 border-t border-slate-100 bg-slate-50/80 ${interactive ? "cursor-default" : ""} ${className}`}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      title={onDoubleClick ? "Double-click to compare geometry revisions" : undefined}
    >
      {label ? (
        <p className="px-3 pt-2 text-[10px] font-medium text-slate-500">{label}</p>
      ) : null}
      <div className="flex items-center justify-center px-2 pb-2 pt-1">
        <svg
          viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
          className="h-[88px] w-full"
          aria-hidden
        >
          <rect x="0" y="0" width={PREVIEW_WIDTH} height={PREVIEW_HEIGHT} fill="#f8fafc" rx="6" />
          {path ? (
            <path
              d={path}
              fill="rgba(59,130,246,0.18)"
              stroke="#2563eb"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>
      </div>
    </div>
  );
}
