import { motion } from "framer-motion";
import { AlertTriangle, Server, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { LOAD_TIERS } from "../../data/architectureMock";
import { AnimatedCounter, StageCanvas, StageHeader } from "./ArchitectureShared";

export default function LoadStage() {
  const [tierIndex, setTierIndex] = useState(0);
  const tier = LOAD_TIERS[tierIndex] ?? LOAD_TIERS[0];

  useEffect(() => {
    const id = window.setInterval(() => {
      setTierIndex((i) => (i + 1) % LOAD_TIERS.length);
    }, 900);
    return () => window.clearInterval(id);
  }, []);

  const isWarning = tier.status === "warning";
  const isCritical = tier.status === "critical";

  return (
    <div className="flex h-full flex-col">
      <StageHeader
        eyebrow="Stage 3"
        title="Traffic Surge — Single Server Bottleneck"
        subtitle="As citizens, surveyors, and integrations connect, one Docker host hits CPU, memory, and connection limits."
      />
      <StageCanvas>
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:justify-center lg:gap-10">
          <motion.div
            animate={
              isCritical
                ? { boxShadow: ["0 0 0 0 rgba(239,68,68,0.4)", "0 0 0 12px rgba(239,68,68,0)", "0 0 0 0 rgba(239,68,68,0.4)"] }
                : isWarning
                  ? { boxShadow: ["0 0 0 0 rgba(245,158,11,0.3)", "0 0 0 8px rgba(245,158,11,0)", "0 0 0 0 rgba(245,158,11,0.3)"] }
                  : {}
            }
            transition={{ repeat: Infinity, duration: 1.2 }}
            className={`relative w-full max-w-[220px] rounded-2xl border-2 p-5 transition-colors duration-500 ${
              isCritical
                ? "border-rose-500 bg-rose-500/10"
                : isWarning
                  ? "border-amber-500 bg-amber-500/10"
                  : "border-slate-600 bg-slate-800/80"
            }`}
          >
            <Server
              className={`mx-auto h-12 w-12 ${
                isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-slate-400"
              }`}
            />
            <p className="mt-3 text-center text-xs font-semibold text-white">Single Docker Host</p>
            {(isWarning || isCritical) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -right-2 -top-2 flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/20 px-2 py-0.5"
              >
                <AlertTriangle className="h-3 w-3 text-rose-400" />
                <span className="text-[9px] font-bold uppercase text-rose-300">
                  {isCritical ? "Overloaded" : "Stressed"}
                </span>
              </motion.div>
            )}
            <div className="mt-3 space-y-1.5">
              {["CPU", "Memory", "Connections"].map((metric, i) => {
                const pct = isCritical ? 98 - i * 5 : isWarning ? 78 - i * 8 : 35 + i * 10;
                return (
                  <div key={metric}>
                    <div className="flex justify-between text-[9px] text-slate-500">
                      <span>{metric}</span>
                      <span className={isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                      <motion.div
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6 }}
                        className={`h-full rounded-full ${
                          isCritical ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <div className="text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Concurrent users</span>
            </div>
            <p className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
              <AnimatedCounter value={tier.users} />
            </p>
            <motion.p
              key={tier.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm font-medium text-cyan-400"
            >
              {tier.label}
            </motion.p>
            <div className="mt-4 flex justify-center gap-1.5">
              {LOAD_TIERS.map((t, i) => (
                <div
                  key={t.users}
                  className={`h-1.5 rounded-full transition-all ${
                    i === tierIndex ? "w-6 bg-cyan-400" : "w-1.5 bg-slate-600"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </StageCanvas>
    </div>
  );
}
