export type CitizenSectionId =
  | "dashboard"
  | "land-records"
  | "queries"
  | "resurvey"
  | "dispute"
  | "feedback"
  | "workflow"
  | "careers";

export type VerificationStatus = "verified" | "pending" | "discrepancy";

export type QueryStatus = "submitted" | "under-review" | "resolved";

export type QueryType = "data-error" | "boundary-dispute" | "ownership" | "other";

export type QueryPriority = "low" | "medium" | "high";

export type ResurveyStatus = "submitted" | "scheduled" | "field-visit" | "completed";

export type WorkflowStepId =
  | "citizen-submit"
  | "talathi-review"
  | "surveyor-visit"
  | "revenue-approval"
  | "resolution";

export const CITIZEN_SECTIONS: {
  id: CitizenSectionId;
  label: string;
  description: string;
}[] = [
  { id: "dashboard", label: "Dashboard", description: "Overview & announcements" },
  { id: "land-records", label: "My Land Records", description: "Download & verify signed copies" },
  { id: "queries", label: "Raise Query", description: "Grievances & ticket tracking" },
  { id: "resurvey", label: "Resurvey Request", description: "Field resurvey workflow" },
  { id: "dispute", label: "Dispute Evidence", description: "Upload boundary proof" },
  { id: "feedback", label: "Feedback", description: "Rate services & suggestions" },
  { id: "workflow", label: "Workflow Status", description: "Citizen–government bridge" },
  { id: "careers", label: "Careers & Jobs", description: "Revenue department openings" },
];

export const CITIZEN_DASHBOARD_STATS = {
  openQueries: 2,
  pendingVerification: 1,
  resurveyRequests: 0,
  resolvedThisMonth: 4,
};

export const REVENUE_ANNOUNCEMENTS = [
  {
    id: "ANN-001",
    date: "2026-06-25",
    title: "Digital 7/12 self-verification now live",
    body: "Land owners in Puducherry UT can verify signed mutation orders against portal records.",
    priority: "info" as const,
  },
  {
    id: "ANN-002",
    date: "2026-06-20",
    title: "Villianur village resurvey camp — 5–12 July",
    body: "Field teams will visit Villianur for boundary reconciliation. Carry original patta.",
    priority: "notice" as const,
  },
  {
    id: "ANN-003",
    date: "2026-06-15",
    title: "Maharashtra Khutal sector FMB update",
    body: "Updated FMB sheets for Khutal Sector 4 available for download in My Land Records.",
    priority: "info" as const,
  },
];

export const LAND_RECORDS = [
  {
    id: "LR-001",
    surveyNo: "142/3A",
    ulpin: "IN-34-PU-2024-0001842",
    village: "Villianur",
    district: "Puducherry",
    ownerName: "R. Murugan",
    areaHa: 0.42,
    areaDisplay: "0.42 ha (1.04 acres)",
    verificationStatus: "verified" as VerificationStatus,
    documents: [
      { type: "7/12 Extract", signedDate: "2026-06-18", fileName: "7-12_Villianur_142-3A_signed.pdf" },
      { type: "Mutation Order", signedDate: "2026-06-18", fileName: "Mutation_MO-2026-8842_signed.pdf" },
      { type: "Patta", signedDate: "2026-06-18", fileName: "Patta_Villianur_142-3A_signed.pdf" },
    ],
    checklist: {
      surveyNo: true,
      area: true,
      ownerName: true,
    },
  },
  {
    id: "LR-002",
    surveyNo: "87/B",
    ulpin: "IN-27-MH-2023-0094218",
    village: "Khutal Sector 4",
    district: "Thane (Murbad)",
    ownerName: "R. Murugan",
    areaHa: 0.38,
    areaDisplay: "0.38 ha (0.94 acres)",
    verificationStatus: "pending" as VerificationStatus,
    documents: [
      { type: "7/12 Extract", signedDate: "2026-06-22", fileName: "7-12_Khutal_87B_signed.pdf" },
      { type: "Mutation Order", signedDate: "2026-06-22", fileName: "Mutation_MO-2026-9104_signed.pdf" },
    ],
    checklist: {
      surveyNo: true,
      area: false,
      ownerName: true,
    },
  },
  {
    id: "LR-003",
    surveyNo: "56/1",
    ulpin: "IN-34-PU-2024-0002105",
    village: "Oulgaret",
    district: "Puducherry",
    ownerName: "R. Murugan",
    areaHa: 0.55,
    areaDisplay: "0.55 ha (1.36 acres)",
    verificationStatus: "discrepancy" as VerificationStatus,
    documents: [
      { type: "7/12 Extract", signedDate: "2026-06-10", fileName: "7-12_Oulgaret_56-1_signed.pdf" },
      { type: "Patta", signedDate: "2026-06-10", fileName: "Patta_Oulgaret_56-1_signed.pdf" },
    ],
    checklist: {
      surveyNo: true,
      area: false,
      ownerName: false,
    },
  },
];

export const QUERY_TYPES: { value: QueryType; label: string }[] = [
  { value: "data-error", label: "Data error in records" },
  { value: "boundary-dispute", label: "Boundary dispute" },
  { value: "ownership", label: "Ownership / title issue" },
  { value: "other", label: "Other grievance" },
];

export const QUERY_PRIORITIES: { value: QueryPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High — urgent" },
];

export const CITIZEN_QUERIES = [
  {
    id: "GRV-2026-0842",
    type: "data-error" as QueryType,
    parcelRef: "142/3A · IN-34-PU-2024-0001842",
    description: "Area shown as 0.42 ha but signed 7/12 states 0.44 ha.",
    priority: "medium" as QueryPriority,
    status: "under-review" as QueryStatus,
    submittedAt: "2026-06-20",
    lastUpdate: "2026-06-24",
    assignedTo: "Talathi — Villianur",
  },
  {
    id: "GRV-2026-0791",
    type: "boundary-dispute" as QueryType,
    parcelRef: "56/1 · IN-34-PU-2024-0002105",
    description: "Neighbour encroachment on eastern boundary; fence line differs from FMB.",
    priority: "high" as QueryPriority,
    status: "submitted" as QueryStatus,
    submittedAt: "2026-06-26",
    lastUpdate: "2026-06-26",
    assignedTo: "Pending assignment",
  },
  {
    id: "GRV-2026-0612",
    type: "ownership" as QueryType,
    parcelRef: "87/B · IN-27-MH-2023-0094218",
    description: "Name spelling mismatch between patta and Aadhaar-linked record.",
    priority: "low" as QueryPriority,
    status: "resolved" as QueryStatus,
    submittedAt: "2026-06-05",
    lastUpdate: "2026-06-14",
    assignedTo: "Revenue Officer — Murbad",
    resolution: "Name corrected in mutation register; updated signed copy issued.",
  },
];

export const RESURVEY_REASONS = [
  "Boundary not matching FMB / site",
  "Sub-division / amalgamation required",
  "Encroachment verification",
  "Post-mutation field verification",
  "DGPS coordinate discrepancy",
  "Other — specify in remarks",
];

export const RESURVEY_REQUESTS = [
  {
    id: "RSV-2026-0041",
    surveyNo: "56/1",
    ulpin: "IN-34-PU-2024-0002105",
    reason: "Boundary not matching FMB / site",
    schedulePreference: "Morning (8 AM – 12 PM)",
    status: "field-visit" as ResurveyStatus,
    submittedAt: "2026-06-18",
    scheduledDate: "2026-07-05",
    documents: ["site_sketch_56-1.pdf"],
  },
];

export const DISPUTE_EVIDENCE = [
  {
    id: "EVD-001",
    parcelRef: "56/1 · Oulgaret",
    fileName: "boundary_fence_east.jpg",
    type: "image" as const,
    uploadedAt: "2026-06-24",
    gpsTag: "11.9134° N, 79.8121° E",
    sizeMb: 2.4,
  },
  {
    id: "EVD-002",
    parcelRef: "56/1 · Oulgaret",
    fileName: "boundary_walkthrough.mp4",
    type: "video" as const,
    uploadedAt: "2026-06-24",
    gpsTag: "11.9136° N, 79.8123° E",
    sizeMb: 18.6,
  },
  {
    id: "EVD-003",
    parcelRef: "56/1 · Oulgaret",
    fileName: "fmb_overlay_marked.png",
    type: "image" as const,
    uploadedAt: "2026-06-25",
    gpsTag: null,
    sizeMb: 1.1,
  },
];

export const UPLOAD_CONSTRAINTS = {
  imageFormats: "JPG, PNG, WEBP",
  videoFormats: "MP4, MOV",
  maxImageMb: 10,
  maxVideoMb: 50,
  maxFiles: 8,
};

export const WORKFLOW_STEPS: {
  id: WorkflowStepId;
  label: string;
  description: string;
  slaDays: number;
}[] = [
  { id: "citizen-submit", label: "Citizen submits", description: "Query, resurvey, or dispute evidence filed", slaDays: 0 },
  { id: "talathi-review", label: "Talathi review", description: "Village-level verification & triage", slaDays: 3 },
  { id: "surveyor-visit", label: "Surveyor visit", description: "Field measurement & FMB reconciliation", slaDays: 7 },
  { id: "revenue-approval", label: "Revenue approval", description: "Tahsildar / RO sign-off on resolution", slaDays: 5 },
  { id: "resolution", label: "Resolution", description: "Updated records & citizen notification", slaDays: 2 },
];

export const ACTIVE_WORKFLOW = {
  ticketId: "GRV-2026-0842",
  currentStep: 1 as number,
  startedAt: "2026-06-20",
  estimatedCompletion: "2026-07-08",
  slaRemainingDays: 12,
  stepsCompleted: ["citizen-submit"] as WorkflowStepId[],
};

export const JOB_LISTINGS = [
  {
    id: "JOB-2026-041",
    title: "Land Surveyor",
    department: "Revenue & Survey — Puducherry UT",
    location: "Villianur / Oulgaret",
    type: "Permanent",
    postedAt: "2026-06-20",
    closingAt: "2026-07-15",
    vacancies: 3,
    salary: "₹35,400 – ₹1,12,400 (Level 6)",
    qualifications: "Diploma in Survey / B.Sc. Geography; 2+ years field experience",
    isNew: true,
  },
  {
    id: "JOB-2026-038",
    title: "Data Entry Operator",
    department: "DoSLR Cadastral Modernisation Cell",
    location: "Puducherry HQ",
    type: "Contract (12 months)",
    postedAt: "2026-06-12",
    closingAt: "2026-07-05",
    vacancies: 5,
    salary: "₹18,000/month consolidated",
    qualifications: "12th pass; typing 40 WPM; basic GIS familiarity preferred",
    isNew: false,
  },
  {
    id: "JOB-2026-035",
    title: "GIS Analyst",
    department: "NIC — Land Records GIS Unit",
    location: "Puducherry / Remote hybrid",
    type: "Permanent",
    postedAt: "2026-06-08",
    closingAt: "2026-07-20",
    vacancies: 2,
    salary: "₹44,900 – ₹1,42,400 (Level 7)",
    qualifications: "B.Tech / M.Sc. GIS; PostGIS, QGIS, GeoServer experience",
    isNew: false,
  },
  {
    id: "JOB-2026-029",
    title: "Field Assistant (Resurvey Camp)",
    department: "Revenue Department — Maharashtra Liaison",
    location: "Khutal, Murbad (Thane)",
    type: "Temporary (camp basis)",
    postedAt: "2026-05-28",
    closingAt: "2026-06-30",
    vacancies: 8,
    salary: "₹12,000/month + TA",
    qualifications: "10th pass; willingness for field work in rural areas",
    isNew: false,
  },
];

export const CITIZEN_PROFILE = {
  name: "R. Murugan",
  mobile: "+91 98XX XXX 421",
  aadhaarMasked: "XXXX-XXXX-4821",
  district: "Puducherry UT",
  registeredSince: "2024-03-12",
};
