type GeoCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, Record<string, unknown>>;

export const ADMIN_BOUNDARY_LAYER_IDS = [
  "adminState",
  "adminDistrict",
  "adminTaluka",
  "adminVillage",
] as const;

export type AdminBoundaryLayerId = (typeof ADMIN_BOUNDARY_LAYER_IDS)[number];

const LAYER_FILES: Record<AdminBoundaryLayerId, string> = {
  adminState: "state",
  adminDistrict: "district",
  adminTaluka: "taluka",
  adminVillage: "village",
};

let cached: Partial<Record<AdminBoundaryLayerId, GeoCollection>> | null = null;
let loadPromise: Promise<Partial<Record<AdminBoundaryLayerId, GeoCollection>>> | null = null;

async function fetchLayer(id: AdminBoundaryLayerId): Promise<GeoCollection | null> {
  const file = LAYER_FILES[id];
  const response = await fetch(`/data/admin-boundaries/${file}.geojson`);
  if (!response.ok) {
    console.warn(`Admin boundary GeoJSON not found: ${file}.geojson`);
    return null;
  }
  return (await response.json()) as GeoCollection;
}

export async function loadAdminBoundaryGeoJson(): Promise<
  Partial<Record<AdminBoundaryLayerId, GeoCollection>>
> {
  if (cached) return cached;
  if (loadPromise) return loadPromise;

  loadPromise = Promise.all(
    ADMIN_BOUNDARY_LAYER_IDS.map(async (id) => {
      const collection = await fetchLayer(id);
      return [id, collection] as const;
    }),
  ).then((entries) => {
    const result: Partial<Record<AdminBoundaryLayerId, GeoCollection>> = {};
    entries.forEach(([id, collection]) => {
      if (collection) result[id] = collection;
    });
    cached = result;
    loadPromise = null;
    return result;
  });

  return loadPromise;
}
