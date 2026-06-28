import { type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonitorStatus, TimeSeriesPoint } from "../../data/monitorMock";

const STATUS_STYLES: Record<MonitorStatus, { badge: string; dot: string; label: string }> = {
  healthy: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Healthy" },
  warning: { badge: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500", label: "Warning" },
  critical: { badge: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", label: "Critical" },
  restarting: { badge: "bg-sky-50 text-sky-700 border-sky-200", dot: "bg-sky-500", label: "Restarting" },
  running: { badge: "bg-indigo-50 text-indigo-700 border-indigo-200", dot: "bg-indigo-500", label: "Running" },
  info: { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", label: "Info" },
};

const DEFAULT_STATUS_STYLE = STATUS_STYLES.info;

export function StatusBadge({ status, label }: { status?: MonitorStatus | string | null; label?: string }) {
  const resolved = status ? STATUS_STYLES[status as MonitorStatus] : undefined;
  const s = resolved ?? DEFAULT_STATUS_STYLE;
  const displayLabel = label ?? (status && !resolved ? String(status) : s.label);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {displayLabel}
    </span>
  );
}

function ChartContainer({ height, children }: { height: number; children: ReactNode }) {
  return (
    <div className="w-full min-w-0" style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function MonitorCard({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1A1A]">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function MetricGaugeRing({
  label,
  value,
  max,
  unit,
  status,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: MonitorStatus;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color =
    status === "critical" ? "#ef4444" : status === "warning" ? "#f59e0b" : status === "restarting" ? "#0ea5e9" : "#10b981";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/50 p-3">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-[#1A1A1A]">{value}</span>
          {unit ? <span className="text-[9px] text-slate-500">{unit}</span> : null}
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] font-medium text-slate-600">{label}</p>
      <StatusBadge status={status} />
    </div>
  );
}

export function Sparkline({ data, color = "#0284c7" }: { data: TimeSeriesPoint[]; color?: string }) {
  return (
    <ChartContainer height={48}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#spark-${color})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ChartContainer>
  );
}

export function MiniBarChart({
  data,
  xKey,
  yKey,
  color = "#334155",
}: {
  data: Record<string, string | number>[];
  xKey: string;
  yKey: string;
  color?: string;
}) {
  return (
    <ChartContainer height={176}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function MiniLineChart({
  data,
  xKey,
  lines,
}: {
  data: Record<string, string | number>[];
  xKey: string;
  lines: { key: string; color: string; strokeDasharray?: string }[];
}) {
  return (
    <ChartContainer height={176}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey={xKey} tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" />
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2}
            strokeDasharray={l.strokeDasharray}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

export function CloudUsageForecastChart({
  data,
  predictedLabel,
  predictedValue,
  trendPerMonth,
  trendPct,
}: {
  data: { month: string; historical: number | null; forecast: number | null }[];
  predictedLabel: string;
  predictedValue: number;
  trendPerMonth: number;
  trendPct: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Next month prediction</p>
            <p className="mt-0.5 text-2xl font-bold text-[#1A1A1A]">
              {predictedValue.toLocaleString()} <span className="text-sm font-medium text-slate-500">units</span>
            </p>
            <p className="text-[11px] text-slate-500">{predictedLabel} · linear trend extrapolation</p>
          </div>
          <div className="rounded-xl border border-sky-100 bg-sky-50/60 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wide text-sky-700">Monthly trend</p>
            <p className="mt-0.5 text-sm font-semibold text-sky-900">
              +{trendPerMonth} units/mo <span className="font-normal text-sky-700">({trendPct}% over 12 mo)</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded bg-sky-600" />
            Historical
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded border-t-2 border-dashed border-violet-500" />
            Forecast
          </span>
        </div>
      </div>
      <ChartContainer height={220}>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#94a3b8" interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" unit=" u" />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            formatter={(value, name) => {
              const label = name === "historical" ? "Actual usage" : "Forecast";
              if (value == null) return ["—", label];
              const num = typeof value === "number" ? value : Number(value);
              return Number.isFinite(num) ? [`${num} units`, label] : ["—", label];
            }}
          />
          <Line
            type="monotone"
            dataKey="historical"
            name="historical"
            stroke="#0284c7"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#0284c7", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="forecast"
            name="forecast"
            stroke="#7c3aed"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={{ r: 4, fill: "#7c3aed", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function DonutChart({
  data,
  colors,
}: {
  data: { name: string; value: number }[];
  colors: string[];
}) {
  return (
    <ChartContainer height={160}>
      <PieChart>
        <Pie data={data} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
      </PieChart>
    </ChartContainer>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; render?: (row: Record<string, unknown>) => ReactNode }[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full min-w-[480px] text-left text-xs">
        <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50/80">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2 text-slate-700">
                  {c.render ? c.render(row) : String(row[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressBar({ value, max = 100, status }: { value: number; max?: number; status?: MonitorStatus }) {
  const pct = Math.min(100, (value / max) * 100);
  const bar =
    status === "critical" ? "bg-rose-500" : status === "warning" ? "bg-amber-500" : status === "restarting" ? "bg-sky-500" : "bg-emerald-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-slate-200 bg-white",
    success: "border-emerald-200 bg-emerald-50/50",
    warning: "border-amber-200 bg-amber-50/50",
    danger: "border-rose-200 bg-rose-50/50",
    info: "border-sky-200 bg-sky-50/50",
  };
  return (
    <div className={`rounded-2xl border px-4 py-4 ${tones[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-[#1A1A1A]">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}
