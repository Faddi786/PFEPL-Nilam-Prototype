import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  FileText,
  MapPin,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ParcelRecord } from "../../data/mockData";
import {
  PARCEL_DOCUMENT_ASSETS,
  WORKSPACE_IMAGE_ASSETS,
  WORKSPACE_TABS,
  generateAgricultureData,
  generateAnalyticsMetrics,
  generateCollablandData,
  generateNilamagalData,
  generateParcelTimeline,
  type ParcelDocumentAsset,
  type WorkspaceTab,
} from "../../data/parcelWorkspaceMock";
import UlpinLineageTree from "./UlpinLineageTree";

type Props = {
  parcel: ParcelRecord;
  geometry: GeoJSON.Polygon;
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
          </li>
        ))}
      </ol>
    </section>
  );
}

function MapPreview({ geometry, compact = false }: { geometry: GeoJSON.Polygon; compact?: boolean }) {
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
    <div
      className={`flex flex-col rounded-xl border border-slate-200 bg-slate-50 ${
        compact ? "p-2.5" : "h-full min-h-[200px] p-4"
      }`}
    >
      <p className={`font-medium text-slate-600 ${compact ? "mb-1.5 text-[10px]" : "mb-3 text-xs"}`}>
        Parcel geometry snapshot
      </p>
      <div
        className={`flex items-center justify-center rounded-lg border border-slate-200 bg-white ${
          compact ? "p-2" : "flex-1 p-4"
        }`}
      >
        <svg viewBox="0 0 100 100" className={`w-full max-w-md ${compact ? "h-20" : "h-48"}`}>
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
      <p className={`text-center text-slate-500 ${compact ? "mt-1 text-[9px]" : "mt-2 text-[10px]"}`}>
        Bounding extent • {ring.length - 1} vertices
      </p>
    </div>
  );
}

function DocumentPreviewPanel({ document }: { document: ParcelDocumentAsset }) {
  return (
    <div className="flex h-full min-h-[420px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h4 className="text-sm font-semibold text-[#1A1A1A]">{document.label}</h4>
        <p className="mt-0.5 text-[11px] text-slate-500">{document.description}</p>
        {document.sourceNote ? (
          <p className="mt-1 text-[10px] italic text-slate-400">{document.sourceNote}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 bg-slate-100">
        {document.kind === "pdf" ? (
          <iframe
            title={document.label}
            src={document.src}
            className="h-full min-h-[380px] w-full border-0"
          />
        ) : (
          <div className="flex h-full min-h-[380px] items-center justify-center p-4">
            <img
              src={document.src}
              alt={document.label}
              className="max-h-full max-w-full rounded-lg object-contain shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsSplitView() {
  const [selectedId, setSelectedId] = useState(PARCEL_DOCUMENT_ASSETS[0]?.id ?? "");
  const selected = PARCEL_DOCUMENT_ASSETS.find((doc) => doc.id === selectedId) ?? PARCEL_DOCUMENT_ASSETS[0];

  return (
    <div className="grid h-[min(72vh,640px)] gap-4 lg:grid-cols-[280px_1fr]">
      <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Land records
          </p>
        </div>
        <ul className="max-h-[calc(72vh-48px)] overflow-y-auto">
          {PARCEL_DOCUMENT_ASSETS.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => setSelectedId(doc.id)}
                className={`flex w-full items-start gap-2.5 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-0 ${
                  selectedId === doc.id
                    ? "bg-[#1A1A1A] text-white"
                    : "hover:bg-slate-50"
                }`}
              >
                <FileText
                  className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                    selectedId === doc.id ? "text-white/80" : "text-slate-400"
                  }`}
                />
                <span>
                  <span className="block text-[11px] font-medium">{doc.label}</span>
                  <span
                    className={`mt-0.5 block text-[10px] ${
                      selectedId === doc.id ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    {doc.kind.toUpperCase()}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      {selected ? <DocumentPreviewPanel document={selected} /> : null}
    </div>
  );
}

function NilamagalPanel({ parcel }: { parcel: ParcelRecord }) {
  const data = useMemo(() => generateNilamagalData(parcel), [parcel]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[11px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5 font-medium">Field</th>
              <th className="px-4 py-2.5 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.field} className="border-b border-slate-100 transition hover:bg-slate-50/80">
                <td className="px-4 py-2 font-medium text-slate-700">{row.field}</td>
                <td className="px-4 py-2 font-medium text-[#1A1A1A]">{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CollablandPanel({
  parcel,
  geometry,
}: {
  parcel: ParcelRecord;
  geometry: GeoJSON.Polygon;
}) {
  const data = useMemo(() => generateCollablandData(parcel, geometry), [parcel, geometry]);
  const areaHa = (data.areaSqM / 10000).toFixed(4);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Area (GIS)", value: `${areaHa} ha` },
            { label: "Perimeter", value: `${data.perimeterM} m` },
            { label: "Vertices", value: String(data.vertexCount) },
            { label: "CRS", value: data.crs },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="mt-0.5 text-sm font-medium text-[#1A1A1A]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="max-h-[min(68vh,560px)] overflow-auto">
            <table className="w-full text-left text-[10px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[9px] uppercase tracking-wide text-slate-500 shadow-sm">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Longitude</th>
                  <th className="px-3 py-2 font-medium">Latitude</th>
                  <th className="px-3 py-2 font-medium">Easting</th>
                  <th className="px-3 py-2 font-medium">Northing</th>
                </tr>
              </thead>
              <tbody>
                {data.coordinates.map((coord) => (
                  <tr key={coord.seq} className="border-t border-slate-100 hover:bg-slate-50/80">
                    <td className="px-3 py-1.5 font-medium text-slate-600">{coord.seq}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-800">{coord.lng}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-800">{coord.lat}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-600">{coord.easting}</td>
                    <td className="px-3 py-1.5 font-mono text-slate-600">{coord.northing}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <MapPreview geometry={geometry} compact />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Boundary stats
          </h3>
          <dl className="mt-3 space-y-2">
            {data.boundaryStats.map((stat) => (
              <div key={stat.label} className="flex justify-between gap-2 text-[11px]">
                <dt className="text-slate-500">{stat.label}</dt>
                <dd className="font-medium text-slate-800">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function UlpinLineagePanel({ parcel }: { parcel: ParcelRecord }) {
  return <UlpinLineageTree parcel={parcel} />;
}

function ImagesGallery() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {WORKSPACE_IMAGE_ASSETS.map((asset) => (
        <figure
          key={asset.id}
          className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="aspect-video overflow-hidden bg-slate-100">
            <img
              src={asset.src}
              alt={asset.label}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
          <figcaption className="px-3 py-2">
            <p className="text-[11px] font-medium text-slate-800">{asset.label}</p>
            <p className="text-[10px] text-slate-500">{asset.category}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function TabPanel({
  tab,
  parcel,
  geometry,
}: {
  tab: WorkspaceTab;
  parcel: ParcelRecord;
  geometry: GeoJSON.Polygon;
}) {
  const agriculture = useMemo(() => generateAgricultureData(parcel), [parcel]);
  const analytics = useMemo(() => generateAnalyticsMetrics(parcel), [parcel]);
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

  if (tab === "nilamagal") {
    return <NilamagalPanel parcel={parcel} />;
  }

  if (tab === "collabland") {
    return <CollablandPanel parcel={parcel} geometry={geometry} />;
  }

  if (tab === "ulpin-lineage") {
    return <UlpinLineagePanel parcel={parcel} />;
  }

  if (tab === "images") {
    return <ImagesGallery />;
  }

  if (tab === "agristack") {
    return (
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="max-w-2xl rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
              AgriStack
            </span>
            <span className="text-[10px] text-slate-500">Farmer registry integration</span>
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
        <div className="space-y-2">
          {WORKSPACE_IMAGE_ASSETS.filter((img) => img.category === "Agristack").map((asset) => (
            <figure key={asset.id} className="overflow-hidden rounded-lg border border-emerald-200 bg-white">
              <img src={asset.src} alt={asset.label} className="aspect-video w-full object-cover" />
              <figcaption className="px-2 py-1.5 text-[10px] text-slate-600">{asset.label}</figcaption>
            </figure>
          ))}
        </div>
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

  if (tab === "documents") {
    return <DocumentsSplitView />;
  }

  return null;
}

export default function ParcelWorkspaceModal({ parcel, geometry, onClose }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

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
              />
            </motion.div>
          </main>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
