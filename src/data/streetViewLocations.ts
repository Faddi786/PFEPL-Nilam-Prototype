/** Default Street View location for 3D walk demo (Puducherry — reliable coverage). */
export const DEFAULT_STREET_VIEW = {
  lat: 11.9338,
  lng: 79.8298,
  heading: 90,
  pitch: 0,
  label: "White Town, Puducherry",
} as const;

export function buildStreetViewEmbedUrl(
  lat: number,
  lng: number,
  heading: number,
  pitch: number,
) {
  return `https://www.google.com/maps?layer=c&cbll=${lat},${lng}&cbp=1,${heading},,0,${pitch}&output=svembed`;
}

export function buildStreetViewPanoUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}
