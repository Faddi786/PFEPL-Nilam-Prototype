import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  ChevronDown,
  Download,
  FileText,
  Image,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AuditHistoryEntry } from "../../data/auditHistory";
import type { ParcelRecord } from "../../data/mockData";
import {
  DOCUMENT_TYPES,
  WORKSPACE_TABS,
  generateAgricultureData,
  generateAnalyticsMetrics,
  generateDocumentPreview,
  generateDownloadItems,
  generateParcelTimeline,
  summarizeAuditHistory,
  type DocumentType,
  type WorkspaceTab,
} from "../../data/parcelWorkspaceMock";

type Props = {
  parcel: ParcelRecord;
  geometry: GeoJSON.Polygon;
  auditHistory: AuditHistoryEntry[];
  onClose: () => void;
};

const MODAL_TRANSITION = { duration: 0.22, ease: "easeOut" as const };

function StatusBadge({ status }: { status: "pass" | "warning" | "review" }) {
  const { t } = useTranslation();

  if (status === "pass") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
        🟢 {t("workspace.pass")}
      </span>
    );
  }
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
        🟠 {t("workspace.warning")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-800">
      🔴 {t("workspace.needsReview")}
    </span>
  );
}

function ParcelTimeline({ parcel }: { parcel: ParcelRecord }) {
  const { t } = useTranslation();
  const events = useMemo(() => generateParcelTimeline(parcel), [parcel]);

  return (
    <section className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {t("workspace.parcelTimeline")}
      </h3>
      <ol className="relative ml-2 space-y-0">
        {events.map((event, index) => (
          <li key={`${event.year}-${event.label}`} className="relative flex gap-4 pb-5 last:pb-0">
            {index < events.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[5px] top-3 h-[calc(100%-4px)] w-px bg-slate-300"
              />
            ) : null}
            <span className="relative z-10 mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#1A1A1A] bg-white" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {event.year} — {event.label}
              </p>
              {event.detail ? (
                <p className="mt-0.5 text-[11px] text-slate-500">{event.detail}</p>
              ) : null}
            </div>
            {index < events.length - 1 ? (
              <span aria-hidden className="absolute -bottom-1 left-[3px] text-slate-300">
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

function DocumentPreviewCard({
  parcel,
  docType,
}: {
  parcel: ParcelRecord;
  docType: DocumentType;
}) {
  const preview = useMemo(() => generateDocumentPreview(parcel, docType), [parcel, docType]);
  const docLabel = DOCUMENT_TYPES.find((d) => d.id === docType)?.label ?? preview.title;

  return (
    <div className="mx-auto max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Government of India — Revenue Department
            </p>
            <h4 className="mt-1 text-sm font-semibold text-[#1A1A1A]">{preview.title}</h4>
          </div>
          {preview.verified ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800">
              <ShieldCheck className="h-3 w-3" />
              Digitally verified
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-600">
          <span>Ref: {preview.referenceNo}</span>
          <span>Issued: {preview.issuedOn}</span>
        </div>
      </div>

      <div className="px-5 py-4">
        <table className="w-full border-collapse text-left text-[11px]">
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.label} className="border-b border-slate-100 last:border-0">
                <th className="w-[38%] py-2 pr-3 font-medium text-slate-500">{row.label}</th>
                <td className="py-2 font-medium text-slate-800">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {docType === "fmb" || docType === "village-map" ? (
          <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <MapPin className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-2 text-[11px] font-medium text-slate-600">Cadastral sketch / FMB diagram</p>
            <p className="text-[10px] text-slate-400">Sheet {parcel.fmbSheet} • Block {parcel.blockNo}</p>
          </div>
        ) : null}

        {(docType === "satellite-images" ||
          docType === "site-inspection" ||
          docType === "field-survey" ||
          docType === "parcel-snapshot") && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex aspect-video items-center justify-center rounded-md border border-slate-200 bg-gradient-to-br from-slate-100 to-slate-200"
              >
                <Image className="h-6 w-6 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </div>

      {preview.footerNote ? (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 text-[9px] text-slate-500">
          {preview.footerNote}
        </div>
      ) : null}

      <div className="border-t border-slate-100 px-5 py-2 text-[9px] text-slate-400">
        Document type: {docLabel}
      </div>
    </div>
  );
}

function MapPreview({ geometry }: { geometry: GeoJSON.Polygon }) {
  const ring = geometry.coordinates[0];
  const lngs = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const w = maxLng - minLng || 1;
  const h = maxLat - minLat || 1;

  const points = ring
    .map((c) => {
      const x = ((c[0] - minLng) / w) * 80 + 10;
      const y = (1 - (c[1] - minLat) / h) * 80 + 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-3 text-xs font-medium text-slate-600">Parcel geometry snapshot</p>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white p-4">
        <svg viewBox="0 0 100 100" className="h-64 w-full max-w-md">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
          <polygon
            points={points}
            fill="rgba(26,26,26,0.12)"
            stroke="#1A1A1A"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="mt-2 text-center text-[10px] text-slate-500">
        Bounding extent • {ring.length - 1} vertices
      </p>
    </div>
  );
}

function TabPanel({
  tab,
  parcel,
  geometry,
  auditHistory,
  docType,
}: {
  tab: WorkspaceTab;
  parcel: ParcelRecord;
  geometry: GeoJSON.Polygon;
  auditHistory: AuditHistoryEntry[];
  docType: DocumentType;
}) {
  const agriculture = useMemo(() => generateAgricultureData(parcel), [parcel]);
  const analytics = useMemo(() => generateAnalyticsMetrics(parcel), [parcel]);
  const downloads = useMemo(() => generateDownloadItems(parcel), [parcel]);
  const auditSummary = useMemo(() => summarizeAuditHistory(auditHistory), [auditHistory]);
  const areaHa = (parcel.areaSqM / 10000).toFixed(4);

  if (tab === "overview") {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Survey No.", value: `${parcel.surveyNo}/${parcel.subDiv}` },
              { label: "Village", value: parcel.village },
              { label: "Extent", value: `${areaHa} ha` },
              { label: "Classification", value: parcel.classification },
              { label: "Land Use", value: parcel.landUse },
              { label: "Status", value: parcel.status.replace(/_/g, " ") },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-0.5 text-sm font-medium capitalize text-[#1A1A1A]">{item.value}</p>
              </div>
            ))}
          </div>
          <ParcelTimeline parcel={parcel} />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick links</h3>
            <ul className="mt-3 space-y-2 text-[11px] text-slate-700">
              <li className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                RoR / Patta on file
              </li>
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-3.5 w-3.5 text-slate-400" />
                ULPIN {parcel.ulpin}
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                FMB {parcel.fmbSheet}
              </li>
            </ul>
          </div>
          <MapPreview geometry={geometry} />
        </div>
      </div>
    );
  }

  if (tab === "ownership") {
    return (
      <div className="max-w-3xl space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Current ownership</h3>
          <table className="mt-4 w-full text-left text-[11px]">
            <tbody>
              {[
                { label: "Owner", value: parcel.ownerMasked },
                { label: "Holding type", value: parcel.holdingType },
                { label: "Occupancy", value: parcel.occupancyType || "Owner occupied" },
                { label: "Patta No.", value: parcel.pattaNo },
                { label: "Deed No.", value: parcel.deedNo },
                { label: "Registered on", value: parcel.registeredOn },
                { label: "Encumbrance", value: parcel.encumbrance },
                { label: "Mutation ref.", value: parcel.mutationRef },
              ].map((row) => (
                <tr key={row.label} className="border-b border-slate-100">
                  <th className="py-2.5 pr-4 font-medium text-slate-500">{row.label}</th>
                  <td className="py-2.5 text-slate-800">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (tab === "documents") {
    return <DocumentPreviewCard parcel={parcel} docType={docType} />;
  }

  if (tab === "images") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {["Satellite 2024", "Satellite 2020", "Site inspection", "Field survey", "Boundary photo", "Landmark"].map(
          (label) => (
            <div key={label} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                <Image className="h-8 w-8 text-slate-400" />
              </div>
              <p className="px-3 py-2 text-[11px] font-medium text-slate-700">{label}</p>
            </div>
          ),
        )}
      </div>
    );
  }

  if (tab === "map") {
    return <MapPreview geometry={geometry} />;
  }

  if (tab === "survey") {
    return (
      <div className="max-w-3xl rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-[#1A1A1A]">Survey particulars</h3>
        <table className="mt-4 w-full text-left text-[11px]">
          <tbody>
            {[
              { label: "Survey year", value: parcel.surveyYear || parcel.lastSurvey },
              { label: "Last survey", value: parcel.lastSurvey },
              { label: "FMB sheet", value: parcel.fmbSheet },
              { label: "Block / Sheet", value: `${parcel.blockNo} / ${parcel.sheetNo}` },
              { label: "GPS accuracy", value: `${parcel.gpsAccuracy} m` },
              { label: "Boundary type", value: parcel.boundaryType || "Stone & hedge" },
              { label: "North boundary", value: parcel.northBoundary || "—" },
              { label: "East boundary", value: parcel.eastBoundary || "—" },
              { label: "Frontage / Depth", value: `${parcel.plotFrontageM} m / ${parcel.plotDepthM} m` },
            ].map((row) => (
              <tr key={row.label} className="border-b border-slate-100">
                <th className="py-2.5 pr-4 font-medium text-slate-500">{row.label}</th>
                <td className="py-2.5 text-slate-800">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "mutations") {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Current mutation</h3>
          <p className="mt-2 text-[11px] text-slate-600">
            {parcel.mutationType || "Sale"} — {parcel.mutationRef} ({parcel.approvalStatus || "Approved"})
          </p>
        </div>
        {auditHistory.map((entry) => (
          <div key={entry.version} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-[#1A1A1A]">
              Revision v{entry.version} — {entry.label}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">{entry.timestamp}</p>
            <p className="mt-2 text-[11px] text-slate-600">{entry.geometryAudit.mutationNotes}</p>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "agriculture") {
    return (
      <div className="max-w-2xl rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
            AgriStack
          </span>
          <span className="text-[10px] text-slate-500">Integration mock</span>
        </div>
        <table className="w-full text-left text-[11px]">
          <tbody>
            {[
              { label: "Farmer ID", value: agriculture.farmerId },
              { label: "Current Crop", value: agriculture.currentCrop },
              { label: "Previous Crop", value: agriculture.previousCrop },
              { label: "Crop Season", value: agriculture.cropSeason },
              { label: "Cultivator", value: agriculture.cultivator },
              { label: "Irrigation", value: agriculture.irrigation },
              { label: "Soil Type", value: agriculture.soilType },
            ].map((row) => (
              <tr key={row.label} className="border-b border-emerald-100/80">
                <th className="py-2.5 pr-4 font-medium text-slate-500">{row.label}</th>
                <td className="py-2.5 font-medium text-slate-800">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (tab === "analytics") {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {analytics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{metric.label}</p>
              <StatusBadge status={metric.status} />
            </div>
            <p className="mt-1.5 text-sm font-semibold text-[#1A1A1A]">{metric.value}</p>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "downloads") {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-[11px]">
          <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Document</th>
              <th className="px-4 py-2.5 font-medium">Format</th>
              <th className="px-4 py-2.5 font-medium">Size</th>
              <th className="px-4 py-2.5 font-medium">Updated</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {downloads.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 font-medium text-slate-800">{item.label}</td>
                <td className="px-4 py-2.5 text-slate-600">{item.format}</td>
                <td className="px-4 py-2.5 text-slate-600">{item.size}</td>
                <td className="px-4 py-2.5 text-slate-600">{item.updated}</td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[10px] text-slate-700 transition hover:bg-slate-50"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-slate-600">
        Audit history summary for this parcel. Use the Audit Log workflow cards for full revision compare.
      </p>
      {auditSummary.map((entry) => (
        <div key={entry.version} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#1A1A1A]">{entry.version}</p>
            <span className="text-[10px] text-slate-500">{entry.timestamp}</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-600">{entry.label}</p>
        </div>
      ))}
    </div>
  );
}

export default function ParcelWorkspaceModal({ parcel, geometry, auditHistory, onClose }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [docType, setDocType] = useState<DocumentType>("ror");

  const surveyLabel = `${parcel.surveyNo}${parcel.subDiv ? `/${parcel.subDiv}` : ""}`;

  function requestClose() {
    setVisible(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  return createPortal(
    <AnimatePresence onExitComplete={onClose}>
      {visible ? (
        <motion.div
          key="parcel-workspace"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={MODAL_TRANSITION}
          className="fixed inset-0 z-[10002] flex flex-col bg-[#F7F7F5] text-[#1A1A1A]"
          role="dialog"
          aria-modal="true"
          aria-label={t("workspace.parcelHeader", { survey: surveyLabel, ulpin: parcel.ulpin })}
        >
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label={t("workspace.close")}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {t("workspace.title")}
                  </p>
                  <h2 className="truncate text-base font-semibold text-[#1A1A1A]">
                    {t("workspace.parcelHeader", { survey: surveyLabel, ulpin: parcel.ulpin })}
                  </h2>
                </div>
              </div>

              <div className="relative shrink-0">
                <label htmlFor="doc-type-select" className="sr-only">
                  {t("workspace.documentType")}
                </label>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                  <ChevronDown className="h-3.5 w-3.5" />
                </div>
                <select
                  id="doc-type-select"
                  value={docType}
                  onChange={(event) => {
                    setDocType(event.target.value as DocumentType);
                    setActiveTab("documents");
                  }}
                  className="max-w-[min(280px,45vw)] appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-[11px] font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]/20"
                >
                  {DOCUMENT_TYPES.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.emoji ? `${doc.emoji} ` : ""}
                      {doc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <nav
              className="mt-3 -mb-px flex gap-1 overflow-x-auto pb-px"
              aria-label={t("workspace.sections")}
            >
              {WORKSPACE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-t-md border-b-2 px-3 py-2 text-[11px] font-medium transition ${
                    activeTab === tab.id
                      ? "border-[#1A1A1A] text-[#1A1A1A]"
                      : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700"
                  }`}
                >
                  {t(`workspace.tabs.${tab.id}`)}
                </button>
              ))}
            </nav>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <TabPanel
                tab={activeTab}
                parcel={parcel}
                geometry={geometry}
                auditHistory={auditHistory}
                docType={docType}
              />
            </motion.div>
          </main>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
