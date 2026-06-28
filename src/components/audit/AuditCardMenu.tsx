import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  Check,
  ChevronRight,
  Download,
  EyeOff,
  FileText,
  Globe,
  History,
  Lock,
  MessageSquare,
  MessageSquareOff,
  Unlock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "../../i18n";

type Props = {
  historyVisible: boolean;
  onToggleHistory: () => void;
  onShowDocuments?: () => void;
  onShow3DWalk?: () => void;
  scrollLocked: boolean;
  onToggleScrollLock: () => void;
  tooltipEnabled: boolean;
  onToggleTooltip: () => void;
};

const HOVER_CLOSE_DELAY_MS = 180;
const SUBMENU_CLOSE_DELAY_MS = 150;

const EXPORT_FORMAT_GROUPS = [
  { labelKey: "audit.export.documents", formats: ["PDF", "CSV", "Excel"] },
  {
    labelKey: "audit.export.vector",
    formats: ["GeoJSON", "Shapefile", "GeoPackage", "KML", "DXF"],
  },
  { labelKey: "audit.export.raster", formats: ["TIFF", "COG"] },
] as const;

export default function AuditCardMenu({
  historyVisible,
  onToggleHistory,
  onShowDocuments,
  onShow3DWalk,
  scrollLocked,
  onToggleScrollLock,
  tooltipEnabled,
  onToggleTooltip,
}: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [langSubmenuOpen, setLangSubmenuOpen] = useState(false);
  const [exportSubmenuOpen, setExportSubmenuOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const langSubmenuTimerRef = useRef<number | null>(null);
  const exportSubmenuTimerRef = useRef<number | null>(null);

  function clearCloseTimer() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu() {
    clearCloseTimer();
    setOpen(true);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_DELAY_MS);
  }

  function clearLangSubmenuTimer() {
    if (langSubmenuTimerRef.current !== null) {
      window.clearTimeout(langSubmenuTimerRef.current);
      langSubmenuTimerRef.current = null;
    }
  }

  function openLangSubmenu() {
    clearLangSubmenuTimer();
    setLangSubmenuOpen(true);
  }

  function scheduleCloseLangSubmenu() {
    clearLangSubmenuTimer();
    langSubmenuTimerRef.current = window.setTimeout(
      () => setLangSubmenuOpen(false),
      SUBMENU_CLOSE_DELAY_MS,
    );
  }

  function clearExportSubmenuTimer() {
    if (exportSubmenuTimerRef.current !== null) {
      window.clearTimeout(exportSubmenuTimerRef.current);
      exportSubmenuTimerRef.current = null;
    }
  }

  function openExportSubmenu() {
    clearExportSubmenuTimer();
    setExportSubmenuOpen(true);
  }

  function scheduleCloseExportSubmenu() {
    clearExportSubmenuTimer();
    exportSubmenuTimerRef.current = window.setTimeout(
      () => setExportSubmenuOpen(false),
      SUBMENU_CLOSE_DELAY_MS,
    );
  }

  useEffect(() => {
    return () => {
      clearCloseTimer();
      clearLangSubmenuTimer();
      clearExportSubmenuTimer();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      setLangSubmenuOpen(false);
      setExportSubmenuOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
        zIndex: 9999,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
        aria-label={t("audit.cardOptions")}
        aria-expanded={open}
        aria-haspopup="menu"
        className="relative z-30 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-slate-300 bg-white transition hover:border-slate-400 hover:bg-slate-50"
      />
      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              ref={menuRef}
              style={menuStyle}
              onMouseEnter={openMenu}
              onMouseLeave={scheduleClose}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="min-w-[176px] origin-top-right overflow-visible rounded-xl border border-slate-200/90 bg-white/98 py-1 shadow-lg backdrop-blur-md"
            >
              <button
                type="button"
                onClick={() => {
                  onToggleHistory();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700 transition hover:bg-slate-50"
              >
                {historyVisible ? (
                  <EyeOff className="h-3 w-3 shrink-0 text-slate-500" />
                ) : (
                  <History className="h-3 w-3 shrink-0 text-slate-500" />
                )}
                {historyVisible ? t("audit.hideHistory") : t("audit.showHistory")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleScrollLock();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700 transition hover:bg-slate-50"
              >
                {scrollLocked ? (
                  <Unlock className="h-3 w-3 shrink-0 text-slate-500" />
                ) : (
                  <Lock className="h-3 w-3 shrink-0 text-slate-500" />
                )}
                {scrollLocked ? t("audit.unlockCard") : t("audit.lockCard")}
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleTooltip();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700 transition hover:bg-slate-50"
              >
                {tooltipEnabled ? (
                  <MessageSquareOff className="h-3 w-3 shrink-0 text-slate-500" />
                ) : (
                  <MessageSquare className="h-3 w-3 shrink-0 text-slate-500" />
                )}
                {tooltipEnabled ? t("audit.turnOffTooltip") : t("audit.turnOnTooltip")}
              </button>
              {onShowDocuments ? (
                <button
                  type="button"
                  onClick={() => {
                    onShowDocuments();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700 transition hover:bg-slate-50"
                >
                  <FileText className="h-3 w-3 shrink-0 text-slate-500" />
                  {t("audit.showDocuments")}
                </button>
              ) : null}
              {onShow3DWalk ? (
                <button
                  type="button"
                  onClick={() => {
                    onShow3DWalk();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700 transition hover:bg-slate-50"
                >
                  <Box className="h-3 w-3 shrink-0 text-slate-500" />
                  {t("audit.walk3D")}
                </button>
              ) : null}
              <div
                className="relative"
                onMouseEnter={openExportSubmenu}
                onMouseLeave={scheduleCloseExportSubmenu}
              >
                <div
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={exportSubmenuOpen}
                  className="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-3 w-3 shrink-0 text-slate-500" />
                  <span className="flex-1">{t("audit.export.label")}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                </div>
                {exportSubmenuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-full top-0 z-10 ml-1 min-w-[140px] overflow-hidden rounded-xl border border-slate-200/90 bg-white/98 py-1 shadow-lg backdrop-blur-md"
                    onMouseEnter={openExportSubmenu}
                    onMouseLeave={scheduleCloseExportSubmenu}
                  >
                    {EXPORT_FORMAT_GROUPS.map((group, groupIndex) => (
                      <div key={group.labelKey}>
                        {groupIndex > 0 ? (
                          <div className="my-1 border-t border-slate-100" role="separator" />
                        ) : null}
                        <div className="px-3 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-400">
                          {t(group.labelKey)}
                        </div>
                        {group.formats.map((format) => (
                          <div
                            key={format}
                            role="menuitem"
                            className="flex w-full cursor-default items-center px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700"
                          >
                            {format}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="my-1 border-t border-slate-100" role="separator" />
              <div
                className="relative"
                onMouseEnter={openLangSubmenu}
                onMouseLeave={scheduleCloseLangSubmenu}
              >
                <div
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={langSubmenuOpen}
                  className="flex w-full cursor-default items-center gap-2 px-3 py-1.5 text-left text-[10px] leading-4 text-slate-700 transition hover:bg-slate-50"
                >
                  <Globe className="h-3 w-3 shrink-0 text-slate-500" />
                  <span className="flex-1">{t("language.section")}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-slate-400" />
                </div>
                {langSubmenuOpen ? (
                  <div
                    role="menu"
                    className="absolute left-full top-0 z-10 ml-1 min-w-[140px] overflow-hidden rounded-xl border border-slate-200/90 bg-white/98 py-1 shadow-lg backdrop-blur-md"
                    onMouseEnter={openLangSubmenu}
                    onMouseLeave={scheduleCloseLangSubmenu}
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const active = i18n.language.startsWith(lang.code);
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={(event) => {
                            event.stopPropagation();
                            void i18n.changeLanguage(lang.code);
                          }}
                          onMouseDown={(event) => event.stopPropagation()}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-[10px] leading-4 transition hover:bg-slate-50 ${
                            active ? "font-medium text-slate-900" : "text-slate-700"
                          }`}
                        >
                          <span>{t(lang.labelKey)}</span>
                          {active ? <Check className="h-3 w-3 shrink-0 text-emerald-600" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
