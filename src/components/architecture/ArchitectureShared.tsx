import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";
import type { ReactNode } from "react";

export function AnimatedCounter({
  value,
  className = "",
  duration = 0.8,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 1 }}
      transition={{ duration: duration * 0.3 }}
    >
      <motion.span>{display}</motion.span>
    </motion.span>
  );
}

export function StageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      className="mb-5 text-center"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-xs text-slate-400 sm:text-sm">{subtitle}</p>
    </motion.div>
  );
}

export function StageCanvas({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative flex min-h-[320px] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50 p-4 shadow-inner sm:min-h-[380px] sm:p-6 ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export const STAGE_VARIANTS = {
  enter: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
  center: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 1.02, filter: "blur(4px)" },
};

export const CARD_STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export const CARD_ITEM = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 22 } },
};
