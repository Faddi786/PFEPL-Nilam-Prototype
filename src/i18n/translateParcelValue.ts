import type { TFunction } from "i18next";
import type { ParcelRecord } from "../data/mockData";
import { formatParcelValue } from "../lib/parcelFormat";

function valueLookupKey(value: string): string {
  return value
    .trim()
    .replace(/[./\s—–-]+/g, "_")
    .replace(/[()]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function tryTranslate(t: TFunction, key: string): string | null {
  const translated = t(key);
  return translated !== key ? translated : null;
}

export function translateParcelValue(
  key: keyof ParcelRecord,
  value: unknown,
  t: TFunction,
): string {
  if (value === null || value === undefined || value === "") {
    return t("parcelValues.common.dash");
  }

  if (key === "areaSqM") return Number(value).toLocaleString();
  if (key === "variancePct") return `${Number(value).toFixed(2)}%`;
  if (key === "plotFrontageM" || key === "plotDepthM") {
    return `${value} ${t("parcelValues.units.m")}`;
  }
  if (key === "gpsAccuracy") return `${value} ${t("parcelValues.units.m")}`;
  if (key === "buildingFootprint") {
    return `${value} ${t("parcelValues.units.sqm")}`;
  }

  const raw = String(value);
  const lookup = valueLookupKey(raw);

  const fieldHit = tryTranslate(t, `parcelValues.${String(key)}.${lookup}`);
  if (fieldHit) return fieldHit;

  const ownerHit = tryTranslate(t, `parcelValues.owners.${lookup}`);
  if (ownerHit) return ownerHit;

  const commonHit = tryTranslate(t, `parcelValues.common.${lookup}`);
  if (commonHit) return commonHit;

  const auditorHit = tryTranslate(t, `parcelValues.auditors.${lookup}`);
  if (auditorHit) return auditorHit;

  const noteHit = tryTranslate(t, `parcelValues.notes.${lookup}`);
  if (noteHit) return noteHit;

  const historyLabelHit = tryTranslate(t, `parcelValues.historyLabels.${lookup}`);
  if (historyLabelHit) return historyLabelHit;

  return formatParcelValue(key, value);
}

export function translateAuditMetaValue(value: string, t: TFunction): string {
  if (!value || value === "—") return t("parcelValues.common.dash");
  const lookup = valueLookupKey(value);
  return (
    tryTranslate(t, `parcelValues.auditors.${lookup}`) ??
    tryTranslate(t, `parcelValues.notes.${lookup}`) ??
    tryTranslate(t, `parcelValues.common.${lookup}`) ??
    value
  );
}
