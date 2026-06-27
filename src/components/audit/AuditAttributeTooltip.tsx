import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { GeometryAuditMeta, MutationAuditMeta } from "../../data/auditHistory";
import { translateAuditMetaValue } from "../../i18n/translateParcelValue";

type FieldTooltipProps = {
  meta: MutationAuditMeta;
  x: number;
  y: number;
};

type GeometryTooltipProps = {
  meta: GeometryAuditMeta;
  x: number;
  y: number;
};

function TooltipShell({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return createPortal(
    <div
      className="pointer-events-none fixed z-[10100] w-[220px] rounded-lg border border-slate-200/90 bg-white/98 px-2.5 py-2 shadow-lg backdrop-blur-sm"
      style={{ left: x + 14, top: y - 10 }}
    >
      {children}
    </div>,
    document.body,
  );
}

function AuditRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-[72px] shrink-0 text-[9px] text-slate-400">{label}</span>
      <span className="text-[9px] font-medium text-slate-700">{value}</span>
    </div>
  );
}

export function FieldAuditTooltip({ meta, x, y }: FieldTooltipProps) {
  const { t } = useTranslation();

  return (
    <TooltipShell x={x} y={y}>
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {t("audit.mutationAudit")}
      </p>
      <AuditRow label={t("audit.changedBy")} value={translateAuditMetaValue(meta.changedBy, t)} />
      <AuditRow label={t("audit.changedAt")} value={translateAuditMetaValue(meta.changedAt, t)} />
      <AuditRow
        label={t("audit.approvedBy")}
        value={meta.approvedBy ? translateAuditMetaValue(meta.approvedBy, t) : t("audit.pending")}
      />
      <AuditRow label={t("audit.approvedAt")} value={meta.approvedAt ?? t("parcelValues.common.dash")} />
      <AuditRow label={t("audit.mutationRef")} value={meta.mutationRef} />
      <p className="mt-1 border-t border-slate-100 pt-1 text-[9px] leading-snug text-slate-500">
        {translateAuditMetaValue(meta.notes, t)}
      </p>
    </TooltipShell>
  );
}

export function GeometryAuditTooltip({ meta, x, y }: GeometryTooltipProps) {
  const { t } = useTranslation();

  return (
    <TooltipShell x={x} y={y}>
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {t("audit.geometryAudit")}
      </p>
      <AuditRow label={t("audit.changedBy")} value={translateAuditMetaValue(meta.changedBy, t)} />
      <AuditRow label={t("audit.changedAt")} value={translateAuditMetaValue(meta.changedAt, t)} />
      <AuditRow
        label={t("audit.approvedBy")}
        value={meta.approvedBy ? translateAuditMetaValue(meta.approvedBy, t) : t("audit.pending")}
      />
      <AuditRow label={t("audit.approvedAt")} value={meta.approvedAt ?? t("parcelValues.common.dash")} />
      <AuditRow label={t("audit.areaSqM")} value={meta.areaSqM.toLocaleString()} />
      <p className="mt-1 border-t border-slate-100 pt-1 text-[9px] leading-snug text-slate-500">
        {translateAuditMetaValue(meta.mutationNotes, t)}
      </p>
    </TooltipShell>
  );
}
