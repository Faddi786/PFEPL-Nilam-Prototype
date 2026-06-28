import { motion } from "framer-motion";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { PRODUCTION_LAYERS } from "../../data/architectureMock";
import { StageCanvas, StageHeader } from "./ArchitectureShared";

function FlowNode({
  label,
  icon: Icon,
  color,
  delay,
}: {
  label: string;
  icon: typeof import("lucide-react").Cloud;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex flex-col items-center"
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl ring-1 ring-white/10 sm:h-12 sm:w-12"
        style={{ backgroundColor: `${color}22`, borderColor: `${color}44` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <p className="mt-1.5 max-w-[72px] text-center text-[9px] font-medium leading-tight text-slate-300">{label}</p>
    </motion.div>
  );
}

export default function ArchitectureDiagram() {
  const colors = ["#22d3ee", "#38bdf8", "#a78bfa", "#336791", "#34d399"];

  return (
    <div className="flex h-full flex-col">
      <StageHeader
        eyebrow="Stage 5"
        title="Production-Grade Architecture"
        subtitle="Multi-AZ deployment with load balancing, ingress routing, HA PostGIS, and full observability via Monitor-Eye."
      />
      <StageCanvas>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
            {PRODUCTION_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <div key={layer.id} className="flex items-center">
                  <FlowNode label={layer.label} icon={Icon} color={colors[i] ?? "#94a3b8"} delay={i * 0.12} />
                  {i < PRODUCTION_LAYERS.length - 1 ? (
                    <ArrowRight className="mx-0.5 h-3 w-3 text-slate-600 sm:mx-1 sm:h-4 sm:w-4" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="mx-auto max-w-lg rounded-xl border border-slate-700 bg-slate-900/80 p-3 font-mono text-[9px] leading-relaxed text-emerald-400 sm:text-[10px]"
          >
            <pre className="overflow-x-auto whitespace-pre">{`
    ┌─────────────┐     ┌──────────────┐     ┌────────────────┐
    │   Grafana   │────▶│  Prometheus  │────▶│  Alertmanager  │
    └──────┬──────┘     └──────┬───────┘     └────────────────┘
           │    Monitor-Eye    │    scrape
           ▼                   ▼
    ┌──────────────────────────────────────────────────────────┐
    │  AZ-1          │  AZ-2          │  AZ-3 (DR)            │
    │  geo-api pods  │  geoserver     │  postgres-replica     │
    │  tile-cache    │  gdal-workers  │  MinIO erasure        │
    └──────────────────────────────────────────────────────────┘
                    Puducherry DoSLR · GeoNilam Platform
`}</pre>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-2">
            {["Multi-AZ", "TLS Ingress", "Pod Disruption Budget", "Velero Backup"].map((tag, i) => (
              <motion.span
                key={tag}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.06 }}
                className="rounded-full border border-slate-600 bg-slate-800/60 px-2.5 py-1 text-[9px] font-medium text-slate-400"
              >
                {tag}
              </motion.span>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex justify-center"
          >
            <Link
              to="/monitor"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            >
              Open Monitor-Eye Dashboard
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        </div>
      </StageCanvas>
    </div>
  );
}
