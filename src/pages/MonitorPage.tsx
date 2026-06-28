import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Box,
  Cloud,
  Database,
  Eye,
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
  InfrastructureTab,
  KubernetesTab,
  KpisTab,
  NetworkTab,
  ObjectStorageTab,
  SecurityTab,
} from "../components/monitor/MonitorTabPanels";
import { StatusBadge } from "../components/monitor/MonitorShared";

const TAB_ICONS: Record<string, typeof Server> = {
  server: Server,
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
      return <InfrastructureTab />;
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

  const clusterCpu = 42;

  const openCritical = alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length;

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#0f1419]">
      <header className="shrink-0 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 px-4 py-3 lg:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <Link
              to="/app"
              className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 transition hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to map
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/40">
                <Eye className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight text-white">Monitor — Eye</h1>
                <p className="text-[11px] text-slate-400">DoSLR NOC · System Health Dashboard · Puducherry UT</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1.5">
              <span className="inline-flex h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-[11px] font-medium text-slate-300">Snapshot</span>
            </div>
            <div className="hidden rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-[11px] text-slate-300 sm:block">
              Cluster CPU <span className="font-semibold text-white">{clusterCpu}%</span>
            </div>
            {openCritical > 0 ? (
              <button
                type="button"
                onClick={() => setActiveTab("alerts")}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-[11px] font-semibold text-rose-300"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {openCritical} critical
              </button>
            ) : (
              <StatusBadge status="healthy" label="All systems nominal" />
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav className="shrink-0 overflow-x-auto border-b border-slate-800 bg-slate-900/95 lg:w-52 lg:border-b-0 lg:border-r">
          <div className="flex gap-1 p-2 lg:flex-col lg:gap-0.5">
            {MONITOR_TABS.map((tab) => {
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
