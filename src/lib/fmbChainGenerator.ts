import * as turf from "@turf/turf";
import {
  polygonExteriorRing,
  selectParcelsForDgpsDemo,
  uniqueRingVertices,
  type DgpsPointBuildOptions,
} from "./dgpsVertexPoints";

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;

const CALLOUTS = [
  "Along existing stone boundary",
  "Along fence line",
  "Along canal bund",
  "Along tar road edge",
  "Along compound wall",
  "Through paddy field bund",
  "Along interior lane",
  "Along temple compound",
] as const;

export type FmbChainSegment = {
  chainId: number;
  fromPoint: string;
  toPoint: string;
  bearing: string;
  distance: string;
  distanceM: number;
  offset: string;
  callout: string;
  sheetNo: string;
  surveyNo: string;
  parcelId: string;
  fmbText: string;
  coordinates: [number, number][];
};

function azimuthToSurveyBearing(azimuth: number): string {
  const a = ((azimuth % 360) + 360) % 360;
  let angle: number;
  let prefix: string;
  let suffix: string;

  if (a <= 90) {
    prefix = "N";
    suffix = "E";
    angle = a;
  } else if (a <= 180) {
    prefix = "S";
    suffix = "E";
    angle = 180 - a;
  } else if (a <= 270) {
    prefix = "S";
    suffix = "W";
    angle = a - 180;
  } else {
    prefix = "N";
    suffix = "W";
    angle = 360 - a;
  }

  const degrees = Math.floor(angle);
  const minutes = Math.floor((angle - degrees) * 60);
  return `${prefix} ${degrees}° ${String(minutes).padStart(2, "0")}' ${suffix}`;
}

function formatFmbText(segment: Omit<FmbChainSegment, "fmbText" | "coordinates">): string {
  return [
    `FMB Sheet: ${segment.sheetNo} | Survey: ${segment.surveyNo}`,
    `Chain ${segment.chainId}: From ${segment.fromPoint} to ${segment.toPoint}`,
    `Bearing: ${segment.bearing} | Distance: ${segment.distance}`,
    `Offset: ${segment.offset} | Call-out: ${segment.callout}`,
  ].join("\n");
}

function offsetForChainIndex(index: number): string {
  if (index % 11 === 0) return `${(0.08 + (index % 4) * 0.03).toFixed(2)} m R`;
  if (index % 7 === 0) return `${(0.05 + (index % 3) * 0.04).toFixed(2)} m L`;
  return "0.00 m";
}

export function buildFmbChainSegmentsFromParcels(
  parcels: GeoFeature[],
  options: DgpsPointBuildOptions & { maxParcels?: number } = {},
): FmbChainSegment[] {
  const { maxParcels = 18, ...dgpsOptions } = options;
  const selected = selectParcelsForDgpsDemo(parcels, { ...dgpsOptions, maxParcels });
  const segments: FmbChainSegment[] = [];
  let globalChainId = 1;

  selected.forEach((parcel, parcelIndex) => {
    const ring = polygonExteriorRing(parcel);
    if (!ring) return;

    const vertices = uniqueRingVertices(ring);
    if (vertices.length < 3) return;

    const props = parcel.properties ?? {};
    const parcelId = String(props.id ?? `P-${parcelIndex + 1}`);
    const surveyNo = String(props.surveyNo ?? `${127 + (parcelIndex % 40)}/${1 + (parcelIndex % 3)}`);
    const sheetNo = String(props.fmbSheet ?? props.sheetNo ?? `KR-FMB-${String(42 + (parcelIndex % 8)).padStart(3, "0")}`);

    vertices.forEach((from, vertexIndex) => {
      const to = vertices[(vertexIndex + 1) % vertices.length];
      const fromPoint = turf.point(from);
      const toPoint = turf.point(to);
      const distanceM = turf.distance(fromPoint, toPoint, { units: "meters" });
      if (distanceM < 0.5) return;

      const azimuth = turf.bearing(fromPoint, toPoint);
      const bearing = azimuthToSurveyBearing(azimuth);
      const distance = `${distanceM.toFixed(2)} m`;
      const bpNum = vertexIndex + 1;
      const nextBpNum = ((vertexIndex + 1) % vertices.length) + 1;
      const chainId = globalChainId++;
      const offset = offsetForChainIndex(globalChainId);
      const callout = CALLOUTS[(parcelIndex + vertexIndex) % CALLOUTS.length];

      const base = {
        chainId,
        fromPoint: `BP-${bpNum}`,
        toPoint: `BP-${nextBpNum}`,
        bearing,
        distance,
        distanceM,
        offset,
        callout,
        sheetNo,
        surveyNo,
        parcelId,
      };

      segments.push({
        ...base,
        fmbText: formatFmbText(base),
        coordinates: [from, to],
      });
    });
  });

  return segments;
}

export function fmbChainsToGeoJson(
  segments: FmbChainSegment[],
): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  const chainFeatures: GeoJSON.Feature[] = segments.map((segment) => ({
    type: "Feature",
    properties: {
      featureType: "chain",
      chainId: segment.chainId,
      fromPoint: segment.fromPoint,
      toPoint: segment.toPoint,
      bearing: segment.bearing,
      distance: segment.distance,
      distanceM: segment.distanceM,
      offset: segment.offset,
      callout: segment.callout,
      sheetNo: segment.sheetNo,
      surveyNo: segment.surveyNo,
      parcelId: segment.parcelId,
      fmbText: segment.fmbText,
    },
    geometry: {
      type: "LineString",
      coordinates: segment.coordinates,
    },
  }));

  const bpSeen = new Set<string>();
  const bpFeatures: GeoJSON.Feature[] = [];

  segments.forEach((segment) => {
    const start = segment.coordinates[0];
    const key = `${start[0].toFixed(7)},${start[1].toFixed(7)}`;
    if (bpSeen.has(key)) return;
    bpSeen.add(key);

    bpFeatures.push({
      type: "Feature",
      properties: {
        featureType: "boundaryPoint",
        label: segment.fromPoint,
        parcelId: segment.parcelId,
        sheetNo: segment.sheetNo,
      },
      geometry: {
        type: "Point",
        coordinates: start,
      },
    });
  });

  return {
    type: "FeatureCollection",
    features: [...chainFeatures, ...bpFeatures],
  };
}

export function buildFmbChainsFromParcels(
  parcels: GeoFeature[],
  options?: DgpsPointBuildOptions & { maxParcels?: number },
): GeoJSON.FeatureCollection<GeoJSON.Geometry> {
  const segments = buildFmbChainSegmentsFromParcels(parcels, options);
  return fmbChainsToGeoJson(segments);
}
