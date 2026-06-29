import * as turf from "@turf/turf";
import type { MapOverlay } from "../components/moretools/MoreToolsMap";
import {
  buildBufferPolygon,
  getAreaDiffCases,
  getBufferFeatures,
  getCadastralParcels,
  getDgpsSurveyPoint,
  getEncroachmentCases,
  getFloodZoneRing,
  getGovtLandRing,
  getIntersectLayerPairs,
  getOverlapCases,
  getParcelsInBuffer,
  getSelectedParcelId,
  getSpatialContext,
  getViewportExtent,
  getVillageBoundaryRing,
  getWorkbenchDataset,
  isGovtParcel,
  type CadastralParcel,
} from "./cadastralSpatialData";

export type DemoResultRow = Record<string, string | number>;

export type SpatialDemoOutput = {
  overlays: MapOverlay[];
  highlightParcelIds?: string[];
  highlightOptions?: { colorByVariance?: boolean };
  rows: DemoResultRow[];
  summary: string;
  badge?: string;
  badgeTone?: "neutral" | "success" | "warning" | "danger";
  columns: { key: string; label: string }[];
};

function withHighlights(
  overlays: MapOverlay[],
  highlightIds: Iterable<string>,
  result: Omit<SpatialDemoOutput, "overlays" | "highlightParcelIds" | "highlightOptions">,
  highlightOptions?: SpatialDemoOutput["highlightOptions"],
): SpatialDemoOutput {
  return {
    overlays,
    highlightParcelIds: [...highlightIds],
    highlightOptions,
    ...result,
  };
}

function parcelPoly(p: CadastralParcel) {
  return turf.polygon([p.ring]);
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

function parcelRows(parcels: CadastralParcel[], extra?: (p: CadastralParcel) => DemoResultRow): DemoResultRow[] {
  return parcels.map((p) => ({
    surveyNo: p.surveyNo,
    owner: p.owner,
    classification: p.classification,
    areaSqM: p.areaSqM,
    ...(extra ? extra(p) : {}),
  }));
}

export function runContainsWithinDemo(): SpatialDemoOutput {
  const villageBoundary = getVillageBoundaryRing();
  const boundary = turf.polygon([villageBoundary]);
  const inside = getCadastralParcels().filter((p) => {
    try {
      return turf.booleanWithin(parcelPoly(p), boundary);
    } catch {
      return false;
    }
  });
  const ids = new Set(inside.map((p) => p.id));
  return withHighlights(
    [boundaryOverlay("village", villageBoundary, "#7c3aed", "rgba(124,58,237,0.12)")],
    ids,
    {
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
    },
  );
}

export function runTouchesDemo(): SpatialDemoOutput {
  const selected = getCadastralParcels().find((p) => p.id === getSelectedParcelId()) ?? getCadastralParcels()[2];
  const selectedPoly = parcelPoly(selected);
  const touching = getCadastralParcels().filter((p) => {
    if (p.id === selected.id) return false;
    try {
      return turf.booleanTouches(selectedPoly, parcelPoly(p));
    } catch {
      return false;
    }
  });
  const ids = new Set([selected.id, ...touching.map((p) => p.id)]);
  return withHighlights(
    [
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
    ids,
    {
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
    },
  );
}

export function runDisjointDemo(): SpatialDemoOutput {
  const floodZone = getFloodZoneRing();
  const refLayer = turf.polygon([floodZone]);
  const disjoint = getCadastralParcels().filter((p) => {
    try {
      return turf.booleanDisjoint(parcelPoly(p), refLayer);
    } catch {
      return false;
    }
  });
  const ids = new Set(disjoint.map((p) => p.id));
  return withHighlights(
    [boundaryOverlay("flood", floodZone, "#0284c7", "rgba(2,132,199,0.2)")],
    ids,
    {
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
    },
  );
}

export function runCrossesDemo(): SpatialDemoOutput {
  const bufferFeatures = getBufferFeatures();
  const road = turf.lineString(bufferFeatures.road.line);
  const crossed = getCadastralParcels().filter((p) => {
    try {
      return turf.booleanCrosses(road, parcelPoly(p));
    } catch {
      return false;
    }
  });
  const ids = new Set(crossed.map((p) => p.id));
  return withHighlights(
    [
      {
        id: "road",
        type: "line",
        coordinates: bufferFeatures.road.line,
        stroke: "#475569",
        strokeWidth: 4,
        zIndex: 5,
      },
    ],
    ids,
    {
      rows: crossed.map((p) => ({
        surveyNo: p.surveyNo,
        road: bufferFeatures.road.label,
        crossing: "Line crosses parcel",
        owner: p.owner,
      })),
      summary: `${crossed.length} parcels crossed by ${bufferFeatures.road.label}`,
      badge: "ST_Crosses",
      badgeTone: crossed.length > 0 ? "warning" : "success",
      columns: [
        { key: "surveyNo", label: "Survey No" },
        { key: "road", label: "Road" },
        { key: "crossing", label: "Relation" },
        { key: "owner", label: "Owner" },
      ],
    },
  );
}

export function runDistanceQueryDemo(distanceM = 120): SpatialDemoOutput {
  const dgpsPoint = getDgpsSurveyPoint();
  const point = turf.point(dgpsPoint);
  const nearby = getCadastralParcels().filter((p) => {
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
  const overlays: MapOverlay[] = [pointOverlay("dgps", dgpsPoint)];
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
  return withHighlights(overlays, ids, {
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
  });
}

export function runNearestNeighborDemo(): SpatialDemoOutput {
  const dgpsPoint = getDgpsSurveyPoint();
  const point = turf.point(dgpsPoint);
  let nearest: CadastralParcel | null = null;
  let minDist = Infinity;
  for (const p of getCadastralParcels()) {
    const d = turf.distance(point, turf.centroid(parcelPoly(p)), { units: "meters" });
    if (d < minDist) {
      minDist = d;
      nearest = p;
    }
  }
  const ids = new Set(nearest ? [nearest.id] : []);
  return withHighlights([pointOverlay("dgps", dgpsPoint)], ids, {
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
  });
}

export function runPointInPolygonDemo(): SpatialDemoOutput {
  const dgpsPoint = getDgpsSurveyPoint();
  const point = turf.point(dgpsPoint);
  const containing = getCadastralParcels().filter((p) => {
    try {
      return turf.booleanPointInPolygon(point, parcelPoly(p));
    } catch {
      return false;
    }
  });
  const ids = new Set(containing.map((p) => p.id));
  return withHighlights([pointOverlay("click-point", dgpsPoint, "#7c3aed")], ids, {
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
  });
}

export function runBoundingBoxDemo(): SpatialDemoOutput {
  const viewportExtent = getViewportExtent();
  const bbox = turf.bbox(turf.polygon([viewportExtent]));
  const bboxPoly = turf.bboxPolygon(bbox);
  const inExtent = getCadastralParcels().filter((p) => {
    try {
      return turf.booleanIntersects(parcelPoly(p), bboxPoly);
    } catch {
      return false;
    }
  });
  const ids = new Set(inExtent.map((p) => p.id));
  return withHighlights(
    [boundaryOverlay("viewport", viewportExtent, "#0d9488", "rgba(13,148,136,0.15)")],
    ids,
    {
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
    },
  );
}

export function runUnionDemo(): SpatialDemoOutput {
  const pair = getCadastralParcels().slice(0, 2);
  const polys = pair.map((p) => parcelPoly(p));
  const unioned = turf.union(turf.featureCollection(polys));
  const areaSqM = unioned ? Math.round(turf.area(unioned)) : 0;
  const overlays: MapOverlay[] = [];
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
  return withHighlights(overlays, pair.map((p) => p.id), {
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
  });
}

export function runDifferenceDemo(): SpatialDemoOutput {
  const parcel = getCadastralParcels()[3];
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
  return withHighlights(overlays, [parcel.id], {
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
  });
}

export function runClipDemo(): SpatialDemoOutput {
  const villageBoundary = getVillageBoundaryRing();
  const boundary = turf.polygon([villageBoundary]);
  const clipped = getCadastralParcels().map((p) => {
    try {
      const result = turf.intersect(turf.featureCollection([parcelPoly(p), boundary]));
      return result ? { parcel: p, clipped: true } : { parcel: p, clipped: false };
    } catch {
      return { parcel: p, clipped: false };
    }
  }).filter((x) => x.clipped);
  const ids = new Set(clipped.map((x) => x.parcel.id));
  return withHighlights(
    [boundaryOverlay("boundary", villageBoundary, "#7c3aed", "rgba(124,58,237,0.1)")],
    ids,
    {
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
    },
  );
}

export function runDissolveDemo(): SpatialDemoOutput {
  const byOwner = new Map<string, CadastralParcel[]>();
  for (const p of getCadastralParcels()) {
    const list = byOwner.get(p.owner) ?? [];
    list.push(p);
    byOwner.set(p.owner, list);
  }
  const multiOwner = [...byOwner.entries()].filter(([, ps]) => ps.length >= 2).slice(0, 1);
  const owner = multiOwner[0]?.[0] ?? getCadastralParcels()[0].owner;
  const group = byOwner.get(owner) ?? getCadastralParcels().slice(0, 2);
  const ids = new Set(group.map((p) => p.id));
  const polys = group.map((p) => parcelPoly(p));
  const dissolved = turf.union(turf.featureCollection(polys));
  const overlays: MapOverlay[] = [];
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
  return withHighlights(overlays, ids, {
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
  });
}

export function runConvexHullDemo(): SpatialDemoOutput {
  const selected = getCadastralParcels().slice(0, 5);
  const collection = turf.featureCollection(selected.map((p) => parcelPoly(p)));
  const hull = turf.convex(collection);
  const ids = new Set(selected.map((p) => p.id));
  const overlays: MapOverlay[] = [];
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
  return withHighlights(overlays, ids, {
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
  });
}

export function runCentroidDemo(): SpatialDemoOutput {
  const sample = getCadastralParcels().slice(0, 6);
  const overlays: MapOverlay[] = [];
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
  return withHighlights(overlays, sample.map((p) => p.id), {
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
  });
}

export function runSymmetricalDiffDemo(): SpatialDemoOutput {
  const parcels = getCadastralParcels();
  const a = turf.polygon([parcels[0].ring]);
  const b = turf.polygon([parcels[1].ring]);
  const aMinusB = turf.difference(turf.featureCollection([a, b]));
  const bMinusA = turf.difference(turf.featureCollection([b, a]));
  const parts = [aMinusB, bMinusA].filter((f): f is NonNullable<typeof aMinusB> => Boolean(f));
  const symDiff = parts.length ? turf.union(turf.featureCollection(parts)) : null;
  const overlays: MapOverlay[] = [];
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
  return withHighlights(overlays, [parcels[0].id, parcels[1].id], {
    rows: [
      {
        parcelA: parcels[0].surveyNo,
        parcelB: parcels[1].surveyNo,
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
  });
}

export function runSpatialJoinDemo(): SpatialDemoOutput {
  const villageBoundary = getVillageBoundaryRing();
  const boundary = turf.polygon([villageBoundary]);
  const joined = getCadastralParcels().slice(0, 8).map((p) => {
    const inside = turf.booleanIntersects(parcelPoly(p), boundary);
    return {
      surveyNo: p.surveyNo,
      owner: p.owner,
      village: inside ? "Khutal" : "Outside boundary",
      taluk: "Karaikal",
      ward: inside ? "Ward 4" : "—",
    };
  });
  const ids = new Set(getCadastralParcels().slice(0, 8).map((p) => p.id));
  return withHighlights(
    [boundaryOverlay("village", villageBoundary, "#7c3aed", "rgba(124,58,237,0.1)")],
    ids,
    {
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
    },
  );
}

export function runSelectByLocationDemo(): SpatialDemoOutput {
  const floodZone = getFloodZoneRing();
  const flood = turf.polygon([floodZone]);
  const selected = getCadastralParcels().filter((p) => {
    try {
      return p.classification === "Private" && turf.booleanIntersects(parcelPoly(p), flood);
    } catch {
      return false;
    }
  });
  const ids = new Set(selected.map((p) => p.id));
  return withHighlights(
    [boundaryOverlay("flood", floodZone, "#0284c7", "rgba(2,132,199,0.2)")],
    ids,
    {
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
    },
  );
}

export function runKNearestDemo(k = 5): SpatialDemoOutput {
  const dgpsPoint = getDgpsSurveyPoint();
  const point = turf.point(dgpsPoint);
  const ranked = getCadastralParcels().map((p) => ({
    parcel: p,
    distanceM: turf.distance(point, turf.centroid(parcelPoly(p)), { units: "meters" }),
  }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, k);
  const ids = new Set(ranked.map((x) => x.parcel.id));
  return withHighlights([pointOverlay("dgps", dgpsPoint)], ids, {
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
  });
}

export function runRouteProximityDemo(): SpatialDemoOutput {
  const bufferFeatures = getBufferFeatures();
  const road = bufferFeatures.road.line;
  const bufferRing = turf.buffer(turf.lineString(road), 40, { units: "meters" });
  const bufferPoly =
    bufferRing?.geometry?.type === "Polygon"
      ? turf.polygon(bufferRing.geometry.coordinates as [number, number][][])
      : null;
  const inCorridor = bufferPoly
    ? getCadastralParcels().filter((p) => {
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
  return withHighlights(overlays, ids, {
    rows: inCorridor.map((p) => ({
      surveyNo: p.surveyNo,
      corridor: `${bufferFeatures.road.label} widening (40 m)`,
      owner: p.owner,
      classification: p.classification,
    })),
    summary: `${inCorridor.length} parcels along ${bufferFeatures.road.label} corridor`,
    badge: "40 m ROW",
    badgeTone: "warning",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "corridor", label: "Corridor" },
      { key: "owner", label: "Owner" },
      { key: "classification", label: "Class" },
    ],
  });
}

export function getBaseParcelOverlays(): MapOverlay[] {
  return [];
}

export function runBufferDemo(featureType: "road" | "river" | "canal" = "road", distanceM = 50): SpatialDemoOutput {
  const bufferFeatures = getBufferFeatures();
  const parcelsInBuffer = getParcelsInBuffer(featureType, distanceM);
  const ids = new Set(parcelsInBuffer.map((p) => p.id));
  const overlays: MapOverlay[] = [];

  const bufferRing = buildBufferPolygon(featureType, distanceM);
  if (bufferRing.length) {
    overlays.push({
      id: "buffer",
      type: "polygon",
      coordinates: bufferRing,
      fill: "rgba(59,130,246,0.25)",
      stroke: "#2563eb",
      strokeWidth: 2,
      lineDash: [6, 4],
      zIndex: 2,
    });
  }

  overlays.push({
    id: "feature-line",
    type: "line",
    coordinates: bufferFeatures[featureType].line,
    stroke: bufferFeatures[featureType].color,
    strokeWidth: 4,
    zIndex: 5,
  });

  return withHighlights(overlays, ids, {
    rows: parcelsInBuffer.map((p) => ({
      surveyNo: p.surveyNo,
      owner: p.owner,
      classification: p.classification,
      areaSqM: p.areaSqM,
    })),
    summary: `${parcelsInBuffer.length} parcels within ${distanceM} m buffer`,
    badge: bufferFeatures[featureType].label,
    badgeTone: parcelsInBuffer.length > 0 ? "warning" : "success",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "owner", label: "Owner" },
      { key: "classification", label: "Classification" },
      { key: "areaSqM", label: "Area (sq.m)" },
    ],
  });
}

export function runAreaDiffDemo(): SpatialDemoOutput {
  const areaDiffCases = getAreaDiffCases();
  const selected = areaDiffCases[0];
  const highlightIds = areaDiffCases.map((row) => row.parcelId);
  const totalDiff = areaDiffCases.reduce((s, c) => s + c.diffSqM, 0);
  return withHighlights([], highlightIds, {
    rows: areaDiffCases.map((row) => ({
      surveyNo: row.surveyNo,
      village: row.village,
      fmbAreaSqM: row.fmbAreaSqM,
      dgpsAreaSqM: row.dgpsAreaSqM,
      diffSqM: row.diffSqM,
      status: row.status,
    })),
    summary: `${areaDiffCases.length} parcels with area mismatch`,
    badge: `Total Δ ${totalDiff} sq.m · ${selected?.surveyNo ?? "—"}`,
    badgeTone: "warning",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "village", label: "Village" },
      { key: "fmbAreaSqM", label: "FMB (sq.m)" },
      { key: "dgpsAreaSqM", label: "DGPS (sq.m)" },
      { key: "diffSqM", label: "Diff (sq.m)" },
      { key: "status", label: "Status" },
    ],
  }, { colorByVariance: true });
}

export function runEncroachmentDemo(): SpatialDemoOutput {
  const encroachmentCases = getEncroachmentCases();
  const totalEncroached = encroachmentCases.reduce((s, c) => s + c.encroachedAreaSqM, 0);
  const overlays: MapOverlay[] = [
    {
      id: "govt-land",
      type: "polygon" as const,
      coordinates: getGovtLandRing(),
      fill: "rgba(245,158,11,0.3)",
      stroke: "#d97706",
      strokeWidth: 2,
      zIndex: 2,
    },
  ];
  const highlightIds = encroachmentCases.map((row) => row.parcelId);

  return withHighlights(overlays, highlightIds, {
    rows: encroachmentCases.map((row) => ({
      surveyNo: row.surveyNo,
      govtLandType: row.govtLandType,
      buildingType: row.buildingType,
      encroachedAreaSqM: row.encroachedAreaSqM,
      status: row.status,
    })),
    summary: `${encroachmentCases.length} encroachment cases found`,
    badge: `${totalEncroached} sq.m total`,
    badgeTone: "danger",
    columns: [
      { key: "surveyNo", label: "Survey No" },
      { key: "govtLandType", label: "Govt land" },
      { key: "buildingType", label: "Building" },
      { key: "encroachedAreaSqM", label: "Area (sq.m)" },
      { key: "status", label: "Status" },
    ],
  });
}

export function runOverlapDemo(): SpatialDemoOutput {
  const overlapCases = getOverlapCases();
  const selected = overlapCases[0];
  const context = getSpatialContext();
  const overlays: MapOverlay[] = selected
    ? [
        {
          id: "overlap",
          type: "polygon" as const,
          coordinates: selected.overlapRing,
          fill: "rgba(239,68,68,0.6)",
          stroke: "#dc2626",
          strokeWidth: 2.5,
          zIndex: 4,
        },
      ]
    : [];
  const highlightIds = selected
    ? getCadastralParcels()
        .filter((p) => p.surveyNo === selected.parcelA || p.surveyNo === selected.parcelB)
        .map((p) => p.id)
    : [];

  return withHighlights(overlays, highlightIds, {
    rows: overlapCases.map((row) => ({
      parcelA: row.parcelA,
      parcelB: row.parcelB,
      village: row.village,
      overlapAreaSqM: row.overlapAreaSqM,
      severity: row.severity,
    })),
    summary: selected
      ? `Overlap found — Area = ${selected.overlapAreaSqM} sq.m`
      : "No overlapping parcel pairs detected in cadastral dataset",
    badge: `${overlapCases.length} pairs in ${context.village}`,
    badgeTone: "danger",
    columns: [
      { key: "parcelA", label: "Parcel A" },
      { key: "parcelB", label: "Parcel B" },
      { key: "village", label: "Village" },
      { key: "overlapAreaSqM", label: "Overlap (sq.m)" },
      { key: "severity", label: "Severity" },
    ],
  });
}

export function runIntersectDemo(pairId?: string): SpatialDemoOutput {
  const intersectPairs = getIntersectLayerPairs();
  const pair = intersectPairs.find((p) => p.id === pairId) ?? intersectPairs[0];
  if (!pair) {
    return {
      overlays: getBaseParcelOverlays(),
      rows: [],
      summary: "No intersect layers available for cadastral dataset",
      columns: [],
    };
  }
  const overlays: MapOverlay[] = [
    {
      id: "layer-a",
      type: "polygon",
      coordinates: pair.layerARing,
      fill: "rgba(59,130,246,0.25)",
      stroke: "#2563eb",
      strokeWidth: 2,
      zIndex: 2,
    },
    {
      id: "layer-b",
      type: "polygon",
      coordinates: pair.layerBRing,
      fill: "rgba(16,185,129,0.2)",
      stroke: "#059669",
      strokeWidth: 2,
      lineDash: [5, 4],
      zIndex: 2,
    },
    {
      id: "intersect",
      type: "polygon",
      coordinates: pair.intersectRing,
      fill: "rgba(234,179,8,0.55)",
      stroke: "#ca8a04",
      strokeWidth: 2.5,
      zIndex: 4,
    },
  ];

  return {
    overlays,
    rows: [{ layerA: pair.layerA, layerB: pair.layerB, intersectAreaSqM: pair.intersectAreaSqM, parcelCount: pair.parcelCount }],
    summary: `Intersection: ${pair.intersectAreaSqM.toLocaleString()} sq.m`,
    badge: `${pair.parcelCount} parcels affected`,
    badgeTone: "warning",
    columns: [
      { key: "layerA", label: "Layer A" },
      { key: "layerB", label: "Layer B" },
      { key: "intersectAreaSqM", label: "Intersect area" },
      { key: "parcelCount", label: "Parcels" },
    ],
  };
}

export function runStatisticsDemo(): SpatialDemoOutput {
  const parcels = getCadastralParcels();
  const context = getSpatialContext();
  const dataset = getWorkbenchDataset();

  const govtCount = parcels.filter((p) => {
    const attrs = dataset.parcelAttrs[p.id];
    return attrs ? isGovtParcel(attrs) : p.classification.toLowerCase().includes("gov");
  }).length;
  const privateCount = parcels.length - govtCount;

  return withHighlights([], parcels.map((p) => p.id), {
    rows: [{ govtParcels: govtCount, privateParcels: privateCount, totalParcels: parcels.length }],
    summary: `${context.village} — ${parcels.length} parcels in view`,
    badge: `${govtCount} govt · ${privateCount} private`,
    badgeTone: "neutral",
    columns: [
      { key: "totalParcels", label: "Total" },
      { key: "govtParcels", label: "Government" },
      { key: "privateParcels", label: "Private" },
    ],
  });
}

const DEMO_RUNNERS: Record<string, () => SpatialDemoOutput> = {
  buffer: () => runBufferDemo(),
  "area-diff": runAreaDiffDemo,
  encroachment: runEncroachmentDemo,
  overlap: runOverlapDemo,
  intersect: () => runIntersectDemo(),
  statistics: runStatisticsDemo,
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

export function runSpatialToolDemo(toolId: string): SpatialDemoOutput {
  const runner = DEMO_RUNNERS[toolId];
  if (!runner) {
    return {
      overlays: getBaseParcelOverlays(),
      rows: [],
      summary: "Tool demo not available",
      columns: [],
    };
  }
  return runner();
}
