export type MonitorStatus = "healthy" | "warning" | "critical" | "restarting" | "running" | "info";

export type MonitorTabId =
  | "infrastructure"
  | "kubernetes"
  | "docker"
  | "database"
  | "geoserver"
  | "application"
  | "frontend"
  | "gis"
  | "gdal"
  | "background-jobs"
  | "object-storage"
  | "security"
  | "api"
  | "network"
  | "backup"
  | "audit"
  | "kpis"
  | "alerts";

export type MonitorTab = {
  id: MonitorTabId;
  label: string;
  icon: string;
  keywords: string[];
};

export const MONITOR_TABS: MonitorTab[] = [
  { id: "infrastructure", label: "Cloud Usage", icon: "cloud", keywords: ["cpu", "ram", "disk", "network", "uptime", "load", "cloud", "usage", "cost"] },
  { id: "kubernetes", label: "Kubernetes", icon: "k8s", keywords: ["pods", "nodes", "deployments", "scaling"] },
  { id: "docker", label: "Docker", icon: "docker", keywords: ["containers", "images", "cadvisor"] },
  { id: "database", label: "Database", icon: "database", keywords: ["postgresql", "postgis", "queries", "replication"] },
  { id: "geoserver", label: "GeoServer", icon: "map", keywords: ["wms", "wfs", "wmts", "tiles", "layers"] },
  { id: "application", label: "Application", icon: "spring", keywords: ["spring boot", "api", "micrometer", "gc"] },
  { id: "frontend", label: "Frontend", icon: "react", keywords: ["react", "errors", "sessions", "sentry"] },
  { id: "gis", label: "GIS Monitoring", icon: "gis", keywords: ["spatial", "parcel", "rendering", "wms"] },
  { id: "gdal", label: "GDAL / Georef", icon: "satellite", keywords: ["gdal", "warp", "rms", "georeferencing"] },
  { id: "background-jobs", label: "Background Jobs", icon: "queue", keywords: ["quartz", "rabbitmq", "tile", "ulpin"] },
  { id: "object-storage", label: "Object Storage", icon: "storage", keywords: ["s3", "ortho", "fmb", "drone"] },
  { id: "security", label: "Security", icon: "shield", keywords: ["wazuh", "siem", "login", "brute force"] },
  { id: "api", label: "API Monitoring", icon: "api", keywords: ["latency", "sla", "health", "5xx"] },
  { id: "network", label: "Network", icon: "network", keywords: ["bandwidth", "vpn", "ssl", "firewall"] },
  { id: "backup", label: "Backup", icon: "backup", keywords: ["restore", "snapshot", "dr"] },
  { id: "audit", label: "Audit Feed", icon: "audit", keywords: ["mutation", "parcel", "export", "login"] },
  { id: "kpis", label: "Business KPIs", icon: "kpi", keywords: ["mutations", "ulpin", "dgps", "villages"] },
  { id: "alerts", label: "Alerts", icon: "alert", keywords: ["critical", "warning", "acknowledge"] },
];

export type TimeSeriesPoint = { t: string; v: number };

export type MetricGauge = {
  label: string;
  value: number;
  max: number;
  unit: string;
  status: MonitorStatus;
  sparkline: TimeSeriesPoint[];
};

export type ServerHost = {
  name: string;
  role: string;
  status: MonitorStatus;
  uptime: string;
  cpu: number;
  ram: number;
  disk: number;
  temp?: number;
  powerW?: number;
};

export const INFRA_METRICS: MetricGauge[] = [
  { label: "CPU", value: 42, max: 100, unit: "%", status: "healthy", sparkline: mkSpark(38, 48) },
  { label: "RAM", value: 68, max: 100, unit: "%", status: "warning", sparkline: mkSpark(62, 72) },
  { label: "Disk", value: 71, max: 100, unit: "%", status: "warning", sparkline: mkSpark(69, 73) },
  { label: "Disk IOPS", value: 8420, max: 15000, unit: "IOPS", status: "healthy", sparkline: mkSpark(7200, 9200) },
  { label: "Network In", value: 1.2, max: 10, unit: "Gbps", status: "healthy", sparkline: mkSpark(0.8, 1.5) },
  { label: "Network Out", value: 0.86, max: 10, unit: "Gbps", status: "healthy", sparkline: mkSpark(0.6, 1.1) },
  { label: "Load Avg", value: 2.4, max: 8, unit: "", status: "healthy", sparkline: mkSpark(1.8, 2.8) },
];

export type CloudUsageMonth = { month: string; usage: number };

/** Monthly cloud resource usage (normalized units) — last 12 months for trend forecast */
export const CLOUD_USAGE_MONTHLY: CloudUsageMonth[] = [
  { month: "Jul '24", usage: 42.1 },
  { month: "Aug '24", usage: 43.8 },
  { month: "Sep '24", usage: 45.2 },
  { month: "Oct '24", usage: 47.6 },
  { month: "Nov '24", usage: 49.1 },
  { month: "Dec '24", usage: 51.4 },
  { month: "Jan '25", usage: 54.2 },
  { month: "Feb '25", usage: 56.8 },
  { month: "Mar '25", usage: 59.5 },
  { month: "Apr '25", usage: 62.1 },
  { month: "May '25", usage: 65.4 },
  { month: "Jun '25", usage: 67.8 },
];

export type CloudUsageForecast = {
  chartData: { month: string; historical: number | null; forecast: number | null }[];
  predictedNextMonth: number;
  nextMonthLabel: string;
  trendPerMonth: number;
  trendPct: number;
};

export function buildCloudUsageForecast(months: CloudUsageMonth[] = CLOUD_USAGE_MONTHLY): CloudUsageForecast {
  const n = months.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += months[i].usage;
    sumXY += i * months[i].usage;
    sumX2 += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const predictedNextMonth = Math.round((slope * n + intercept) * 10) / 10;
  const last = months[n - 1];
  const first = months[0];
  const trendPerMonth = Math.round(slope * 10) / 10;
  const trendPct = Math.round(((last.usage - first.usage) / first.usage) * 1000) / 10;
  const nextMonthLabel = "Jul '25";

  const chartData: CloudUsageForecast["chartData"] = months.map((m) => ({
    month: m.month,
    historical: m.usage,
    forecast: null,
  }));
  chartData[n - 1].forecast = last.usage;
  const forecastPoint: CloudUsageForecast["chartData"][number] = {
    month: nextMonthLabel,
    historical: null,
    forecast: predictedNextMonth,
  };
  chartData.push(forecastPoint);

  return { chartData, predictedNextMonth, nextMonthLabel, trendPerMonth, trendPct };
}

export const INFRA_SERVERS: ServerHost[] = [
  { name: "doslr-app-01", role: "Spring Boot API", status: "healthy", uptime: "26 days 4h", cpu: 38, ram: 62, disk: 54, temp: 42, powerW: 185 },
  { name: "doslr-app-02", role: "Spring Boot API", status: "healthy", uptime: "26 days 4h", cpu: 44, ram: 65, disk: 56, temp: 44, powerW: 192 },
  { name: "doslr-geo-01", role: "GeoServer + Tile Cache", status: "warning", uptime: "12 days 18h", cpu: 72, ram: 81, disk: 78, temp: 58, powerW: 240 },
  { name: "doslr-db-01", role: "PostgreSQL / PostGIS", status: "healthy", uptime: "89 days 2h", cpu: 28, ram: 74, disk: 71, temp: 39, powerW: 210 },
  { name: "doslr-worker-01", role: "GDAL / ETL Worker", status: "healthy", uptime: "8 days 6h", cpu: 55, ram: 48, disk: 42, temp: 46, powerW: 165 },
  { name: "doslr-obs-01", role: "Prometheus / Grafana", status: "healthy", uptime: "45 days 11h", cpu: 18, ram: 32, disk: 38, temp: 36, powerW: 120 },
];

export const K8S_NODES = [
  { name: "node-pud-01", status: "healthy" as MonitorStatus, pods: 28, cpu: 54, mem: 61, ready: true },
  { name: "node-pud-02", status: "healthy" as MonitorStatus, pods: 31, cpu: 48, mem: 58, ready: true },
  { name: "node-pud-03", status: "warning" as MonitorStatus, pods: 34, cpu: 78, mem: 82, ready: true },
];

export const K8S_DEPLOYMENTS = [
  { name: "geoserver", replicas: "3/3", status: "healthy" as MonitorStatus, cpu: "1.2 cores", mem: "4.8 GB", restarts: 0 },
  { name: "spring-boot-api", replicas: "4/4", status: "healthy" as MonitorStatus, cpu: "2.1 cores", mem: "6.2 GB", restarts: 1 },
  { name: "tile-cache", replicas: "2/2", status: "healthy" as MonitorStatus, cpu: "0.8 cores", mem: "2.1 GB", restarts: 0 },
  { name: "gdal-worker", replicas: "2/3", status: "warning" as MonitorStatus, cpu: "3.4 cores", mem: "8.1 GB", restarts: 2 },
  { name: "rabbitmq", replicas: "1/1", status: "healthy" as MonitorStatus, cpu: "0.3 cores", mem: "1.2 GB", restarts: 0 },
];

export const K8S_PODS = [
  { pod: "geoserver-7f8b9c-abc12", ns: "gis", status: "healthy" as MonitorStatus, restarts: 0, age: "12d", cpu: "420m", mem: "1.6Gi" },
  { pod: "spring-boot-api-def34", ns: "app", status: "healthy" as MonitorStatus, restarts: 0, age: "26d", cpu: "580m", mem: "1.8Gi" },
  { pod: "tile-cache-88aa1", ns: "gis", status: "healthy" as MonitorStatus, restarts: 0, age: "8d", cpu: "210m", mem: "980Mi" },
  { pod: "gdal-worker-x7k2m", ns: "etl", status: "restarting" as MonitorStatus, restarts: 2, age: "2h", cpu: "1.2", mem: "3.1Gi" },
];

export const DOCKER_CONTAINERS = [
  { name: "doslr-geoserver", image: "geoserver:2.24.2", cpu: "18%", mem: "3.2 GB", net: "420 MB/s", restarts: 0, status: "healthy" as MonitorStatus },
  { name: "doslr-api", image: "doslr-api:3.8.1", cpu: "12%", mem: "2.1 GB", net: "180 MB/s", restarts: 0, status: "healthy" as MonitorStatus },
  { name: "doslr-postgis", image: "postgis:16-3.4", cpu: "8%", mem: "12.4 GB", net: "95 MB/s", restarts: 0, status: "healthy" as MonitorStatus },
  { name: "doslr-redis", image: "redis:7.2", cpu: "2%", mem: "512 MB", net: "12 MB/s", restarts: 1, status: "healthy" as MonitorStatus },
  { name: "doslr-tilegen", image: "tilegen:1.4.0", cpu: "34%", mem: "1.8 GB", net: "240 MB/s", restarts: 0, status: "warning" as MonitorStatus },
  { name: "cadvisor", image: "cadvisor:0.49", cpu: "1%", mem: "128 MB", net: "2 MB/s", restarts: 0, status: "healthy" as MonitorStatus },
];

export const DB_METRICS = {
  connections: { active: 120, max: 200, idle: 42, status: "healthy" as MonitorStatus },
  slowQueries: { count: 14, worstMs: 2800, threshold: 1000, status: "warning" as MonitorStatus },
  locks: { waiting: 2, deadlocks24h: 0, status: "healthy" as MonitorStatus },
  replication: { lagMs: 42, role: "primary", replica: "doslr-db-replica-01", status: "healthy" as MonitorStatus },
  cacheHitRatio: 94.2,
  indexUsage: 87.6,
  avgQueryMs: 18.4,
  dbSizeGb: 580,
  postgis: {
    spatialIndexes: 142,
    gistScans24h: 284000,
    stIntersectsCalls: 18420,
    geometryValidity: 99.7,
  },
};

export const DB_TABLES = [
  { table: "parcel_geometry", size: "312 GB", rows: "2.34M", idxScan: "98%", status: "healthy" as MonitorStatus },
  { table: "mutation_records", size: "84 GB", rows: "890K", idxScan: "92%", status: "healthy" as MonitorStatus },
  { table: "village_boundaries", size: "42 GB", rows: "12.4K", idxScan: "88%", status: "healthy" as MonitorStatus },
  { table: "audit_events", size: "68 GB", rows: "4.1M", idxScan: "76%", status: "warning" as MonitorStatus },
  { table: "spatial_ref_sys", size: "12 MB", rows: "8.5K", idxScan: "100%", status: "healthy" as MonitorStatus },
];

export const GEOSERVER_METRICS = {
  wms: 18420,
  wfs: 3240,
  wmts: 42180,
  tileCacheHit: 87.4,
  tileCacheMiss: 12.6,
  avgRenderMs: 240,
  activeSessions: 48,
  status: "warning" as MonitorStatus,
};

export const GEOSERVER_LAYERS = [
  { layer: "Village Parcels", requests: 8420, avgLoadSec: 12, status: "warning" as MonitorStatus },
  { layer: "Cadastral Boundaries", requests: 6240, avgLoadSec: 1.2, status: "healthy" as MonitorStatus },
  { layer: "FMB Sheets", requests: 2180, avgLoadSec: 2.8, status: "healthy" as MonitorStatus },
  { layer: "Ortho Imagery 2024", requests: 9840, avgLoadSec: 0.4, status: "healthy" as MonitorStatus },
  { layer: "Mutation Overlay", requests: 1420, avgLoadSec: 0.9, status: "healthy" as MonitorStatus },
  { layer: "DGPS Survey Points", requests: 680, avgLoadSec: 0.3, status: "healthy" as MonitorStatus },
];

export const APP_ENDPOINTS = [
  { endpoint: "POST /api/auth/login", p50: 120, p95: 200, p99: 340, rps: 42, errors: 0, status: "healthy" as MonitorStatus },
  { endpoint: "POST /api/mutations", p50: 840, p95: 1800, p99: 2400, rps: 18, errors: 2, status: "warning" as MonitorStatus },
  { endpoint: "GET /api/parcels/search", p50: 68, p95: 120, p99: 280, rps: 124, errors: 0, status: "healthy" as MonitorStatus },
  { endpoint: "GET /api/ulpin/resolve", p50: 45, p95: 90, p99: 180, rps: 86, errors: 0, status: "healthy" as MonitorStatus },
  { endpoint: "POST /api/gis/spatial-query", p50: 220, p95: 480, p99: 920, rps: 34, errors: 1, status: "healthy" as MonitorStatus },
];

export const APP_JVM = {
  threads: { active: 84, peak: 112, daemon: 42 },
  heapUsedGb: 4.2,
  heapMaxGb: 8,
  gcTimeMs: 420,
  failedRequests24h: 18,
  loginCount24h: 284,
  mutationCount24h: 48,
  queueSize: 12,
  backgroundJobs: 6,
};

export const FRONTEND_METRICS = {
  jsErrors24h: 8,
  brokenPages: 1,
  slowLoads: 14,
  activeSessions: 186,
  avgPageLoadMs: 1240,
  browsers: [
    { name: "Chrome", pct: 62 },
    { name: "Edge", pct: 24 },
    { name: "Firefox", pct: 8 },
    { name: "Safari", pct: 6 },
  ],
};

export const FRONTEND_ERRORS = [
  { time: "10:42:18", page: "/app", error: "TypeError: Cannot read properties of undefined (reading 'getExtent')", count: 3, severity: "warning" as MonitorStatus },
  { time: "10:38:02", page: "/workflows/mutation", error: "ChunkLoadError: Loading chunk 482 failed", count: 1, severity: "critical" as MonitorStatus },
  { time: "10:21:44", page: "/database", error: "NetworkError: Failed to fetch parcel batch", count: 2, severity: "warning" as MonitorStatus },
  { time: "09:55:12", page: "/nil-ai", error: "WebGL context lost during map render", count: 1, severity: "info" as MonitorStatus },
];

export const GIS_METRICS = [
  { metric: "Tile generation", value: "1,240/min", status: "healthy" as MonitorStatus },
  { metric: "Map render (avg)", value: "180ms", status: "healthy" as MonitorStatus },
  { metric: "Village layer load", value: "180ms", status: "healthy" as MonitorStatus },
  { metric: "Spatial search", value: "42ms", status: "healthy" as MonitorStatus },
  { metric: "Spatial index usage", value: "94.2%", status: "healthy" as MonitorStatus },
  { metric: "Failed WMS (24h)", value: "12", status: "warning" as MonitorStatus },
  { metric: "Parcel query (p95)", value: "120ms", status: "healthy" as MonitorStatus },
  { metric: "Ortho tile cache hit", value: "91.8%", status: "healthy" as MonitorStatus },
];

export const GDAL_JOBS = {
  running: 4,
  queued: 18,
  successRate: 96.8,
  rmsErrorM: 0.18,
  failed24h: 3,
  avgWarpMin: 4.2,
  avgImportMin: 8.6,
  perVillageMin: 12.4,
};

export const GDAL_RECENT = [
  { id: "GDAL-8842", village: "Khutal Sector 4", type: "Warp", status: "healthy" as MonitorStatus, rms: 0.12, duration: "3m 42s" },
  { id: "GDAL-8841", village: "Murbad Block A", type: "Import", status: "healthy" as MonitorStatus, rms: 0.18, duration: "7m 18s" },
  { id: "GDAL-8840", village: "Villianur", type: "Georef", status: "warning" as MonitorStatus, rms: 0.42, duration: "14m 02s" },
  { id: "GDAL-8839", village: "Oulgaret", type: "Warp", status: "critical" as MonitorStatus, rms: null, duration: "failed" },
];

export const JOB_QUEUES = [
  { queue: "tile-generation", depth: 42, processing: 4, failed: 1, status: "warning" as MonitorStatus, engine: "Quartz" },
  { queue: "georeferencing", depth: 18, processing: 4, failed: 0, status: "healthy" as MonitorStatus, engine: "RabbitMQ" },
  { queue: "raster-import", depth: 8, processing: 2, failed: 0, status: "healthy" as MonitorStatus, engine: "RabbitMQ" },
  { queue: "shapefile-import", depth: 3, processing: 1, failed: 0, status: "healthy" as MonitorStatus, engine: "Quartz" },
  { queue: "ulpin-sync", depth: 124, processing: 8, failed: 2, status: "warning" as MonitorStatus, engine: "RabbitMQ" },
];

export const JOB_TABLE = [
  { id: "JOB-44281", type: "Tile generation", target: "Villianur ortho L18", status: "running" as MonitorStatus, progress: 68, started: "10:38" },
  { id: "JOB-44280", type: "ULPIN sync", target: "Batch 2026-06-28-A", status: "healthy" as MonitorStatus, progress: 100, started: "10:12" },
  { id: "JOB-44279", type: "Shapefile import", target: "FMB Puducherry Q2", status: "warning" as MonitorStatus, progress: 42, started: "10:05" },
  { id: "JOB-44278", type: "Georeferencing", target: "Drone mosaic — Oulgaret", status: "running" as MonitorStatus, progress: 24, started: "09:48" },
];

export const OBJECT_STORAGE = [
  { bucket: "orthomosaics", objects: 1842, sizeTb: 12.4, uploadMbps: 420, downloadMbps: 840, failedUploads: 0, status: "healthy" as MonitorStatus },
  { bucket: "fmb-pdfs", objects: 42800, sizeTb: 2.1, uploadMbps: 120, downloadMbps: 280, failedUploads: 1, status: "healthy" as MonitorStatus },
  { bucket: "drone-images", objects: 98420, sizeTb: 8.6, uploadMbps: 680, downloadMbps: 920, failedUploads: 2, status: "warning" as MonitorStatus },
  { bucket: "documents", objects: 124000, sizeTb: 0.84, uploadMbps: 45, downloadMbps: 120, failedUploads: 0, status: "healthy" as MonitorStatus },
];

export const SECURITY_ALERTS = [
  { time: "10:41:02", severity: "warning" as MonitorStatus, source: "Wazuh", message: "5 failed login attempts from 103.42.18.92 — Revenue Officer portal" },
  { time: "10:38:44", severity: "info" as MonitorStatus, source: "SIEM", message: "Role change: user kumar.v promoted to Surveyor — approved by anitha.r" },
  { time: "10:22:18", severity: "critical" as MonitorStatus, source: "Wazuh", message: "Brute force pattern detected — IP 198.51.100.42 added to watchlist" },
  { time: "10:18:06", severity: "warning" as MonitorStatus, source: "API Gateway", message: "Rate limit exceeded: /api/parcels/search — 1,240 req/min from 10.0.4.18" },
  { time: "09:55:30", severity: "info" as MonitorStatus, source: "Auth", message: "Unauthorized access attempt — /admin without Admin role (blocked)" },
];

export const SECURITY_STATS = {
  failedLogins24h: 28,
  unauthorized24h: 6,
  roleChanges24h: 3,
  apiAbuse24h: 4,
  watchlistIps: 12,
};

export const API_HEALTH = [
  { endpoint: "/actuator/health", status: "healthy" as MonitorStatus, latencyMs: 12, uptime: "99.98%" },
  { endpoint: "/api/health", status: "healthy" as MonitorStatus, latencyMs: 18, uptime: "99.96%" },
  { endpoint: "/geoserver/ows", status: "warning" as MonitorStatus, latencyMs: 420, uptime: "99.82%" },
  { endpoint: "/api/gis/tiles", status: "healthy" as MonitorStatus, latencyMs: 84, uptime: "99.94%" },
];

export const API_TRAFFIC = {
  rps: 284,
  p50: 42,
  p95: 280,
  p99: 840,
  errors4xx: 124,
  errors5xx: 8,
  availability: 99.94,
};

export const NETWORK_METRICS = {
  bandwidthInGbps: 1.2,
  bandwidthOutGbps: 0.86,
  packetLossPct: 0.02,
  latencyMs: 4.2,
  vpnStatus: "healthy" as MonitorStatus,
  firewallStatus: "healthy" as MonitorStatus,
  sslCerts: [
    { domain: "doslr.gov.in", expires: "2026-11-14", daysLeft: 139, status: "healthy" as MonitorStatus },
    { domain: "api.doslr.gov.in", expires: "2026-09-02", daysLeft: 66, status: "warning" as MonitorStatus },
    { domain: "geo.doslr.gov.in", expires: "2027-01-28", daysLeft: 214, status: "healthy" as MonitorStatus },
  ],
};

export const BACKUP_STATUS = [
  { name: "PostgreSQL full", lastSuccess: "2026-06-28 02:00", age: "8h 42m", sizeTb: 0.58, restoreTest: "passed", status: "healthy" as MonitorStatus },
  { name: "GeoServer config", lastSuccess: "2026-06-28 03:15", age: "7h 27m", sizeTb: 0.002, restoreTest: "passed", status: "healthy" as MonitorStatus },
  { name: "Object storage sync", lastSuccess: "2026-06-27 23:00", age: "11h 42m", sizeTb: 23.8, restoreTest: "scheduled", status: "healthy" as MonitorStatus },
  { name: "Audit log archive", lastSuccess: "2026-06-26 01:00", age: "2d 9h", sizeTb: 0.12, restoreTest: "passed", status: "warning" as MonitorStatus },
];

export const AUDIT_FEED = [
  { time: "10:42:44", user: "kumar.v", action: "Edited parcel geometry", detail: "ULPIN PY-04-012-0001842 — boundary adjustment" },
  { time: "10:41:18", user: "anitha.r", action: "Approved mutation", detail: "Mutation MUT-2026-04821 — Villianur" },
  { time: "10:40:02", user: "rajesh.m", action: "Logged in", detail: "Revenue Officer — SSO / 2FA verified" },
  { time: "10:38:56", user: "system", action: "Exported files", detail: "FMB batch export — 240 sheets — Oulgaret commune" },
  { time: "10:36:12", user: "priya.s", action: "Deleted draft record", detail: "Draft mutation MUT-DRAFT-882 removed" },
  { time: "10:34:08", user: "kumar.v", action: "DGPS survey submitted", detail: "18 vertices — Khutal Sector 4" },
];

export const BUSINESS_KPIS = [
  { label: "Today's mutations", value: 48, hint: "+12% vs yesterday", tone: "info" as const },
  { label: "Pending approvals", value: 12, hint: "4 urgent > 48h", tone: "warning" as const },
  { label: "DGPS surveys today", value: 18, hint: "6 teams active", tone: "success" as const },
  { label: "Villages completed", value: "84%", hint: "168 / 200 villages", tone: "success" as const },
  { label: "ULPIN generated", value: "2,34,567", hint: "National registry sync OK", tone: "info" as const },
  { label: "Failed imports", value: 2, hint: "Shapefile + drone mosaic", tone: "danger" as const },
];

export const KPI_TREND = mkSpark(40, 52).map((p, i) => ({ day: `D-${6 - i}`, mutations: p.v, surveys: Math.round(p.v * 0.4) }));

export type AlertSeverity = "critical" | "warning" | "info";

export type MonitorAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  source: string;
  since: string;
  acknowledged: boolean;
};

export const MONITOR_ALERTS: MonitorAlert[] = [
  { id: "ALT-001", severity: "critical", title: "GeoServer pod high memory", detail: "geoserver-7f8b9c using 92% memory — tile rendering degraded", source: "Prometheus", since: "12m ago", acknowledged: false },
  { id: "ALT-002", severity: "warning", title: "Disk usage > 70%", detail: "doslr-db-01 /data volume at 71% — 580 GB PostGIS", source: "Node Exporter", since: "2h ago", acknowledged: false },
  { id: "ALT-003", severity: "warning", title: "Village Parcels layer slow", detail: "Avg load time 12s — exceeds 5s SLA", source: "GeoServer", since: "45m ago", acknowledged: true },
  { id: "ALT-004", severity: "info", title: "ULPIN sync queue depth", detail: "124 jobs pending — within capacity", source: "RabbitMQ", since: "8m ago", acknowledged: false },
  { id: "ALT-005", severity: "critical", title: "GDAL job failed", detail: "GDAL-8839 Oulgaret warp — CRS mismatch", source: "ETL Worker", since: "1h ago", acknowledged: false },
  { id: "ALT-006", severity: "warning", title: "SSL cert expiring", detail: "api.doslr.gov.in expires in 66 days", source: "Cert Monitor", since: "1d ago", acknowledged: true },
];

export const ARCHITECTURE_STACK = [
  { layer: "Grafana", desc: "Dashboards & alerting", status: "healthy" as MonitorStatus },
  { layer: "Prometheus", desc: "Metrics collection", status: "healthy" as MonitorStatus },
  { layer: "Alertmanager", desc: "Incident routing", status: "healthy" as MonitorStatus },
  { layer: "Spring Boot", desc: "REST API + Actuator", status: "healthy" as MonitorStatus },
  { layer: "GeoServer", desc: "WMS/WFS/WMTS", status: "warning" as MonitorStatus },
  { layer: "PostgreSQL", desc: "PostGIS cadastral DB", status: "healthy" as MonitorStatus },
  { layer: "React", desc: "DoSLR frontend", status: "healthy" as MonitorStatus },
  { layer: "Object Store", desc: "Ortho / FMB / drone", status: "healthy" as MonitorStatus },
];

function mkSpark(min: number, max: number): TimeSeriesPoint[] {
  const pts: TimeSeriesPoint[] = [];
  for (let i = 0; i < 24; i++) {
    pts.push({ t: `${i}h`, v: Math.round(min + Math.random() * (max - min)) });
  }
  return pts;
}

export function jitterMetric(value: number, pct = 0.03): number {
  const delta = value * pct * (Math.random() * 2 - 1);
  return Math.round((value + delta) * 10) / 10;
}
