import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import ParcelContextPanel from "../ParcelContextPanel";
import AuditCardMenu from "./AuditCardMenu";
import Parcel3DWalkModal from "./Parcel3DWalkModal";
import ParcelWorkspaceModal from "./ParcelWorkspaceModal";
import {
  AttributeCompareModal,
  GeometryCompareModal,
  buildAttributeCompareRows,
  type GeometryCompareRow,
} from "./AttributeCompareModal";
import {
  buildCurrentFieldAudit,
  buildCurrentGeometryAudit,
  type AuditHistoryEntry,
} from "../../data/auditHistory";
import type { ParcelRecord } from "../../data/mockData";
import { getTranslatedParcelFieldLabel } from "../../i18n/useParcelFieldLabel";
import { translateAuditMetaValue } from "../../i18n/translateParcelValue";

type Props = {
  parcel: ParcelRecord;
  history: AuditHistoryEntry[];
  currentGeometry: GeoJSON.Polygon;
  historyExpanded?: boolean;
  onHistoryExpandedChange?: (expanded: boolean) => void;
  cardTopOffset?: string;
  visible?: boolean;
};

const CARD_STAGGER_MS = 120;
const CARD_SLIDE_MS = 480;
const CARD_BOTTOM_PADDING = "1rem";
const BEHIND_OFFSET = "calc(-1 * min(300px, calc(100vw - 2rem)) - 0.5rem)";
const SCROLL_ANIM_MS = 280;
const PANEL_FADE_MS = 0.225;

function cardHeight(topOffset: string) {
  return `calc(100vh - ${topOffset} - ${CARD_BOTTOM_PADDING})`;
}

function animateScrollTo(element: HTMLDivElement, target: number, duration = SCROLL_ANIM_MS) {
  const start = element.scrollTop;
  const delta = target - start;
  if (Math.abs(delta) < 1) {
    element.scrollTop = target;
    return;
  }

  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.scrollTop = start + delta * eased;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

export default function AuditHistoryRow({
  parcel,
  history,
  currentGeometry,
  historyExpanded = false,
  onHistoryExpandedChange,
  cardTopOffset = "4.75rem",
  visible = true,
}: Props) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollContainersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const isSyncingRef = useRef(false);
  const scrollLockedRef = useRef(false);
  const lockArmedRef = useRef(false);

  const [phase, setPhase] = useState<"idle" | "revealed" | "hiding">(
    historyExpanded ? "revealed" : "idle",
  );
  const [visibleCards, setVisibleCards] = useState(historyExpanded ? history.length : 0);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [lockArmed, setLockArmed] = useState(false);
  const [tooltipEnabled, setTooltipEnabled] = useState(false);
  const [compareAttribute, setCompareAttribute] = useState<{
    key: keyof ParcelRecord;
    label: string;
  } | null>(null);
  const [compareGeometry, setCompareGeometry] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [walk3DOpen, setWalk3DOpen] = useState(false);
  const prevParcelIdRef = useRef(parcel.id);

  scrollLockedRef.current = scrollLocked;
  lockArmedRef.current = lockArmed;

  function toggleScrollLock() {
    setScrollLocked((value) => {
      const next = !value;
      if (next) {
        setLockArmed(true);
        lockArmedRef.current = true;
      } else {
        setLockArmed(false);
        lockArmedRef.current = false;
      }
      return next;
    });
  }

  const expandedHeight = cardHeight(cardTopOffset);
  const currentFieldAudit = useMemo(() => buildCurrentFieldAudit(parcel.id), [parcel.id]);
  const currentGeometryAudit = useMemo(
    () => buildCurrentGeometryAudit(parcel.id, parcel.areaSqM),
    [parcel.areaSqM, parcel.id],
  );

  useEffect(() => {
    const parcelChanged = prevParcelIdRef.current !== parcel.id;
    if (!parcelChanged) return;

    prevParcelIdRef.current = parcel.id;

    setWorkspaceOpen(false);
    setWalk3DOpen(false);

    if (historyExpanded) {
      setPhase("revealed");
      setVisibleCards(history.length);
    } else {
      setPhase("idle");
      setVisibleCards(0);
    }
  }, [parcel.id, historyExpanded, history.length]);

  const registerScrollContainer = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      scrollContainersRef.current.set(id, el);
    } else {
      scrollContainersRef.current.delete(id);
    }
  }, []);

  const syncScrollFrom = useCallback((scrollTop: number, sourceId: string, animateOthers = false) => {
    if (!scrollLockedRef.current || isSyncingRef.current) return;

    isSyncingRef.current = true;
    scrollContainersRef.current.forEach((el, id) => {
      if (id === sourceId) return;
      if (animateOthers) {
        animateScrollTo(el, scrollTop);
      } else {
        el.scrollTop = scrollTop;
      }
    });
    requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
  }, []);

  const handleAttributesScroll = useCallback(
    (scrollTop: number, source: HTMLDivElement) => {
      if (!scrollLockedRef.current || lockArmedRef.current) return;
      const sourceId = [...scrollContainersRef.current.entries()].find(([, el]) => el === source)?.[0];
      if (!sourceId) return;

      syncScrollFrom(scrollTop, sourceId, false);
    },
    [syncScrollFrom],
  );

  const handleCardClick = useCallback(
    (cardId: string) => {
      if (!scrollLockedRef.current) return;
      const source = scrollContainersRef.current.get(cardId);
      if (!source) return;

      setLockArmed(false);
      lockArmedRef.current = false;
      syncScrollFrom(source.scrollTop, cardId, true);
    },
    [syncScrollFrom],
  );

  const handleCardMouseEnter = useCallback(
    (cardId: string) => {
      if (!scrollLockedRef.current || lockArmedRef.current) return;
      const source = scrollContainersRef.current.get(cardId);
      if (!source) return;
      syncScrollFrom(source.scrollTop, cardId, true);
    },
    [syncScrollFrom],
  );

  function startReveal() {
    if (phase !== "idle") return;
    onHistoryExpandedChange?.(true);
    setPhase("revealed");
    setVisibleCards(0);
    history.forEach((_, index) => {
      window.setTimeout(
        () => setVisibleCards((count) => Math.max(count, index + 1)),
        index * CARD_STAGGER_MS,
      );
    });
  }

  function startHide() {
    if (phase !== "revealed") return;
    setPhase("hiding");

    const total = history.length;
    history.forEach((_, index) => {
      window.setTimeout(
        () => setVisibleCards(total - index - 1),
        index * CARD_STAGGER_MS,
      );
    });

    window.setTimeout(() => {
      setPhase("idle");
      setVisibleCards(0);
      onHistoryExpandedChange?.(false);
    }, total * CARD_STAGGER_MS + CARD_SLIDE_MS);
  }

  function toggleHistory() {
    if (phase === "idle") startReveal();
    else if (phase === "revealed") startHide();
  }

  const showHistoryCards = phase === "revealed" || phase === "hiding";
  const historyVisible = phase === "revealed" || phase === "hiding";

  const attributeCompareRows = compareAttribute
    ? buildAttributeCompareRows(
        compareAttribute.key,
        {
          revision: t("audit.current"),
          parcel,
          fieldAudit: currentFieldAudit[compareAttribute.key],
        },
        history.map((entry) => ({
          revision: String(entry.version),
          parcel: entry.parcel,
          fieldAudit: entry.fieldAudit,
        })),
        t,
      )
    : [];

  const geometryCompareRows: GeometryCompareRow[] = compareGeometry
    ? [
        {
          revision: t("audit.current"),
          label: t("audit.currentGeometry"),
          areaSqM: parcel.areaSqM.toLocaleString(),
          mutationNotes: translateAuditMetaValue(currentGeometryAudit.mutationNotes, t),
          geometryAudit: currentGeometryAudit,
        },
        ...history.map((entry) => ({
          revision: String(entry.version),
          label: translateAuditMetaValue(entry.label, t),
          areaSqM: entry.parcel.areaSqM.toLocaleString(),
          mutationNotes: translateAuditMetaValue(entry.geometryAudit.mutationNotes, t),
          geometryAudit: entry.geometryAudit,
        })),
      ]
    : [];

  return (
    <>
      <AnimatePresence>
        {visible ? (
          <motion.div
            key={parcel.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: PANEL_FADE_MS, ease: "easeOut" }}
            className="pointer-events-none absolute left-0 right-0 z-20 px-4"
            style={{
              top: cardTopOffset,
              bottom: CARD_BOTTOM_PADDING,
              height: expandedHeight,
            }}
          >
            <div
              ref={scrollRef}
              className="audit-history-scroll pointer-events-none flex h-full w-max max-w-full items-stretch gap-2 overflow-x-auto"
            >
              <div className="relative z-30 h-full shrink-0 pointer-events-auto">
                <ParcelContextPanel
                  parcel={parcel}
                  variant="audit"
                  fillHeight
                  geometry={currentGeometry}
                  polygonLabel={t("audit.currentGeometry")}
                  attributesScrollRef={(el) => registerScrollContainer("current", el)}
                  onAttributesScroll={handleAttributesScroll}
                  onCardMouseEnter={() => handleCardMouseEnter("current")}
                  onCardClick={() => handleCardClick("current")}
                  tooltipEnabled={tooltipEnabled}
                  fieldAudit={currentFieldAudit}
                  geometryAudit={currentGeometryAudit}
                  onLabelDoubleClick={(key) =>
                    setCompareAttribute({
                      key,
                      label: getTranslatedParcelFieldLabel(key, t),
                    })
                  }
                  onGeometryDoubleClick={() => setCompareGeometry(true)}
                  headerAction={
                    <AuditCardMenu
                      historyVisible={historyVisible}
                      onToggleHistory={toggleHistory}
                      onShowDocuments={() => setWorkspaceOpen(true)}
                      onShow3DWalk={() => setWalk3DOpen(true)}
                      scrollLocked={scrollLocked}
                      onToggleScrollLock={toggleScrollLock}
                      tooltipEnabled={tooltipEnabled}
                      onToggleTooltip={() => setTooltipEnabled((value) => !value)}
                    />
                  }
                />
              </div>

              {showHistoryCards
                ? history.map((entry, index) => {
                    const cardVisible = index < visibleCards;
                    const cardId = `history-${entry.version}`;
                    return (
                      <div
                        key={`${parcel.id}-history-${entry.version}`}
                        className="relative h-full shrink-0 pointer-events-auto"
                        style={{
                          zIndex: 20 - index,
                          transition: `transform ${CARD_SLIDE_MS}ms ease-out, opacity ${CARD_SLIDE_MS}ms ease-out`,
                          opacity: cardVisible ? 1 : 0,
                          transform: cardVisible ? "translateX(0)" : `translateX(${BEHIND_OFFSET})`,
                          pointerEvents: cardVisible ? "auto" : "none",
                        }}
                      >
                        <ParcelContextPanel
                          parcel={entry.parcel}
                          variant="audit"
                          fillHeight
                          subtitle={`${translateAuditMetaValue(entry.label, t)} • ${entry.timestamp}`}
                          geometry={entry.geometry}
                          polygonLabel={t("audit.versionGeometry", { version: entry.version })}
                          attributesScrollRef={(el) => registerScrollContainer(cardId, el)}
                          onAttributesScroll={handleAttributesScroll}
                          onCardMouseEnter={() => handleCardMouseEnter(cardId)}
                          onCardClick={() => handleCardClick(cardId)}
                          tooltipEnabled={tooltipEnabled}
                          fieldAudit={entry.fieldAudit}
                          geometryAudit={entry.geometryAudit}
                          onLabelDoubleClick={(key) =>
                            setCompareAttribute({
                              key,
                              label: getTranslatedParcelFieldLabel(key, t),
                            })
                          }
                          onGeometryDoubleClick={() => setCompareGeometry(true)}
                        />
                      </div>
                    );
                  })
                : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {compareAttribute ? (
        <AttributeCompareModal
          title={t("audit.compareAttribute", { label: compareAttribute.label })}
          attributeLabel={compareAttribute.label}
          rows={attributeCompareRows}
          tooltipEnabled={tooltipEnabled}
          onClose={() => setCompareAttribute(null)}
        />
      ) : null}

      {compareGeometry ? (
        <GeometryCompareModal
          title={t("audit.compareGeometry")}
          rows={geometryCompareRows}
          tooltipEnabled={tooltipEnabled}
          onClose={() => setCompareGeometry(false)}
        />
      ) : null}

      {workspaceOpen ? (
        <ParcelWorkspaceModal
          parcel={parcel}
          geometry={currentGeometry}
          onClose={() => setWorkspaceOpen(false)}
        />
      ) : null}

      {walk3DOpen ? (
        <Parcel3DWalkModal
          parcel={parcel}
          geometry={currentGeometry}
          onClose={() => setWalk3DOpen(false)}
        />
      ) : null}
    </>
  );
}
