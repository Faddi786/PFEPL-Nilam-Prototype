import { DEFAULT_REGION_KEY, type ParcelRecord, type RegionKey } from "./mockData";
import { getWorkbenchRegionDatasetSync } from "./workbenchParcels";
import { NIL_AI_EXPORTS, type NilAiAttachment } from "../lib/nilAiExport";

export type { NilAiAttachment };

export type NilAiResult = {
  reply: string;
  parcelIds: string[];
  attachments?: NilAiAttachment[];
  highlightMode?: "variance" | "default";
};

export type NilAiSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

export const NIL_AI_SUGGESTIONS: NilAiSuggestion[] = [
  {
    id: "mutation-khutal",
    label: "Mutation-pending · Khutal",
    prompt: "Locate mutation-pending parcels in the Khutal village cluster",
  },
  {
    id: "variance-khutal",
    label: "Variance bands · Khutal",
    prompt: "Flag amber and red variance bands on agricultural parcels in Khutal",
  },
  {
    id: "analysis-report",
    label: "Download analysis report",
    prompt: "Generate a cadastral data analysis report with parcel maps and attribute tables in PDF format",
  },
];

type ParcelFeature = {
  properties: ParcelRecord;
  centroid: [number, number];
};

function polygonCentroid(coords: GeoJSON.Polygon["coordinates"]): [number, number] {
  const ring = coords[0];
  let lng = 0;
  let lat = 0;
  const count = ring.length - 1;
  for (let i = 0; i < count; i += 1) {
    lng += ring[i][0];
    lat += ring[i][1];
  }
  return [lng / count, lat / count];
}

export function getParcelFeatures(regionKey: RegionKey = DEFAULT_REGION_KEY): ParcelFeature[] {
  const dataset = getWorkbenchRegionDatasetSync(regionKey);
  return dataset.geojson.parcels.features.map((feature) => ({
    properties: feature.properties as ParcelRecord,
    centroid: polygonCentroid((feature.geometry as GeoJSON.Polygon).coordinates),
  }));
}

export function getParcelsFromDataset(regionKey: RegionKey = DEFAULT_REGION_KEY): ParcelRecord[] {
  return getParcelFeatures(regionKey).map((item) => item.properties);
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * ratio));
  return sorted[index];
}

function pickVarianceMixFromZone(
  features: ParcelFeature[],
  zone: "north-east" | "south-west",
  filter: (parcel: ParcelRecord) => boolean,
  limit = 5,
): ParcelRecord[] {
  const lngs = features.map((item) => item.centroid[0]);
  const lats = features.map((item) => item.centroid[1]);
  const lngHigh = percentile(lngs, 0.72);
  const lngLow = percentile(lngs, 0.28);
  const latHigh = percentile(lats, 0.72);
  const latLow = percentile(lats, 0.28);

  const matched = features.filter((item) => {
    const [lng, lat] = item.centroid;
    const inZone =
      zone === "north-east" ? lng >= lngHigh && lat >= latHigh : lng <= lngLow && lat <= latLow;
    return inZone && filter(item.properties);
  });

  const pool =
    matched.length >= limit
      ? matched
      : features
          .filter((item) => filter(item.properties))
          .sort((a, b) => {
            const scoreA =
              zone === "north-east" ? a.centroid[0] + a.centroid[1] : -(a.centroid[0] + a.centroid[1]);
            const scoreB =
              zone === "north-east" ? b.centroid[0] + b.centroid[1] : -(b.centroid[0] + b.centroid[1]);
            return scoreB - scoreA;
          });

  const bands = ["green", "amber", "red"] as const;
  const picked: ParcelRecord[] = [];

  for (const band of bands) {
    const match = pool.find((item) => item.properties.varianceBand === band);
    if (match) picked.push(match.properties);
  }

  for (const item of pool) {
    if (picked.length >= limit) break;
    if (!picked.some((parcel) => parcel.id === item.properties.id)) {
      picked.push(item.properties);
    }
  }

  return picked.slice(0, limit);
}

function formatParcelReply(
  parcels: ParcelRecord[],
  intro: string,
  outro: string,
  highlightMode: NilAiResult["highlightMode"] = "default",
): NilAiResult {
  const lines = parcels.map(
    (parcel) =>
      `- Survey **${parcel.surveyNo}** - ${parcel.village}, ${parcel.ward}, ${parcel.landUse}, ${parcel.areaSqM.toLocaleString()} sq m`,
  );

  return {
    reply: [intro, "", ...lines, "", outro].join("\n"),
    parcelIds: parcels.map((parcel) => parcel.id),
    highlightMode,
  };
}

function reportAttachments(): NilAiAttachment[] {
  return [
    {
      id: "pdf",
      title: NIL_AI_EXPORTS.pdf.title,
      subtitle: NIL_AI_EXPORTS.pdf.subtitle,
      url: NIL_AI_EXPORTS.pdf.url,
      filename: NIL_AI_EXPORTS.pdf.filename,
      kind: "pdf",
    },
    {
      id: "xlsx",
      title: NIL_AI_EXPORTS.xlsx.title,
      subtitle: NIL_AI_EXPORTS.xlsx.subtitle,
      url: NIL_AI_EXPORTS.xlsx.url,
      filename: NIL_AI_EXPORTS.xlsx.filename,
      kind: "xlsx",
    },
  ];
}

type ScenarioId = "mutation-ne" | "variance-sw" | "report" | "fallback";

/** Keywords checked via case-insensitive substring match on the full prompt. */
export const NIL_AI_VARIANCE_KEYWORDS = [
  "highest variance",
  "area difference",
  "area diff",
  "variance band",
  "variance bands",
  "variations",
  "variation",
  "variance",
  "anomal",
  "south-west",
  "southwest",
  "agricultur",
] as const;

export const NIL_AI_MUTATION_KEYWORDS = [
  "pending mutation",
  "ownership change",
  "mutation pending",
  "north-east",
  "northeast",
  "mutation",
  "mutate",
  "transfer",
  "kurumbapet",
  "corridor",
  "murbad",
  "khutal",
  "pending",
] as const;

export const NIL_AI_REPORT_KEYWORDS = [
  "generate report",
  "cadastral analysis",
  "attribute table",
  "analysis report",
  "spreadsheet",
  "dashboard",
  "download",
  "generate",
  "certificate",
  "summary",
  "analysis",
  "export",
  "report",
  "excel",
  "pdf",
] as const;

const SCENARIO_KEYWORDS: Record<Exclude<ScenarioId, "fallback">, readonly string[]> = {
  "variance-sw": NIL_AI_VARIANCE_KEYWORDS,
  "mutation-ne": NIL_AI_MUTATION_KEYWORDS,
  report: NIL_AI_REPORT_KEYWORDS,
};

/** Higher value wins when keyword length is tied (variance > mutation > report). */
const SCENARIO_PRIORITY: Record<Exclude<ScenarioId, "fallback">, number> = {
  "variance-sw": 3,
  "mutation-ne": 2,
  report: 1,
};

function normalizeNilAiPrompt(prompt: string): string {
  return prompt.toLowerCase().trim().replace(/\s+/g, " ");
}

function detectScenario(text: string): ScenarioId {
  const normalized = normalizeNilAiPrompt(text);
  if (!normalized) return "fallback";

  type Match = { scenario: Exclude<ScenarioId, "fallback">; keyword: string };
  const matches: Match[] = [];

  for (const scenario of Object.keys(SCENARIO_KEYWORDS) as Exclude<ScenarioId, "fallback">[]) {
    for (const keyword of SCENARIO_KEYWORDS[scenario]) {
      if (normalized.includes(keyword)) {
        matches.push({ scenario, keyword });
      }
    }
  }

  if (!matches.length) return "fallback";

  matches.sort((a, b) => {
    const lengthDiff = b.keyword.length - a.keyword.length;
    if (lengthDiff !== 0) return lengthDiff;
    return SCENARIO_PRIORITY[b.scenario] - SCENARIO_PRIORITY[a.scenario];
  });

  return matches[0].scenario;
}

export function resolveNilAiPrompt(prompt: string, features: ParcelFeature[]): NilAiResult {
  const text = normalizeNilAiPrompt(prompt);
  if (!text) {
    return {
      reply: [
        "Ask NIL-AI to query the map or generate a cadastral analysis report.",
        "",
        "Examples: mutation-pending parcels in Khutal, variance bands in Khutal, or download analysis report.",
      ].join("\n"),
      parcelIds: [],
    };
  }

  const scenario = detectScenario(text);

  if (scenario === "report") {
    return {
      reply: [
        "I've compiled the **cadastral data analysis report** from the current map scope.",
        "",
        "The PDF includes parcel geometries over a satellite basemap on the left, a structured attribute table on the right, and DoSLR header/footer blocks with run metadata and variance summary.",
        "",
        "Open the files below in a new tab — PDF for presentation and spreadsheet for desk review.",
      ].join("\n"),
      parcelIds: [],
      attachments: reportAttachments(),
    };
  }

  if (scenario === "mutation-ne") {
    const parcels = pickVarianceMixFromZone(
      features,
      "north-east",
      (parcel) =>
        parcel.village.toLowerCase().includes("khutal") ||
        parcel.region.toLowerCase().includes("khutal") ||
        parcel.status.toLowerCase().includes("mutation") ||
        parcel.status.toLowerCase().includes("pending") ||
        Boolean(parcel.mutationRef),
      5,
    );
    return formatParcelReply(
      parcels,
      `**${parcels.length} mutation-pending parcel${parcels.length === 1 ? "" : "s"}** in the **Khutal village cluster** (north-east sector).`,
      "Panning to the north-east sector. RoR ledger cross-check complete — highlighted boundaries are ready for review.",
    );
  }

  if (scenario === "variance-sw") {
    const parcels = pickVarianceMixFromZone(
      features,
      "south-west",
      (parcel) =>
        parcel.landUse === "Agriculture" ||
        parcel.varianceBand === "amber" ||
        parcel.varianceBand === "red" ||
        parcel.village.toLowerCase().includes("khutal"),
      5,
    );
    return formatParcelReply(
      parcels,
      `**${parcels.length} variance-band parcel${parcels.length === 1 ? "" : "s"}** in the **Khutal block** (south-west cluster).`,
      "Panning to the south-west sector. Green, amber, and red ST_Area vs RoR deviations are colour-coded on the map for field reconciliation.",
      "variance",
    );
  }

  return {
    reply: [
      "I'm **NIL-AI**, your cadastral intelligence assistant for DoSLR.",
      "",
      "Try one of these actions:",
      ...NIL_AI_SUGGESTIONS.map((item) => `- *${item.prompt}*`),
    ].join("\n"),
    parcelIds: [],
  };
}
