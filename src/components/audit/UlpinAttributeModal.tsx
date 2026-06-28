import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ParcelRecord } from "../../data/mockData";
import { formatParcelValue, PARCEL_AUDIT_SECTIONS } from "../../lib/parcelFormat";
import { PARCEL_AUDIT_SECTION_LABEL_KEYS } from "../../i18n/parcelAuditSections";
import { getTranslatedParcelFieldLabel } from "../../i18n/useParcelFieldLabel";
import { translateParcelValue } from "../../i18n/translateParcelValue";
import type { UlpinLineageNode } from "../../data/parcelWorkspaceMock";

type Props = {
  node: UlpinLineageNode;
  parcel: ParcelRecord;
  onClose: () => void;
};

const MODAL_TRANSITION = { duration: 0.22, ease: "easeOut" as const };

export default function UlpinAttributeModal({ node, parcel, onClose }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="ulpin-attribute-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={MODAL_TRANSITION}
        className="fixed inset-0 z-[10010] flex flex-col bg-[#F7F7F5]"
        role="dialog"
        aria-modal="true"
        aria-label={`ULPIN ${node.ulpin}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>

        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-[1920px] pr-10">
            <h2 className="text-sm font-semibold text-slate-900">ULPIN Record</h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-600">{node.ulpin}</p>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 lg:px-10">
          <div className="mx-auto grid max-w-[1920px] gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {PARCEL_AUDIT_SECTIONS.filter((section) => section.label !== "Data provenance").map((section) => {
              const sectionLabelKey = PARCEL_AUDIT_SECTION_LABEL_KEYS[section.label];
              const sectionLabel = sectionLabelKey ? t(sectionLabelKey) : section.label;

              return (
                <section
                  key={section.label}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      {sectionLabel}
                    </h3>
                  </div>
                  <dl className="divide-y divide-slate-100">
                    {section.keys.map((key) => {
                      const label = getTranslatedParcelFieldLabel(key, t);
                      const rawValue = key === "ulpin" ? node.ulpin : parcel[key];
                      const displayValue =
                        key === "ulpin" ? node.ulpin : translateParcelValue(key, rawValue, t);

                      return (
                        <div key={key} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,42%)_1fr]">
                          <dt className="text-[10px] font-medium text-slate-500">{label}</dt>
                          <dd className="text-[11px] font-medium leading-snug text-slate-800">
                            {key === "areaSqM" ? formatParcelValue(key, rawValue) : displayValue}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                </section>
              );
            })}
          </div>
        </main>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
