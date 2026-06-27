import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import type TileSource from "ol/source/Tile";

export type BasemapId = "basemap-carto" | "basemap-osm" | "basemap-imagery";

export const BASEMAP_OPTIONS: Array<{ id: BasemapId; label: string }> = [
  { id: "basemap-carto", label: "Carto Positron" },
  { id: "basemap-osm", label: "OpenStreetMap" },
  { id: "basemap-imagery", label: "Esri World Imagery" },
];

/** Esri World Imagery has sparse/no tiles above ~18 in many areas. */
export const IMAGERY_MAX_ZOOM = 18;

/** Vector tile providers support slightly higher zoom. */
export const VECTOR_MAX_ZOOM = 20;

export const BASEMAP_MAX_ZOOM: Record<BasemapId, number> = {
  "basemap-carto": VECTOR_MAX_ZOOM,
  "basemap-osm": 19,
  "basemap-imagery": IMAGERY_MAX_ZOOM,
};

/** Pan default Khutal/workbench view down so the river band leaves the frame. */
export const DEFAULT_VIEW_PAN_DOWN_RATIO = 0.2;

const DEFAULT_VIEWPORT_HEIGHT_PX = 900;

export function getBasemapMaxZoom(id: BasemapId | string): number {
  return BASEMAP_MAX_ZOOM[id as BasemapId] ?? VECTOR_MAX_ZOOM;
}

/**
 * Shift cadastral center south by a fraction of viewport height at the given zoom
 * (EPSG:4326 lon/lat in, lon/lat out).
 */
export function offsetCenterForDefaultPan(
  center: [number, number],
  zoom: number,
  viewportHeightPx = DEFAULT_VIEWPORT_HEIGHT_PX,
): [number, number] {
  const metersPerPixel =
    (156_543.03392804097 * Math.cos((center[1] * Math.PI) / 180)) / Math.pow(2, zoom);
  const offsetM = metersPerPixel * viewportHeightPx * DEFAULT_VIEW_PAN_DOWN_RATIO;
  const latOffset = offsetM / 111_320;
  return [center[0], center[1] - latOffset];
}

export function createBasemapSource(id: BasemapId): TileSource {
  switch (id) {
    case "basemap-carto":
      return new XYZ({
        url: "https://{a-d}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        attributions: "&copy; OpenStreetMap contributors &copy; CARTO",
        maxZoom: BASEMAP_MAX_ZOOM["basemap-carto"],
        crossOrigin: "anonymous",
      });
    case "basemap-osm":
      return new OSM({
        maxZoom: BASEMAP_MAX_ZOOM["basemap-osm"],
        crossOrigin: "anonymous",
      });
    case "basemap-imagery":
      return new XYZ({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        maxZoom: IMAGERY_MAX_ZOOM,
        crossOrigin: "anonymous",
      });
  }
}
