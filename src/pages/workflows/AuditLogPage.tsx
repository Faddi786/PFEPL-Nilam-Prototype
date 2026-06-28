import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AuditHistoryRow from "../../components/audit/AuditHistoryRow";
import i18n from "../../i18n";
import WorkflowSwitcher from "../../components/WorkflowSwitcher";
import { createMapEngine } from "../../lib/mapEngine";
import {
  findParcelGeometry,
  generateAuditHistory,
  searchAuditParcel,
  searchParcels,
} from "../../data/auditHistory";
import {
  DEFAULT_REGION_KEY,
  type ParcelRecord,
  type RegionDataset,
} from "../../data/mockData";
import { getWorkbenchRegionDatasetSync, loadWorkbenchRegionDataset } from "../../data/workbenchParcels";
import { getVisiblePanelWorkflows } from "../../data/workflows";
const MAX_SEARCH_SUGGESTIONS = 5;
const PANEL_FADE_MS = 225;

function applyAuditLogLayerDefaults(engine: ReturnType<typeof createMapEngine>) {
  engine.setBasemap("basemap-carto");

  const hiddenLayers = [
    "ortho",
    "region",
    "taluk",
    "village",
    "ward",
    "adminState",
    "adminDistrict",
    "adminTaluka",
    "adminVillage",
    "fmb",
    "fmbChains",
    "variance",
    "dgps",
    "collabland",
    "crops",
    "buildings",
    "trees",
    "roads",
    "waterBodies",
    "forest",
    "cadastralDimensions",
  ] as const;

  hiddenLayers.forEach((layerId) => engine.setLayerVisibility(layerId, false));
  engine.setLayerVisibility("parcels", true);
}

function parcelSuggestionLabel(parcel: ParcelRecord): string {
  return `${parcel.surveyNo}${parcel.subDiv ? `/${parcel.subDiv}` : ""} • ${parcel.village}`;
}

function parcelSuggestionMeta(parcel: ParcelRecord): string {
  return `${parcel.id} • ULPIN ${parcel.ulpin}`;
}

export default function AuditLogPage() {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const topControlsRef = useRef<HTMLDivElement | null>(null);
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const engineRef = useRef<ReturnType<typeof createMapEngine> | null>(null);
  const selectedParcelRef = useRef<ParcelRecord | null>(null);
  const initialDatasetRef = useRef<RegionDataset | null>(null);
  const regionKey = DEFAULT_REGION_KEY;
  const [regionDataset, setRegionDataset] = useState(() => getWorkbenchRegionDatasetSync(regionKey));
  const visibleWorkflows = useMemo(() => getVisiblePanelWorkflows(), []);
  const [selectedParcel, setSelectedParcel] = useState<ParcelRecord | null>(null);
  const [panelParcel, setPanelParcel] = useState<ParcelRecord | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [cardTopOffset, setCardTopOffset] = useState("4.75rem");

  selectedParcelRef.current = selectedParcel;

  useEffect(() => {
    const previousLanguage = i18n.resolvedLanguage ?? i18n.language;
    void i18n.changeLanguage("en");

    return () => {
      void i18n.changeLanguage(previousLanguage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadWorkbenchRegionDataset(regionKey).then((dataset) => {
      if (!cancelled) setRegionDataset(dataset);
    });
    return () => {
      cancelled = true;
    };
  }, [regionKey]);

  useEffect(() => {
    function measureTopControls() {
      const el = topControlsRef.current ?? searchFormRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCardTopOffset(`${rect.bottom + 10}px`);
    }

    measureTopControls();
    const raf = requestAnimationFrame(measureTopControls);
    window.addEventListener("resize", measureTopControls);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measureTopControls);
    };
  }, []);

  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return searchParcels(regionDataset.parcels, q).slice(0, MAX_SEARCH_SUGGESTIONS);
  }, [regionDataset.parcels, searchQuery]);

  const displayParcel = panelParcel;

  const currentGeometry = useMemo(() => {
    if (!displayParcel) return null;
    return findParcelGeometry(regionDataset, displayParcel.id);
  }, [regionDataset, displayParcel]);

  const auditHistory = useMemo(() => {
    if (!displayParcel || !currentGeometry) return [];
    return generateAuditHistory(displayParcel, currentGeometry);
  }, [currentGeometry, displayParcel]);

  function dismissPanel() {
    setPanelVisible(false);
    window.setTimeout(() => {
      setSelectedParcel(null);
      setPanelParcel(null);
      setSearchFeedback(null);
      setSearchQuery("");
      setHistoryExpanded(false);
      engineRef.current?.clearHighlights();
    }, PANEL_FADE_MS);
  }

  function selectParcel(parcel: ParcelRecord) {
    setSelectedParcel(parcel);
    setPanelParcel(parcel);
    setPanelVisible(true);
    setSearchQuery(parcel.surveyNo);
    setSearchFeedback(null);
    setShowSuggestions(false);
    engineRef.current?.highlightParcels([parcel.id]);
  }

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    if (searchSuggestions.length === 1) {
      selectParcel(searchSuggestions[0]);
      return;
    }
    const match = searchAuditParcel(regionDataset.parcels, searchQuery);
    if (!match) {
      setSearchFeedback(t("audit.noParcelMatched"));
      setShowSuggestions(false);
      return;
    }
    selectParcel(match);
  }

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!mapRef.current || engineRef.current) return;

    initialDatasetRef.current = regionDataset;
    engineRef.current = createMapEngine(mapRef.current, regionDataset, {
      onParcelClick: (parcel) => selectParcel(parcel as ParcelRecord),
      onMapClick: (_pixel, hasParcel) => {
        if (!hasParcel && selectedParcelRef.current) {
          dismissPanel();
        }
      },
    });

    applyAuditLogLayerDefaults(engineRef.current);

    const map = engineRef.current.map;
    const resize = () => map.updateSize();
    requestAnimationFrame(resize);
    window.addEventListener("resize", resize);

    const observer = new ResizeObserver(resize);
    if (mapRef.current) observer.observe(mapRef.current);

    return () => {
      window.removeEventListener("resize", resize);
      observer.disconnect();
      engineRef.current?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!engineRef.current) return;
    if (initialDatasetRef.current === regionDataset) return;
    initialDatasetRef.current = regionDataset;
    engineRef.current.setDataset(regionDataset, { transitionDuration: 800 });
    requestAnimationFrame(() => {
      engineRef.current?.map.updateSize();
    });
  }, [regionDataset]);

  return (
    <div
      data-audit-log
      className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] text-[#1A1A1A]"
      style={{ "--audit-card-top": cardTopOffset } as React.CSSProperties}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={mapRef} className="absolute inset-0" />

        <div
          ref={topControlsRef}
          className="pointer-events-none absolute inset-x-4 top-4 z-30 flex items-start justify-between gap-3"
        >
          <div className="pointer-events-auto flex min-w-0 items-center gap-2">
            <Link
              to="/app"
              aria-label={t("audit.back")}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/80 bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-slate-200 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div ref={searchRef} className="relative w-[min(320px,calc(100vw-8rem))]">
              <form
                ref={searchFormRef}
                onSubmit={handleSearchSubmit}
                className="relative z-30 flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setShowSuggestions(true);
                    if (searchFeedback) setSearchFeedback(null);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim()) setShowSuggestions(true);
                  }}
                  placeholder={t("audit.searchPlaceholder")}
                  className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  autoComplete="off"
                />
              </form>

              {showSuggestions && searchSuggestions.length > 0 ? (
                <ul
                  role="listbox"
                  className="audit-search-dropdown absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 shadow-lg backdrop-blur-sm"
                >
                  {searchSuggestions.map((parcel) => (
                    <li key={parcel.id} role="option">
                      <button
                        type="button"
                        onClick={() => selectParcel(parcel)}
                        className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition hover:bg-slate-50"
                      >
                        <span className="text-xs font-medium text-slate-800">
                          {parcelSuggestionLabel(parcel)}
                        </span>
                        <span className="text-[10px] text-slate-500">{parcelSuggestionMeta(parcel)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {showSuggestions && searchQuery.trim() && searchSuggestions.length === 0 ? (
                <p className="audit-search-dropdown absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 text-[11px] text-slate-500 shadow-sm backdrop-blur-sm">
                  {t("audit.noMatchingParcels")}
                </p>
              ) : null}

              {searchFeedback ? (
                <p className="absolute left-0 right-0 top-full z-30 mt-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-800 shadow-sm">
                  {searchFeedback}
                </p>
              ) : null}
            </div>
          </div>

          <div className="pointer-events-auto shrink-0">
            <WorkflowSwitcher
              currentWorkflowId="audit-log"
              workflows={visibleWorkflows}
              variant="overlay"
            />
          </div>
        </div>

        {displayParcel && auditHistory.length > 0 && currentGeometry ? (
          <AuditHistoryRow
            parcel={displayParcel}
            history={auditHistory}
            currentGeometry={currentGeometry}
            historyExpanded={historyExpanded}
            onHistoryExpandedChange={setHistoryExpanded}
            cardTopOffset={cardTopOffset}
            visible={panelVisible}
          />
        ) : null}
      </div>
    </div>
  );
}
