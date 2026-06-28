import type { AffineParams, GcpPoint, PolynomialOrder, ProjectiveParams } from "../data/transformationMock";

export type Point = [number, number];

/** Solve N×N linear system via Gaussian elimination */
function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row]![col]!) > Math.abs(M[pivot]![col]!)) pivot = row;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-10) return null;
    [M[col], M[pivot]] = [M[pivot]!, M[col]!];

    for (let row = col + 1; row < n; row++) {
      const factor = M[row]![col]! / M[col]![col]!;
      for (let j = col; j <= n; j++) M[row]![j]! -= factor * M[col]![j]!;
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i]![n]!;
    for (let j = i + 1; j < n; j++) sum -= M[i]![j]! * x[j]!;
    x[i] = sum / M[i]![i]!;
  }
  return x;
}

/** Least-squares affine fit from GCP pairs: [x',y'] = A·[x,y,1] */
export function fitAffineFromGcps(gcps: GcpPoint[]): AffineParams {
  if (gcps.length < 3) {
    return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumX2 = 0;
  let sumY2 = 0;
  let sumXY = 0;
  let sumXt = 0;
  let sumYt = 0;
  let sumXxt = 0;
  let sumYxt = 0;
  let sumXyt = 0;
  let sumYyt = 0;
  const n = gcps.length;

  for (const g of gcps) {
    const [x, y] = g.source;
    const [tx, ty] = g.target;
    sumX += x;
    sumY += y;
    sumX2 += x * x;
    sumY2 += y * y;
    sumXY += x * y;
    sumXt += tx;
    sumYt += ty;
    sumXxt += x * tx;
    sumYxt += y * tx;
    sumXyt += x * ty;
    sumYyt += y * ty;
  }

  const AtA = [
    [sumX2, sumXY, sumX],
    [sumXY, sumY2, sumY],
    [sumX, sumY, n],
  ];
  const bx = [sumXxt, sumYxt, sumXt];
  const by = [sumXyt, sumYyt, sumYt];

  const cx = solveLinear(AtA, bx);
  const cy = solveLinear(AtA, by);
  if (!cx || !cy) return { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

  return { a: cx[0]!, b: cx[1]!, tx: cx[2]!, c: cy[0]!, d: cy[1]!, ty: cy[2]! };
}

export function applyAffine(point: Point, p: AffineParams): Point {
  const [x, y] = point;
  return [p.a * x + p.b * y + p.tx, p.c * x + p.d * y + p.ty];
}

export function affineToMatrixString(p: AffineParams): string {
  return `matrix(${p.a}, ${p.c}, ${p.b}, ${p.d}, ${p.tx}, ${p.ty})`;
}

/** Build polynomial basis terms for order 1–3 */
function polyTerms(x: number, y: number, order: PolynomialOrder): number[] {
  if (order === 1) return [1, x, y];
  if (order === 2) return [1, x, y, x * x, x * y, y * y];
  return [1, x, y, x * x, x * y, y * y, x * x * x, x * x * y, x * y * y, y * y * y];
}

/** Fit polynomial coefficients via least squares (normal equations) */
export function fitPolynomial(
  gcps: GcpPoint[],
  order: PolynomialOrder,
): { coeffX: number[]; coeffY: number[] } | null {
  const terms = polyTerms(0, 0, order);
  const k = terms.length;
  if (gcps.length < k) return null;

  const AtA: number[][] = Array.from({ length: k }, () => new Array(k).fill(0));
  const Atbx = new Array(k).fill(0);
  const Atby = new Array(k).fill(0);

  for (const g of gcps) {
    const [x, y] = g.source;
    const t = polyTerms(x, y, order);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) AtA[i]![j]! += t[i]! * t[j]!;
      Atbx[i]! += t[i]! * g.target[0];
      Atby[i]! += t[i]! * g.target[1];
    }
  }

  const coeffX = solveLinear(AtA, Atbx);
  const coeffY = solveLinear(AtA, Atby);
  if (!coeffX || !coeffY) return null;
  return { coeffX, coeffY };
}

export function applyPolynomial(
  point: Point,
  coeffX: number[],
  coeffY: number[],
  order: PolynomialOrder,
): Point {
  const [x, y] = point;
  const t = polyTerms(x, y, order);
  let px = 0;
  let py = 0;
  for (let i = 0; i < t.length; i++) {
    px += coeffX[i]! * t[i]!;
    py += coeffY[i]! * t[i]!;
  }
  return [px, py];
}

/** Simplified TPS: radial basis U(r)=r²·log(r) with IDW fallback for demo */
export function applyTps(point: Point, gcps: GcpPoint[]): Point {
  if (gcps.length === 0) return point;
  if (gcps.length === 1) {
    const g = gcps[0]!;
    return [point[0] + g.target[0] - g.source[0], point[1] + g.target[1] - g.source[1]];
  }

  const [x, y] = point;
  let wx = 0;
  let wy = 0;
  let wSum = 0;

  for (const g of gcps) {
    const [sx, sy] = g.source;
    const dx = g.target[0] - sx;
    const dy = g.target[1] - sy;
    const r = Math.hypot(x - sx, y - sy);
    const u = r < 0.001 ? 0 : r * r * Math.log(r);
    const w = 1 / Math.max(r * r, 0.5) + u * 0.15;
    wx += (sx + dx - x) * w;
    wy += (sy + dy - y) * w;
    wSum += w;
  }

  const avgDx = gcps.reduce((s, g) => s + (g.target[0] - g.source[0]), 0) / gcps.length;
  const avgDy = gcps.reduce((s, g) => s + (g.target[1] - g.source[1]), 0) / gcps.length;

  return [x + avgDx * 0.3 + wx / wSum, y + avgDy * 0.3 + wy / wSum];
}

/** Direct linear transform for 4-point homography (8 unknowns) */
export function fitProjective(srcCorners: Point[], dstCorners: Point[]): ProjectiveParams | null {
  if (srcCorners.length < 4 || dstCorners.length < 4) return null;

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [x, y] = srcCorners[i]!;
    const [u, v] = dstCorners[i]!;
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const h = solveLinear(A, b);
  if (!h) return null;

  return {
    h: [
      [h[0]!, h[1]!, h[2]!],
      [h[3]!, h[4]!, h[5]!],
      [h[6]!, h[7]!, 1],
    ],
  };
}

export function applyProjective(point: Point, params: ProjectiveParams): Point {
  const [x, y] = point;
  const { h } = params;
  const w = h[2]![0]! * x + h[2]![1]! * y + h[2]![2]!;
  if (Math.abs(w) < 1e-10) return point;
  const px = (h[0]![0]! * x + h[0]![1]! * y + h[0]![2]!) / w;
  const py = (h[1]![0]! * x + h[1]![1]! * y + h[1]![2]!) / w;
  return [px, py];
}

export function computeRmsError(
  gcps: GcpPoint[],
  transform: (p: Point) => Point,
): number {
  if (gcps.length === 0) return 0;
  const residuals = gcps.map((g) => {
    const pred = transform(g.source);
    return Math.hypot(pred[0] - g.target[0], pred[1] - g.target[1]);
  });
  const meanSq = residuals.reduce((s, r) => s + r * r, 0) / residuals.length;
  return Math.sqrt(meanSq);
}

export function clampPoint(p: Point, min = 2, max = 98): Point {
  return [Math.max(min, Math.min(max, p[0])), Math.max(min, Math.min(max, p[1]))];
}
