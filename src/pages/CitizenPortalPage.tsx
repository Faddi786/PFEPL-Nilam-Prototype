import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Camera,
  ChevronRight,
  Download,
  FileCheck,
  FileText,
  GitBranch,
  Landmark,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  ScrollText,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ACTIVE_WORKFLOW,
  CITIZEN_DASHBOARD_STATS,
  CITIZEN_PROFILE,
  CITIZEN_QUERIES,
  CITIZEN_SECTIONS,
  JOB_LISTINGS,
  LAND_RECORDS,
  QUERY_TYPES,
  RESURVEY_REASONS,
  RESURVEY_REQUESTS,
  WORKFLOW_STEPS,
  type CitizenSectionId,
  type QueryStatus,
  type QueryType,
  type ResurveyStatus,
} from "../data/citizenPortalMock";
import {
  CitizenButton,
  CitizenCard,
  CitizenToast,
  QueryStatusBadge,
  StarRating,
} from "../components/citizen/CitizenShared";

const SECTION_ICONS: Record<CitizenSectionId, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  "land-records": Landmark,
  queries: MessageSquare,
  resurvey: RefreshCw,
  dispute: Camera,
  feedback: MessageSquare,
  workflow: GitBranch,
  careers: Briefcase,
};

const QUERY_STATUS_DOT: Record<QueryStatus, string> = {
  submitted: "bg-sky-400",
  "under-review": "bg-amber-400",
  resolved: "bg-emerald-400",
};

const RESURVEY_STATUS_DOT: Record<ResurveyStatus, string> = {
  submitted: "bg-sky-400",
  scheduled: "bg-violet-400",
  "field-visit": "bg-amber-400",
  completed: "bg-emerald-400",
};

function docTypeIcon(type: string) {
  if (type.includes("7/12")) return FileText;
  if (type.includes("Mutation")) return ScrollText;
  if (type.includes("Patta")) return FileCheck;
  return FileText;
}

function StatusDot({ colorClass }: { colorClass: string }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${colorClass}`} aria-hidden />;
}

function SectionHeader({ sectionId }: { sectionId: CitizenSectionId }) {
  const section = CITIZEN_SECTIONS.find((s) => s.id === sectionId)!;
  const Icon = SECTION_ICONS[sectionId];
  return (
    <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-slate-900">{section.label}</h1>
        <p className="text-xs text-slate-500">{section.description}</p>
      </div>
    </div>
  );
}

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
  const { toast, showToast, dismissToast } = useCitizenToast();

  const [queryForm, setQueryForm] = useState({
    type: "data-error" as QueryType,
    parcelRef: "",
    description: "",
  });
  const [queries, setQueries] = useState(CITIZEN_QUERIES);

  const [resurveyForm, setResurveyForm] = useState({
    surveyNo: "",
    reason: RESURVEY_REASONS[0],
  });

  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackText, setFeedbackText] = useState("");

  const [jobModal, setJobModal] = useState<(typeof JOB_LISTINGS)[0] | null>(null);
  const [jobApplication, setJobApplication] = useState({ name: "", email: "", phone: "", resume: "" });

  const [disputeParcel, setDisputeParcel] = useState("56/1");

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
      priority: "medium" as const,
      status: "submitted" as const,
      submittedAt: new Date().toISOString().slice(0, 10),
      lastUpdate: new Date().toISOString().slice(0, 10),
      assignedTo: "Pending assignment",
    };
    setQueries((prev) => [newQuery, ...prev]);
    setQueryForm({ type: "data-error", parcelRef: "", description: "" });
    showToast(`Query submitted — ${newQuery.id}`);
  };

  const handleResurveySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Resurvey request submitted");
    setResurveyForm({ surveyNo: "", reason: RESURVEY_REASONS[0] });
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Feedback submitted — thank you");
    setFeedbackText("");
  };

  const handleJobApply = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Application submitted for ${jobModal?.title}`);
    setJobModal(null);
    setJobApplication({ name: "", email: "", phone: "", resume: "" });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 p-3 lg:p-4">
      <CitizenToast message={toast} onDismiss={dismissToast} />

      <main className="flex min-h-0 flex-1 gap-3 overflow-hidden lg:gap-4">
        <aside className="hidden w-52 shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:flex xl:w-56">
          <nav className="min-h-0 flex-1 overflow-y-auto p-2">
            {CITIZEN_SECTIONS.map((section) => {
              const Icon = SECTION_ICONS[section.id];
              const active = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition ${
                    active ? "bg-slate-800 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:shadow-sm"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-slate-200" : "text-slate-400"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">{section.label}</span>
                    {!active && (
                      <span className="block truncate text-[10px] text-slate-400">{section.description}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to map workbench
            </Link>
            <div className="lg:hidden">
              <select
                value={activeSection}
                onChange={(e) => setActiveSection(e.target.value as CitizenSectionId)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {CITIZEN_SECTIONS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeSection === "dashboard" && (
            <div>
              <SectionHeader sectionId="dashboard" />
              <p className="mb-3 text-sm text-slate-600">
                Welcome back, {CITIZEN_PROFILE.name.split(" ")[0]} — your land records and requests at a glance.
              </p>
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { label: "Open queries", value: CITIZEN_DASHBOARD_STATS.openQueries },
                  { label: "Pending verification", value: CITIZEN_DASHBOARD_STATS.pendingVerification },
                  { label: "Resolved this month", value: CITIZEN_DASHBOARD_STATS.resolvedThisMonth },
                ].map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                  >
                    <span className="font-semibold text-slate-800">{chip.value}</span>
                    {chip.label}
                  </span>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
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
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-white hover:shadow-md"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                      <action.icon className="h-4 w-4 text-slate-500" />
                    </div>
                    <span className="text-sm font-medium text-slate-800">{action.label}</span>
                    <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === "land-records" && (
            <div>
              <SectionHeader sectionId="land-records" />
              <div className="space-y-3">
                {LAND_RECORDS.slice(0, 2).map((record) => (
                  <CitizenCard key={record.id} title={`Survey ${record.surveyNo}`} subtitle={record.village}>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {record.documents.map((doc) => {
                        const DocIcon = docTypeIcon(doc.type);
                        return (
                          <span
                            key={doc.fileName}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 px-2 py-1 text-[11px] text-slate-600"
                          >
                            <DocIcon className="h-3 w-3 text-slate-400" />
                            {doc.type}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{record.ownerName} · {record.areaDisplay}</p>
                      <CitizenButton
                        size="sm"
                        variant="outline"
                        onClick={() => showToast(`Downloading ${record.documents[0]?.fileName ?? "document"}`)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download signed copy
                      </CitizenButton>
                    </div>
                  </CitizenCard>
                ))}
              </div>
            </div>
          )}

          {activeSection === "queries" && (
            <div className="space-y-4">
              <SectionHeader sectionId="queries" />
              <CitizenCard title="Raise query" subtitle="Report an issue with your parcel record">
                <form onSubmit={handleSubmitQuery} className="space-y-3">
                  <select
                    value={queryForm.type}
                    onChange={(e) => setQueryForm((f) => ({ ...f, type: e.target.value as QueryType }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    {QUERY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Survey no / ULPIN"
                    value={queryForm.parcelRef}
                    onChange={(e) => setQueryForm((f) => ({ ...f, parcelRef: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <textarea
                    rows={2}
                    placeholder="Brief description"
                    value={queryForm.description}
                    onChange={(e) => setQueryForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <CitizenButton type="submit">Submit query</CitizenButton>
                </form>
              </CitizenCard>

              <CitizenCard title="My queries">
                <div className="space-y-2">
                  {queries.slice(0, 4).map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 transition hover:border-slate-200 hover:bg-slate-50/50">
                      <div className="flex min-w-0 items-center gap-2">
                        <StatusDot colorClass={QUERY_STATUS_DOT[q.status]} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800">{q.id}</p>
                          <p className="truncate text-[11px] text-slate-500">{q.parcelRef}</p>
                        </div>
                      </div>
                      <QueryStatusBadge status={q.status} />
                    </div>
                  ))}
                </div>
              </CitizenCard>
            </div>
          )}

          {activeSection === "resurvey" && (
            <div className="space-y-4">
              <SectionHeader sectionId="resurvey" />
              <CitizenCard title="Request resurvey" subtitle="Schedule a field survey visit">
                <form onSubmit={handleResurveySubmit} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Survey number"
                    value={resurveyForm.surveyNo}
                    onChange={(e) => setResurveyForm((f) => ({ ...f, surveyNo: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <select
                    value={resurveyForm.reason}
                    onChange={(e) => setResurveyForm((f) => ({ ...f, reason: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  >
                    {RESURVEY_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <CitizenButton type="submit">Submit request</CitizenButton>
                </form>
              </CitizenCard>

              {RESURVEY_REQUESTS.length > 0 && (
                <CitizenCard title="Active requests">
                  {RESURVEY_REQUESTS.map((req) => (
                    <div key={req.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-medium text-slate-800">
                        <StatusDot colorClass={RESURVEY_STATUS_DOT[req.status]} />
                        {req.id} · Survey {req.surveyNo}
                      </span>
                      <span className="text-slate-500 capitalize">{req.status.replace("-", " ")}</span>
                    </div>
                  ))}
                </CitizenCard>
              )}
            </div>
          )}

          {activeSection === "dispute" && (
            <div>
              <SectionHeader sectionId="dispute" />
              <CitizenCard title="Upload dispute evidence" subtitle="Photos or video of boundary issues">
              <div className="space-y-3">
                <input
                  type="text"
                  value={disputeParcel}
                  onChange={(e) => setDisputeParcel(e.target.value)}
                  placeholder="Survey number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <div className="rounded-lg border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white p-6 text-center transition hover:border-slate-400">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Upload className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Upload images or video</p>
                  <CitizenButton className="mt-3" size="sm" variant="outline" onClick={() => showToast("File uploaded — demo")}>
                    Browse files
                  </CitizenButton>
                </div>
              </div>
            </CitizenCard>
            </div>
          )}

          {activeSection === "feedback" && (
            <div>
              <SectionHeader sectionId="feedback" />
              <CitizenCard title="Service feedback" subtitle="Rate your experience">
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <StarRating value={feedbackRating} onChange={setFeedbackRating} />
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Optional comments"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                />
                <CitizenButton type="submit">Submit feedback</CitizenButton>
              </form>
            </CitizenCard>
            </div>
          )}

          {activeSection === "workflow" && (
            <div>
              <SectionHeader sectionId="workflow" />
              <CitizenCard title="Case workflow" subtitle={`Ticket ${ACTIVE_WORKFLOW.ticketId}`}>
              <div className="flex flex-wrap gap-2">
                {WORKFLOW_STEPS.map((step, index) => {
                  const isDone = index < ACTIVE_WORKFLOW.currentStep;
                  const isCurrent = index === ACTIVE_WORKFLOW.currentStep;
                  const dotColor = isDone ? "bg-emerald-400" : isCurrent ? "bg-amber-400" : "bg-slate-300";
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        isCurrent
                          ? "border-slate-400 bg-slate-100 text-slate-800 shadow-sm"
                          : isDone
                            ? "border-slate-200 bg-slate-50 text-slate-600"
                            : "border-slate-100 text-slate-400"
                      }`}
                    >
                      <StatusDot colorClass={dotColor} />
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </CitizenCard>
            </div>
          )}

          {activeSection === "careers" && (
            <div className="space-y-3">
              <SectionHeader sectionId="careers" />
              <p className="text-xs text-slate-500">Revenue department & GIS land records openings</p>
              {JOB_LISTINGS.map((job) => (
                <CitizenCard
                  key={job.id}
                  title={job.title}
                  subtitle={`${job.department} · ${job.location}`}
                  className={job.isNew ? "ring-1 ring-slate-200" : ""}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-0.5 text-xs text-slate-600">
                      <p>
                        {job.isNew && (
                          <span className="mr-1.5 inline-flex rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                            New
                          </span>
                        )}
                        <span className="font-medium text-slate-800">{job.type}</span>
                        {job.vacancies > 1 ? ` · ${job.vacancies} vacancies` : ""}
                      </p>
                      <p>{job.salary}</p>
                      <p className="text-slate-500">{job.qualifications}</p>
                      <p className="text-[11px] text-slate-400">
                        Closes {job.closingAt}
                      </p>
                    </div>
                    <CitizenButton size="sm" onClick={() => setJobModal(job)}>
                      Apply
                    </CitizenButton>
                  </div>
                </CitizenCard>
              ))}
            </div>
          )}
        </div>
      </main>

      {jobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Apply — {jobModal.title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{jobModal.department}</p>
            <form onSubmit={handleJobApply} className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Full name"
                required
                value={jobApplication.name}
                onChange={(e) => setJobApplication((a) => ({ ...a, name: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="email"
                placeholder="Email"
                required
                value={jobApplication.email}
                onChange={(e) => setJobApplication((a) => ({ ...a, email: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <input
                type="tel"
                placeholder="Mobile number"
                required
                value={jobApplication.phone}
                onChange={(e) => setJobApplication((a) => ({ ...a, phone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              />
              <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3">
                <FileText className="h-5 w-5 text-slate-400" />
                <span className="flex-1 text-xs text-slate-600">Resume (PDF)</span>
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
                  Submit
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
