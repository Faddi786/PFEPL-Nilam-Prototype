import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Layers,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import {
  ARCHITECTURE_STAGES,
  type ArchitectureStageId,
} from "../data/architectureMock";
import ArchitectureDiagram from "../components/architecture/ArchitectureDiagram";
import DockerStage from "../components/architecture/DockerStage";
import K8sScaleStage from "../components/architecture/K8sScaleStage";
import LoadStage from "../components/architecture/LoadStage";
import TechStackStage from "../components/architecture/TechStackStage";
import { STAGE_VARIANTS } from "../components/architecture/ArchitectureShared";

const STAGE_COMPONENTS: Record<ArchitectureStageId, () => React.ReactNode> = {
  stack: () => <TechStackStage />,
  docker: () => <DockerStage />,
  load: () => <LoadStage />,
  k8s: () => <K8sScaleStage />,
  production: () => <ArchitectureDiagram />,
};

export default function ScalableArchitecturePage() {
  const [stageIndex, setStageIndex] = useState(0);

  const currentStage = ARCHITECTURE_STAGES[stageIndex] ?? ARCHITECTURE_STAGES[0];

  const goToStage = useCallback((index: number) => {
    setStageIndex(((index % ARCHITECTURE_STAGES.length) + ARCHITECTURE_STAGES.length) % ARCHITECTURE_STAGES.length);
  }, []);

  const nextStage = useCallback(() => {
    goToStage(stageIndex + 1);
  }, [goToStage, stageIndex]);

  const replay = useCallback(() => {
    setStageIndex(0);
  }, []);

  const StageComponent = STAGE_COMPONENTS[currentStage.id];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0a0e14]">
      <header className="shrink-0 border-b border-slate-800/80 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-3 lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              to="/app"
              className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 transition hover:text-slate-300"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to map
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 ring-1 ring-cyan-500/30">
                <Layers className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white">Scale Architecture</h1>
                <p className="text-[11px] text-slate-500">GeoNilam · RFP Scalability Demo · Puducherry UT</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={nextStage}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700"
            >
              <SkipForward className="h-3.5 w-3.5" />
              Next
            </button>
            <button
              type="button"
              onClick={replay}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Replay
            </button>
          </div>
        </div>

        <div className="mx-auto mt-3 flex max-w-6xl gap-1 overflow-x-auto pb-1">
          {ARCHITECTURE_STAGES.map((stage, i) => (
            <button
              key={stage.id}
              type="button"
              onClick={() => goToStage(i)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                i === stageIndex
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                  : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
              }`}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="mx-auto flex h-full max-w-6xl flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage.id}
              variants={STAGE_VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <StageComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
