import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Box,
  Cloud,
  Database,
  Globe,
  HardDrive,
  Layers,
  Network,
  Radio,
  Server,
  Shield,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  MONITOR_ALERTS,
  MONITOR_TABS,
  type MonitorAlert,
  type MonitorTabId,
} from "../data/monitorMock";
import {
  AlertsTab,
  ApiTab,
  ApplicationTab,
  AuditTab,
  BackgroundJobsTab,
  BackupTab,
  DatabaseTab,
  DockerTab,
  FrontendTab,
  GdalTab,
  GeoServerTab,
  GisTab,
  CloudUsageTab,
  KubernetesTab,
  KpisTab,
  NetworkTab,
  ObjectStorageTab,
  SecurityTab,
} from "../components/monitor/MonitorTabPanels";

/** Toggle Monitor Eye left-sidebar nav items; tab panels remain in code. */
const MONITOR_SIDEBAR_VISIBILITY: Record<MonitorTabId, boolean> = {
  infrastructure: true, // Cloud Usage — platform cost & capacity
  kubernetes: false,
  docker: false,
  database: true, // PostGIS — cadastral data backbone
  geoserver: false,
  application: true, // Spring Boot — core API health
  frontend: false,
  gis: true, // GeoServer/tiles — map delivery
  gdal: false,
  "background-jobs": false,
  "object-storage": false,
  security: false,
  api: false,
  network: false,
  backup: false,
  audit: false,
  kpis: true, // mutations, ULPINs — executive metrics
  alerts: true, // operational incidents
};

const VISIBLE_MONITOR_TABS = MONITOR_TABS.filter((tab) => MONITOR_SIDEBAR_VISIBILITY[tab.id]);

const TAB_ICONS: Record<string, typeof Server> = {
  server: Server,
  cloud: Cloud,
  k8s: Cloud,
  docker: Box,
  database: Database,
  map: Layers,
  spring: Activity,
  react: Globe,
  gis: Layers,
  satellite: Radio,
  queue: Workflow,
  storage: HardDrive,
  shield: Shield,
  api: Activity,
  network: Network,
  backup: HardDrive,
  audit: BarChart3,
  kpi: BarChart3,
  alert: AlertTriangle,
};

function TabPanel({ tabId, alerts, onAcknowledge }: { tabId: MonitorTabId; alerts: MonitorAlert[]; onAcknowledge: (id: string) => void }) {
  switch (tabId) {
    case "infrastructure":
      return <CloudUsageTab />;
    case "kubernetes":
      return <KubernetesTab />;
    case "docker":
      return <DockerTab />;
    case "database":
      return <DatabaseTab />;
    case "geoserver":
      return <GeoServerTab />;
    case "application":
      return <ApplicationTab />;
    case "frontend":
      return <FrontendTab />;
    case "gis":
      return <GisTab />;
    case "gdal":
      return <GdalTab />;
    case "background-jobs":
      return <BackgroundJobsTab />;
    case "object-storage":
      return <ObjectStorageTab />;
    case "security":
      return <SecurityTab />;
    case "api":
      return <ApiTab />;
    case "network":
      return <NetworkTab />;
    case "backup":
      return <BackupTab />;
    case "audit":
      return <AuditTab />;
    case "kpis":
      return <KpisTab />;
    case "alerts":
      return <AlertsTab alerts={alerts} onAcknowledge={onAcknowledge} />;
    default:
      return null;
  }
}

export default function MonitorPage() {
  const [activeTab, setActiveTab] = useState<MonitorTabId>("infrastructure");
  const [alerts, setAlerts] = useState<MonitorAlert[]>(MONITOR_ALERTS);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0f1419]">
      <Link
        to="/app"
        aria-label="Back to map"
        className="absolute left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800/95 text-slate-300 shadow-lg backdrop-blur-sm transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav className="shrink-0 overflow-x-auto border-b border-slate-800 bg-slate-900/95 pt-14 lg:w-52 lg:border-b-0 lg:border-r">
          <div className="flex gap-1 p-2 lg:flex-col lg:gap-0.5">
            {VISIBLE_MONITOR_TABS.map((tab) => {
              const Icon = TAB_ICONS[tab.icon] ?? Activity;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition lg:w-full ${
                    active
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[#F7F7F5] p-3 lg:p-4">
          <TabPanel tabId={activeTab} alerts={alerts} onAcknowledge={handleAcknowledge} />
        </main>
      </div>
    </div>
  );
}
