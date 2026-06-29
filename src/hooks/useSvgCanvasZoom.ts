import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";

export const SVG_ZOOM_DEFAULT = 0.82;
export const SVG_ZOOM_STEP_DEFAULT = 1.18;
/** ~8% per +/- click / wheel step — used on FMB extract & georeferencing canvases */
export const SVG_ZOOM_STEP_FINE = 1.08;
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 3.5;
/** Pixels of wheel delta required before one fine zoom step (ignored when 0). */
export const SVG_WHEEL_DELTA_THRESHOLD_FINE = 100;

export function isSvgPanTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-canvas-interactive]")) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "svg") return true;
  if (tag === "image") return true;
  if (target.getAttribute("data-pan-background") === "true") return true;
  return false;
}

export type SvgCanvasZoom = {
  viewBox: string;
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  wheelTargetRef: RefObject<HTMLDivElement | null>;
  isPanning: boolean;
  spacePanActive: boolean;
  onPanMouseDown: (e: React.MouseEvent) => void;
  onPanMouseMove: (e: React.MouseEvent) => void;
  onPanMouseUp: () => void;
  containerCursorClass: string;
};

export type SvgCanvasZoomOptions = {
  defaultZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  /** Multiplier per zoom step; 1.18 ≈ 18%, 1.08 ≈ 8%. Defaults to SVG_ZOOM_STEP_DEFAULT. */
  zoomStep?: number;
  /** Wheel delta (px) to accumulate before one step; 0 = one step per wheel event. */
  wheelDeltaThreshold?: number;
};

export function useSvgCanvasZoom(
  viewWidth: number,
  viewHeight: number,
  options?: SvgCanvasZoomOptions,
): SvgCanvasZoom {
  const defaultZoom = options?.defaultZoom ?? SVG_ZOOM_DEFAULT;
  const minZoom = options?.minZoom ?? ZOOM_MIN;
  const maxZoom = options?.maxZoom ?? ZOOM_MAX;
  const zoomStep = options?.zoomStep ?? SVG_ZOOM_STEP_DEFAULT;
  const wheelDeltaThreshold = options?.wheelDeltaThreshold ?? 0;

  const [zoom, setZoom] = useState(defaultZoom);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(
    null,
  );
  const wheelTargetRef = useRef<HTMLDivElement | null>(null);
  const wheelAccumRef = useRef(0);

  const viewBox = useMemo(() => {
    const w = viewWidth / zoom;
    const h = viewHeight / zoom;
    const x = (viewWidth - w) / 2 + pan.x;
    const y = (viewHeight - h) / 2 + pan.y;
    return `${x} ${y} ${w} ${h}`;
  }, [viewWidth, viewHeight, zoom, pan.x, pan.y]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" && !e.repeat) {
        setSpacePanActive(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        setSpacePanActive(false);
        panStartRef.current = null;
        setIsPanning(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const el = wheelTargetRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();

      if (wheelDeltaThreshold > 0) {
        wheelAccumRef.current += e.deltaY;
        if (Math.abs(wheelAccumRef.current) < wheelDeltaThreshold) return;
        wheelAccumRef.current = 0;
      }

      if (e.deltaY < 0) {
        setZoom((z) => Math.min(maxZoom, z * zoomStep));
      } else {
        setZoom((z) => Math.max(minZoom, z / zoomStep));
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [maxZoom, minZoom, zoomStep, wheelDeltaThreshold]);

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(maxZoom, z * zoomStep));
  }, [maxZoom, zoomStep]);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(minZoom, z / zoomStep));
  }, [minZoom, zoomStep]);

  const resetZoom = useCallback(() => {
    setZoom(defaultZoom);
    setPan({ x: 0, y: 0 });
    panStartRef.current = null;
    setIsPanning(false);
  }, [defaultZoom]);

  const onPanMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const middleButton = e.button === 1;
      const leftButton = e.button === 0;
      if (!middleButton && !leftButton) return;

      const spacePan = leftButton && spacePanActive;
      const backgroundPan = leftButton && isSvgPanTarget(e.target);
      if (!middleButton && !spacePan && !backgroundPan) return;

      e.preventDefault();
      panStartRef.current = { clientX: e.clientX, clientY: e.clientY, panX: pan.x, panY: pan.y };
      setIsPanning(true);
    },
    [pan.x, pan.y, spacePanActive],
  );

  const onPanMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!panStartRef.current) return;
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const w = viewWidth / zoom;
      const h = viewHeight / zoom;
      const scaleX = w / rect.width;
      const scaleY = h / rect.height;
      const dx = e.clientX - panStartRef.current.clientX;
      const dy = e.clientY - panStartRef.current.clientY;

      setPan({
        x: panStartRef.current.panX - dx * scaleX,
        y: panStartRef.current.panY - dy * scaleY,
      });
    },
    [viewWidth, viewHeight, zoom],
  );

  const onPanMouseUp = useCallback(() => {
    panStartRef.current = null;
    setIsPanning(false);
  }, []);

  const containerCursorClass =
    isPanning || spacePanActive ? "cursor-grabbing" : spacePanActive ? "cursor-grab" : "";

  return {
    viewBox,
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    wheelTargetRef,
    isPanning,
    spacePanActive,
    onPanMouseDown,
    onPanMouseMove,
    onPanMouseUp,
    containerCursorClass,
  };
}
