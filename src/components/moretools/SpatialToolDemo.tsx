import MoreToolsMap, { type MapOverlay } from "./MoreToolsMap";

type SpatialToolDemoProps = {
  overlays: MapOverlay[];
  summary?: string | null;
};

export default function SpatialToolDemo({ overlays, summary }: SpatialToolDemoProps) {
  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <MoreToolsMap overlays={overlays} className="h-full min-h-[420px] w-full" />
      {summary ? (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 sm:right-auto">
          <p className="inline-block max-w-full rounded-lg border border-white/70 bg-white/90 px-3 py-2 text-sm font-medium text-slate-800 shadow-sm backdrop-blur-sm">
            {summary}
          </p>
        </div>
      ) : null}
    </div>
  );
}
