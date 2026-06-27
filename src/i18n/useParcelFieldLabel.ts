import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ParcelRecord } from "../data/mockData";
import { getParcelFieldLabel } from "../lib/parcelFormat";

export function getTranslatedParcelFieldLabel(
  key: keyof ParcelRecord,
  t: TFunction,
): string {
  const translationKey = `parcelFields.${String(key)}`;
  const translated = t(translationKey);
  if (translated !== translationKey) return translated;
  return getParcelFieldLabel(key);
}

export function useParcelFieldLabel(key: keyof ParcelRecord): string {
  const { t } = useTranslation();
  return getTranslatedParcelFieldLabel(key, t);
}

export { translateParcelValue, translateAuditMetaValue } from "./translateParcelValue";
