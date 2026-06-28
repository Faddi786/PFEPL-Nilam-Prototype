import { SlidersHorizontal } from "lucide-react";
import { GDAL_PANEL_DEFAULTS } from "../../data/warpMock";

type WarpProcessingPanelProps = {
  stretch: number;
  rotateDeg: number;
  offsetX: number;
  offsetY: number;
  onStretchChange: (v: number) => void;
  onRotateChange: (v: number) => void;
  onOffsetXChange: (v: number) => void;
  onOffsetYChange: (v: number) => void;
  processing: boolean;
};

export default function WarpProcessingPanel({
  stretch,
  rotateDeg,
  offsetX,
  offsetY,
  onStretchChange,
  onRotateChange,
  onOffsetXChange,
  onOffsetYChange,
  processing,
}: WarpProcessingPanelProps) {
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
        <SlidersHorizontal className="h-4 w-4 text-slate-500" />
        <span className="font-semibold text-slate-800">GDAL warp options</span>
        {processing ? (
          <span className="ml-auto animate-pulse text-xs text-sky-600">gdalwarp running…</span>
        ) : null}
      </div>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600">Stretch (histogram)</span>
        <input
          type="range"
          min="0.8"
          max="1.4"
          step="0.02"
          value={stretch}
          onChange={(e) => onStretchChange(Number(e.target.value))}
          className="w-full accent-sky-600"
        />
        <span className="text-[10px] text-slate-400">{stretch.toFixed(2)}×</span>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600">Compress</span>
        <select className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs" defaultValue={GDAL_PANEL_DEFAULTS.compress}>
          <option value="LZW">LZW</option>
          <option value="DEFLATE">DEFLATE</option>
          <option value="JPEG">JPEG (ortho)</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs font-medium text-slate-600">Rotate (°)</span>
        <input
          type="range"
          min="-8"
          max="8"
          step="0.2"
          value={rotateDeg}
          onChange={(e) => onRotateChange(Number(e.target.value))}
          className="w-full accent-sky-600"
        />
        <span className="text-[10px] text-slate-400">{rotateDeg.toFixed(1)}°</span>
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Offset X (m)</span>
          <input
            type="number"
            value={offsetX}
            step="0.1"
            onChange={(e) => onOffsetXChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-slate-600">Offset Y (m)</span>
          <input
            type="number"
            value={offsetY}
            step="0.1"
            onChange={(e) => onOffsetYChange(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
        </label>
      </div>

      <pre className="overflow-x-auto rounded-lg bg-slate-900 p-2 text-[9px] leading-relaxed text-emerald-300">
        {`gdalwarp -t_srs EPSG:32644 \\
  -r cubic -co COMPRESS=${GDAL_PANEL_DEFAULTS.compress} \\
  -tr 0.03 0.03 -et 0.0 \\
  fmb_142_scan.tif ortho_ref.tif \\
  fmb_georef.tif`}
      </pre>
    </div>
  );
}
