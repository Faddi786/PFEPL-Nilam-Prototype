import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Fingerprint,
  GitBranch,
  Home,
  Image,
  Landmark,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Upload,
  User,
  Video,
  Bell,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ACTIVE_WORKFLOW,
  CITIZEN_DASHBOARD_STATS,
  CITIZEN_PROFILE,
  CITIZEN_QUERIES,
  CITIZEN_SECTIONS,
  DISPUTE_EVIDENCE,
  JOB_LISTINGS,
  LAND_RECORDS,
  QUERY_PRIORITIES,
  QUERY_TYPES,
  RESURVEY_REASONS,
  RESURVEY_REQUESTS,
  REVENUE_ANNOUNCEMENTS,
  UPLOAD_CONSTRAINTS,
  WORKFLOW_STEPS,
  type CitizenSectionId,
  type QueryPriority,
  type QueryType,
} from "../data/citizenPortalMock";
import {
  ChecklistItem,
  CitizenButton,
  CitizenCard,
  CitizenToast,
  CitizenToggle,
  KpiTile,
  QueryStatusBadge,
  ResurveyStatusBadge,
  StarRating,
  VerificationBadge,
} from "../components/citizen/CitizenShared";

const SECTION_ICONS: Record<CitizenSectionId, typeof Home> = {
  dashboard: LayoutDashboard,
  "land-records": Landmark,
  queries: MessageSquare,
  resurvey: RefreshCw,
  dispute: Camera,
  feedback: MessageSquare,
  workflow: GitBranch,
  careers: Briefcase,
};

function useCitizenToast() {
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);
  return { toast, showToast, dismissToast: () => setToast(null) };
}

function makeTicketId() {
  return `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function CitizenPortalPage() {
  const [activeSection, setActiveSection] = useState<CitizenSectionId>("dashboard");
  const [search, setSearch] = useState("");
  const { toast, showToast, dismissToast } = useCitizenToast();

  const [queryForm, setQueryForm] = useState({
    type: "data-error" as QueryType,
    parcelRef: "",
    description: "",
    priority: "medium" as QueryPriority,
  });
  const [queries, setQueries] = useState(CITIZEN_QUERIES);

  const [resurveyForm, setResurveyForm] = useState({
    surveyNo: "",
    ulpin: "",
    reason: RESURVEY_REASONS[0],
    schedule: "Morning (8 AM – 12 PM)",
    remarks: "",
  });

  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackAnonymous, setFeedbackAnonymous] = useState(false);

  const [checklists, setChecklists] = useState(
    () =>
      Object.fromEntries(
        LAND_RECORDS.map((r) => [r.id, { ...r.checklist }]),
      ) as Record<string, { surveyNo: boolean; area: boolean; ownerName: boolean }>,
  );

  const [jobModal, setJobModal] = useState<(typeof JOB_LISTINGS)[0] | null>(null);
  const [jobApplication, setJobApplication] = useState({ name: "", email: "", phone: "", resume: "" });
  const [jobNotifications, setJobNotifications] = useState(true);

  const [disputeFiles, setDisputeFiles] = useState<string[]>([]);
  const [gpsEnabled, setGpsEnabled] = useState(true);
  const [disputeParcel, setDisputeParcel] = useState("56/1 · IN-34-PU-2024-0002105");

  const filteredSections = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CITIZEN_SECTIONS;
    return CITIZEN_SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(q) || s.description.toLowerCase().includes(q),
    );
  }, [search]);

  const SectionIcon = SECTION_ICONS[activeSection];

  const toggleChecklist = (recordId: string, field: "surveyNo" | "area" | "ownerName") => {
    setChecklists((prev) => ({
      ...prev,
      [recordId]: { ...prev[recordId], [field]: !prev[recordId][field] },
    }));
    showToast("Verification checklist updated");
  };

  const getRecordVerificationStatus = (recordId: string) => {
    const c = checklists[recordId];
    if (!c) return "pending";
    const all = c.surveyNo && c.area && c.ownerName;
    const none = !c.surveyNo && !c.area && !c.ownerName;
    if (all) return "verified";
    if (none) return "pending";
    return "discrepancy";
  };

  const handleSubmitQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryForm.parcelRef.trim() || !queryForm.description.trim()) {
      showToast("Please fill parcel reference and description");
      return;
    }
    const newQuery = {
      id: makeTicketId(),
      type: queryForm.type,
      parcelRef: queryForm.parcelRef,
      description: queryForm.description,
      priority: queryForm.priority,
      status: "submitted" as const,
      submittedAt: new Date().toISOString().slice(0, 10),
      lastUpdate: new Date().toISOString().slice(0, 10),
      assignedTo: "Pending assignment",
    };
    setQueries((prev) => [newQuery, ...prev]);
    setQueryForm({ type: "data-error", parcelRef: "", description: "", priority: "medium" });
    showToast(`Query submitted — Ticket ${newQuery.id}`);
  };

  const handleResurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Resurvey request submitted — RSV-2026-0052");
    setResurveyForm({
      surveyNo: "",
      ulpin: "",
      reason: RESURVEY_REASONS[0],
      schedule: "Morning (8 AM – 12 PM)",
      remarks: "",
    });
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(feedbackAnonymous ? "Anonymous feedback submitted — thank you" : "Feedback submitted — thank you");
    setFeedbackText("");
  };

  const handleJobApply = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Application submitted for ${jobModal?.title}`);
    setJobModal(null);
    setJobApplication({ name: "", email: "", phone: "", resume: "" });
  };

  const handleDisputeUpload = () => {
    const mockName = `evidence_${Date.now()}.jpg`;
    setDisputeFiles((prev) => [...prev, mockName]);
    showToast(`Uploaded ${mockName}${gpsEnabled ? " with GPS tag" : ""}`);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F7F7F5] p-3 lg:p-4">
      <CitizenToast message={toast} onDismiss={dismissToast} />

      {/* Auth hint banner */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white px-4 py-2.5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
            <Fingerprint className="h-4 w-4 text-sky-700" />
          </div>
          <div>
            <p className="text-xs font-semibold text-sky-900">Secure citizen access</p>
            <p className="text-[11px] text-sky-700">
              Login with <strong>Aadhaar</strong> or <strong>Mobile OTP</strong> — demo mode active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CitizenButton size="sm" variant="outline" onClick={() => showToast("Aadhaar OTP flow — demo only")}>
            <Fingerprint className="h-3.5 w-3.5" />
            Aadhaar Login
          </CitizenButton>
          <CitizenButton size="sm" onClick={() => showToast("Mobile OTP sent — demo only")}>
            <Phone className="h-3.5 w-3.5" />
            Mobile OTP
          </CitizenButton>
        </div>
      </div>

      <main className="flex min-h-0 flex-1 gap-3 overflow-hidden lg:gap-4">
        {/* Left sub-nav */}
        <aside className="hidden w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-[0_8px_30px_rgba(0,0,0,0.06)] lg:flex xl:w-64">
          <div className="border-b border-slate-100 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Citizen services</p>
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
                    active ? "bg-[#1A4D2E] text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold">{section.label}</span>
                    <span className={`block truncate text-[10px] ${active ? "text-emerald-200" : "text-slate-500"}`}>
                      {section.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>
          <div className="border-t border-slate-100 p-3">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Logged in as</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-800">{CITIZEN_PROFILE.name}</p>
              <p className="text-[10px] text-slate-500">{CITIZEN_PROFILE.district}</p>
            </div>
          </div>
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
                <SectionIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold text-[#1A1A1A]">Citizen Portal</h1>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                      My Services
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Puducherry UT & Maharashtra land records · Revenue Department digital services
                  </p>
                </div>
              </div>
            </div>
            <div className="lg:hidden">
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as CitizenSectionId)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {CITIZEN_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dashboard */}
          {activeSection === "dashboard" && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiTile label="Open queries" value={CITIZEN_DASHBOARD_STATS.openQueries} tone="warning" />
                <KpiTile label="Pending verification" value={CITIZEN_DASHBOARD_STATS.pendingVerification} tone="warning" />
                <KpiTile label="Resurvey requests" value={CITIZEN_DASHBOARD_STATS.resurveyRequests} />
                <KpiTile label="Resolved this month" value={CITIZEN_DASHBOARD_STATS.resolvedThisMonth} tone="success" />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <CitizenCard title="Quick actions" subtitle="Common citizen services">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "Download signed copy", icon: Download, section: "land-records" as CitizenSectionId },
                      { label: "Raise a query", icon: MessageSquare, section: "queries" as CitizenSectionId },
                      { label: "Request resurvey", icon: RefreshCw, section: "resurvey" as CitizenSectionId },
                      { label: "Upload dispute proof", icon: Camera, section: "dispute" as CitizenSectionId },
                    ].map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => setActiveSection(action.section)}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-left text-xs font-semibold text-slate-800 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                      >
                        <action.icon className="h-4 w-4 text-emerald-700" />
                        {action.label}
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
                      </button>
                    ))}
                  </div>
                </CitizenCard>

                <CitizenCard title="My profile" subtitle="Registered citizen">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                      <User className="h-6 w-6 text-emerald-800" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-slate-800">{CITIZEN_PROFILE.name}</p>
                      <p className="text-slate-600">{CITIZEN_PROFILE.mobile}</p>
                      <p className="text-slate-500">Aadhaar: {CITIZEN_PROFILE.aadhaarMasked}</p>
                      <p className="text-slate-500">Member since {CITIZEN_PROFILE.registeredSince}</p>
                    </div>
                  </div>
                </CitizenCard>
              </div>

              <CitizenCard title="Revenue department announcements" subtitle="Official notices & updates">
                <div className="space-y-3">
                  {REVENUE_ANNOUNCEMENTS.map((ann) => (
                    <div
                      key={ann.id}
                      className={`rounded-xl border px-4 py-3 ${
                        ann.priority === "notice" ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-slate-50/40"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Bell className="h-3.5 w-3.5 text-slate-500" />
                        <p className="text-xs font-semibold text-slate-800">{ann.title}</p>
                        <span className="ml-auto text-[10px] text-slate-500">{ann.date}</span>
                      </div>
                      <p className="mt-1.5 text-xs text-slate-600">{ann.body}</p>
                    </div>
                  ))}
                </div>
              </CitizenCard>

              <CitizenCard title="Recent query activity">
                <div className="space-y-2">
                  {queries.slice(0, 3).map((q) => (
                    <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{q.id}</p>
                        <p className="text-[11px] text-slate-500">{q.parcelRef}</p>
                      </div>
                      <QueryStatusBadge status={q.status} />
                    </div>
                  ))}
                </div>
              </CitizenCard>
            </div>
          )}

          {/* Land Records */}
          {activeSection === "land-records" && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                After receiving your signed mutation order, download copies and self-verify survey number, area, and owner name against the portal record.
              </p>
              {LAND_RECORDS.map((record) => {
                const status = getRecordVerificationStatus(record.id);
                const checklist = checklists[record.id];
                return (
                  <CitizenCard
                    key={record.id}
                    title={`Survey ${record.surveyNo} — ${record.village}`}
                    subtitle={`${record.district} · ${record.ulpin}`}
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <VerificationBadge status={status} />
                      <span className="text-xs text-slate-600">
                        Owner: <strong>{record.ownerName}</strong> · {record.areaDisplay}
                      </span>
                    </div>

                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Signed documents</p>
                    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {record.documents.map((doc) => (
                        <div
                          key={doc.fileName}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800">{doc.type}</p>
                            <p className="text-[10px] text-slate-500">Signed {doc.signedDate}</p>
                          </div>
                          <CitizenButton
                            size="xs"
                            variant="outline"
                            onClick={() => showToast(`Downloading ${doc.fileName}`)}
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </CitizenButton>
                        </div>
                      ))}
                    </div>

                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Self-verification checklist
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <ChecklistItem
                        label={`Survey no. matches (${record.surveyNo})`}
                        checked={checklist?.surveyNo ?? false}
                        onToggle={() => toggleChecklist(record.id, "surveyNo")}
                      />
                      <ChecklistItem
                        label={`Area matches (${record.areaDisplay})`}
                        checked={checklist?.area ?? false}
                        onToggle={() => toggleChecklist(record.id, "area")}
                      />
                      <ChecklistItem
                        label={`Owner name matches (${record.ownerName})`}
                        checked={checklist?.ownerName ?? false}
                        onToggle={() => toggleChecklist(record.id, "ownerName")}
                      />
                    </div>

                    {status === "discrepancy" && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs text-rose-800">
                        Discrepancy detected — raise a query or upload dispute evidence to initiate review.
                      </div>
                    )}
                  </CitizenCard>
                );
              })}
            </div>
          )}

          {/* Queries */}
          {activeSection === "queries" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <CitizenCard title="Raise query / grievance" subtitle="Link to your parcel and describe the issue">
                  <form onSubmit={handleSubmitQuery} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Query type
                      </label>
                      <select
                        value={queryForm.type}
                        onChange={(e) => setQueryForm((f) => ({ ...f, type: e.target.value as QueryType }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {QUERY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Parcel (survey no / ULPIN)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 142/3A · IN-34-PU-2024-0001842"
                        value={queryForm.parcelRef}
                        onChange={(e) => setQueryForm((f) => ({ ...f, parcelRef: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Describe the issue in detail…"
                        value={queryForm.description}
                        onChange={(e) => setQueryForm((f) => ({ ...f, description: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Priority
                      </label>
                      <select
                        value={queryForm.priority}
                        onChange={(e) => setQueryForm((f) => ({ ...f, priority: e.target.value as QueryPriority }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {QUERY_PRIORITIES.map((p) => (
                          <option key={p.value} value={p.value}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <CitizenButton type="submit">Submit query</CitizenButton>
                  </form>
                </CitizenCard>

                <CitizenCard title="Query status tracker" subtitle="Submitted → Under Review → Resolved">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    {(["submitted", "under-review", "resolved"] as const).map((step, i) => (
                      <div key={step} className="flex flex-1 flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                            i <= 1 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <p className="mt-1 text-center text-[10px] font-medium text-slate-600">
                          {step === "submitted" ? "Submitted" : step === "under-review" ? "Under Review" : "Resolved"}
                        </p>
                        {i < 2 && <div className="absolute hidden" />}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Active ticket <strong>{ACTIVE_WORKFLOW.ticketId}</strong> is currently under Talathi review.
                  </p>
                </CitizenCard>
              </div>

              <CitizenCard title="My queries" subtitle="Track all grievances by ticket ID">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500">
                        <th className="px-2 py-2 font-semibold">Ticket ID</th>
                        <th className="px-2 py-2 font-semibold">Type</th>
                        <th className="px-2 py-2 font-semibold">Parcel</th>
                        <th className="px-2 py-2 font-semibold">Priority</th>
                        <th className="px-2 py-2 font-semibold">Status</th>
                        <th className="px-2 py-2 font-semibold">Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {queries.map((q) => (
                        <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-2 py-2.5 font-mono font-medium text-slate-800">{q.id}</td>
                          <td className="px-2 py-2.5 capitalize text-slate-600">{q.type.replace("-", " ")}</td>
                          <td className="max-w-[180px] truncate px-2 py-2.5 text-slate-600">{q.parcelRef}</td>
                          <td className="px-2 py-2.5 capitalize text-slate-600">{q.priority}</td>
                          <td className="px-2 py-2.5">
                            <QueryStatusBadge status={q.status} />
                          </td>
                          <td className="px-2 py-2.5 text-slate-500">{q.assignedTo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CitizenCard>
            </div>
          )}

          {/* Resurvey */}
          {activeSection === "resurvey" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <CitizenCard title="Request field resurvey" subtitle="Schedule a government surveyor visit">
                  <form onSubmit={handleResurveySubmit} className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          Survey number
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 56/1"
                          value={resurveyForm.surveyNo}
                          onChange={(e) => setResurveyForm((f) => ({ ...f, surveyNo: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          ULPIN
                        </label>
                        <input
                          type="text"
                          placeholder="IN-34-PU-2024-…"
                          value={resurveyForm.ulpin}
                          onChange={(e) => setResurveyForm((f) => ({ ...f, ulpin: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Reason for resurvey
                      </label>
                      <select
                        value={resurveyForm.reason}
                        onChange={(e) => setResurveyForm((f) => ({ ...f, reason: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        {RESURVEY_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Schedule preference
                      </label>
                      <select
                        value={resurveyForm.schedule}
                        onChange={(e) => setResurveyForm((f) => ({ ...f, schedule: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      >
                        <option>Morning (8 AM – 12 PM)</option>
                        <option>Afternoon (12 PM – 4 PM)</option>
                        <option>Any weekday</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Supporting documents
                      </label>
                      <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-3 py-4">
                        <Upload className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-600">Upload site sketch, old FMB, or court order</p>
                          <p className="text-[10px] text-slate-500">PDF, JPG — max 10 MB each</p>
                        </div>
                        <CitizenButton size="sm" variant="outline" type="button" onClick={() => showToast("Document attached — demo")}>
                          Browse
                        </CitizenButton>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Remarks
                      </label>
                      <textarea
                        rows={2}
                        value={resurveyForm.remarks}
                        onChange={(e) => setResurveyForm((f) => ({ ...f, remarks: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                        placeholder="Additional details for the surveyor…"
                      />
                    </div>
                    <CitizenButton type="submit">Submit resurvey request</CitizenButton>
                  </form>
                </CitizenCard>

                <CitizenCard title="Workflow status" subtitle="Track your resurvey requests">
                  {RESURVEY_REQUESTS.length === 0 ? (
                    <p className="text-xs text-slate-500">No active resurvey requests.</p>
                  ) : (
                    <div className="space-y-3">
                      {RESURVEY_REQUESTS.map((req) => (
                        <div key={req.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-xs font-semibold text-slate-800">{req.id}</p>
                            <ResurveyStatusBadge status={req.status} />
                          </div>
                          <p className="mt-1 text-xs text-slate-600">
                            Survey {req.surveyNo} · {req.reason}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Scheduled: {req.scheduledDate} · Preference: {req.schedulePreference}
                          </p>
                          <div className="mt-2 flex gap-1">
                            {(["submitted", "scheduled", "field-visit", "completed"] as const).map((step, i) => {
                              const stepIndex = ["submitted", "scheduled", "field-visit", "completed"].indexOf(req.status);
                              const done = i <= stepIndex;
                              return (
                                <div
                                  key={step}
                                  className={`h-1.5 flex-1 rounded-full ${done ? "bg-emerald-500" : "bg-slate-200"}`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CitizenCard>
              </div>
            </div>
          )}

          {/* Dispute Evidence */}
          {activeSection === "dispute" && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <CitizenCard title="Upload dispute evidence" subtitle="Images or video of boundary issues">
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Link to parcel
                      </label>
                      <input
                        type="text"
                        value={disputeParcel}
                        onChange={(e) => setDisputeParcel(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                      />
                    </div>
                    <CitizenToggle
                      checked={gpsEnabled}
                      onChange={setGpsEnabled}
                      label="Attach GPS location (demo)"
                      description="Auto-tag uploads with device coordinates for field verification"
                    />
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4 text-center">
                      <Camera className="mx-auto h-8 w-8 text-slate-400" />
                      <p className="mt-2 text-xs font-medium text-slate-700">Drag & drop or browse files</p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Images: {UPLOAD_CONSTRAINTS.imageFormats} (max {UPLOAD_CONSTRAINTS.maxImageMb} MB) · Videos:{" "}
                        {UPLOAD_CONSTRAINTS.videoFormats} (max {UPLOAD_CONSTRAINTS.maxVideoMb} MB)
                      </p>
                      <CitizenButton className="mt-3" size="sm" onClick={handleDisputeUpload}>
                        <Upload className="h-3.5 w-3.5" />
                        Upload proof
                      </CitizenButton>
                    </div>
                    {disputeFiles.length > 0 && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 px-3 py-2 text-xs text-emerald-800">
                        {disputeFiles.length} file(s) staged for submission
                      </div>
                    )}
                  </div>
                </CitizenCard>

                <CitizenCard title="Accepted formats & limits" subtitle="UI validation — demo only">
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-slate-400" />
                      Images: {UPLOAD_CONSTRAINTS.imageFormats} — up to {UPLOAD_CONSTRAINTS.maxImageMb} MB each
                    </li>
                    <li className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-slate-400" />
                      Video: {UPLOAD_CONSTRAINTS.videoFormats} — up to {UPLOAD_CONSTRAINTS.maxVideoMb} MB each
                    </li>
                    <li className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      Maximum {UPLOAD_CONSTRAINTS.maxFiles} files per dispute case
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      GPS tagging optional — helps surveyor locate boundary
                    </li>
                  </ul>
                </CitizenCard>
              </div>

              <CitizenCard title="Proof of issue gallery" subtitle="Previously uploaded evidence">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {DISPUTE_EVIDENCE.map((ev) => (
                    <div key={ev.id} className="overflow-hidden rounded-xl border border-slate-200">
                      <div
                        className={`flex h-28 items-center justify-center ${
                          ev.type === "video" ? "bg-slate-800" : "bg-gradient-to-br from-emerald-100 to-slate-100"
                        }`}
                      >
                        {ev.type === "video" ? (
                          <Video className="h-10 w-10 text-white/80" />
                        ) : (
                          <Image className="h-10 w-10 text-emerald-700/60" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-xs font-semibold text-slate-800">{ev.fileName}</p>
                        <p className="text-[10px] text-slate-500">{ev.parcelRef}</p>
                        <p className="mt-1 text-[10px] text-slate-500">
                          {ev.uploadedAt} · {ev.sizeMb} MB
                          {ev.gpsTag ? ` · ${ev.gpsTag}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CitizenCard>
            </div>
          )}

          {/* Feedback */}
          {activeSection === "feedback" && (
            <div className="max-w-xl space-y-4">
              <CitizenCard title="Service feedback" subtitle="Help us improve citizen land record services">
                <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Rate your experience
                    </label>
                    <StarRating value={feedbackRating} onChange={setFeedbackRating} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Suggestions & comments
                    </label>
                    <textarea
                      rows={4}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what worked well or what needs improvement…"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <CitizenToggle
                    checked={feedbackAnonymous}
                    onChange={setFeedbackAnonymous}
                    label="Submit anonymously"
                    description="Your identity will not be linked to this feedback"
                  />
                  <CitizenButton type="submit">Submit feedback</CitizenButton>
                </form>
              </CitizenCard>
            </div>
          )}

          {/* Workflow */}
          {activeSection === "workflow" && (
            <div className="space-y-4">
              <CitizenCard
                title="Controlled workflow — citizen to government"
                subtitle={`Active case: ${ACTIVE_WORKFLOW.ticketId}`}
              >
                <p className="mb-4 text-xs text-slate-600">
                  Your request flows through village Talathi, field surveyor, and revenue approval before resolution. Each step has defined SLAs.
                </p>
                <div className="grid gap-2 lg:grid-cols-5">
                  {WORKFLOW_STEPS.map((step, index) => {
                    const isDone = index < ACTIVE_WORKFLOW.currentStep;
                    const isCurrent = index === ACTIVE_WORKFLOW.currentStep;
                    return (
                      <div
                        key={step.id}
                        className={`relative rounded-xl border px-3 py-3 ${
                          isCurrent
                            ? "border-emerald-300 bg-emerald-50"
                            : isDone
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {isDone ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                isCurrent ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-500"
                              }`}
                            >
                              {index + 1}
                            </span>
                          )}
                          <p className="text-xs font-semibold text-slate-800">{step.label}</p>
                        </div>
                        <p className="mt-1.5 text-[10px] text-slate-500">{step.description}</p>
                        {step.slaDays > 0 && (
                          <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="h-3 w-3" />
                            SLA: {step.slaDays} days
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CitizenCard>

              <div className="grid gap-4 lg:grid-cols-2">
                <CitizenCard title="SLA timeline" subtitle="Estimated completion">
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Started</span>
                      <span className="font-medium text-slate-800">{ACTIVE_WORKFLOW.startedAt}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Estimated completion</span>
                      <span className="font-medium text-slate-800">{ACTIVE_WORKFLOW.estimatedCompletion}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">SLA remaining</span>
                      <span className="font-medium text-emerald-700">{ACTIVE_WORKFLOW.slaRemainingDays} days</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full w-[35%] rounded-full bg-emerald-500" />
                    </div>
                    <p className="text-[10px] text-slate-500">Step 2 of 5 — Talathi review in progress</p>
                  </div>
                </CitizenCard>

                <CitizenCard title="Government bridge" subtitle="Controlled access between citizen & revenue dept">
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>Citizen submissions are logged with audit trail — tamper-evident workflow IDs</span>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
                      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>Revenue officers see only case-relevant parcel data — RBAC enforced</span>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
                      <Home className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>Resolution updates trigger signed document re-issue to your portal inbox</span>
                    </div>
                  </div>
                </CitizenCard>
              </div>
            </div>
          )}

          {/* Careers */}
          {activeSection === "careers" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-600">
                  Government of Puducherry & Maharashtra revenue department — current openings
                </p>
                <CitizenToggle
                  checked={jobNotifications}
                  onChange={setJobNotifications}
                  label="Notify me of new postings"
                />
              </div>

              <div className="grid gap-4">
                {JOB_LISTINGS.map((job) => (
                  <CitizenCard key={job.id} title={job.title} subtitle={`${job.department} · ${job.location}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 text-xs text-slate-600">
                        <p>
                          <span className="font-semibold text-slate-800">{job.type}</span> · {job.vacancies} vacancy
                          {job.vacancies > 1 ? "ies" : "y"}
                        </p>
                        <p>{job.salary}</p>
                        <p className="text-slate-500">{job.qualifications}</p>
                        <p className="text-[11px] text-slate-500">
                          Posted {job.postedAt} · Closes {job.closingAt}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {job.isNew && (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-bold uppercase text-sky-700">
                            New
                          </span>
                        )}
                        <CitizenButton onClick={() => setJobModal(job)}>Apply now</CitizenButton>
                      </div>
                    </div>
                  </CitizenCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Job application modal */}
      {jobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-[#1A1A1A]">Apply — {jobModal.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{jobModal.department}</p>
            <form onSubmit={handleJobApply} className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Full name"
                required
                value={jobApplication.name}
                onChange={(e) => setJobApplication((a) => ({ ...a, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={jobApplication.email}
                onChange={(e) => setJobApplication((a) => ({ ...a, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="tel"
                placeholder="Mobile number"
                required
                value={jobApplication.phone}
                onChange={(e) => setJobApplication((a) => ({ ...a, phone: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-xs text-slate-600">Resume / CV (PDF)</span>
                <CitizenButton
                  size="xs"
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setJobApplication((a) => ({ ...a, resume: "resume.pdf" }));
                    showToast("Resume attached — demo");
                  }}
                >
                  Upload
                </CitizenButton>
              </div>
              <div className="flex gap-2 pt-1">
                <CitizenButton type="submit" className="flex-1">
                  Submit application
                </CitizenButton>
                <CitizenButton type="button" variant="secondary" onClick={() => setJobModal(null)}>
                  Cancel
                </CitizenButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
