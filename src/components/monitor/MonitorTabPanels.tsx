import {
  API_HEALTH,
  API_TRAFFIC,
  APP_ENDPOINTS,
  APP_JVM,
  ARCHITECTURE_STACK,
  AUDIT_FEED,
  BACKUP_STATUS,
  BUSINESS_KPIS,
  DB_METRICS,
  DB_TABLES,
  DOCKER_CONTAINERS,
  FRONTEND_ERRORS,
  FRONTEND_METRICS,
  GDAL_JOBS,
  GDAL_RECENT,
  GEOSERVER_LAYERS,
  GEOSERVER_METRICS,
  GIS_METRICS,
  INFRA_METRICS,
  INFRA_SERVERS,
  JOB_QUEUES,
  JOB_TABLE,
  K8S_DEPLOYMENTS,
  K8S_NODES,
  K8S_PODS,
  KPI_TREND,
  NETWORK_METRICS,
  OBJECT_STORAGE,
  SECURITY_ALERTS,
  SECURITY_STATS,
  type MonitorAlert,
} from "../../data/monitorMock";
import {
  DataTable,
  DonutChart,
  MetricGaugeRing,
  MiniBarChart,
  MiniLineChart,
  MonitorCard,
  ProgressBar,
  Sparkline,
  StatCard,
  StatusBadge,
} from "./MonitorShared";

export function InfrastructureTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {INFRA_METRICS.map((m) => (
          <MetricGaugeRing key={m.label} label={m.label} value={m.value} max={m.max} unit={m.unit} status={m.status} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonitorCard title="CPU & RAM trend" subtitle="Last 24 hours — Prometheus scrape">
          <MiniLineChart
            data={INFRA_METRICS[0].sparkline.map((p, i) => ({
              t: p.t,
              cpu: p.v,
              ram: INFRA_METRICS[1].sparkline[i]?.v ?? 0,
            }))}
            xKey="t"
            lines={[
              { key: "cpu", color: "#0284c7" },
              { key: "ram", color: "#f59e0b" },
            ]}
          />
        </MonitorCard>
        <MonitorCard title="Network throughput" subtitle="Ingress / egress">
          {INFRA_METRICS.slice(4, 6).map((m) => (
            <div key={m.label} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-600">{m.label}</span>
                <span className="font-semibold">{m.value} {m.unit}</span>
              </div>
              <Sparkline data={m.sparkline} color={m.label.includes("In") ? "#10b981" : "#6366f1"} />
            </div>
          ))}
        </MonitorCard>
      </div>
      <MonitorCard title="Server inventory" subtitle="Node exporter — live status">
        <DataTable
          columns={[
            { key: "name", label: "Host" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
            { key: "uptime", label: "Uptime" },
            { key: "cpu", label: "CPU", render: (r) => `${r.cpu}%` },
            { key: "ram", label: "RAM", render: (r) => `${r.ram}%` },
            { key: "disk", label: "Disk", render: (r) => `${r.disk}%` },
            { key: "temp", label: "Temp", render: (r) => (r.temp ? `${r.temp}°C` : "—") },
            { key: "powerW", label: "Power", render: (r) => (r.powerW ? `${r.powerW}W` : "—") },
          ]}
          rows={INFRA_SERVERS as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
    </div>
  );
}

export function KubernetesTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "GeoServer Pod", status: "healthy" as const, detail: "3/3 replicas — WMS/WFS active" },
          { label: "Spring Boot", status: "healthy" as const, detail: "4/4 replicas — API p95 280ms" },
          { label: "Tile Cache", status: "healthy" as const, detail: "2/2 replicas — 87% hit rate" },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{c.label}</h4>
              <StatusBadge status={c.status} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{c.detail}</p>
          </div>
        ))}
      </div>
      <MonitorCard title="Cluster nodes" subtitle="kubectl top nodes">
        <DataTable
          columns={[
            { key: "name", label: "Node" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
            { key: "pods", label: "Pods" },
            { key: "cpu", label: "CPU %", render: (r) => `${r.cpu}%` },
            { key: "mem", label: "Memory %", render: (r) => `${r.mem}%` },
            { key: "ready", label: "Ready", render: (r) => (r.ready ? "Yes" : "No") },
          ]}
          rows={K8S_NODES as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonitorCard title="Deployments" subtitle="Desired vs available">
          <DataTable
            columns={[
              { key: "name", label: "Deployment" },
              { key: "replicas", label: "Replicas" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
              { key: "cpu", label: "CPU" },
              { key: "mem", label: "Memory" },
              { key: "restarts", label: "Restarts" },
            ]}
            rows={K8S_DEPLOYMENTS as unknown as Record<string, unknown>[]}
          />
        </MonitorCard>
        <MonitorCard title="Pods" subtitle="Container runtime">
          <DataTable
            columns={[
              { key: "pod", label: "Pod" },
              { key: "ns", label: "Namespace" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
              { key: "restarts", label: "Restarts" },
              { key: "age", label: "Age" },
              { key: "cpu", label: "CPU" },
              { key: "mem", label: "Mem" },
            ]}
            rows={K8S_PODS as unknown as Record<string, unknown>[]}
          />
        </MonitorCard>
      </div>
    </div>
  );
}

export function DockerTab() {
  return (
    <MonitorCard title="Container metrics" subtitle="cAdvisor — CPU, memory, network, restarts">
      <DataTable
        columns={[
          { key: "name", label: "Container" },
          { key: "image", label: "Image" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
          { key: "cpu", label: "CPU" },
          { key: "mem", label: "Memory" },
          { key: "net", label: "Network" },
          { key: "restarts", label: "Restarts" },
          {
            key: "logs",
            label: "Logs",
            render: () => (
              <button type="button" className="text-sky-600 hover:underline">
                View →
              </button>
            ),
          },
        ]}
        rows={DOCKER_CONTAINERS as unknown as Record<string, unknown>[]}
      />
    </MonitorCard>
  );
}

export function DatabaseTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active connections" value={DB_METRICS.connections.active} hint={`Max ${DB_METRICS.connections.max}`} tone="info" />
        <StatCard label="Slow queries" value={DB_METRICS.slowQueries.count} hint={`Worst ${DB_METRICS.slowQueries.worstMs}ms`} tone="warning" />
        <StatCard label="Cache hit ratio" value={`${DB_METRICS.cacheHitRatio}%`} hint="Shared buffers + OS" tone="success" />
        <StatCard label="Database size" value={`${DB_METRICS.dbSizeGb} GB`} hint="PostGIS cadastral" tone="neutral" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonitorCard title="Replication & locks" subtitle="Streaming replica lag">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-slate-500">Lag</dt><dd className="font-semibold">{DB_METRICS.replication.lagMs} ms</dd></div>
            <div><dt className="text-slate-500">Role</dt><dd className="font-semibold">{DB_METRICS.replication.role}</dd></div>
            <div><dt className="text-slate-500">Replica</dt><dd className="font-semibold">{DB_METRICS.replication.replica}</dd></div>
            <div><dt className="text-slate-500">Locks waiting</dt><dd className="font-semibold">{DB_METRICS.locks.waiting}</dd></div>
            <div><dt className="text-slate-500">Deadlocks (24h)</dt><dd className="font-semibold">{DB_METRICS.locks.deadlocks24h}</dd></div>
            <div><dt className="text-slate-500">Avg query time</dt><dd className="font-semibold">{DB_METRICS.avgQueryMs} ms</dd></div>
          </dl>
        </MonitorCard>
        <MonitorCard title="PostGIS metrics" subtitle="Spatial index & geometry health">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            <div><dt className="text-slate-500">GiST indexes</dt><dd className="font-semibold">{DB_METRICS.postgis.spatialIndexes}</dd></div>
            <div><dt className="text-slate-500">GiST scans (24h)</dt><dd className="font-semibold">{DB_METRICS.postgis.gistScans24h.toLocaleString()}</dd></div>
            <div><dt className="text-slate-500">ST_Intersects calls</dt><dd className="font-semibold">{DB_METRICS.postgis.stIntersectsCalls.toLocaleString()}</dd></div>
            <div><dt className="text-slate-500">Geometry validity</dt><dd className="font-semibold">{DB_METRICS.postgis.geometryValidity}%</dd></div>
            <div><dt className="text-slate-500">Index usage</dt><dd className="font-semibold">{DB_METRICS.indexUsage}%</dd></div>
          </dl>
        </MonitorCard>
      </div>
      <MonitorCard title="Table sizes & index usage" subtitle="pg_stat_user_tables">
        <DataTable
          columns={[
            { key: "table", label: "Table" },
            { key: "size", label: "Size" },
            { key: "rows", label: "Rows" },
            { key: "idxScan", label: "Index scan %" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
          ]}
          rows={DB_TABLES as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
    </div>
  );
}

export function GeoServerTab() {
  const hitData = [
    { name: "Hit", value: GEOSERVER_METRICS.tileCacheHit },
    { name: "Miss", value: GEOSERVER_METRICS.tileCacheMiss },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="WMS requests" value={GEOSERVER_METRICS.wms.toLocaleString()} tone="info" />
        <StatCard label="WFS requests" value={GEOSERVER_METRICS.wfs.toLocaleString()} tone="neutral" />
        <StatCard label="WMTS requests" value={GEOSERVER_METRICS.wmts.toLocaleString()} tone="info" />
        <StatCard label="Active sessions" value={GEOSERVER_METRICS.activeSessions} tone="success" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonitorCard title="Tile cache" subtitle={`Avg render ${GEOSERVER_METRICS.avgRenderMs}ms`}>
          <DonutChart data={hitData} colors={["#10b981", "#f59e0b"]} />
          <div className="mt-2 flex justify-center gap-4 text-xs text-slate-600">
            <span>Hit {GEOSERVER_METRICS.tileCacheHit}%</span>
            <span>Miss {GEOSERVER_METRICS.tileCacheMiss}%</span>
          </div>
        </MonitorCard>
        <MonitorCard title="Service health" subtitle="GeoServer cluster">
          <StatusBadge status={GEOSERVER_METRICS.status} />
          <p className="mt-3 text-xs text-slate-600">GeoServer pod memory elevated — Village Parcels layer exceeding SLA.</p>
        </MonitorCard>
      </div>
      <MonitorCard title="Per-layer performance" subtitle="Request count & load time">
        <DataTable
          columns={[
            { key: "layer", label: "Layer" },
            { key: "requests", label: "Requests (24h)", render: (r) => Number(r.requests).toLocaleString() },
            { key: "avgLoadSec", label: "Avg load", render: (r) => `${r.avgLoadSec}s` },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
          ]}
          rows={GEOSERVER_LAYERS as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
    </div>
  );
}

export function ApplicationTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Logins (24h)" value={APP_JVM.loginCount24h} tone="info" />
        <StatCard label="Mutations (24h)" value={APP_JVM.mutationCount24h} tone="success" />
        <StatCard label="Failed requests" value={APP_JVM.failedRequests24h} tone="warning" />
        <StatCard label="Queue size" value={APP_JVM.queueSize} hint={`${APP_JVM.backgroundJobs} background jobs`} tone="neutral" />
      </div>
      <MonitorCard title="API latency — Micrometer / Actuator" subtitle="p50 / p95 / p99 per endpoint">
        <DataTable
          columns={[
            { key: "endpoint", label: "Endpoint" },
            { key: "p50", label: "p50", render: (r) => `${r.p50}ms` },
            { key: "p95", label: "p95", render: (r) => `${r.p95}ms` },
            { key: "p99", label: "p99", render: (r) => `${r.p99}ms` },
            { key: "rps", label: "RPS" },
            { key: "errors", label: "Errors" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
          ]}
          rows={APP_ENDPOINTS as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
      <MonitorCard title="JVM metrics" subtitle="Heap, threads, GC">
        <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
          <div><dt className="text-slate-500">Heap</dt><dd className="text-lg font-semibold">{APP_JVM.heapUsedGb}/{APP_JVM.heapMaxGb} GB</dd></div>
          <div><dt className="text-slate-500">Threads</dt><dd className="text-lg font-semibold">{APP_JVM.threads.active} <span className="text-slate-400">/ peak {APP_JVM.threads.peak}</span></dd></div>
          <div><dt className="text-slate-500">GC time</dt><dd className="text-lg font-semibold">{APP_JVM.gcTimeMs} ms</dd></div>
          <div><dt className="text-slate-500">Daemon threads</dt><dd className="text-lg font-semibold">{APP_JVM.threads.daemon}</dd></div>
        </dl>
        <div className="mt-3">
          <p className="mb-1 text-[10px] text-slate-500">Heap usage</p>
          <ProgressBar value={APP_JVM.heapUsedGb} max={APP_JVM.heapMaxGb} status="healthy" />
        </div>
      </MonitorCard>
    </div>
  );
}

export function FrontendTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="JS errors (24h)" value={FRONTEND_METRICS.jsErrors24h} tone="warning" />
        <StatCard label="Broken pages" value={FRONTEND_METRICS.brokenPages} tone="danger" />
        <StatCard label="Slow loads" value={FRONTEND_METRICS.slowLoads} tone="warning" />
        <StatCard label="Active sessions" value={FRONTEND_METRICS.activeSessions} tone="success" />
        <StatCard label="Avg page load" value={`${FRONTEND_METRICS.avgPageLoadMs}ms`} tone="neutral" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonitorCard title="Browser breakdown" subtitle="Active sessions by browser">
          <DonutChart
            data={FRONTEND_METRICS.browsers.map((b) => ({ name: b.name, value: b.pct }))}
            colors={["#4285f4", "#0078d4", "#ff7139", "#006cff"]}
          />
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            {FRONTEND_METRICS.browsers.map((b) => (
              <li key={b.name} className="flex justify-between"><span>{b.name}</span><span className="font-medium">{b.pct}%</span></li>
            ))}
          </ul>
        </MonitorCard>
        <MonitorCard title="Recent errors" subtitle="Sentry-style feed">
          <ul className="max-h-52 space-y-2 overflow-y-auto">
            {FRONTEND_ERRORS.map((e, i) => (
              <li key={i} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{e.time}</span>
                  <StatusBadge status={e.severity} />
                </div>
                <p className="mt-1 font-medium text-slate-700">{e.page}</p>
                <p className="mt-0.5 text-slate-500">{e.error}</p>
                <p className="mt-1 text-[10px] text-slate-400">{e.count} events</p>
              </li>
            ))}
          </ul>
        </MonitorCard>
      </div>
    </div>
  );
}

export function GisTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GIS_METRICS.map((m) => (
          <div key={m.metric} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{m.metric}</p>
              <StatusBadge status={m.status} />
            </div>
            <p className="mt-2 text-2xl font-bold text-[#1A1A1A]">{m.value}</p>
          </div>
        ))}
      </div>
      <MonitorCard title="Spatial operations timeline" subtitle="Parcel queries & WMS failures">
        <MiniBarChart data={KPI_TREND} xKey="day" yKey="mutations" color="#0284c7" />
      </MonitorCard>
    </div>
  );
}

export function GdalTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jobs running" value={GDAL_JOBS.running} tone="info" />
        <StatCard label="Queued" value={GDAL_JOBS.queued} tone="warning" />
        <StatCard label="Success rate" value={`${GDAL_JOBS.successRate}%`} tone="success" />
        <StatCard label="RMS error" value={`${GDAL_JOBS.rmsErrorM}m`} hint="Sub-metre accuracy" tone="success" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonitorCard title="Processing times" subtitle="Average per operation">
          <dl className="grid grid-cols-3 gap-3 text-xs">
            <div><dt className="text-slate-500">Warp</dt><dd className="text-lg font-semibold">{GDAL_JOBS.avgWarpMin} min</dd></div>
            <div><dt className="text-slate-500">Import</dt><dd className="text-lg font-semibold">{GDAL_JOBS.avgImportMin} min</dd></div>
            <div><dt className="text-slate-500">Per village</dt><dd className="text-lg font-semibold">{GDAL_JOBS.perVillageMin} min</dd></div>
          </dl>
          <p className="mt-3 text-xs text-rose-600">{GDAL_JOBS.failed24h} failed jobs in last 24h</p>
        </MonitorCard>
        <MonitorCard title="Recent jobs" subtitle="GDAL pipeline">
          <DataTable
            columns={[
              { key: "id", label: "Job" },
              { key: "village", label: "Village" },
              { key: "type", label: "Type" },
              { key: "rms", label: "RMS", render: (r) => (r.rms != null ? `${r.rms}m` : "—") },
              { key: "duration", label: "Duration" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
            ]}
            rows={GDAL_RECENT as unknown as Record<string, unknown>[]}
          />
        </MonitorCard>
      </div>
    </div>
  );
}

export function BackgroundJobsTab() {
  return (
    <div className="space-y-4">
      <MonitorCard title="Queue depth" subtitle="Quartz & RabbitMQ">
        <DataTable
          columns={[
            { key: "queue", label: "Queue" },
            { key: "engine", label: "Engine" },
            { key: "depth", label: "Depth" },
            { key: "processing", label: "Processing" },
            { key: "failed", label: "Failed" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
          ]}
          rows={JOB_QUEUES as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
      <MonitorCard title="Active jobs" subtitle="Real-time job status">
        <DataTable
          columns={[
            { key: "id", label: "Job ID" },
            { key: "type", label: "Type" },
            { key: "target", label: "Target" },
            { key: "started", label: "Started" },
            { key: "progress", label: "Progress", render: (r) => {
              const progress = Number(r.progress ?? 0);
              return (
                <div className="flex items-center gap-2">
                  <div className="w-20"><ProgressBar value={progress} status={r.status as never} /></div>
                  <span>{progress}%</span>
                </div>
              );
            } },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
          ]}
          rows={JOB_TABLE as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
    </div>
  );
}

export function ObjectStorageTab() {
  return (
    <MonitorCard title="Object storage buckets" subtitle="Orthomosaics, FMB PDFs, drone imagery, documents">
      <DataTable
        columns={[
          { key: "bucket", label: "Bucket" },
          { key: "objects", label: "Objects", render: (r) => Number(r.objects).toLocaleString() },
          { key: "sizeTb", label: "Size (TB)", render: (r) => `${r.sizeTb} TB` },
          { key: "uploadMbps", label: "Upload", render: (r) => `${r.uploadMbps} Mbps` },
          { key: "downloadMbps", label: "Download", render: (r) => `${r.downloadMbps} Mbps` },
          { key: "failedUploads", label: "Failed" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
        ]}
        rows={OBJECT_STORAGE as unknown as Record<string, unknown>[]}
      />
    </MonitorCard>
  );
}

export function SecurityTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Failed logins" value={SECURITY_STATS.failedLogins24h} tone="warning" />
        <StatCard label="Unauthorized" value={SECURITY_STATS.unauthorized24h} tone="danger" />
        <StatCard label="Role changes" value={SECURITY_STATS.roleChanges24h} tone="info" />
        <StatCard label="API abuse" value={SECURITY_STATS.apiAbuse24h} tone="warning" />
        <StatCard label="Watchlist IPs" value={SECURITY_STATS.watchlistIps} tone="danger" />
      </div>
      <MonitorCard title="SIEM alert feed" subtitle="Wazuh / API Gateway / Auth">
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {SECURITY_ALERTS.map((a, i) => (
            <li key={i} className="flex gap-3 rounded-xl border border-slate-100 p-3 text-xs">
              <StatusBadge status={a.severity} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400">{a.time}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{a.source}</span>
                </div>
                <p className="mt-1 text-slate-700">{a.message}</p>
              </div>
            </li>
          ))}
        </ul>
      </MonitorCard>
    </div>
  );
}

export function ApiTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Requests/sec" value={API_TRAFFIC.rps} tone="info" />
        <StatCard label="p95 latency" value={`${API_TRAFFIC.p95}ms`} tone="neutral" />
        <StatCard label="5xx errors" value={API_TRAFFIC.errors5xx} tone="warning" />
        <StatCard label="SLA availability" value={`${API_TRAFFIC.availability}%`} tone="success" />
      </div>
      <MonitorCard title="Health endpoints" subtitle="Synthetic probes every 30s">
        <DataTable
          columns={[
            { key: "endpoint", label: "Endpoint" },
            { key: "latencyMs", label: "Latency", render: (r) => `${r.latencyMs}ms` },
            { key: "uptime", label: "Uptime (30d)" },
            { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
          ]}
          rows={API_HEALTH as unknown as Record<string, unknown>[]}
        />
      </MonitorCard>
      <MonitorCard title="Latency percentiles" subtitle="Global API gateway">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] text-slate-500">p50</dt><dd className="text-2xl font-bold">{API_TRAFFIC.p50}ms</dd></div>
          <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] text-slate-500">p95</dt><dd className="text-2xl font-bold">{API_TRAFFIC.p95}ms</dd></div>
          <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] text-slate-500">p99</dt><dd className="text-2xl font-bold">{API_TRAFFIC.p99}ms</dd></div>
        </dl>
      </MonitorCard>
    </div>
  );
}

export function NetworkTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Bandwidth in" value={`${NETWORK_METRICS.bandwidthInGbps} Gbps`} tone="info" />
        <StatCard label="Bandwidth out" value={`${NETWORK_METRICS.bandwidthOutGbps} Gbps`} tone="info" />
        <StatCard label="Packet loss" value={`${NETWORK_METRICS.packetLossPct}%`} tone="success" />
        <StatCard label="Latency" value={`${NETWORK_METRICS.latencyMs}ms`} tone="success" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonitorCard title="Infrastructure links" subtitle="VPN & firewall">
          <div className="flex gap-4">
            <div><p className="text-xs text-slate-500">VPN</p><StatusBadge status={NETWORK_METRICS.vpnStatus} /></div>
            <div><p className="text-xs text-slate-500">Firewall</p><StatusBadge status={NETWORK_METRICS.firewallStatus} /></div>
          </div>
        </MonitorCard>
        <MonitorCard title="SSL certificates" subtitle="Expiry monitoring">
          <DataTable
            columns={[
              { key: "domain", label: "Domain" },
              { key: "expires", label: "Expires" },
              { key: "daysLeft", label: "Days left" },
              { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
            ]}
            rows={NETWORK_METRICS.sslCerts as unknown as Record<string, unknown>[]}
          />
        </MonitorCard>
      </div>
    </div>
  );
}

export function BackupTab() {
  return (
    <MonitorCard title="Backup & disaster recovery" subtitle="Scheduled snapshots & restore tests">
      <DataTable
        columns={[
          { key: "name", label: "Backup" },
          { key: "lastSuccess", label: "Last success" },
          { key: "age", label: "Age" },
          { key: "sizeTb", label: "Size", render: (r) => `${r.sizeTb} TB` },
          { key: "restoreTest", label: "Restore test" },
          { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status as never} /> },
        ]}
        rows={BACKUP_STATUS as unknown as Record<string, unknown>[]}
      />
    </MonitorCard>
  );
}

export function AuditTab() {
  return (
    <MonitorCard title="Live audit feed" subtitle="Parcel edits, mutations, logins, exports">
      <ul className="max-h-[480px] space-y-2 overflow-y-auto">
        {AUDIT_FEED.map((e, i) => (
          <li key={i} className="flex gap-3 border-b border-slate-50 py-2 text-xs last:border-0">
            <span className="shrink-0 font-mono text-[10px] text-slate-400">{e.time}</span>
            <div>
              <p className="font-semibold text-slate-800">{e.user} — {e.action}</p>
              <p className="text-slate-500">{e.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </MonitorCard>
  );
}

export function KpisTab() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {BUSINESS_KPIS.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} hint={k.hint} tone={k.tone} />
        ))}
      </div>
      <MonitorCard title="Mutation trend" subtitle="Director dashboard — last 7 days">
        <MiniLineChart data={KPI_TREND} xKey="day" lines={[{ key: "mutations", color: "#0284c7" }, { key: "surveys", color: "#10b981" }]} />
      </MonitorCard>
      <MonitorCard title="Observability stack" subtitle="Grafana → Prometheus → components">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ARCHITECTURE_STACK.map((s) => (
            <div key={s.layer} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
              <div>
                <p className="font-semibold">{s.layer}</p>
                <p className="text-slate-500">{s.desc}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
          ))}
        </div>
      </MonitorCard>
    </div>
  );
}

export function AlertsTab({
  alerts,
  onAcknowledge,
}: {
  alerts: MonitorAlert[];
  onAcknowledge: (id: string) => void;
}) {
  const critical = alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length;
  const warning = alerts.filter((a) => a.severity === "warning" && !a.acknowledged).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Critical (open)" value={critical} tone="danger" />
        <StatCard label="Warning (open)" value={warning} tone="warning" />
        <StatCard label="Total alerts" value={alerts.length} tone="neutral" />
      </div>
      <MonitorCard title="Alertmanager feed" subtitle="Acknowledge to suppress notifications">
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={`flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                a.acknowledged ? "border-slate-100 bg-slate-50/50 opacity-70" : "border-slate-200 bg-white"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.severity} />
                  <span className="text-[10px] font-mono text-slate-400">{a.id}</span>
                  <span className="text-[10px] text-slate-400">{a.since}</span>
                  {a.acknowledged ? <span className="text-[10px] font-medium text-slate-500">ACKNOWLEDGED</span> : null}
                </div>
                <p className="mt-1 font-semibold text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-500">{a.detail}</p>
                <p className="mt-1 text-[10px] text-slate-400">Source: {a.source}</p>
              </div>
              {!a.acknowledged ? (
                <button
                  type="button"
                  onClick={() => onAcknowledge(a.id)}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Acknowledge
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </MonitorCard>
    </div>
  );
}
