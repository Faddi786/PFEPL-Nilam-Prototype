import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

export function AdminCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "connected" | "synced" | "warning" | "offline" | "active" | "paused" | "success" | "error" | "published" | "review" | "pending" | "completed" }) {
  const styles: Record<string, string> = {
    connected: "bg-sky-50 text-sky-700 border-sky-200",
    synced: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    offline: "bg-slate-100 text-slate-600 border-slate-200",
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    paused: "bg-slate-100 text-slate-600 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    error: "bg-rose-50 text-rose-700 border-rose-200",
    published: "bg-emerald-50 text-emerald-700 border-emerald-200",
    review: "bg-amber-50 text-amber-700 border-amber-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  const labels: Record<string, string> = {
    connected: "Connected",
    synced: "Synced",
    warning: "Warning",
    offline: "Offline",
    active: "Active",
    paused: "Paused",
    success: "Success",
    error: "Error",
    published: "Published",
    review: "In review",
    pending: "Pending",
    completed: "Completed",
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[status] ?? styles.offline}`}>
      {labels[status] ?? status}
    </span>
  );
}

export function AdminToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2.5 transition hover:bg-slate-50">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-800">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-slate-500">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

export function AdminToast({ message, onDismiss }: { message: string | null; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-lg">
        <Check className="h-4 w-4 text-emerald-600" />
        <span className="text-sm font-medium text-slate-700">{message}</span>
        <button type="button" onClick={onDismiss} className="ml-2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function AdminButton({
  children,
  onClick,
  variant = "primary",
  size = "sm",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "xs";
  disabled?: boolean;
}) {
  const variants = {
    primary: "border-slate-800 bg-[#1A1A1A] text-white hover:bg-slate-800",
    secondary: "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
  };
  const sizes = { sm: "px-3 py-1.5 text-xs", xs: "px-2 py-1 text-[11px]" };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-medium transition disabled:opacity-50 ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

export function KpiStrip({ items }: { items: { label: string; value: string | number; tone?: "neutral" | "warning" | "danger" | "success" }[] }) {
  const tones = {
    neutral: "border-slate-200 bg-white",
    warning: "border-amber-200 bg-amber-50/50",
    danger: "border-rose-200 bg-rose-50/50",
    success: "border-emerald-200 bg-emerald-50/50",
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className={`rounded-xl border px-3 py-2.5 ${tones[item.tone ?? "neutral"]}`}>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
          <p className="mt-0.5 text-xl font-semibold text-[#1A1A1A]">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
