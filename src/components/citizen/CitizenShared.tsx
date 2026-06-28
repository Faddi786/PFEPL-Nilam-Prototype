import { Check, Star, X } from "lucide-react";
import type { ReactNode } from "react";
import type { QueryStatus, ResurveyStatus, VerificationStatus } from "../../data/citizenPortalMock";

export function CitizenCard({
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
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}>
      <div className="border-b border-slate-100 px-4 py-3">
        <p className="text-sm font-semibold text-[#1A1A1A]">{title}</p>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

const VERIFICATION_STYLES: Record<VerificationStatus, { badge: string; label: string }> = {
  verified: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Verified" },
  pending: { badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Pending" },
  discrepancy: { badge: "bg-rose-50 text-rose-700 border-rose-200", label: "Discrepancy found" },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const style = VERIFICATION_STYLES[status];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
      {style.label}
    </span>
  );
}

const QUERY_STATUS_STYLES: Record<QueryStatus, { badge: string; label: string }> = {
  submitted: { badge: "bg-sky-50 text-sky-700 border-sky-200", label: "Submitted" },
  "under-review": { badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Under Review" },
  resolved: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Resolved" },
};

export function QueryStatusBadge({ status }: { status: QueryStatus }) {
  const style = QUERY_STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
      {style.label}
    </span>
  );
}

const RESURVEY_STATUS_STYLES: Record<ResurveyStatus, { badge: string; label: string }> = {
  submitted: { badge: "bg-sky-50 text-sky-700 border-sky-200", label: "Submitted" },
  scheduled: { badge: "bg-violet-50 text-violet-700 border-violet-200", label: "Scheduled" },
  "field-visit": { badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Field visit" },
  completed: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Completed" },
};

export function ResurveyStatusBadge({ status }: { status: ResurveyStatus }) {
  const style = RESURVEY_STATUS_STYLES[status];
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
      {style.label}
    </span>
  );
}

export function CitizenButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "xs" | "sm" | "md";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const sizeClass = size === "xs" ? "px-2.5 py-1 text-[11px]" : size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  const variantClass =
    variant === "primary"
      ? "bg-[#1A1A1A] text-white hover:bg-slate-800"
      : variant === "secondary"
        ? "bg-slate-100 text-slate-800 hover:bg-slate-200"
        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

export function KpiTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-200 bg-amber-50/60"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50/60"
        : "border-slate-200 bg-slate-50/60";
  return (
    <div className={`rounded-xl border px-4 py-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-[#1A1A1A]">{value}</p>
    </div>
  );
}

export function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition hover:scale-110"
          aria-label={`Rate ${n} stars`}
        >
          <Star
            className={`h-6 w-6 ${n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function CitizenToggle({
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
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${checked ? "left-5" : "left-0.5"}`}
        />
      </button>
    </label>
  );
}

export function CitizenToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
      <Check className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <button type="button" onClick={onDismiss} className="ml-2 rounded p-0.5 hover:bg-emerald-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ChecklistItem({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
        checked ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white"
        }`}
      >
        {checked ? <Check className="h-3 w-3" /> : null}
      </span>
      <span className={`text-sm ${checked ? "text-emerald-800" : "text-slate-700"}`}>{label}</span>
    </button>
  );
}
