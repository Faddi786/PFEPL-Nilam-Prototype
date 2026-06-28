import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { Cloud, Play, Zap } from "lucide-react";
import { K8S_SERVICES, POD_SCALE_TIERS } from "../../data/architectureMock";
import { AnimatedCounter, StageCanvas, StageHeader } from "./ArchitectureShared";

const TIER_STEP_MS = 1800;

function distributePods(totalPods: number): number[] {
  if (totalPods <= 0) return K8S_SERVICES.map(() => 0);
  if (totalPods === 1) return K8S_SERVICES.map((_, i) => (i === 0 ? 1 : 0));

  const baseSum = K8S_SERVICES.reduce((acc, s) => acc + s.basePods, 0);
  const exact = K8S_SERVICES.map((s) => (totalPods * s.basePods) / baseSum);
  const counts = exact.map(Math.floor);
  let remaining = totalPods - counts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let j = 0; j < remaining; j++) {
    counts[order[j % order.length].i]++;
  }
  return counts;
}

function visualDotCount(pods: number): number {
  if (pods <= 0) return 0;
  if (pods === 1) return 1;
  if (pods <= 12) return pods;
  if (pods <= 100) return Math.min(pods, 30);
  return 42;
}

function PodGrid({ count, color }: { count: number; color: string }) {
  const visible = visualDotCount(count);
  if (visible === 0) {
    return <p className="text-[9px] italic text-slate-600">scaled to 0</p>;
  }

  return (
    <div className="flex flex-wrap gap-[3px]">
      {Array.from({ length: visible }).map((_, i) => (
        <motion.div
          key={`${count}-${i}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: Math.min(i * 0.012, 0.35), type: "spring", stiffness: 420, damping: 24 }}
          className="h-[7px] w-[7px] shrink-0 rounded-[2px]"
          style={{ backgroundColor: color, opacity: 0.65 + (i % 4) * 0.08 }}
        />
      ))}
      {count > visible && (
        <span className="self-center pl-1 text-[8px] tabular-nums text-slate-500">+{count - visible}</span>
      )}
    </div>
  );
}

export default function K8sScaleStage() {
  const [tierIndex, setTierIndex] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const timersRef = useRef<number[]>([]);
  const tier = POD_SCALE_TIERS[tierIndex] ?? POD_SCALE_TIERS[0];
  const podCounts = distributePods(tier.pods);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const runSimulation = useCallback(() => {
    clearTimers();
    setIsSimulating(true);
    setTierIndex(0);

    POD_SCALE_TIERS.forEach((_, i) => {
      if (i === 0) return;
      const id = window.setTimeout(() => setTierIndex(i), i * TIER_STEP_MS);
      timersRef.current.push(id);
    });

    const doneId = window.setTimeout(() => {
      setIsSimulating(false);
    }, (POD_SCALE_TIERS.length - 1) * TIER_STEP_MS + 400);
    timersRef.current.push(doneId);
  }, [clearTimers]);

  useEffect(() => {
    runSimulation();
    return clearTimers;
  }, [runSimulation, clearTimers]);

  return (
    <div className="flex h-full flex-col">
      <StageHeader
        eyebrow="Stage 4"
        title="Kubernetes — Instant Auto-Scale"
        subtitle="Horizontal Pod Autoscaler spins up replicas in milliseconds — from 1 pod to 1,000+ under citizen portal surges."
      />
      <StageCanvas>
        <div className="flex flex-col gap-4 lg:flex-row">
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex shrink-0 flex-col items-center lg:w-36"
          >
            <Cloud className="h-10 w-10 text-sky-400" />
            <p className="mt-2 text-xs font-semibold text-white">K8s Cluster</p>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mt-3 flex items-center gap-1.5 rounded-full border border-violet-500/40 bg-violet-500/15 px-2.5 py-1"
            >
              <Zap className="h-3 w-3 text-violet-300" />
              <span className="text-[9px] font-bold uppercase tracking-wide text-violet-300">HPA Active</span>
            </motion.div>
            <div className="mt-4 text-center">
              <p className="text-[10px] text-slate-500">Total pods</p>
              <p className="text-2xl font-bold tabular-nums text-white">
                <AnimatedCounter value={tier.pods} duration={0.55} />
              </p>
              <p className="text-[10px] text-cyan-400">
                {tier.pods === 1 ? "baseline" : `scale in ~${tier.ms}ms`}
              </p>
            </div>
          </motion.div>

          <div className="min-w-0 flex-1 space-y-2">
            {K8S_SERVICES.map((svc, si) => {
              const pods = podCounts[si] ?? 0;
              return (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: si * 0.08 }}
                  className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-2.5"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold text-white">{svc.name}</span>
                    <span className="text-[10px] tabular-nums text-slate-400">{pods} pods</span>
                  </div>
                  <PodGrid count={pods} color={svc.color} />
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <motion.div
            key={tier.label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2"
          >
            {POD_SCALE_TIERS.map((t, i) => (
              <button
                key={t.pods}
                type="button"
                disabled={isSimulating}
                onClick={() => {
                  clearTimers();
                  setIsSimulating(false);
                  setTierIndex(i);
                }}
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-medium transition ${
                  i === tierIndex
                    ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                    : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </motion.div>
          <button
            type="button"
            onClick={runSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-[9px] font-medium text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          >
            <Play className="h-3 w-3" />
            {isSimulating ? "Scaling…" : "Simulate scale"}
          </button>
        </div>
      </StageCanvas>
    </div>
  );
}
