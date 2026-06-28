import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Blocks,
  Bot,
  Database,
  FileSearch,
  Gauge,
  Key,
  Landmark,
  Map,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import RbacMatrix from "../components/reports/RbacMatrix";
import {
  AB_EXPERIMENTS,
  ADMIN_BOUNDARY_LAYERS,
  ADMIN_RBAC_FUNCTIONS,
  ADMIN_RBAC_ROLES,
  ADMIN_SECTIONS,
  ADMIN_SESSIONS,
  ADMIN_USERS,
  ANOMALY_PIPELINE,
  API_KEYS,
  AUDIT_LOG_SAMPLE,
  DEFAULT_THEMATIC_LAYERS,
  DGPS_DEVICES,
  EMAIL_TEMPLATES,
  ETL_JOBS,
  FEATURE_FLAGS,
  FIELD_TEAMS,
  GDPR_REQUESTS,
  INTEGRATIONS,
  MUTATION_QUEUE,
  OAUTH_CLIENTS,
  PARCEL_LOCKS,
  PERFORMANCE_METRICS,
  RECENT_ERRORS,
  SCHEDULED_REPORTS,
  SYNC_CONFLICTS,
  WEBHOOKS,
  type AdminSectionId,
} from "../data/adminMock";
import {
  AdminButton,
  AdminCard,
  AdminToast,
  AdminToggle,
  KpiStrip,
  StatusBadge,
} from "../components/admin/AdminShared";

const SECTION_ICONS: Record<AdminSectionId, typeof Shield> = {
  identity: Shield,
  system: Settings,
  integrations: Database,
  "land-ops": Landmark,
  audit: FileSearch,
  "map-gis": Map,
  mobile: Smartphone,
  notifications: Bell,
  advanced: Zap,
};

function useAdminToast() {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return { toast, showToast, dismissToast: () => setToast(null) };
}

export default function AdminPage() {
  const [activeSection, setActiveSection] = useState<AdminSectionId>("identity");
  const [search, setSearch] = useState("");
  const { toast, showToast, dismissToast } = useAdminToast();

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [ssoEnabled, setSsoEnabled] = useState(true);
  const [twoFaEnforced, setTwoFaEnforced] = useState(false);
  const [defaultRegion, setDefaultRegion] = useState("Karaikal");
  const [featureFlags, setFeatureFlags] = useState(FEATURE_FLAGS);
  const [thematicDefaults, setThematicDefaults] = useState(DEFAULT_THEMATIC_LAYERS);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [passwordMinLength, setPasswordMinLength] = useState("12");
  const [forceMobileUpdate, setForceMobileUpdate] = useState(false);
  const [blockchainEnabled, setBlockchainEnabled] = useState(false);
  const [aiConfidence, setAiConfidence] = useState("0.75");
  const [rateLimit, setRateLimit] = useState("1000");
  const [retentionAudit, setRetentionAudit] = useState("7");
  const [retentionDocs, setRetentionDocs] = useState("10");
  const [redVarianceThreshold, setRedVarianceThreshold] = useState("5");
  const [epsg, setEpsg] = useState("EPSG:32644");
  const [basemapUrl, setBasemapUrl] = useState("https://tile.openstreetmap.org/{z}/{x}/{y}.png");
  const [userFilter, setUserFilter] = useState("");

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ADMIN_SECTIONS;
    return ADMIN_SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [search]);

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    if (!q) return ADMIN_USERS;
    return ADMIN_USERS.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    );
  }, [userFilter]);

  const toggleFeature = (id: string) => {
    setFeatureFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)),
    );
    showToast("Feature flag updated");
  };

  const SectionIcon = SECTION_ICONS[activeSection];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] p-3 lg:p-4">
      <AdminToast message={toast} onDismiss={dismissToast} />

      <main className="flex min-h-0 flex-1 gap-3 overflow-hidden lg:gap-4">
        {/* Left sub-nav */}
        <aside className="hidden w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.06)] lg:flex xl:w-64">
          <div className="border-b border-slate-100 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Admin sections</p>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="search"
                placeholder="Filter sections…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-slate-400"
              />
            </div>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredSections.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`mb-1 flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
                    active ? "bg-[#1A1A1A] text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">{section.label}</span>
                    <span className={`block truncate text-[10px] ${active ? "text-slate-300" : "text-slate-500"}`}>
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-2xl border border-white/70 bg-white/85 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.06)] lg:p-5">
          <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link
                to="/app"
                className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to map workbench
              </Link>
              <div className="flex items-start gap-2">
                <SectionIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold text-[#1A1A1A]">Platform Administration</h1>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                      Admin
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    DoSLR cadastral GIS · Nilam land records · Puducherry UT demo
                  </p>
                </div>
              </div>
            </div>

            {/* Mobile section picker */}
            <div className="lg:hidden">
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as AdminSectionId)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {ADMIN_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeSection === "identity" && (
            <div className="space-y-4">
              <KpiStrip
                items={[
                  { label: "Total users", value: ADMIN_USERS.length },
                  { label: "Active sessions", value: ADMIN_SESSIONS.length },
                  { label: "Admins", value: ADMIN_USERS.filter((u) => u.role === "Admin").length },
                  { label: "Locked accounts", value: ADMIN_USERS.filter((u) => u.status === "locked").length, tone: "warning" },
                ]}
              />

              <AdminCard title="User management" subtitle="Surveyor, Revenue Officer, Admin, Read-only">
                <div className="mb-3">
                  <div className="relative max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="search"
                      placeholder="Search users…"
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-xs outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500">
                        <th className="px-2 py-2 font-semibold">Name</th>
                        <th className="px-2 py-2 font-semibold">Role</th>
                        <th className="px-2 py-2 font-semibold">Region</th>
                        <th className="px-2 py-2 font-semibold">Status</th>
                        <th className="px-2 py-2 font-semibold">Last login</th>
                        <th className="px-2 py-2 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-2 py-2.5">
                            <p className="font-medium text-slate-800">{user.name}</p>
                            <p className="text-[11px] text-slate-500">{user.email}</p>
                          </td>
                          <td className="px-2 py-2.5">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {user.role}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-slate-600">{user.region}</td>
                          <td className="px-2 py-2.5">
                            <StatusBadge status={user.status === "active" ? "active" : user.status === "locked" ? "warning" : "offline"} />
                          </td>
                          <td className="px-2 py-2.5 text-slate-500">{user.lastLogin}</td>
                          <td className="px-2 py-2.5">
                            <AdminButton variant="secondary" size="xs" onClick={() => showToast(`Edit user: ${user.name}`)}>
                              Edit
                            </AdminButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  <AdminButton onClick={() => showToast("Invite user dialog opened")}>Invite user</AdminButton>
                  <AdminButton variant="secondary" onClick={() => showToast("Bulk import CSV ready")}>
                    Bulk import
                  </AdminButton>
                </div>
              </AdminCard>

              <RbacMatrix functions={ADMIN_RBAC_FUNCTIONS} roles={ADMIN_RBAC_ROLES} />

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Active sessions" subtitle="Force logout for security incidents">
                  <div className="space-y-2">
                    {ADMIN_SESSIONS.map((sess) => (
                      <div key={sess.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium text-slate-800">{sess.user}</p>
                          <p className="text-[11px] text-slate-500">
                            {sess.device} · {sess.ip} · {sess.lastActive}
                          </p>
                        </div>
                        <AdminButton variant="danger" size="xs" onClick={() => showToast(`Session ${sess.id} terminated`)}>
                          Force logout
                        </AdminButton>
                      </div>
                    ))}
                  </div>
                </AdminCard>

                <AdminCard title="Authentication policy" subtitle="SSO, LDAP, 2FA">
                  <div className="space-y-2">
                    <AdminToggle checked={ssoEnabled} onChange={(v) => { setSsoEnabled(v); showToast(v ? "SSO/LDAP enabled" : "SSO/LDAP disabled"); }} label="SSO / LDAP (Active Directory)" description="Puducherry govt identity provider" />
                    <AdminToggle checked={twoFaEnforced} onChange={(v) => { setTwoFaEnforced(v); showToast(v ? "2FA enforcement enabled" : "2FA enforcement disabled"); }} label="Enforce 2FA for all officers" description="TOTP via NIC-approved authenticator" />
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
                      <p className="text-xs font-medium text-slate-700">LDAP endpoint (demo)</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">ldaps://idp.puducherry.gov.in:636</p>
                    </div>
                  </div>
                </AdminCard>
              </div>
            </div>
          )}

          {activeSection === "system" && (
            <div className="space-y-4">
              <AdminCard title="Regional defaults" subtitle="Default map extent and data scope">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Default region</span>
                    <select
                      value={defaultRegion}
                      onChange={(e) => { setDefaultRegion(e.target.value); showToast(`Default region: ${e.target.value}`); }}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="Khutal">Khutal</option>
                      <option value="Karaikal">Karaikal</option>
                      <option value="Mahe">Mahe</option>
                      <option value="Yanam">Yanam</option>
                      <option value="Puducherry">Puducherry (all)</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Default basemap</span>
                    <select className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" defaultValue="osm" onChange={() => showToast("Basemap preset saved")}>
                      <option value="osm">OpenStreetMap</option>
                      <option value="satellite">Satellite (Bhuvan)</option>
                      <option value="topo">Survey of India topo</option>
                    </select>
                  </label>
                </div>
              </AdminCard>

              <AdminCard title="Feature flags" subtitle="Enable or disable platform modules">
                <div className="grid gap-2 sm:grid-cols-2">
                  {featureFlags.map((flag) => (
                    <AdminToggle
                      key={flag.id}
                      checked={flag.enabled}
                      onChange={() => toggleFeature(flag.id)}
                      label={flag.label}
                    />
                  ))}
                </div>
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Maintenance mode" subtitle="Show maintenance banner to non-admin users">
                  <AdminToggle
                    checked={maintenanceMode}
                    onChange={(v) => { setMaintenanceMode(v); showToast(v ? "Maintenance mode ON" : "Maintenance mode OFF"); }}
                    label="Platform maintenance mode"
                    description="Admins retain full access during maintenance"
                  />
                  {maintenanceMode ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Maintenance banner will display on login and map workbench for non-admin roles.
                    </div>
                  ) : null}
                </AdminCard>

                <AdminCard title="Session & password policy">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Session timeout (minutes)</span>
                      <input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Minimum password length</span>
                      <input type="number" value={passwordMinLength} onChange={(e) => setPasswordMinLength(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <AdminButton onClick={() => showToast("Security policy saved")}>Save policy</AdminButton>
                  </div>
                </AdminCard>
              </div>
            </div>
          )}

          {activeSection === "integrations" && (
            <div className="space-y-4">
              <AdminCard title="Integration health" subtitle="Nilamagal, Collabland, Agristack, ULPIN">
                <div className="space-y-3">
                  {INTEGRATIONS.map((integ) => (
                    <div key={integ.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800">{integ.name}</p>
                          <StatusBadge status={integ.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">{integ.detail}</p>
                        <p className="text-[11px] text-slate-400">Last sync: {integ.lastSync}</p>
                      </div>
                      <AdminButton variant="secondary" onClick={() => showToast(`Manual sync started: ${integ.name}`)}>
                        <RefreshCw className="h-3 w-3" />
                        Sync now
                      </AdminButton>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Scheduled ETL jobs" subtitle="Cron schedule display">
                  <div className="space-y-2">
                    {ETL_JOBS.map((job) => (
                      <div key={job.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                        <div>
                          <p className="text-xs font-medium text-slate-800">{job.name}</p>
                          <p className="font-mono text-[10px] text-slate-500">{job.schedule}</p>
                          <p className="text-[11px] text-slate-400">Last: {job.lastRun}</p>
                        </div>
                        <StatusBadge status={job.status === "success" ? "success" : "warning"} />
                      </div>
                    ))}
                  </div>
                </AdminCard>

                <AdminCard title="Webhook endpoints">
                  <div className="space-y-2">
                    {WEBHOOKS.map((wh) => (
                      <div key={wh.id} className="rounded-lg border border-slate-100 px-3 py-2">
                        <div className="flex items-center justify-between">
                          <StatusBadge status={wh.status} />
                          <span className="text-[10px] text-slate-400">{wh.events}</span>
                        </div>
                        <p className="mt-1 truncate font-mono text-[11px] text-slate-600">{wh.url}</p>
                      </div>
                    ))}
                    <AdminButton variant="secondary" onClick={() => showToast("Add webhook dialog opened")}>
                      Add webhook
                    </AdminButton>
                  </div>
                </AdminCard>
              </div>
            </div>
          )}

          {activeSection === "land-ops" && (
            <div className="space-y-4">
              <KpiStrip
                items={[
                  { label: "Pending mutations", value: MUTATION_QUEUE.length, tone: "warning" },
                  { label: "Anomaly queue", value: ANOMALY_PIPELINE.queued },
                  { label: "Red variance", value: ANOMALY_PIPELINE.redVariance, tone: "danger" },
                  { label: "Locked parcels", value: PARCEL_LOCKS.length },
                ]}
              />

              <AdminCard title="Mutation approval queue" subtitle="Bulk approve pending revenue mutations">
                <div className="mb-3 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500">
                        <th className="px-2 py-2 text-left">ID</th>
                        <th className="px-2 py-2 text-left">Parcel</th>
                        <th className="px-2 py-2 text-left">Applicant</th>
                        <th className="px-2 py-2 text-left">SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MUTATION_QUEUE.map((m) => (
                        <tr key={m.id} className="border-b border-slate-50">
                          <td className="px-2 py-2 font-mono text-[11px]">{m.id}</td>
                          <td className="px-2 py-2 font-medium">{m.parcel}</td>
                          <td className="px-2 py-2">{m.applicant}</td>
                          <td className="px-2 py-2">
                            <span className={m.sla === "Overdue" ? "font-semibold text-rose-600" : "text-slate-600"}>{m.sla}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <AdminButton onClick={() => showToast("Bulk approve: 3 mutations approved")}>Bulk approve selected</AdminButton>
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Anomaly pipeline oversight">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-sky-50 px-2 py-3">
                      <p className="text-2xl font-semibold text-sky-700">{ANOMALY_PIPELINE.running}</p>
                      <p className="text-[10px] text-sky-600">Running</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-2 py-3">
                      <p className="text-2xl font-semibold text-amber-700">{ANOMALY_PIPELINE.queued}</p>
                      <p className="text-[10px] text-amber-600">Queued</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-2 py-3">
                      <p className="text-2xl font-semibold text-emerald-700">{ANOMALY_PIPELINE.completedToday}</p>
                      <p className="text-[10px] text-emerald-600">Completed today</p>
                    </div>
                    <div className="rounded-lg bg-rose-50 px-2 py-3">
                      <p className="text-2xl font-semibold text-rose-700">{ANOMALY_PIPELINE.redVariance}</p>
                      <p className="text-[10px] text-rose-600">Red variance</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Last run: {ANOMALY_PIPELINE.lastRun}</p>
                  <div className="mt-2">
                    <AdminButton variant="secondary" onClick={() => showToast("Anomaly pipeline triggered")}>
                      Trigger pipeline run
                    </AdminButton>
                  </div>
                </AdminCard>

                <AdminCard title="Document verification SLA">
                  <KpiStrip
                    items={[
                      { label: "Within SLA", value: "94%", tone: "success" },
                      { label: "At risk", value: 8, tone: "warning" },
                      { label: "Breached", value: 2, tone: "danger" },
                      { label: "Avg review time", value: "4.2h" },
                    ]}
                  />
                </AdminCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Parcel lock / unlock registry">
                  {PARCEL_LOCKS.map((lock) => (
                    <div key={lock.ulpin} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <p className="font-mono text-[11px] text-slate-700">{lock.ulpin}</p>
                        <p className="text-xs text-slate-500">{lock.reason} · {lock.lockedBy}</p>
                      </div>
                      <AdminButton variant="secondary" size="xs" onClick={() => showToast(`Unlock requested: ${lock.ulpin}`)}>
                        Unlock
                      </AdminButton>
                    </div>
                  ))}
                </AdminCard>

                <AdminCard title="Bulk ULPIN assignment" subtitle="Assign national ULPINs to unregistered parcels">
                  <p className="mb-3 text-xs text-slate-500">1,247 parcels pending ULPIN in Karaikal commune block 3.</p>
                  <AdminButton onClick={() => showToast("Bulk ULPIN assignment job queued")}>
                    Start bulk assignment
                  </AdminButton>
                </AdminCard>
              </div>
            </div>
          )}

          {activeSection === "audit" && (
            <div className="space-y-4">
              <AdminCard title="System audit log" subtitle="Recent platform events">
                <div className="mb-3 flex gap-2">
                  <AdminButton variant="secondary" onClick={() => showToast("Full audit log export started")}>
                    Export CSV
                  </AdminButton>
                  <Link to="/workflows/audit-log" className="inline-flex">
                    <AdminButton variant="secondary">Open full audit viewer</AdminButton>
                  </Link>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500">
                        <th className="px-2 py-2 text-left">Timestamp</th>
                        <th className="px-2 py-2 text-left">User</th>
                        <th className="px-2 py-2 text-left">Action</th>
                        <th className="px-2 py-2 text-left">Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {AUDIT_LOG_SAMPLE.map((entry, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="px-2 py-2 text-slate-500">{entry.time}</td>
                          <td className="px-2 py-2">{entry.user}</td>
                          <td className="px-2 py-2 text-sky-700">{entry.action}</td>
                          <td className="px-2 py-2 text-slate-600">{entry.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Data provenance settings">
                  <AdminToggle checked label="Track geometry edit lineage" onChange={() => showToast("Provenance setting updated")} />
                  <AdminToggle checked label="Hash document attachments on upload" onChange={() => showToast("Provenance setting updated")} />
                  <AdminToggle checked={false} label="Require dual-signoff for boundary edits" onChange={() => showToast("Provenance setting updated")} />
                </AdminCard>

                <AdminCard title="Retention policy">
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-600">Audit records (years)</span>
                      <input type="number" value={retentionAudit} onChange={(e) => setRetentionAudit(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs text-slate-600">Documents (years)</span>
                      <input type="number" value={retentionDocs} onChange={(e) => setRetentionDocs(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    </label>
                    <AdminButton onClick={() => showToast("Retention policy saved")}>Save retention</AdminButton>
                  </div>
                </AdminCard>
              </div>

              <AdminCard title="GDPR / data export requests">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="px-2 py-2 text-left">ID</th>
                      <th className="px-2 py-2 text-left">Requester</th>
                      <th className="px-2 py-2 text-left">Type</th>
                      <th className="px-2 py-2 text-left">Status</th>
                      <th className="px-2 py-2 text-left">Filed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {GDPR_REQUESTS.map((req) => (
                      <tr key={req.id} className="border-b border-slate-50">
                        <td className="px-2 py-2 font-mono">{req.id}</td>
                        <td className="px-2 py-2">{req.requester}</td>
                        <td className="px-2 py-2">{req.type}</td>
                        <td className="px-2 py-2"><StatusBadge status={req.status} /></td>
                        <td className="px-2 py-2 text-slate-500">{req.filed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminCard>
            </div>
          )}

          {activeSection === "map-gis" && (
            <div className="space-y-4">
              <AdminCard title="Admin boundary layers" subtitle="Maharashtra shapefiles & Puducherry communes">
                <div className="space-y-2">
                  {ADMIN_BOUNDARY_LAYERS.map((layer) => (
                    <div key={layer.name} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{layer.name}</p>
                        <p className="text-[11px] text-slate-500">{layer.features} features · {layer.version}</p>
                      </div>
                      <StatusBadge status={layer.status} />
                    </div>
                  ))}
                  <AdminButton variant="secondary" onClick={() => showToast("Upload shapefile dialog opened")}>
                    Upload boundary shapefile
                  </AdminButton>
                </div>
              </AdminCard>

              <AdminCard title="Thematic layer defaults for new users">
                <div className="grid gap-2 sm:grid-cols-2">
                  {thematicDefaults.map((layer) => (
                    <AdminToggle
                      key={layer.id}
                      checked={layer.defaultOn}
                      onChange={() => {
                        setThematicDefaults((prev) =>
                          prev.map((l) => (l.id === layer.id ? { ...l, defaultOn: !l.defaultOn } : l)),
                        );
                        showToast(`Default layer: ${layer.label}`);
                      }}
                      label={layer.label}
                    />
                  ))}
                </div>
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Tile server / basemap URL">
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-600">XYZ tile URL template</span>
                    <input
                      type="url"
                      value={basemapUrl}
                      onChange={(e) => setBasemapUrl(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-[11px]"
                    />
                  </label>
                  <div className="mt-2">
                    <AdminButton onClick={() => showToast("Basemap URL saved")}>Save URL</AdminButton>
                  </div>
                </AdminCard>

                <AdminCard title="Coordinate system (EPSG)">
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-600">Project CRS</span>
                    <select value={epsg} onChange={(e) => { setEpsg(e.target.value); showToast(`CRS: ${e.target.value}`); }} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="EPSG:32644">EPSG:32644 — UTM 44N (Puducherry)</option>
                      <option value="EPSG:4326">EPSG:4326 — WGS 84</option>
                      <option value="EPSG:7755">EPSG:7755 — India NSF LCC</option>
                    </select>
                  </label>
                  <p className="mt-2 text-[11px] text-slate-500">Cartographic styling presets: Executive · Field survey · Minister view</p>
                </AdminCard>
              </div>
            </div>
          )}

          {activeSection === "mobile" && (
            <div className="space-y-4">
              <AdminCard title="Nilam Mobile app" subtitle="Version control and force update">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Current production: v2.4.1</p>
                    <p className="text-xs text-slate-500">Min supported: v2.3.0 · 847 active devices</p>
                  </div>
                  <AdminToggle
                    checked={forceMobileUpdate}
                    onChange={(v) => { setForceMobileUpdate(v); showToast(v ? "Force update enabled" : "Force update disabled"); }}
                    label="Force update below min version"
                  />
                </div>
              </AdminCard>

              <AdminCard title="DGPS / GNSS device registry">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-500">
                      <th className="px-2 py-2 text-left">Device</th>
                      <th className="px-2 py-2 text-left">Model</th>
                      <th className="px-2 py-2 text-left">Assigned</th>
                      <th className="px-2 py-2 text-left">Last fix</th>
                      <th className="px-2 py-2 text-left">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DGPS_DEVICES.map((d) => (
                      <tr key={d.id} className="border-b border-slate-50">
                        <td className="px-2 py-2 font-mono">{d.id}</td>
                        <td className="px-2 py-2">{d.model}</td>
                        <td className="px-2 py-2">{d.assignedTo}</td>
                        <td className="px-2 py-2 text-slate-500">{d.lastFix}</td>
                        <td className="px-2 py-2 text-emerald-600">{d.accuracy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Offline sync conflict queue">
                  {SYNC_CONFLICTS.map((c) => (
                    <div key={c.id} className="mb-2 rounded-lg border border-amber-100 bg-amber-50/30 px-3 py-2">
                      <p className="text-xs font-medium text-slate-800">{c.parcel} — {c.field}</p>
                      <p className="text-[11px] text-slate-500">Server: {c.server} · Mobile: {c.mobile}</p>
                      <div className="mt-2 flex gap-2">
                        <AdminButton size="xs" onClick={() => showToast(`Resolved: server wins — ${c.id}`)}>Server wins</AdminButton>
                        <AdminButton size="xs" variant="secondary" onClick={() => showToast(`Resolved: mobile wins — ${c.id}`)}>Mobile wins</AdminButton>
                      </div>
                    </div>
                  ))}
                </AdminCard>

                <AdminCard title="Field survey team assignment">
                  {FIELD_TEAMS.map((team) => (
                    <div key={team.team} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{team.team}</p>
                        <p className="text-[11px] text-slate-500">Lead: {team.lead} · {team.members} members · {team.activeSurveys} active</p>
                      </div>
                      <AdminButton size="xs" variant="secondary" onClick={() => showToast(`Assign parcels to ${team.team}`)}>
                        Assign
                      </AdminButton>
                    </div>
                  ))}
                </AdminCard>
              </div>
            </div>
          )}

          {activeSection === "notifications" && (
            <div className="space-y-4">
              <AdminCard title="Email / SMS template editor" subtitle="Demo template management">
                <div className="space-y-2">
                  {EMAIL_TEMPLATES.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{tpl.name}</p>
                        <p className="text-[11px] text-slate-500">{tpl.channel} · Last edited {tpl.lastEdited}</p>
                      </div>
                      <AdminButton size="xs" variant="secondary" onClick={() => showToast(`Edit template: ${tpl.name}`)}>
                        Edit
                      </AdminButton>
                    </div>
                  ))}
                </div>
              </AdminCard>

              <AdminCard title="Scheduled report jobs">
                {SCHEDULED_REPORTS.map((r) => (
                  <div key={r.name} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{r.name}</p>
                      <p className="text-[11px] text-slate-500">{r.schedule} → {r.recipients}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
              </AdminCard>

              <AdminCard title="Alert thresholds">
                <label className="block max-w-xs">
                  <span className="mb-1 block text-xs text-slate-600">Red variance count alert threshold</span>
                  <input
                    type="number"
                    value={redVarianceThreshold}
                    onChange={(e) => setRedVarianceThreshold(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <p className="mt-2 text-[11px] text-slate-500">SMS + email to GIS lead when red variance parcels exceed threshold in a commune.</p>
                <div className="mt-3">
                  <AdminButton onClick={() => showToast("Alert thresholds saved")}>Save thresholds</AdminButton>
                </div>
              </AdminCard>
            </div>
          )}

          {activeSection === "advanced" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="API keys" subtitle="Manage integration credentials">
                  {API_KEYS.map((key) => (
                    <div key={key.id} className="mb-2 rounded-lg border border-slate-100 px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">{key.name}</p>
                      <p className="font-mono text-[11px] text-slate-500">{key.prefix}</p>
                      <p className="text-[11px] text-slate-400">{key.scopes} · Last used {key.lastUsed}</p>
                    </div>
                  ))}
                  <AdminButton variant="secondary" onClick={() => showToast("Generate API key dialog opened")}>
                    <Key className="h-3 w-3" />
                    Generate key
                  </AdminButton>
                </AdminCard>

                <AdminCard title="OAuth clients">
                  {OAUTH_CLIENTS.map((client) => (
                    <div key={client.id} className="mb-2 rounded-lg border border-slate-100 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">{client.name}</p>
                        <StatusBadge status={client.status} />
                      </div>
                      <p className="text-[11px] text-slate-500">{client.grant} · {client.redirect}</p>
                    </div>
                  ))}
                </AdminCard>
              </div>

              <AdminCard title="Rate limiting & quota">
                <label className="block max-w-xs">
                  <span className="mb-1 block text-xs text-slate-600">API requests per hour (per key)</span>
                  <input type="number" value={rateLimit} onChange={(e) => setRateLimit(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                </label>
                <div className="mt-2">
                  <AdminButton onClick={() => showToast("Rate limits updated")}>Save limits</AdminButton>
                </div>
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="Database backup schedule">
                  <KpiStrip
                    items={[
                      { label: "Last backup", value: "06:00 today", tone: "success" },
                      { label: "Restore point", value: "RP-2026-0628", tone: "neutral" },
                      { label: "RPO", value: "4 hours" },
                      { label: "RTO", value: "2 hours" },
                    ]}
                  />
                  <div className="mt-3">
                    <AdminButton variant="secondary" onClick={() => showToast("On-demand backup started")}>
                      Run backup now
                    </AdminButton>
                  </div>
                </AdminCard>

                <AdminCard title="Disaster recovery status">
                  <div className="flex items-center gap-2">
                    <StatusBadge status="synced" />
                    <span className="text-xs text-slate-600">Warm standby · Chennai DR site</span>
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">Last DR failover test: 2026-03-15 · Passed</p>
                  <p className="text-[11px] text-slate-500">Replication lag: &lt; 30 seconds</p>
                </AdminCard>
              </div>

              <AdminCard title="Performance metrics" subtitle="API latency & map load time (mock)">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="h-48">
                    <p className="mb-2 text-xs font-medium text-slate-600">API latency (ms)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={PERFORMANCE_METRICS.apiLatency}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="ms" stroke="#334155" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-48">
                    <p className="mb-2 text-xs font-medium text-slate-600">Map load time (s)</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={PERFORMANCE_METRICS.mapLoad}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="ms" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </AdminCard>

              <AdminCard title="Error log" subtitle="Sentry-style recent errors">
                {RECENT_ERRORS.map((err, i) => (
                  <div key={i} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={err.level === "error" ? "error" : "warning"} />
                        <span className="text-[11px] text-slate-400">{err.time}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-700">{err.message}</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">×{err.count}</span>
                  </div>
                ))}
              </AdminCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="A/B feature experiments">
                  {AB_EXPERIMENTS.map((exp) => (
                    <div key={exp.id} className="mb-2 flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{exp.name}</p>
                        <p className="text-[11px] text-slate-500">{exp.variant}</p>
                      </div>
                      <StatusBadge status={exp.status === "running" ? "active" : "paused"} />
                    </div>
                  ))}
                </AdminCard>

                <AdminCard title="Multi-tenant org settings" subtitle="Puducherry UT departments">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>Revenue Department</span>
                      <StatusBadge status="active" />
                    </div>
                    <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>Survey & Settlement</span>
                      <StatusBadge status="active" />
                    </div>
                    <div className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>NIC GIS Cell</span>
                      <StatusBadge status="active" />
                    </div>
                  </div>
                </AdminCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <AdminCard title="NIL-AI model configuration">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm font-medium">Cadastral intelligence prompts</span>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-slate-600">Confidence threshold (0–1)</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={aiConfidence}
                      onChange={(e) => setAiConfidence(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="mt-2">
                    <AdminButton onClick={() => showToast("NIL-AI config saved")}>Save AI config</AdminButton>
                  </div>
                </AdminCard>

                <AdminCard title="Blockchain audit anchoring" subtitle="Immutable hash trail for land records">
                  <div className="mb-3 flex items-center gap-2">
                    <Blocks className="h-4 w-4 text-violet-600" />
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700">
                      Demo · Hyperledger Fabric
                    </span>
                  </div>
                  <AdminToggle
                    checked={blockchainEnabled}
                    onChange={(v) => { setBlockchainEnabled(v); showToast(v ? "Blockchain anchoring enabled" : "Blockchain anchoring disabled"); }}
                    label="Anchor mutation & geometry hashes on-chain"
                    description="Daily Merkle root submitted to state land records ledger"
                  />
                  {blockchainEnabled ? (
                    <p className="mt-2 font-mono text-[10px] text-slate-500">Last anchor: 0x8f3a…c21d · Block #184,291</p>
                  ) : null}
                </AdminCard>
              </div>

              <AdminCard title="System health overview">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm text-slate-700">CPU 34% · Memory 62% · Disk 41%</span>
                  </div>
                  <StatusBadge status="connected" />
                  <span className="text-xs text-slate-500">All services operational</span>
                </div>
              </AdminCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
