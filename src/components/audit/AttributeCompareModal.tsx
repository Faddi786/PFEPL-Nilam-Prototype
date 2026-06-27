import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquare, MessageSquareOff, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { GeometryAuditMeta, MutationAuditMeta } from "../../data/auditHistory";
import { getFieldAuditForRevision } from "../../data/auditHistory";
import { formatParcelValue } from "../../lib/parcelFormat";
import { getTranslatedParcelFieldLabel } from "../../i18n/useParcelFieldLabel";
import { translateParcelValue } from "../../i18n/translateParcelValue";
import type { ParcelRecord } from "../../data/mockData";
import { FieldAuditTooltip, GeometryAuditTooltip } from "./AuditAttributeTooltip";

export type AttributeCompareRow = {
  revision: string;
  value: string;
  fieldKey: keyof ParcelRecord;
  fieldAudit: MutationAuditMeta;
};

export type GeometryCompareRow = {
  revision: string;
  label: string;
  areaSqM: string;
  mutationNotes: string;
  geometryAudit?: GeometryAuditMeta;
};

type AttributeModalProps = {
  title: string;
  attributeLabel: string;
  rows: AttributeCompareRow[];
  tooltipEnabled: boolean;
  onClose: () => void;
};

type GeometryModalProps = {
  title: string;
  rows: GeometryCompareRow[];
  tooltipEnabled: boolean;
  onClose: () => void;
};

const MODAL_TRANSITION = { duration: 0.2, ease: "easeOut" as const };

function ModalBackdrop({
  children,
  onClose,
}: {
  children: (requestClose: () => void) => React.ReactNode;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);

  function requestClose() {
    setVisible(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          key="compare-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MODAL_TRANSITION}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/25 p-4 backdrop-blur-[1px]"
          onClick={requestClose}
          role="presentation"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={MODAL_TRANSITION}
            className="flex max-h-[min(80vh,560px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {children(requestClose)}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function useTooltipState() {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    field?: MutationAuditMeta;
    geometry?: GeometryAuditMeta;
  } | null>(null);
  return { tooltip, setTooltip };
}

export function AttributeCompareModal({
  title,
  attributeLabel,
  rows,
  tooltipEnabled,
  onClose,
}: AttributeModalProps) {
  const { t } = useTranslation();
  const { tooltip, setTooltip } = useTooltipState();
  const [localTooltips, setLocalTooltips] = useState(tooltipEnabled);

  useEffect(() => {
    setLocalTooltips(tooltipEnabled);
  }, [tooltipEnabled]);

  return (
    <ModalBackdrop onClose={onClose}>
      {(requestClose) => (
        <>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLocalTooltips((value) => !value)}
                aria-label={localTooltips ? t("audit.turnOffTooltips") : t("audit.turnOnTooltips")}
                aria-pressed={localTooltips}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100 ${
                  localTooltips ? "text-slate-800" : "text-slate-500"
                }`}
              >
                {localTooltips ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <MessageSquareOff className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={requestClose}
                aria-label={t("audit.close")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left text-[10px] leading-4">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-500">{t("audit.revisionNo")}</th>
                  <th className="px-4 py-2 font-medium text-slate-500">
                    {rows[0]?.fieldKey
                      ? getTranslatedParcelFieldLabel(rows[0].fieldKey, t)
                      : attributeLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.revision}-${index}`} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-600">{row.revision}</td>
                    <td
                      className={`px-4 py-2 font-medium text-slate-800 ${localTooltips ? "cursor-default" : ""}`}
                      onMouseEnter={
                        localTooltips
                          ? (event) =>
                              setTooltip({
                                x: event.clientX,
                                y: event.clientY,
                                field: row.fieldAudit,
                              })
                          : undefined
                      }
                      onMouseMove={
                        localTooltips
                          ? (event) =>
                              setTooltip({
                                x: event.clientX,
                                y: event.clientY,
                                field: row.fieldAudit,
                              })
                          : undefined
                      }
                      onMouseLeave={localTooltips ? () => setTooltip(null) : undefined}
                    >
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tooltip?.field ? (
            <FieldAuditTooltip meta={tooltip.field} x={tooltip.x} y={tooltip.y} />
          ) : null}
        </>
      )}
    </ModalBackdrop>
  );
}

export function GeometryCompareModal({ title, rows, tooltipEnabled, onClose }: GeometryModalProps) {
  const { t } = useTranslation();
  const { tooltip, setTooltip } = useTooltipState();
  const [localTooltips, setLocalTooltips] = useState(tooltipEnabled);

  useEffect(() => {
    setLocalTooltips(tooltipEnabled);
  }, [tooltipEnabled]);

  return (
    <ModalBackdrop onClose={onClose}>
      {(requestClose) => (
        <>
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setLocalTooltips((value) => !value)}
                aria-label={localTooltips ? t("audit.turnOffTooltips") : t("audit.turnOnTooltips")}
                aria-pressed={localTooltips}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100 ${
                  localTooltips ? "text-slate-800" : "text-slate-500"
                }`}
              >
                {localTooltips ? (
                  <MessageSquare className="h-4 w-4" />
                ) : (
                  <MessageSquareOff className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={requestClose}
                aria-label={t("audit.close")}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-slate-500">{t("audit.revisionNo")}</th>
                  <th className="px-4 py-2 font-medium text-slate-500">{t("audit.geometryLabel")}</th>
                  <th className="px-4 py-2 font-medium text-slate-500">{t("audit.areaSqM")}</th>
                  <th className="px-4 py-2 font-medium text-slate-500">{t("audit.mutationNotes")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.revision}-${index}`} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-600">{row.revision}</td>
                    <td className="px-4 py-2 text-slate-600">{row.label}</td>
                    <td
                      className={`px-4 py-2 font-medium text-slate-800 ${localTooltips && row.geometryAudit ? "cursor-default" : ""}`}
                      onMouseEnter={
                        localTooltips && row.geometryAudit
                          ? (event) =>
                              setTooltip({
                                x: event.clientX,
                                y: event.clientY,
                                geometry: row.geometryAudit,
                              })
                          : undefined
                      }
                      onMouseMove={
                        localTooltips && row.geometryAudit
                          ? (event) =>
                              setTooltip({
                                x: event.clientX,
                                y: event.clientY,
                                geometry: row.geometryAudit,
                              })
                          : undefined
                      }
                      onMouseLeave={localTooltips ? () => setTooltip(null) : undefined}
                    >
                      {row.areaSqM}
                    </td>
                    <td className="px-4 py-2 text-slate-600">{row.mutationNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tooltip?.geometry ? (
            <GeometryAuditTooltip meta={tooltip.geometry} x={tooltip.x} y={tooltip.y} />
          ) : null}
        </>
      )}
    </ModalBackdrop>
  );
}

export function buildAttributeCompareRows(
  fieldKey: keyof ParcelRecord,
  current: { revision: string; parcel: ParcelRecord; fieldAudit?: MutationAuditMeta },
  history: Array<{
    revision: string;
    parcel: ParcelRecord;
    fieldAudit?: Partial<Record<keyof ParcelRecord, MutationAuditMeta>>;
  }>,
  t?: TFunction,
): AttributeCompareRow[] {
  const formatValue = (value: unknown) =>
    t ? translateParcelValue(fieldKey, value, t) : formatParcelValue(fieldKey, value);

  const rows: AttributeCompareRow[] = [
    {
      revision: current.revision,
      value: formatValue(current.parcel[fieldKey]),
      fieldKey,
      fieldAudit:
        current.fieldAudit ?? getFieldAuditForRevision(current.parcel.id, 0, fieldKey),
    },
  ];

  for (const entry of history) {
    const version = Number(entry.revision) || 0;
    rows.push({
      revision: entry.revision,
      value: formatValue(entry.parcel[fieldKey]),
      fieldKey,
      fieldAudit:
        entry.fieldAudit?.[fieldKey] ??
        getFieldAuditForRevision(entry.parcel.id, version, fieldKey),
    });
  }

  return rows;
}
