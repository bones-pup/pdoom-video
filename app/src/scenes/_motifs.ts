// Shared motorsport telemetry & friction motifs used across plates:
//  - the SPARK: white-hot titanium skid-block friction point with ember/signal halo & sparks
//  - G-G FRICTION CIRCLE: concentric 1G/3G/5G traction envelope + live G-vector dot
//  - SHIFT-LIGHT STRIP: 15-LED steering-wheel array (bone -> ember -> strobing signal red)
//  - START GANTRY PODS: 5 FIA start lights with synchronized lights-out snap
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font } from '../engine/type';
import { clamp, frameIdx, hash, TAU } from '../engine/util';

type P2 = { x: number; y: number };

/**
 * Deterministic titanium skid-block spark streaks emitted from `headAt(t)`.
 * Uses a constant `rateMax` clock thinned by birth-time hash when `rate` varies,
 * guaranteeing identical particle identities across adaptive motion-blur sub-frames.
 */
export function sparkParticles(
  lb: LineBatch,
  t: number,
  headAt: (t: number) => P2 | null,
  o: {
    rate?: number | ((tb: number) => number);
    rateMax?: number;
    life?: number;
    speed?: number;
    gravity?: number;
    intensity?: number;
    seed?: number;
    width?: number;
    driftX?: number;
  } = {},
) {
  const life = o.life ?? 0.42, speed = o.speed ?? 310, g = o.gravity ?? 560, I = o.intensity ?? 1, seed = o.seed ?? 1;
  const driftX = o.driftX ?? 0;
  const rateAt = typeof o.rate === 'function' ? o.rate : null;
  const rate = rateAt ? o.rateMax! : (o.rate as number | undefined) ?? 100;
  if (!(rate > 0)) return;
  const n0 = Math.floor((t - life) * rate), n1 = Math.floor(t * rate);
  for (let n = n0; n <= n1; n++) {
    const tb = n / rate;
    if (tb > t) continue;
    if (rateAt && hash(n, seed + 3) * rate >= rateAt(tb)) continue;
    const age = t - tb;
    const h = headAt(tb);
    if (!h) continue;
    const a = hash(n, seed) * TAU, sp = speed * (0.28 + hash(n, seed + 1) ** 2 * 1.3);
    const lf = life * (0.35 + 0.65 * hash(n, seed + 2));
    if (age > lf) continue;
    const vx = Math.cos(a) * sp + driftX, vy = Math.sin(a) * sp - speed * 0.26;
    const x = h.x + vx * age, y = h.y + vy * age + 0.5 * g * age * age;
    const dtb = 0.019;
    const a0 = Math.max(0, age - dtb);
    const x0 = h.x + vx * a0, y0 = h.y + vy * a0 + 0.5 * g * a0 * a0;
    const k = 1 - age / lf;
    const heat = k * k;
    const col: [number, number, number] = [
      (LIN.signal[0] + (1 - LIN.signal[0]) * heat) * 2.4 * I,
      (LIN.ember[1] * 0.85 + (0.88 - LIN.ember[1] * 0.85) * heat) * 2.3 * I,
      (LIN.signal[2] + (0.62 - LIN.signal[2]) * heat) * 2.2 * I,
    ];
    lb.seg2(x0, y0, x, y, (o.width ?? 1.65) * (0.5 + k * 0.75), col, Math.min(1, k * 1.45));
  }
}

/** Titanium friction / apex laser head: incandescent core, signal halo, 4 crisp anamorphic/star spikes. */
export function sparkHead(lb: LineBatch, x: number, y: number, t: number, scale = 1, intensity = 1) {
  const flick = 0.86 + 0.14 * Math.sin(t * 97.3) * Math.sin(t * 61.1);
  const I = intensity * flick;
  lb.seg2(x, y, x + 0.01, y, 28 * scale, [LIN.signal[0] * 0.55 * I, LIN.signal[1] * 0.55 * I, LIN.signal[2] * 0.55 * I], 0.36);
  lb.seg2(x, y, x + 0.01, y, 12.5 * scale, [LIN.ember[0] * 2.6 * I, LIN.ember[1] * 2.4 * I, LIN.ember[2] * 2.2 * I], 0.82);
  lb.seg2(x, y, x + 0.01, y, 5 * scale, [6.2 * I, 5.4 * I, 4.5 * I], 1);
  // Horizontal anamorphic flare + cross spikes
  const fIdx = frameIdx(t);
  for (let i = 0; i < 4; i++) {
    const a = i * (TAU / 4);
    const horiz = i % 2 === 0 ? 1.8 : 0.9;
    const r = (10 + 5 * hash(fIdx, i + 9)) * scale * horiz;
    lb.seg2(x - Math.cos(a) * r, y - Math.sin(a) * r, x + Math.cos(a) * r, y + Math.sin(a) * r, 1.15 * scale, [3.2 * I, 1.3 * I, 0.45 * I], 0.78);
  }
}

/** Canvas2D version of the spark head. */
export function sparkHead2D(c: CanvasRenderingContext2D, x: number, y: number, _t: number, scale = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, 24 * scale);
  g.addColorStop(0, 'rgba(255,252,245,1)');
  g.addColorStop(0.18, 'rgba(255,155,70,0.96)');
  g.addColorStop(0.46, rgba('signal', 0.48));
  g.addColorStop(1, rgba('signal', 0));
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, 24 * scale, 0, TAU); c.fill();
}

/**
 * Draw the G-G Friction Envelope circle at (x, y) with outer radius R (= 5G limit).
 * `gx`, `gy` are normalized G-loads where magnitude 1.0 = 5G traction limit.
 * Exceeding 1.0 triggers the traction-breach warning ring in `signal` red.
 */
export function drawGGCircle2D(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  R: number,
  gx: number,
  gy: number,
  o: { ink?: 'bone' | 'ink'; alpha?: number; showLabels?: boolean } = {},
) {
  const ink = o.ink ?? 'bone';
  const a = o.alpha ?? 1;
  const mag = Math.hypot(gx, gy);
  const breach = mag > 1.0;
  c.save();
  c.translate(x, y);
  c.globalAlpha *= a;

  // Concentric 1G (0.2), 3G (0.6), 5G (1.0) rings
  for (const [f, w, al] of [[0.2, 1, 0.22], [0.6, 1, 0.32], [1.0, breach ? 2.2 : 1.4, breach ? 0.95 : 0.58]] as const) {
    c.strokeStyle = f === 1.0 && breach ? rgba('signal', al) : rgba(ink, al);
    c.lineWidth = w;
    c.beginPath(); c.arc(0, 0, R * f, 0, TAU); c.stroke();
  }
  // Crosshair axes
  c.strokeStyle = rgba(ink, 0.22);
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-R * 1.12, 0); c.lineTo(R * 1.12, 0);
  c.moveTo(0, -R * 1.12); c.lineTo(0, R * 1.12);
  c.stroke();

  // Live G-vector line + dot
  const px = gx * R, py = gy * R;
  c.strokeStyle = rgba('signal', 0.85);
  c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(px, py); c.stroke();

  c.fillStyle = breach ? rgba('signal', 1) : rgba('ember', 1);
  c.beginPath(); c.arc(px, py, Math.max(3.5, R * 0.055), 0, TAU); c.fill();

  if (o.showLabels !== false && R >= 48) {
    c.font = font(F.mono(500), Math.max(10, R * 0.11));
    c.fillStyle = breach ? rgba('signal', 0.95) : rgba(ink, 0.52);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText(`${(mag * 5).toFixed(1)}G`, R * 0.12, -R - 8);
    if (breach) {
      c.textAlign = 'right';
      c.fillText('LIMIT!', -R * 0.1, -R - 8);
    }
  }
  c.restore();
}

/**
 * Steering-wheel 15-LED shift strip: 5 bone/ash -> 5 ember -> 5 signal red.
 * Strobes at 15 Hz (`frameIdx(t)`) when `rpm01 >= 0.98` (rev limiter).
 */
export function drawShiftStrip2D(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rpm01: number,
  t: number,
  o: { alpha?: number; ink?: 'bone' | 'ink' } = {},
) {
  const N = 15;
  const gap = Math.max(3, w * 0.018);
  const cellW = (w - gap * (N - 1)) / N;
  const lit = Math.round(clamp(rpm01, 0, 1) * N);
  const limiter = rpm01 >= 0.98 && Math.floor(frameIdx(t) / 2) % 2 === 1;
  const baseInk = o.ink ?? 'bone';

  c.save();
  c.globalAlpha *= o.alpha ?? 1;
  for (let i = 0; i < N; i++) {
    const lx = x + i * (cellW + gap);
    const on = limiter ? true : i < lit;
    if (!on) {
      c.fillStyle = rgba(baseInk, 0.14);
      c.fillRect(lx, y, cellW, h);
    } else {
      const col = limiter ? 'signal' : i < 5 ? baseInk : i < 10 ? 'ember' : 'signal';
      c.fillStyle = rgba(col, 0.96);
      c.fillRect(lx, y, cellW, h);
    }
  }
  c.restore();
}

/**
 * Five FIA start-gantry pods centred at (cx, cy).
 * `litPods` = 0..5 red pods illuminated; `blackout` = true on LIGHTS OUT.
 */
export function drawStartPods2D(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spanW: number,
  podR: number,
  litPods: number,
  blackout = false,
  alpha = 1,
) {
  c.save();
  c.globalAlpha *= alpha;
  const step = spanW / 4;
  // Horizontal gantry bar
  c.strokeStyle = rgba('graphite', 0.55);
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(cx - spanW * 0.62, cy); c.lineTo(cx + spanW * 0.62, cy); c.stroke();

  for (let i = 0; i < 5; i++) {
    const px = cx - spanW / 2 + i * step;
    // Housing box
    const hw = podR * 1.55, hh = podR * 2.5;
    c.fillStyle = rgba('ink2', 0.95);
    c.strokeStyle = rgba('graphite', 0.65);
    c.lineWidth = 1.5;
    c.fillRect(px - hw, cy - hh, hw * 2, hh * 2);
    c.strokeRect(px - hw, cy - hh, hw * 2, hh * 2);

    // Upper unlit dummy lens + lower active red lens
    for (const [ry, active] of [[cy - podR * 1.05, false], [cy + podR * 1.05, !blackout && i < litPods]] as const) {
      c.beginPath(); c.arc(px, ry, podR, 0, TAU);
      if (active) {
        const g = c.createRadialGradient(px, ry, 0, px, ry, podR * 2.1);
        g.addColorStop(0, 'rgba(255,210,180,1)');
        g.addColorStop(0.45, rgba('signal', 1));
        g.addColorStop(1, rgba('signal', 0));
        c.fillStyle = g;
        c.save();
        c.beginPath(); c.arc(px, ry, podR * 2.1, 0, TAU); c.fill();
        c.restore();
        c.fillStyle = rgba('signal', 1);
        c.beginPath(); c.arc(px, ry, podR, 0, TAU); c.fill();
      } else {
        c.fillStyle = rgba('ink', 0.9);
        c.fill();
        c.strokeStyle = rgba('graphite', 0.35);
        c.lineWidth = 1;
        c.stroke();
      }
    }
  }
  c.restore();
}
