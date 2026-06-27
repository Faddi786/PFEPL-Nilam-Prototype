import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PolygonPreviewPanel from "./audit/PolygonPreviewPanel";
import { PARCEL_DISPLAY_FIELDS, type ParcelRecord } from "../data/mockData";
import { formatParcelValue, getParcelFieldLabel, PARCEL_AUDIT_SECTIONS } from "../lib/parcelFormat";
import { getTranslatedParcelFieldLabel } from "../i18n/useParcelFieldLabel";
import { translateParcelValue } from "../i18n/translateParcelValue";
import { PARCEL_AUDIT_SECTION_LABEL_KEYS } from "../i18n/parcelAuditSections";
import type { GeometryAuditMeta, MutationAuditMeta } from "../data/auditHistory";
import { FieldAuditTooltip, GeometryAuditTooltip } from "./audit/AuditAttributeTooltip";

type Props = {
  parcel: ParcelRecord;
  className?: string;
  style?: React.CSSProperties;
  elongated?: boolean;
  subtitle?: string;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  maxBodyHeight?: string;
  variant?: "default" | "audit";
  geometry?: GeoJSON.Polygon | null;
  polygonLabel?: string;
  fillHeight?: boolean;
  attributesScrollRef?: (el: HTMLDivElement | null) => void;
  onAttributesScroll?: (scrollTop: number, source: HTMLDivElement) => void;
  onCardMouseEnter?: () => void;
  onCardClick?: () => void;
  tooltipEnabled?: boolean;
  fieldAudit?: Partial<Record<keyof ParcelRecord, MutationAuditMeta>>;
  geometryAudit?: GeometryAuditMeta | null;
  onLabelDoubleClick?: (key: keyof ParcelRecord, label: string) => void;
  onGeometryDoubleClick?: () => void;
};

const ParcelContextPanel = forwardRef<HTMLDivElement, Props>(function ParcelContextPanel(
  {
    parcel,
    className = "",
    style,
    elongated = false,
    subtitle,
    footer,
    headerAction,
    maxBodyHeight,
    variant = "default",
    geometry,
    polygonLabel,
    fillHeight = false,
    attributesScrollRef,
    onAttributesScroll,
    onCardMouseEnter,
    onCardClick,
    tooltipEnabled = false,
    fieldAudit,
    geometryAudit,
    onLabelDoubleClick,
    onGeometryDoubleClick,
  },
  ref,
) {
  const { t } = useTranslation();
  const isAudit = variant === "audit";
  const [fieldTooltip, setFieldTooltip] = useState<{
    meta: MutationAuditMeta;
    x: number;
    y: number;
  } | null>(null);
  const [geometryTooltip, setGeometryTooltip] = useState<{
    meta: GeometryAuditMeta;
    x: number;
    y: number;
  } | null>(null);

  function showFieldTooltip(key: keyof ParcelRecord, event: React.MouseEvent) {
    if (!tooltipEnabled || !fieldAudit?.[key]) return;
    setFieldTooltip({ meta: fieldAudit[key]!, x: event.clientX, y: event.clientY });
  }

  function showGeometryTooltip(event: React.MouseEvent) {
    if (!tooltipEnabled || !geometryAudit) return;
    setGeometryTooltip({ meta: geometryAudit, x: event.clientX, y: event.clientY });
  }

  function renderAuditAttributes() {
    return (
      <dl className="space-y-0">
        {PARCEL_AUDIT_SECTIONS.map((section, sectionIndex) => {
          const sectionLabelKey = PARCEL_AUDIT_SECTION_LABEL_KEYS[section.label];
          const sectionLabel = sectionLabelKey ? t(sectionLabelKey) : section.label;

          return (
          <div key={section.label}>
            {sectionIndex > 0 ? <div className="audit-section-divider" role="separator" /> : null}
            <p className="audit-section-label">{sectionLabel}</p>
            <div className="space-y-1">
              {section.keys.map((key) => {
                const label = getTranslatedParcelFieldLabel(key, t);
                return (
                  <div
                    key={key}
                    className="grid grid-cols-[100px_1fr] gap-1.5 text-[10px] leading-4"
                  >
                    <dt
                      className="cursor-default select-none text-slate-500"
                      onDoubleClick={() => onLabelDoubleClick?.(key, label)}
                      title={t("audit.doubleClickCompare")}
                    >
                      {label}
                    </dt>
                    <dd
                      className={`font-medium text-slate-800 ${tooltipEnabled && fieldAudit?.[key] ? "cursor-default" : ""}`}
                      onMouseEnter={(event) => showFieldTooltip(key, event)}
                      onMouseMove={(event) => showFieldTooltip(key, event)}
                      onMouseLeave={() => setFieldTooltip(null)}
                    >
                      {translateParcelValue(key, parcel[key], t)}
                    </dd>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </dl>
    );
  }

  return (
    <div
      ref={ref}
      style={style}
      onMouseEnter={onCardMouseEnter}
      onClick={onCardClick}
      className={`flex w-[min(300px,calc(100vw-2rem))] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-lg backdrop-blur-sm transition-[min-height] duration-500 ease-out ${
        fillHeight || isAudit ? "h-full min-h-0" : elongated ? "min-h-[420px]" : "min-h-0"
      } ${className}`}
    >
      <div className="relative z-10 shrink-0 overflow-visible border-b border-slate-100 px-3 py-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[#1A1A1A]">
              {isAudit ? t("parcelContext.title") : "Parcel Context"}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {subtitle ?? `${parcel.id} • ${parcel.region}`}
            </p>
          </div>
          {headerAction ? (
            <div className="relative z-20 shrink-0">{headerAction}</div>
          ) : null}
        </div>
      </div>
      <div
        ref={attributesScrollRef}
        onScroll={(event) => {
          onAttributesScroll?.(event.currentTarget.scrollTop, event.currentTarget);
        }}
        className={`px-3 py-2 transition-[max-height] duration-500 ease-out ${
          isAudit || fillHeight ? "audit-attributes-scroll min-h-0 flex-1 overflow-y-auto" : "overflow-y-auto"
        }`}
        style={
          isAudit || fillHeight
            ? undefined
            : { maxHeight: maxBodyHeight ?? (elongated ? "58vh" : "52vh") }
        }
      >
        {isAudit ? (
          renderAuditAttributes()
        ) : (
          <dl className="space-y-1.5">
            {PARCEL_DISPLAY_FIELDS.map(({ key }) => (
              <div key={key} className="grid grid-cols-[100px_1fr] gap-1.5 text-[11px] leading-4">
                <dt className="text-slate-500">{getParcelFieldLabel(key)}</dt>
                <dd className="font-medium text-slate-800">{formatParcelValue(key, parcel[key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {geometry ? (
        <PolygonPreviewPanel
          geometry={geometry}
          label={polygonLabel ?? t("audit.geometryPreview")}
          onDoubleClick={onGeometryDoubleClick}
          onMouseEnter={showGeometryTooltip}
          onMouseMove={showGeometryTooltip}
          onMouseLeave={() => setGeometryTooltip(null)}
          interactive={Boolean(tooltipEnabled || onGeometryDoubleClick)}
        />
      ) : null}
      {footer ? <div className="mt-auto shrink-0 border-t border-slate-100 px-3 py-2.5">{footer}</div> : null}
      {fieldTooltip ? (
        <FieldAuditTooltip meta={fieldTooltip.meta} x={fieldTooltip.x} y={fieldTooltip.y} />
      ) : null}
      {geometryTooltip ? (
        <GeometryAuditTooltip
          meta={geometryTooltip.meta}
          x={geometryTooltip.x}
          y={geometryTooltip.y}
        />
      ) : null}
    </div>
  );
});

export default ParcelContextPanel;
