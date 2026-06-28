import { motion } from "framer-motion";
import { Box, Terminal } from "lucide-react";
import { TECH_STACK } from "../../data/architectureMock";
import { StageCanvas, StageHeader } from "./ArchitectureShared";

export default function DockerStage() {
  return (
    <div className="flex h-full flex-col">
      <StageHeader
        eyebrow="Stage 2"
        title="Docker Compose — One Command Deploy"
        subtitle="Every service is containerised. A single server runs the full GeoNilam stack — identical across dev, staging, and pilot environments."
      />
      <StageCanvas>
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-stretch lg:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-[200px] shrink-0"
          >
            <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Collapsing into containers
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {TECH_STACK.slice(0, 6).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ scale: 1, x: 0, y: 0 }}
                  animate={{
                    scale: [1, 0.6, 0.55],
                    x: [0, 40 + (i % 3) * 8, 60 + (i % 3) * 10],
                    y: [0, 20 + Math.floor(i / 3) * 12, 40 + Math.floor(i / 3) * 16],
                    opacity: [1, 0.8, 0],
                  }}
                  transition={{ duration: 1.2, delay: 0.3 + i * 0.08, ease: "easeInOut" }}
                  className="h-8 w-8 rounded-lg ring-1 ring-white/10"
                  style={{ backgroundColor: `${item.accent}33` }}
                />
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5, type: "spring" }}
            className="relative flex-1 rounded-2xl border-2 border-slate-600 bg-slate-800/80 p-4"
          >
            <div className="mb-3 flex items-center gap-2 border-b border-slate-700 pb-2">
              <Box className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold text-white">Single Server · Docker Host</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
              {TECH_STACK.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.05, type: "spring", stiffness: 300, damping: 20 }}
                  className="flex flex-col items-center rounded-lg border border-slate-600/80 bg-slate-900/80 px-1 py-2"
                >
                  <div
                    className="mb-1 flex h-6 w-6 items-center justify-center rounded"
                    style={{ backgroundColor: `${item.accent}22` }}
                  >
                    <Box className="h-3 w-3" style={{ color: item.accent }} />
                  </div>
                  <p className="truncate text-center text-[8px] font-medium text-slate-300">{item.name.split(" ")[0]}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="mx-auto mt-5 flex max-w-md items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5"
        >
          <Terminal className="h-4 w-4 shrink-0 text-emerald-400" />
          <code className="text-xs text-emerald-300">
            <span className="text-slate-500">$</span> docker compose up -d
          </code>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="ml-auto text-[10px] font-medium text-emerald-400"
          >
            ✓ Running
          </motion.span>
        </motion.div>
      </StageCanvas>
    </div>
  );
}
