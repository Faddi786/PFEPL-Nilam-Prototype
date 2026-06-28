import { motion } from "framer-motion";
import { TECH_STACK } from "../../data/architectureMock";
import { CARD_ITEM, CARD_STAGGER, StageCanvas, StageHeader } from "./ArchitectureShared";

const CATEGORY_LABEL: Record<string, string> = {
  frontend: "Frontend",
  api: "API",
  data: "Data",
  gis: "GIS",
  infra: "Infrastructure",
  ai: "AI / ML",
};

export default function TechStackStage() {
  return (
    <div className="flex h-full flex-col">
      <StageHeader
        eyebrow="Stage 1"
        title="GeoNilam Technology Stack"
        subtitle="Modern, open-source components powering land records, spatial analytics, and citizen services across Puducherry UT."
      />
      <StageCanvas>
        <motion.div
          variants={CARD_STAGGER}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-3"
        >
          {TECH_STACK.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                variants={CARD_ITEM}
                whileHover={{ scale: 1.03, y: -2 }}
                className="group relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-800/60 p-3 backdrop-blur-sm transition hover:border-slate-600"
              >
                <div
                  className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20 blur-xl transition group-hover:opacity-30"
                  style={{ backgroundColor: item.accent }}
                />
                <div className="flex items-start gap-2.5">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-white/10"
                    style={{ backgroundColor: `${item.accent}22` }}
                  >
                    <Icon className="h-4 w-4" style={{ color: item.accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">{item.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-400">{item.subtitle}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-500">
                      {CATEGORY_LABEL[item.category]}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </StageCanvas>
    </div>
  );
}
