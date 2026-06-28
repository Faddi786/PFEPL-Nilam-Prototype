import * as turf from "@turf/turf";
import type { MapOverlay } from "../components/moretools/MoreToolsMap";
import {
  BUFFER_FEATURES,
  DEMO_PARCELS,
  type DemoParcel,
} from "./moreToolsMock";

export const VILLAGE_BOUNDARY_RING: [number, number][] = [
  [79.830, 10.929],
  [79.846, 10.929],
  [79.846, 10.920],
  [79.830, 10.920],
  [79.830, 10.929],
];

export const MUNICIPAL_BOUNDARY_RING: [number, number][] = [
  [79.835, 10.928],
  [79.844, 10.928],
  [79.844, 10.921],
  [79.835, 10.921],
  [79.835, 10.928],
];

export const FLOOD_ZONE_RING: [number, number][] = [
  [79.832, 10.928],
  [79.842, 10.929],
  [79.843, 10.921],
  [79.833, 10.920],
  [79.832, 10.928],
];

export const DGPS_SURVEY_POINT: [number, number] = [79.8378, 10.9248];

export const VIEWPORT_EXTENT: [number, number][] = [
  [79.834, 10.927],
  [79.842, 10.927],
  [79.842, 10.922],
  [79.834, 10.922],
  [79.834, 10.927],
];

export const SELECTED_PARCEL_ID = DEMO_PARCELS[2]?.id ?? "p-3";

export type DemoResultRow = Record<string, string | number>;

export type SpatialDemoOutput = {
  overlays: MapOverlay[];
  rows: DemoResultRow[];
  summary: string;
  badge?: string;
  badgeTone?: "neutral" | "success" | "warning" | "danger";
  columns: { key: string; label: string }[];
};

function parcelPoly(p: DemoParcel) {
  return turf.polygon([p.ring]);
}

function baseParcelOverlays(
  highlightIds: Set<string>,
  highlightFill = "rgba(34,197,94,0.45)",
  highlightStroke = "#16a34a",
): MapOverlay[] {
  return DEMO_PARCELS.map((p) => ({
    id: `parcel-${p.id}`,
    type: "polygon" as const,
    coordinates: p.ring,
    fill: highlightIds.has(p.id) ? highlightFill : "rgba(148,163,184,0.2)",
    stroke: highlightIds.has(p.id) ? highlightStroke : "#64748b",
    strokeWidth: highlightIds.has(p.id) ? 2 : 1,
    zIndex: highlightIds.has(p.id) ? 4 : 1,
  }));
}

function boundaryOverlay(
  id: string,
  ring: [number, number][],
  stroke: string,
  fill: string,
): MapOverlay {
  return {
    id,
    type: "polygon",
    coordinates: ring,
    fill,
    stroke,
    strokeWidth: 2,
    lineDash: [6, 4],
    zIndex: 2,
  };
}

function pointOverlay(id: string, coord: [number, number], color = "#dc2626"): MapOverlay {
  const [lon, lat] = coord;
  const d = 0.00015;
  return {
    id,
    type: "polygon",
    coordinates: [
      [lon, lat + d],
      [lon + d, lat],
      [lon, lat - d],
      [lon - d, lat],
      [lon, lat + d],
    ],
    fill: color,
    stroke: color,
    strokeWidth: 2,
    zIndex: 6,
  };
}

function parcelRows(parcels: DemoParcel[], extra?: (p: DemoParcel) => DemoResultRow): DemoResultRow[] {
  return parcels.map((p) => ({
    surveyNo: p.surveyNo,
    owner: p.owner,
    classification: p.classification,
    areaSqM: p.areaSqM,
    ...(extra ? extra(p) : {}),
  }));
}

export function runContainsWithinDemo(): SpatialDemoOutput {
  const boundary = turf.polygon([VILLAGE_BOUNDARY_RING]);
  const inside = DEMO_PARCELS.filter((p) => {
    try {
      return turf.booleanWithin(parcelPoly(p), boundary);
    } catch {
      return false;
    }
  });
  const ids = new Set(inside.map((p) => p.id));
  return {
    overlays: [
      boundaryOverlay("village", VILLAGE_BOUNDARY_RING, "#7c3aed", "rgba(124,58,237,0.12)"),
      ...baseParcelOverlays(ids),
    ],
    rows: parcelRows(inside, () => ({ status: "Fully within Khutal boundary" })),
    summary: `${inside.length} parcels fully within village boundary`,
    badge: "ST_Within",
    badgeTone: inside.length > 0 ? "success" : "neutral",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "owner", label: "Owner" },
      { key: "classification", label: "Class" },
      { key: "areaSqM", label: "Area (sq.m)" },
      { key: "status", label: "Status" },
    ],
  };
}

export function runTouchesDemo(): SpatialDemoOutput {
  const selected = DEMO_PARCELS.find((p) => p.id === SELECTED_PARCEL_ID) ?? DEMO_PARCELS[2];
  const selectedPoly = parcelPoly(selected);
  const touching = DEMO_PARCELS.filter((p) => {
    if (p.id === selected.id) return false;
    try {
      return turf.booleanTouches(selectedPoly, parcelPoly(p));
    } catch {
      return false;
    }
  });
  const ids = new Set([selected.id, ...touching.map((p) => p.id)]);
  return {
    overlays: [
      ...baseParcelOverlays(ids, "rgba(59,130,246,0.4)", "#2563eb"),
      {
        id: "selected",
        type: "polygon",
        coordinates: selected.ring,
        fill: "rgba(234,179,8,0.5)",
        stroke: "#ca8a04",
        strokeWidth: 3,
        zIndex: 5,
      },
    ],
    rows: touching.map((p) => ({
      surveyNo: p.surveyNo,
      neighborOf: selected.surveyNo,
      owner: p.owner,
      sharedBoundary: "Yes",
    })),
    summary: `${touching.length} parcels touch ${selected.surveyNo}`,
    badge: "ST_Touches",
    badgeTone: "neutral",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "neighborOf", label: "Neighbor of" },
      { key: "owner", label: "Owner" },
      { key: "sharedBoundary", label: "Shared boundary" },
    ],
  };
}

export function runDisjointDemo(): SpatialDemoOutput {
  const refLayer = turf.polygon([FLOOD_ZONE_RING]);
  const disjoint = DEMO_PARCELS.filter((p) => {
    try {
      return turf.booleanDisjoint(parcelPoly(p), refLayer);
    } catch {
      return false;
    }
  });
  const ids = new Set(disjoint.map((p) => p.id));
  return {
    overlays: [
      boundaryOverlay("flood", FLOOD_ZONE_RING, "#0284c7", "rgba(2,132,199,0.2)"),
      ...baseParcelOverlays(ids, "rgba(34,197,94,0.4)", "#16a34a"),
    ],
    rows: parcelRows(disjoint, () => ({ refLayer: "Flood hazard zone", overlap: "None" })),
    summary: `${disjoint.length} parcels disjoint from flood zone`,
    badge: "ST_Disjoint",
    badgeTone: "success",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "owner", label: "Owner" },
      { key: "refLayer", label: "Reference layer" },
      { key: "overlap", label: "Overlap" },
    ],
  };
}

export function runCrossesDemo(): SpatialDemoOutput {
  const road = turf.lineString(BUFFER_FEATURES.road.line);
  const crossed = DEMO_PARCELS.filter((p) => {
    try {
      return turf.booleanCrosses(road, parcelPoly(p));
    } catch {
      return false;
    }
  });
  const ids = new Set(crossed.map((p) => p.id));
  const overlays: MapOverlay[] = [
    ...baseParcelOverlays(ids, "rgba(239,68,68,0.45)", "#dc2626"),
    {
      id: "road",
      type: "line",
      coordinates: BUFFER_FEATURES.road.line,
      stroke: "#475569",
      strokeWidth: 4,
      zIndex: 5,
    },
  ];
  return {
    overlays,
    rows: crossed.map((p) => ({
      surveyNo: p.surveyNo,
      road: "NH-45A Highway",
      crossing: "Line crosses parcel",
      owner: p.owner,
    })),
    summary: `${crossed.length} parcels crossed by NH-45A`,
    badge: "ST_Crosses",
    badgeTone: crossed.length > 0 ? "warning" : "success",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "road", label: "Road" },
      { key: "crossing", label: "Relation" },
      { key: "owner", label: "Owner" },
    ],
  };
}

export function runDistanceQueryDemo(distanceM = 120): SpatialDemoOutput {
  const point = turf.point(DGPS_SURVEY_POINT);
  const nearby = DEMO_PARCELS.filter((p) => {
    try {
      const d = turf.distance(point, turf.centroid(parcelPoly(p)), { units: "meters" });
      return d <= distanceM;
    } catch {
      return false;
    }
  }).map((p) => {
    const d = turf.distance(point, turf.centroid(parcelPoly(p)), { units: "meters" });
    return { parcel: p, distanceM: Math.round(d) };
  });
  const ids = new Set(nearby.map((x) => x.parcel.id));
  const bufferRing = turf.buffer(point, distanceM, { units: "meters" });
  const overlays: MapOverlay[] = [
    pointOverlay("dgps", DGPS_SURVEY_POINT),
    ...baseParcelOverlays(ids, "rgba(249,115,22,0.45)", "#ea580c"),
  ];
  if (bufferRing?.geometry?.type === "Polygon") {
    overlays.push({
      id: "distance-ring",
      type: "polygon",
      coordinates: bufferRing.geometry.coordinates[0] as [number, number][],
      fill: "rgba(249,115,22,0.15)",
      stroke: "#ea580c",
      strokeWidth: 2,
      lineDash: [5, 4],
      zIndex: 2,
    });
  }
  return {
    overlays,
    rows: nearby.map(({ parcel: p, distanceM: d }) => ({
      surveyNo: p.surveyNo,
      distanceM: d,
      owner: p.owner,
      classification: p.classification,
    })),
    summary: `${nearby.length} parcels within ${distanceM} m of DGPS point`,
    badge: `${distanceM} m`,
    badgeTone: "warning",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "distanceM", label: "Distance (m)" },
      { key: "owner", label: "Owner" },
      { key: "classification", label: "Class" },
    ],
  };
}

export function runNearestNeighborDemo(): SpatialDemoOutput {
  const point = turf.point(DGPS_SURVEY_POINT);
  let nearest: DemoParcel | null = null;
  let minDist = Infinity;
  for (const p of DEMO_PARCELS) {
    const d = turf.distance(point, turf.centroid(parcelPoly(p)), { units: "meters" });
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  const ids = new Set(nearest ? [nearest.id] : []);
  return {
    overlays: [
      pointOverlay("dgps", DGPS_SURVEY_POINT),
      ...baseParcelOverlays(ids, "rgba(34,197,94,0.5)", "#16a34a"),
    ],
    rows: nearest
      ? [{ surveyNo: nearest.surveyNo, distanceM: Math.round(minDist), owner: nearest.owner, areaSqM: nearest.areaSqM }]
      : [],
    summary: nearest ? `Nearest: ${nearest.surveyNo} at ${Math.round(minDist)} m` : "No parcel found",
    badge: "1 result",
    badgeTone: "success",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "distanceM", label: "Distance (m)" },
      { key: "owner", label: "Owner" },
      { key: "areaSqM", label: "Area (sq.m)" },
    ],
  };
}

export function runPointInPolygonDemo(): SpatialDemoOutput {
  const point = turf.point(DGPS_SURVEY_POINT);
  const containing = DEMO_PARCELS.filter((p) => {
    try {
      return turf.booleanPointInPolygon(point, parcelPoly(p));
    } catch {
      return false;
    }
  });
  const ids = new Set(containing.map((p) => p.id));
  return {
    overlays: [
      pointOverlay("click-point", DGPS_SURVEY_POINT, "#7c3aed"),
      ...baseParcelOverlays(ids, "rgba(124,58,237,0.45)", "#7c3aed"),
    ],
    rows: containing.map((p) => ({
      surveyNo: p.surveyNo,
      owner: p.owner,
      classification: p.classification,
      areaSqM: p.areaSqM,
      containsPoint: "Yes",
    })),
    summary: containing.length
      ? `Point falls in survey ${containing[0].surveyNo}`
      : "No parcel contains this point",
    badge: "ST_Contains",
    badgeTone: containing.length ? "success" : "danger",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "owner", label: "Owner" },
      { key: "classification", label: "Class" },
      { key: "areaSqM", label: "Area (sq.m)" },
      { key: "containsPoint", label: "Contains point" },
    ],
  };
}

export function runBoundingBoxDemo(): SpatialDemoOutput {
  const bbox = turf.bbox(turf.polygon([VIEWPORT_EXTENT]));
  const bboxPoly = turf.bboxPolygon(bbox);
  const inExtent = DEMO_PARCELS.filter((p) => {
    try {
      return turf.booleanIntersects(parcelPoly(p), bboxPoly);
    } catch {
      return false;
    }
  });
  const ids = new Set(inExtent.map((p) => p.id));
  return {
    overlays: [
      boundaryOverlay("viewport", VIEWPORT_EXTENT, "#0d9488", "rgba(13,148,136,0.15)"),
      ...baseParcelOverlays(ids),
    ],
    rows: parcelRows(inExtent, () => ({ inViewport: "Yes" })),
    summary: `${inExtent.length} parcels in current viewport extent`,
    badge: "Extent select",
    badgeTone: "neutral",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "owner", label: "Owner" },
      { key: "classification", label: "Class" },
      { key: "inViewport", label: "In viewport" },
    ],
  };
}

export function runUnionDemo(): SpatialDemoOutput {
  const pair = DEMO_PARCELS.slice(0, 2);
  const polys = pair.map((p) => parcelPoly(p));
  const unioned = turf.union(turf.featureCollection(polys));
  const overlays: MapOverlay[] = pair.map((p, i) => ({
    id: `parcel-${i}`,
    type: "polygon",
    coordinates: p.ring,
    fill: "rgba(59,130,246,0.3)",
    stroke: "#2563eb",
    strokeWidth: 2,
    zIndex: 2,
  }));
  if (unioned?.geometry?.type === "Polygon") {
    overlays.push({
      id: "union-result",
      type: "polygon",
      coordinates: unioned.geometry.coordinates[0] as [number, number][],
      fill: "rgba(34,197,94,0.35)",
      stroke: "#16a34a",
      strokeWidth: 3,
      lineDash: [4, 3],
      zIndex: 4,
    });
  }
  const areaSqM = unioned ? Math.round(turf.area(unioned)) : 0;
  return {
    overlays,
    rows: [
      {
        inputParcels: pair.map((p) => p.surveyNo).join(" + "),
        mergedAreaSqM: areaSqM,
        operation: "ST_Union",
        village: "Khutal",
      },
    ],
    summary: `Merged ${pair.map((p) => p.surveyNo).join(" & ")} → ${areaSqM.toLocaleString()} sq.m`,
    badge: "Union",
    badgeTone: "success",
    columns: [
      { key: "inputParcels", label: "Input parcels" },
      { key: "mergedAreaSqM", label: "Merged area (sq.m)" },
      { key: "operation", label: "Operation" },
      { key: "village", label: "Village" },
    ],
  };
}

export function runDifferenceDemo(): SpatialDemoOutput {
  const parcel = DEMO_PARCELS[3];
  const encroach = turf.polygon([
    [
      [parcel.ring[0][0] + 0.001, parcel.ring[0][1] - 0.001],
      [parcel.ring[1][0], parcel.ring[1][1] - 0.001],
      [parcel.ring[1][0] - 0.0005, parcel.ring[2][1]],
      [parcel.ring[0][0] + 0.001, parcel.ring[0][1] - 0.001],
    ],
  ]);
  const diff = turf.difference(turf.featureCollection([parcelPoly(parcel), encroach]));
  const overlays: MapOverlay[] = [
    {
      id: "parcel",
      type: "polygon",
      coordinates: parcel.ring,
      fill: "rgba(148,163,184,0.25)",
      stroke: "#64748b",
      strokeWidth: 2,
      zIndex: 2,
    },
    {
      id: "subtract",
      type: "polygon",
      coordinates: encroach.geometry.coordinates[0] as [number, number][],
      fill: "rgba(239,68,68,0.5)",
      stroke: "#dc2626",
      strokeWidth: 2,
      zIndex: 3,
    },
  ];
  if (diff?.geometry?.type === "Polygon") {
    overlays.push({
      id: "result",
      type: "polygon",
      coordinates: diff.geometry.coordinates[0] as [number, number][],
      fill: "rgba(34,197,94,0.4)",
      stroke: "#16a34a",
      strokeWidth: 2.5,
      zIndex: 4,
    });
  }
  const netArea = diff ? Math.round(turf.area(diff)) : 0;
  const removed = parcel.areaSqM - netArea;
  return {
    overlays,
    rows: [
      {
        surveyNo: parcel.surveyNo,
        originalSqM: parcel.areaSqM,
        removedSqM: Math.max(removed, 0),
        netSqM: netArea,
      },
    ],
    summary: `${parcel.surveyNo}: ${netArea.toLocaleString()} sq.m after subtracting encroachment`,
    badge: "ST_Difference",
    badgeTone: "warning",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "originalSqM", label: "Original (sq.m)" },
      { key: "removedSqM", label: "Removed (sq.m)" },
      { key: "netSqM", label: "Net (sq.m)" },
    ],
  };
}

export function runClipDemo(): SpatialDemoOutput {
  const boundary = turf.polygon([VILLAGE_BOUNDARY_RING]);
  const clipped = DEMO_PARCELS.map((p) => {
    try {
      const result = turf.intersect(turf.featureCollection([parcelPoly(p), boundary]));
      return result ? { parcel: p, clipped: true } : { parcel: p, clipped: false };
    } catch {
      return { parcel: p, clipped: false };
    }
  }).filter((x) => x.clipped);
  const ids = new Set(clipped.map((x) => x.parcel.id));
  return {
    overlays: [
      boundaryOverlay("boundary", VILLAGE_BOUNDARY_RING, "#7c3aed", "rgba(124,58,237,0.1)"),
      ...baseParcelOverlays(ids, "rgba(13,148,136,0.4)", "#0d9488"),
    ],
    rows: clipped.map(({ parcel: p }) => ({
      surveyNo: p.surveyNo,
      owner: p.owner,
      clippedTo: "Khutal village",
      areaSqM: p.areaSqM,
    })),
    summary: `${clipped.length} parcels clipped to village boundary`,
    badge: "ST_Clip",
    badgeTone: "success",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "owner", label: "Owner" },
      { key: "clippedTo", label: "Clipped to" },
      { key: "areaSqM", label: "Area (sq.m)" },
    ],
  };
}

export function runDissolveDemo(): SpatialDemoOutput {
  const byOwner = new Map<string, DemoParcel[]>();
  for (const p of DEMO_PARCELS) {
    const list = byOwner.get(p.owner) ?? [];
    list.push(p);
    byOwner.set(p.owner, list);
  }
  const multiOwner = [...byOwner.entries()].filter(([, ps]) => ps.length >= 2).slice(0, 1);
  const owner = multiOwner[0]?.[0] ?? DEMO_PARCELS[0].owner;
  const group = byOwner.get(owner) ?? DEMO_PARCELS.slice(0, 2);
  const ids = new Set(group.map((p) => p.id));
  const polys = group.map((p) => parcelPoly(p));
  const dissolved = turf.union(turf.featureCollection(polys));
  const overlays: MapOverlay[] = [
    ...baseParcelOverlays(ids, "rgba(59,130,246,0.35)", "#2563eb"),
  ];
  if (dissolved?.geometry?.type === "Polygon") {
    overlays.push({
      id: "dissolved",
      type: "polygon",
      coordinates: dissolved.geometry.coordinates[0] as [number, number][],
      fill: "rgba(234,179,8,0.3)",
      stroke: "#ca8a04",
      strokeWidth: 3,
      lineDash: [6, 3],
      zIndex: 5,
    });
  }
  const totalArea = dissolved ? Math.round(turf.area(dissolved)) : 0;
  return {
    overlays,
    rows: [
      {
        owner,
        parcelCount: group.length,
        surveys: group.map((p) => p.surveyNo).join(", "),
        totalAreaSqM: totalArea,
      },
    ],
    summary: `Dissolved ${group.length} parcels for ${owner}`,
    badge: "By owner",
    badgeTone: "neutral",
    columns: [
      { key: "owner", label: "Owner" },
      { key: "parcelCount", label: "Parcels" },
      { key: "surveys", label: "Survey Nos" },
      { key: "totalAreaSqM", label: "Total area (sq.m)" },
    ],
  };
}

export function runConvexHullDemo(): SpatialDemoOutput {
  const selected = DEMO_PARCELS.slice(0, 5);
  const collection = turf.featureCollection(selected.map((p) => parcelPoly(p)));
  const hull = turf.convex(collection);
  const ids = new Set(selected.map((p) => p.id));
  const overlays: MapOverlay[] = [...baseParcelOverlays(ids)];
  if (hull?.geometry?.type === "Polygon") {
    overlays.push({
      id: "hull",
      type: "polygon",
      coordinates: hull.geometry.coordinates[0] as [number, number][],
      fill: "rgba(168,85,247,0.15)",
      stroke: "#9333ea",
      strokeWidth: 2.5,
      lineDash: [8, 4],
      zIndex: 3,
    });
  }
  const hullArea = hull ? Math.round(turf.area(hull)) : 0;
  return {
    overlays,
    rows: [
      {
        parcelCount: selected.length,
        surveys: selected.map((p) => p.surveyNo).join(", "),
        hullAreaSqM: hullArea,
        village: "Khutal",
      },
    ],
    summary: `Convex hull around ${selected.length} parcels — ${hullArea.toLocaleString()} sq.m`,
    badge: "ST_ConvexHull",
    badgeTone: "neutral",
    columns: [
      { key: "parcelCount", label: "Parcels" },
      { key: "surveys", label: "Survey Nos" },
      { key: "hullAreaSqM", label: "Hull area (sq.m)" },
      { key: "village", label: "Village" },
    ],
  };
}

export function runCentroidDemo(): SpatialDemoOutput {
  const sample = DEMO_PARCELS.slice(0, 6);
  const overlays: MapOverlay[] = [
    ...baseParcelOverlays(new Set(sample.map((p) => p.id)), "rgba(148,163,184,0.2)", "#64748b"),
  ];
  const rows: DemoResultRow[] = [];
  for (const p of sample) {
    const c = turf.centroid(parcelPoly(p));
    const [lon, lat] = c.geometry.coordinates as [number, number];
    overlays.push(pointOverlay(`centroid-${p.id}`, [lon, lat], "#dc2626"));
    rows.push({
      surveyNo: p.surveyNo,
      centroidLon: lon.toFixed(5),
      centroidLat: lat.toFixed(5),
      areaSqM: p.areaSqM,
    });
  }
  return {
    overlays,
    rows,
    summary: `Centroids computed for ${sample.length} parcels`,
    badge: "ST_Centroid",
    badgeTone: "success",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "centroidLon", label: "Lon" },
      { key: "centroidLat", label: "Lat" },
      { key: "areaSqM", label: "Area (sq.m)" },
    ],
  };
}

export function runSymmetricalDiffDemo(): SpatialDemoOutput {
  const a = turf.polygon([DEMO_PARCELS[0].ring]);
  const b = turf.polygon([DEMO_PARCELS[1].ring]);
  const aMinusB = turf.difference(turf.featureCollection([a, b]));
  const bMinusA = turf.difference(turf.featureCollection([b, a]));
  const parts = [aMinusB, bMinusA].filter((f): f is NonNullable<typeof aMinusB> => Boolean(f));
  const symDiff = parts.length ? turf.union(turf.featureCollection(parts)) : null;
  const overlays: MapOverlay[] = [
    {
      id: "layer-a",
      type: "polygon",
      coordinates: DEMO_PARCELS[0].ring,
      fill: "rgba(59,130,246,0.3)",
      stroke: "#2563eb",
      strokeWidth: 2,
      zIndex: 2,
    },
    {
      id: "layer-b",
      type: "polygon",
      coordinates: DEMO_PARCELS[1].ring,
      fill: "rgba(16,185,129,0.25)",
      stroke: "#059669",
      strokeWidth: 2,
      zIndex: 2,
    },
  ];
  if (symDiff?.geometry?.type === "Polygon") {
    overlays.push({
      id: "sym-diff",
      type: "polygon",
      coordinates: symDiff.geometry.coordinates[0] as [number, number][],
      fill: "rgba(234,179,8,0.5)",
      stroke: "#ca8a04",
      strokeWidth: 2.5,
      zIndex: 4,
    });
  }
  const exclusiveArea = symDiff ? Math.round(turf.area(symDiff)) : 0;
  return {
    overlays,
    rows: [
      {
        parcelA: DEMO_PARCELS[0].surveyNo,
        parcelB: DEMO_PARCELS[1].surveyNo,
        exclusiveAreaSqM: exclusiveArea,
        relation: "A ⊕ B (exclusive)",
      },
    ],
    summary: `Exclusive area: ${exclusiveArea.toLocaleString()} sq.m (in A or B, not both)`,
    badge: "ST_SymDifference",
    badgeTone: "warning",
    columns: [
      { key: "parcelA", label: "Parcel A" },
      { key: "parcelB", label: "Parcel B" },
      { key: "exclusiveAreaSqM", label: "Exclusive (sq.m)" },
      { key: "relation", label: "Relation" },
    ],
  };
}

export function runSpatialJoinDemo(): SpatialDemoOutput {
  const boundary = turf.polygon([VILLAGE_BOUNDARY_RING]);
  const joined = DEMO_PARCELS.slice(0, 8).map((p) => {
    const inside = turf.booleanIntersects(parcelPoly(p), boundary);
    return {
      surveyNo: p.surveyNo,
      owner: p.owner,
      village: inside ? "Khutal" : "Outside boundary",
      taluk: "Karaikal",
      ward: inside ? "Ward 4" : "—",
    };
  });
  const ids = new Set(DEMO_PARCELS.slice(0, 8).map((p) => p.id));
  return {
    overlays: [
      boundaryOverlay("village", VILLAGE_BOUNDARY_RING, "#7c3aed", "rgba(124,58,237,0.1)"),
      ...baseParcelOverlays(ids),
    ],
    rows: joined,
    summary: `Spatial join: village attributes attached to ${joined.length} parcels`,
    badge: "Spatial join",
    badgeTone: "success",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "owner", label: "Owner" },
      { key: "village", label: "Village" },
      { key: "taluk", label: "Taluk" },
      { key: "ward", label: "Ward" },
    ],
  };
}

export function runSelectByLocationDemo(): SpatialDemoOutput {
  const flood = turf.polygon([FLOOD_ZONE_RING]);
  const selected = DEMO_PARCELS.filter((p) => {
    try {
      return p.classification === "Private" && turf.booleanIntersects(parcelPoly(p), flood);
    } catch {
      return false;
    }
  });
  const ids = new Set(selected.map((p) => p.id));
  return {
    overlays: [
      boundaryOverlay("flood", FLOOD_ZONE_RING, "#0284c7", "rgba(2,132,199,0.2)"),
      ...baseParcelOverlays(ids, "rgba(239,68,68,0.45)", "#dc2626"),
    ],
    rows: selected.map((p) => ({
      surveyNo: p.surveyNo,
      classification: p.classification,
      filter: "Private AND in flood zone",
      owner: p.owner,
    })),
    summary: `${selected.length} private parcels in flood zone`,
    badge: "Attribute + spatial",
    badgeTone: "danger",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "classification", label: "Class" },
      { key: "filter", label: "Filter" },
      { key: "owner", label: "Owner" },
    ],
  };
}

export function runKNearestDemo(k = 5): SpatialDemoOutput {
  const point = turf.point(DGPS_SURVEY_POINT);
  const ranked = DEMO_PARCELS.map((p) => ({
    parcel: p,
    distanceM: turf.distance(point, turf.centroid(parcelPoly(p)), { units: "meters" }),
  }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, k);
  const ids = new Set(ranked.map((x) => x.parcel.id));
  return {
    overlays: [
      pointOverlay("dgps", DGPS_SURVEY_POINT),
      ...baseParcelOverlays(ids, "rgba(59,130,246,0.4)", "#2563eb"),
    ],
    rows: ranked.map((x, i) => ({
      rank: i + 1,
      surveyNo: x.parcel.surveyNo,
      distanceM: Math.round(x.distanceM),
      owner: x.parcel.owner,
    })),
    summary: `Top ${k} nearest parcels to DGPS point`,
    badge: `K=${k}`,
    badgeTone: "neutral",
    columns: [
      { key: "rank", label: "Rank" },
      { key: "surveyNo", label: "Survey No" },
      { key: "distanceM", label: "Distance (m)" },
      { key: "owner", label: "Owner" },
    ],
  };
}

export function runRouteProximityDemo(): SpatialDemoOutput {
  const road = BUFFER_FEATURES.road.line;
  const bufferRing = turf.buffer(turf.lineString(road), 40, { units: "meters" });
  const bufferPoly =
    bufferRing?.geometry?.type === "Polygon"
      ? turf.polygon(bufferRing.geometry.coordinates as [number, number][][])
      : null;
  const inCorridor = bufferPoly
    ? DEMO_PARCELS.filter((p) => {
        try {
          return turf.booleanIntersects(parcelPoly(p), bufferPoly);
        } catch {
          return false;
        }
      })
    : [];
  const ids = new Set(inCorridor.map((p) => p.id));
  const overlays: MapOverlay[] = [
    {
      id: "road",
      type: "line",
      coordinates: road,
      stroke: "#475569",
      strokeWidth: 4,
      zIndex: 5,
    },
    ...baseParcelOverlays(ids, "rgba(249,115,22,0.45)", "#ea580c"),
  ];
  if (bufferPoly) {
    overlays.push({
      id: "corridor",
      type: "polygon",
      coordinates: bufferPoly.geometry.coordinates[0] as [number, number][],
      fill: "rgba(249,115,22,0.15)",
      stroke: "#ea580c",
      strokeWidth: 2,
      lineDash: [5, 4],
      zIndex: 2,
    });
  }
  return {
    overlays,
    rows: inCorridor.map((p) => ({
      surveyNo: p.surveyNo,
      corridor: "NH-45A widening (40 m)",
      owner: p.owner,
      classification: p.classification,
    })),
    summary: `${inCorridor.length} parcels along NH-45A corridor`,
    badge: "40 m ROW",
    badgeTone: "warning",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "corridor", label: "Corridor" },
      { key: "owner", label: "Owner" },
      { key: "classification", label: "Class" },
    ],
  };
}

const DEMO_RUNNERS: Record<string, () => SpatialDemoOutput> = {
  "contains-within": runContainsWithinDemo,
  touches: runTouchesDemo,
  disjoint: runDisjointDemo,
  crosses: runCrossesDemo,
  "distance-query": () => runDistanceQueryDemo(120),
  "nearest-neighbor": runNearestNeighborDemo,
  "point-in-polygon": runPointInPolygonDemo,
  "bounding-box": runBoundingBoxDemo,
  union: runUnionDemo,
  difference: runDifferenceDemo,
  clip: runClipDemo,
  dissolve: runDissolveDemo,
  "convex-hull": runConvexHullDemo,
  centroid: runCentroidDemo,
  "symmetrical-diff": runSymmetricalDiffDemo,
  "spatial-join": runSpatialJoinDemo,
  "select-by-location": runSelectByLocationDemo,
  "k-nearest": () => runKNearestDemo(5),
  "route-proximity": runRouteProximityDemo,
};

export function runSpatialToolDemo(toolId: string): SpatialDemoOutput | null {
  const runner = DEMO_RUNNERS[toolId];
  return runner ? runner() : null;
}
