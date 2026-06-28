import type { RbacRole } from "./reports";

export type AdminSectionId =
  | "identity"
  | "system"
  | "integrations"
  | "land-ops"
  | "audit"
  | "map-gis"
  | "mobile"
  | "notifications"
  | "advanced";

export type AdminSection = {
  id: AdminSectionId;
  label: string;
  description: string;
  icon: string;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { id: "identity", label: "Identity & Access", description: "Users, roles, sessions, SSO", icon: "shield" },
  { id: "system", label: "System Config", description: "Region, flags, maintenance", icon: "settings" },
  { id: "integrations", label: "Data & Integrations", description: "Nilamagal, ULPIN, ETL", icon: "database" },
  { id: "land-ops", label: "Land Records Ops", description: "Mutations, anomalies, parcels", icon: "landmark" },
  { id: "audit", label: "Audit & Compliance", description: "Logs, retention, GDPR", icon: "file-search" },
  { id: "map-gis", label: "Map & GIS Admin", description: "Layers, tiles, EPSG", icon: "map" },
  { id: "mobile", label: "Mobile & Field Ops", description: "DGPS, sync, teams", icon: "smartphone" },
  { id: "notifications", label: "Notifications & Reports", description: "Templates, alerts", icon: "bell" },
  { id: "advanced", label: "Advanced", description: "API, DR, AI, blockchain", icon: "zap" },
];

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: "Surveyor" | "Revenue Officer" | "Admin" | "Read-only";
  status: "active" | "inactive" | "locked";
  lastLogin: string;
  region: string;
};

export const ADMIN_USERS: AdminUser[] = [
  { id: "u-001", name: "Priya Venkatesh", email: "priya.v@revenue.puducherry.gov.in", role: "Revenue Officer", status: "active", lastLogin: "2026-06-28 09:14", region: "Karaikal" },
  { id: "u-002", name: "Ramesh Kumar", email: "ramesh.k@survey.puducherry.gov.in", role: "Surveyor", status: "active", lastLogin: "2026-06-28 08:42", region: "Khutal" },
  { id: "u-003", name: "Anitha Raj", email: "anitha.r@doslr.gov.in", role: "Admin", status: "active", lastLogin: "2026-06-28 10:01", region: "All regions" },
  { id: "u-004", name: "Guest Auditor", email: "audit@external.in", role: "Read-only", status: "active", lastLogin: "2026-06-27 16:30", region: "Puducherry" },
  { id: "u-005", name: "Suresh Babu", email: "suresh.b@revenue.puducherry.gov.in", role: "Revenue Officer", status: "locked", lastLogin: "2026-06-20 11:05", region: "Mahe" },
  { id: "u-006", name: "Lakshmi Devi", email: "lakshmi.d@survey.puducherry.gov.in", role: "Surveyor", status: "inactive", lastLogin: "2026-05-15 14:22", region: "Yanam" },
];

export type AdminSession = {
  id: string;
  user: string;
  device: string;
  ip: string;
  started: string;
  lastActive: string;
};

export const ADMIN_SESSIONS: AdminSession[] = [
  { id: "sess-1", user: "anitha.r@doslr.gov.in", device: "Chrome · Windows 11", ip: "10.24.1.18", started: "2026-06-28 08:55", lastActive: "2 min ago" },
  { id: "sess-2", user: "priya.v@revenue.puducherry.gov.in", device: "Edge · Windows 10", ip: "10.24.2.44", started: "2026-06-28 09:10", lastActive: "5 min ago" },
  { id: "sess-3", user: "ramesh.k@survey.puducherry.gov.in", device: "Nilam Mobile · Android 14", ip: "192.168.4.12", started: "2026-06-28 07:30", lastActive: "18 min ago" },
  { id: "sess-4", user: "audit@external.in", device: "Firefox · macOS", ip: "203.45.88.12", started: "2026-06-27 16:28", lastActive: "1 day ago" },
];

export const ADMIN_RBAC_FUNCTIONS = [
  "View parcel map",
  "Edit geometry",
  "Approve mutation",
  "Run anomaly pipeline",
  "Export audit log",
  "Manage users",
  "NIL-AI queries",
  "Mobile field sync",
  "Admin console",
];

export const ADMIN_RBAC_ROLES: RbacRole[] = [
  {
    role: "Surveyor",
    description: "Field survey and geometry capture",
    users: 42,
    permissions: {
      "View parcel map": true,
      "Edit geometry": true,
      "Approve mutation": false,
      "Run anomaly pipeline": true,
      "Export audit log": false,
      "Manage users": false,
      "NIL-AI queries": true,
      "Mobile field sync": true,
      "Admin console": false,
    },
  },
  {
    role: "Revenue Officer",
    description: "Mutation approval and revenue records",
    users: 28,
    permissions: {
      "View parcel map": true,
      "Edit geometry": false,
      "Approve mutation": true,
      "Run anomaly pipeline": true,
      "Export audit log": true,
      "Manage users": false,
      "NIL-AI queries": true,
      "Mobile field sync": false,
      "Admin console": false,
    },
  },
  {
    role: "Admin",
    description: "Full platform administration",
    users: 6,
    permissions: {
      "View parcel map": true,
      "Edit geometry": true,
      "Approve mutation": true,
      "Run anomaly pipeline": true,
      "Export audit log": true,
      "Manage users": true,
      "NIL-AI queries": true,
      "Mobile field sync": true,
      "Admin console": true,
    },
  },
  {
    role: "Read-only",
    description: "Audit and minister view access",
    users: 15,
    permissions: {
      "View parcel map": true,
      "Edit geometry": false,
      "Approve mutation": false,
      "Run anomaly pipeline": false,
      "Export audit log": true,
      "Manage users": false,
      "NIL-AI queries": true,
      "Mobile field sync": false,
      "Admin console": false,
    },
  },
];

export type IntegrationStatus = {
  id: string;
  name: string;
  status: "connected" | "synced" | "warning" | "offline";
  lastSync: string;
  detail: string;
};

export const INTEGRATIONS: IntegrationStatus[] = [
  { id: "nilamagal", name: "Nilamagal Legacy DB", status: "synced", lastSync: "2026-06-28 06:00 IST", detail: "Oracle 11g · 1.24M parcel rows" },
  { id: "collabland", name: "Collabland Geometry Service", status: "connected", lastSync: "Live", detail: "WFS 2.0 · avg 42ms response" },
  { id: "agristack", name: "Agristack Farmer Feed", status: "warning", lastSync: "2026-06-27 22:15", detail: "3,412 unmatched farmer IDs" },
  { id: "ulpin", name: "National ULPIN Registry API", status: "connected", lastSync: "2026-06-28 09:30", detail: "MoRTH NIC endpoint · 99.2% uptime" },
  { id: "shapefile", name: "Shapefile Import Queue", status: "warning", lastSync: "2 pending", detail: "MH_admin_boundaries_v3.zip processing" },
];

export const ETL_JOBS = [
  { id: "etl-1", name: "Nilamagal nightly sync", schedule: "0 2 * * *", lastRun: "2026-06-28 02:00", status: "success" as const },
  { id: "etl-2", name: "ULPIN delta pull", schedule: "*/30 * * * *", lastRun: "2026-06-28 09:30", status: "success" as const },
  { id: "etl-3", name: "Variance heatmap aggregate", schedule: "0 6 * * *", lastRun: "2026-06-28 06:00", status: "success" as const },
  { id: "etl-4", name: "Agristack farmer reconcile", schedule: "0 4 * * 0", lastRun: "2026-06-23 04:00", status: "warning" as const },
];

export const WEBHOOKS = [
  { id: "wh-1", url: "https://revenue.puducherry.gov.in/hooks/mutation", events: "mutation.approved", status: "active" as const },
  { id: "wh-2", url: "https://gis.nic.in/doslr/anomaly-alert", events: "anomaly.red_variance", status: "active" as const },
  { id: "wh-3", url: "https://internal.audit.local/ingest", events: "audit.*", status: "paused" as const },
];

export const MUTATION_QUEUE = [
  { id: "mut-8841", parcel: "KRL-142/3B", applicant: "S. Murugan", submitted: "2026-06-27", sla: "2d remaining", priority: "normal" as const },
  { id: "mut-8842", parcel: "KHT-089/1A", applicant: "V. Priya", submitted: "2026-06-26", sla: "Overdue", priority: "high" as const },
  { id: "mut-8843", parcel: "PDY-201/7", applicant: "Joint heirs — Raman", submitted: "2026-06-28", sla: "3d remaining", priority: "normal" as const },
];

export const ANOMALY_PIPELINE = {
  running: 2,
  queued: 14,
  completedToday: 38,
  redVariance: 7,
  lastRun: "2026-06-28 09:15",
};

export const PARCEL_LOCKS = [
  { ulpin: "ULPIN-IN-34-PD-2024-0001842", reason: "Court injunction", lockedBy: "Revenue Officer", since: "2026-06-10" },
  { ulpin: "ULPIN-IN-34-KR-2023-0000891", reason: "Mutation in progress", lockedBy: "System", since: "2026-06-28" },
];

export const AUDIT_LOG_SAMPLE = [
  { time: "2026-06-28 10:02:14", user: "anitha.r", action: "ADMIN_CONFIG_UPDATE", detail: "Feature flag: NIL-AI enabled" },
  { time: "2026-06-28 09:58:03", user: "priya.v", action: "MUTATION_APPROVE", detail: "KRL-138/2 — sale deed verified" },
  { time: "2026-06-28 09:45:22", user: "ramesh.k", action: "GEOMETRY_EDIT", detail: "KHT-089/1A — DGPS vertex correction" },
  { time: "2026-06-28 09:30:01", user: "system", action: "ETL_SYNC", detail: "Nilamagal nightly sync completed" },
  { time: "2026-06-28 09:12:44", user: "nil-ai", action: "AI_QUERY", detail: "Variance report generated — 142 parcels" },
];

export const GDPR_REQUESTS = [
  { id: "gdpr-12", requester: "Citizen portal #44821", type: "Data export", status: "pending" as const, filed: "2026-06-26" },
  { id: "gdpr-11", requester: "Citizen portal #44790", type: "Rectification", status: "completed" as const, filed: "2026-06-20" },
];

export const ADMIN_BOUNDARY_LAYERS = [
  { name: "Maharashtra Districts", features: 36, version: "v3.2", status: "published" as const },
  { name: "Maharashtra Talukas", features: 358, version: "v3.1", status: "published" as const },
  { name: "Puducherry Communes", features: 10, version: "v1.0", status: "published" as const },
  { name: "Coastal hazard buffer", features: 4, version: "draft", status: "review" as const },
];

export const DGPS_DEVICES = [
  { id: "dgps-01", model: "Trimble R12i", assignedTo: "Ramesh Kumar", lastFix: "2026-06-28 08:40", accuracy: "±2.1 cm" },
  { id: "dgps-02", model: "Leica GS18 T", assignedTo: "Lakshmi Devi", lastFix: "2026-06-27 16:12", accuracy: "±1.8 cm" },
  { id: "dgps-03", model: "South Galaxy G7", assignedTo: "Unassigned", lastFix: "—", accuracy: "—" },
];

export const SYNC_CONFLICTS = [
  { id: "conf-88", parcel: "KRL-055/2", field: "area_sqm", server: "1,240", mobile: "1,238", detected: "2026-06-28 07:55" },
  { id: "conf-87", parcel: "KHT-012/4", field: "owner_name", server: "Murugan S", mobile: "S Murugan", detected: "2026-06-27 18:20" },
];

export const FIELD_TEAMS = [
  { team: "Karaikal North", lead: "Ramesh Kumar", members: 6, activeSurveys: 3 },
  { team: "Khutal Central", lead: "Suresh Babu", members: 4, activeSurveys: 1 },
  { team: "Mahe Coastal", lead: "Lakshmi Devi", members: 5, activeSurveys: 2 },
];

export const EMAIL_TEMPLATES = [
  { id: "tpl-1", name: "Mutation approved", channel: "Email", lastEdited: "2026-06-15" },
  { id: "tpl-2", name: "SLA breach alert", channel: "SMS", lastEdited: "2026-06-10" },
  { id: "tpl-3", name: "Daily mutation summary", channel: "Email", lastEdited: "2026-06-01" },
];

export const SCHEDULED_REPORTS = [
  { name: "Daily mutation summary", schedule: "Daily 07:00", recipients: "Revenue officers", status: "active" as const },
  { name: "Variance heatmap", schedule: "Weekly Mon 06:00", recipients: "GIS team", status: "active" as const },
  { name: "Audit compliance digest", schedule: "Monthly 1st", recipients: "Admin", status: "active" as const },
];

export const API_KEYS = [
  { id: "key-1", name: "NIC GIS Integration", prefix: "doslr_live_••••8f2a", scopes: "read:parcels, read:geometry", created: "2025-11-12", lastUsed: "2026-06-28" },
  { id: "key-2", name: "Minister Dashboard", prefix: "doslr_ro_••••3c91", scopes: "read:reports", created: "2026-01-05", lastUsed: "2026-06-27" },
];

export const OAUTH_CLIENTS = [
  { id: "oauth-1", name: "Nilam Mobile App", grant: "PKCE", redirect: "nilam://auth/callback", status: "active" as const },
  { id: "oauth-2", name: "Collabland WFS Proxy", grant: "client_credentials", redirect: "—", status: "active" as const },
];

export const RECENT_ERRORS = [
  { time: "2026-06-28 09:22", level: "error" as const, message: "ULPIN API timeout after 30s", count: 3 },
  { time: "2026-06-28 08:15", level: "warning" as const, message: "Tile server slow response >2s", count: 12 },
  { time: "2026-06-27 22:40", level: "error" as const, message: "Agristack feed parse failure", count: 1 },
];

export const AB_EXPERIMENTS = [
  { id: "exp-1", name: "New mutation wizard UI", variant: "B — 40% traffic", status: "running" as const },
  { id: "exp-2", name: "NIL-AI confidence display", variant: "A — control", status: "paused" as const },
];

export const PERFORMANCE_METRICS = {
  apiLatency: [
    { time: "08:00", ms: 42 },
    { time: "09:00", ms: 38 },
    { time: "10:00", ms: 55 },
    { time: "11:00", ms: 47 },
    { time: "12:00", ms: 41 },
  ],
  mapLoad: [
    { time: "08:00", ms: 1.2 },
    { time: "09:00", ms: 1.1 },
    { time: "10:00", ms: 1.4 },
    { time: "11:00", ms: 1.3 },
    { time: "12:00", ms: 1.2 },
  ],
};

export const FEATURE_FLAGS = [
  { id: "workflows", label: "Workflows (mutation, anomaly, AutoCAD)", enabled: true },
  { id: "mobile", label: "Nilam Mobile field app", enabled: true },
  { id: "nil-ai", label: "NIL-AI cadastral assistant", enabled: true },
  { id: "3d-walk", label: "3D parcel walk-through", enabled: true },
  { id: "blockchain", label: "Blockchain audit anchoring", enabled: false },
];

export const DEFAULT_THEMATIC_LAYERS = [
  { id: "variance", label: "Variance heatmap", defaultOn: true },
  { id: "mutation", label: "Mutation status", defaultOn: true },
  { id: "encumbrance", label: "Encumbrance overlay", defaultOn: false },
  { id: "admin-boundary", label: "Admin boundaries", defaultOn: true },
];
