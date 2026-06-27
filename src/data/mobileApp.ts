import { DEFAULT_REGION_KEY, PARCEL_BOUNDARY_STROKE, VARIANCE_BAND_COLORS_SOLID, type ParcelRecord } from "./mockData";
import { getWorkbenchRegionDatasetSync } from "./workbenchParcels";

export type MobileTab = "home" | "map" | "search" | "capture" | "sync";

export type FieldOfficer = {
  id: string;
  name: string;
  role: string;
  badge: string;
  assignedVillage: string;
  assignedTaluk: string;
  region: string;
};

export type FieldPacket = {
  id: string;
  village: string;
  parcelCount: number;
  status: "assigned" | "downloaded" | "in-progress" | "synced";
  dueDate: string;
  progressPct: number;
};

export type CapturedGnssPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  accuracyM: number;
  source: "bluetooth" | "ntrip" | "file";
  capturedAt: string;
  synced: boolean;
};

export const DEMO_FIELD_OFFICER: FieldOfficer = {
  id: "surveyor.kr.1042",
  name: "R. Venkatesh",
  role: "Revenue Surveyor",
  badge: "KR-SRV-1042",
  assignedVillage: "Khutal",
  assignedTaluk: "Murbad",
  region: "Thane, Maharashtra",
};

export const FIELD_PACKETS: FieldPacket[] = [
  {
    id: "pkt-khutal-042",
    village: "Khutal",
    parcelCount: 48,
    status: "in-progress",
    dueDate: "18 Jun 2026",
    progressPct: 62,
  },
  {
    id: "pkt-khutal-011",
    village: "Khutal Bangla",
    parcelCount: 32,
    status: "assigned",
    dueDate: "25 Jun 2026",
    progressPct: 0,
  },
];

function khutalDataset() {
  return getWorkbenchRegionDatasetSync(DEFAULT_REGION_KEY);
}

export const MOBILE_PARCELS: ParcelRecord[] = khutalDataset().parcels.slice(0, 60);

export function searchMobileParcels(query: string): ParcelRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return MOBILE_PARCELS.slice(0, 18);
  return MOBILE_PARCELS.filter(
    (p) =>
      p.surveyNo.toLowerCase().includes(q) ||
      p.subDiv.toLowerCase().includes(q) ||
      p.ulpin.toLowerCase().includes(q) ||
      p.village.toLowerCase().includes(q),
  ).slice(0, 12);
}

export function getMobileParcel(id: string): ParcelRecord | undefined {
  return khutalDataset().parcels.find((p) => p.id === id);
}

export const INITIAL_GNSS_POINTS: CapturedGnssPoint[] = [
  {
    id: "gnss-001",
    label: "GCP-KHT-12",
    lat: 10.9258,
    lng: 79.8369,
    accuracyM: 0.08,
    source: "bluetooth",
    capturedAt: "2026-06-10 09:14",
    synced: true,
  },
  {
    id: "gnss-002",
    label: "GCP-KHT-13",
    lat: 10.9262,
    lng: 79.8374,
    accuracyM: 0.11,
    source: "ntrip",
    capturedAt: "2026-06-10 09:22",
    synced: false,
  },
  {
    id: "gnss-003",
    label: "GCP-KHT-14",
    lat: 10.9251,
    lng: 79.8381,
    accuracyM: 0.09,
    source: "bluetooth",
    capturedAt: "2026-06-10 10:05",
    synced: true,
  },
  {
    id: "gnss-004",
    label: "GCP-KHT-15",
    lat: 10.9247,
    lng: 79.8362,
    accuracyM: 0.12,
    source: "file",
    capturedAt: "2026-06-10 10:18",
    synced: false,
  },
  {
    id: "gnss-005",
    label: "GCP-KHT-16",
    lat: 10.9265,
    lng: 79.8385,
    accuracyM: 0.07,
    source: "ntrip",
    capturedAt: "2026-06-10 10:31",
    synced: false,
  },
];

export function formatArea(sqM: number): string {
  const cents = sqM / 40.4686;
  if (cents >= 100) return `${(sqM / 4046.86).toFixed(2)} ac`;
  return `${cents.toFixed(1)} cents`;
}

export { VARIANCE_BAND_COLORS_SOLID, PARCEL_BOUNDARY_STROKE };
