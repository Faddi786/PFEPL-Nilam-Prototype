export type HeatmapPeriod = "month" | "year" | "all";

export type VillageMutationStats = {
  id: string;
  name: string;
  nameTa: string;
  counts: Record<HeatmapPeriod, number>;
  /** Polygon ring in lon/lat */
  ring: [number, number][];
};

export const HEATMAP_COLOR_SCALE = [
  { min: 0, max: 50, color: "#22c55e", label: "Low (0–50)" },
  { min: 51, max: 150, color: "#eab308", label: "Moderate (51–150)" },
  { min: 151, max: 300, color: "#f97316", label: "High (151–300)" },
  { min: 301, max: Infinity, color: "#ef4444", label: "Critical (300+)" },
] as const;

export const HEATMAP_VILLAGES: VillageMutationStats[] = [
  {
    id: "v-thirunallar",
    name: "Thirunallar",
    nameTa: "திருநள்ளார்",
    counts: { month: 12, year: 89, all: 142 },
    ring: [
      [79.828, 10.932],
      [79.842, 10.934],
      [79.846, 10.922],
      [79.832, 10.918],
      [79.828, 10.932],
    ],
  },
  {
    id: "v-kottucherry",
    name: "Kottucherry",
    nameTa: "கொட்டுச்சேரி",
    counts: { month: 8, year: 45, all: 78 },
    ring: [
      [79.848, 10.928],
      [79.862, 10.930],
      [79.864, 10.916],
      [79.850, 10.914],
      [79.848, 10.928],
    ],
  },
  {
    id: "v-nedungadu",
    name: "Nedungadu",
    nameTa: "நெடுங்காடு",
    counts: { month: 45, year: 210, all: 388 },
    ring: [
      [79.812, 10.918],
      [79.826, 10.920],
      [79.828, 10.906],
      [79.814, 10.904],
      [79.812, 10.918],
    ],
  },
  {
    id: "v-neravy",
    name: "Neravy",
    nameTa: "நெரவி",
    counts: { month: 62, year: 312, all: 421 },
    ring: [
      [79.862, 10.912],
      [79.876, 10.914],
      [79.878, 10.900],
      [79.864, 10.898],
      [79.862, 10.912],
    ],
  },
  {
    id: "v-varichikudy",
    name: "Varichikudy",
    nameTa: "வரிச்சிகுடி",
    counts: { month: 3, year: 18, all: 34 },
    ring: [
      [79.834, 10.906],
      [79.848, 10.908],
      [79.850, 10.894],
      [79.836, 10.892],
      [79.834, 10.906],
    ],
  },
  {
    id: "v-tirumalai",
    name: "Tirumalairayanpattinam",
    nameTa: "திருமலைராயன்பட்டினம்",
    counts: { month: 28, year: 156, all: 267 },
    ring: [
      [79.798, 10.928],
      [79.812, 10.930],
      [79.814, 10.916],
      [79.800, 10.914],
      [79.798, 10.928],
    ],
  },
  {
    id: "v-khutal-core",
    name: "Khutal (Core)",
    nameTa: "குதல்",
    counts: { month: 95, year: 400, all: 512 },
    ring: [
      [79.826, 10.924],
      [79.840, 10.926],
      [79.842, 10.912],
      [79.828, 10.910],
      [79.826, 10.924],
    ],
  },
];

export function getMutationColor(count: number): string {
  for (const band of HEATMAP_COLOR_SCALE) {
    if (count >= band.min && count <= band.max) return band.color;
  }
  return HEATMAP_COLOR_SCALE[HEATMAP_COLOR_SCALE.length - 1].color;
}

export function getHeatmapKpis(period: HeatmapPeriod) {
  const villages = HEATMAP_VILLAGES.map((v) => ({ ...v, count: v.counts[period] }));
  const total = villages.reduce((s, v) => s + v.count, 0);
  const sorted = [...villages].sort((a, b) => b.count - a.count);
  const hotspots = sorted.filter((v) => v.count >= 150).length;
  return {
    totalMutations: total,
    villageCount: villages.length,
    hotspots,
    avgPerVillage: Math.round(total / villages.length),
    top5: sorted.slice(0, 5),
  };
}

export const HEATMAP_CONTEXT = {
  district: "Karaikal",
  ut: "Puducherry",
  center: [79.8372, 10.9254] as [number, number],
  zoom: 13,
} as const;
