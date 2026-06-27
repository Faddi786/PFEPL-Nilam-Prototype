import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import ta from "./locales/ta.json";
import mr from "./locales/mr.json";

export const LANG_STORAGE_KEY = "nilam:lang";

export const SUPPORTED_LANGUAGES = [
  { code: "en", labelKey: "language.en" },
  { code: "hi", labelKey: "language.hi" },
  { code: "ta", labelKey: "language.ta" },
  { code: "mr", labelKey: "language.mr" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

function getStoredLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some((lang) => lang.code === stored)) {
      return stored as SupportedLanguage;
    }
  } catch {
    /* ignore storage errors */
  }
  return "en";
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    ta: { translation: ta },
    mr: { translation: mr },
  },
  lng: getStoredLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    /* ignore storage errors */
  }
});

export default i18n;
