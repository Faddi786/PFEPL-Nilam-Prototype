type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, Record<string, unknown>>;

export const DGPS_SOURCES = ["DGPS", "GNSS RTK", "NTRIP"] as const;

export type DgpsPointBuildOptions = {
  /** Max parcels to select for demo DGPS clusters (default 12). */
  maxParcels?: number;
  /** Target vertex count when scoring parcel suitability (default 6). */
  targetVertices?: number;
  /** Minimum vertices required to include a parcel (default 4). */
  minVertices?: number;
  /** Upper bound for parcel vertex count before down-sampling (default 12). */
  maxVerticesPerParcel?: number;
};

export function polygonExteriorRing(feature: GeoFeature): [number, number][] | null {
  const geom = feature.geometry;
  if (geom.type === "Polygon") return geom.coordinates[0] as [number, number][];
  if (geom.type === "MultiPolygon") return geom.coordinates[0][0] as [number, number][];
  return null;
}

export function uniqueRingVertices(ring: [number, number][]): [number, number][] {
  if (!ring.length) return [];
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1];
  return closed ? ring.slice(0, -1) : ring.slice();
}

function sampleVerticesEvenly(vertices: [number, number][], maxCount: number): [number, number][] {
  if (vertices.length <= maxCount) return vertices;
  const result: [number, number][] = [];
  for (let i = 0; i < maxCount; i += 1) {
    result.push(vertices[Math.floor((i * vertices.length) / maxCount)]);
  }
  return result;
}

export function selectParcelsForDgpsDemo(
  parcels: GeoFeature[],
  options: DgpsPointBuildOptions = {},
): GeoFeature[] {
  const {
    maxParcels = 12,
    targetVertices = 6,
    minVertices = 4,
    maxVerticesPerParcel = 12,
  } = options;

  const polygons = parcels.filter(
    (feature) => feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon",
  );

  const scored = polygons
    .map((parcel, index) => {
      const ring = polygonExteriorRing(parcel);
      const vertexCount = ring ? uniqueRingVertices(ring).length : 0;
      const inRange = vertexCount >= minVertices && vertexCount <= maxVerticesPerParcel;
      return {
        parcel,
        index,
        vertexCount,
        score: inRange ? Math.abs(vertexCount - targetVertices) : 1000 + Math.abs(vertexCount - targetVertices),
      };
    })
    .filter((entry) => entry.vertexCount >= minVertices);

  scored.sort((a, b) => a.score - b.score || a.index - b.index);

  const candidates = scored.filter((entry) => entry.score < 1000);
  const pool = candidates.length > 0 ? candidates : scored;
  if (pool.length <= maxParcels) return pool.map((entry) => entry.parcel);

  const selected: GeoFeature[] = [];
  const step = pool.length / maxParcels;
  for (let i = 0; i < maxParcels; i += 1) {
    selected.push(pool[Math.floor(i * step)].parcel);
  }
  return selected;
}

export type BuiltDgpsPoint = {
  id: string;
  source: string;
  rmse: number;
  uploaded: boolean;
  parcelId?: string;
  vertexIndex: number;
  coordinates: [number, number];
};

export function buildDgpsVertexPointsFromParcels(
  parcels: GeoFeature[],
  idPrefix: string,
  options: DgpsPointBuildOptions = {},
): BuiltDgpsPoint[] {
  const { maxVerticesPerParcel = 8 } = options;
  const selected = selectParcelsForDgpsDemo(parcels, options);
  const points: BuiltDgpsPoint[] = [];
  let globalIndex = 0;

  selected.forEach((parcel) => {
    const ring = polygonExteriorRing(parcel);
    if (!ring) return;

    let vertices = uniqueRingVertices(ring);
    if (vertices.length > maxVerticesPerParcel) {
      vertices = sampleVerticesEvenly(vertices, 6);
    }

    const parcelId = parcel.properties?.id as string | undefined;

    vertices.forEach((coord, vertexIndex) => {
      const index = globalIndex++;
      points.push({
        id: `${idPrefix}-GCP-${String(index + 1).padStart(3, "0")}`,
        source: DGPS_SOURCES[index % DGPS_SOURCES.length],
        rmse: Number((0.04 + (index % 14) * 0.016).toFixed(2)),
        uploaded: index % 3 !== 0,
        parcelId,
        vertexIndex,
        coordinates: [coord[0], coord[1]],
      });
    });
  });

  return points;
}

export function dgpsPointsToGeoJson(
  points: BuiltDgpsPoint[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature" as const,
      properties: {
        id: point.id,
        source: point.source,
        rmse: point.rmse,
        uploaded: point.uploaded,
        parcelId: point.parcelId,
        vertexIndex: point.vertexIndex,
      },
      geometry: {
        type: "Point" as const,
        coordinates: point.coordinates,
      },
    })),
  };
}
