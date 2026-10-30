// Global overlay: FIA scrutineering crop-mark frame at the bookends and the (normally hidden)
// corner RPM / REDLINE readout, plus optional plate captions.
// Bookends: the opening's CAD setup sheet (`lights`) and the outro's `[ BOX / RESET LAP ]` loop.
import { Layer2D, W, H } from './gl';
import { rgba } from './palette';
import { F, font } from './type';
import type { Lyrics } from './lyrics';
import { clamp, ease, hash, lerp, noise1, prog, smoothstep } from './util';

export interface Caption { start: number; end: number; fig: string; text: string }

/**
 * Normalized RPM / Redline progression (0..1 -> 0..15,000 RPM).
 * Kept named `PDoom` (with alias `Redline`) for seamless Engine compatibility.
 * Each sung "mind" in "lose my mind" upshifts the engine ceiling toward the 15,000 RPM rev limiter.
 */
export class PDoom {
  steps: { t: number; v: number; rpm: number }[] = [];
  constructor(lyrics: Lyrics) {
    const hits = lyrics
      .find('lose my mind')
      .filter((l) => /feels so good|might just/i.test(l.text))
      .map((l) => (l.words[l.words.length - 1]?.start ?? l.start) + 0.04);
    const rpms = [11600, 13200, 14400, 15000];
    this.steps = [
      { t: -1, v: 3200 / 15000, rpm: 3200 },
      ...hits.map((t, i) => {
        const rpm = rpms[Math.min(i, rpms.length - 1)] ?? 15000;
        return { t, v: rpm / 15000, rpm };
      }),
    ];
  }
  /** Normalized 0..1 RPM at song time `t` with upshift surge and micro-throttle flutter. */
  value(t: number): number {
    let i = 0;
    while (i + 1 < this.steps.length && this.steps[i + 1]!.t <= t) i++;
    const cur = this.steps[i]!, prev = this.steps[Math.max(0, i - 1)]!;
    const k = i === 0 ? 1 : prog(t, cur.t, cur.t + 0.75, ease.outExpo);
    const base = prev.v + (cur.v - prev.v) * k;
    const next = this.steps[i + 1];
    const creep = next ? (next.v - cur.v) * 0.22 * smoothstep(cur.t + 0.8, next.t, t) : 0;
    const flutter = noise1(t * 7.5, 11) * 0.006 * (1 - k * 0.4);
    return clamp(base + creep + flutter, 0, 1);
  }
  /** Integer engine RPM (0..15,000) at song time `t`. */
  rpm(t: number): number {
    return Math.round(this.value(t) * 15000);
  }
  /** 0..1 flash envelope right after a redline step. */
  flash(t: number): number {
    let f = 0;
    for (const s of this.steps) if (t >= s.t && s.t > 0) f = Math.max(f, Math.pow(0.5, (t - s.t) / 0.32));
    return f;
  }
  lastStep(t: number) { let s = this.steps[0]!; for (const x of this.steps) if (x.t <= t) s = x; return s; }
}

export const Redline = PDoom;
export type Redline = PDoom;

/** Canonical text format of normalized RPM ('3,200', '15,000'). */
export const formatRPM = (norm01: number) => Math.round(clamp(norm01, 0, 2) * 15000).toLocaleString('en-US');
export const formatPDoom = formatRPM;

/**
 * Draw the telemetry RPM instrument (label, digital counter, segmented rev bar) anywhere
 * into a Canvas2D context — for plates that stage telemetry diegetically inside their world.
 * (x, y) = left end of the digits' baseline; the label sits above, the rev bar below.
 */
export function drawReadout(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  v: number,
  o: { scale?: number; text?: string; digits?: string; label?: string; labelText?: string; bar?: boolean } = {},
) {
  const k = o.scale ?? 1;
  c.save();
  c.textBaseline = 'alphabetic';
  c.font = font(F.mono(500), 13 * k);
  c.letterSpacing = `${3 * k}px`;
  c.fillStyle = o.label ?? rgba('bone', 0.62);
  c.fillText(o.labelText ?? 'RPM · TELEMETRY', x, y - 44 * k);
  c.letterSpacing = '0px';
  c.font = font(F.mono(500), 40 * k);
  c.fillStyle = o.digits ?? (v >= 0.96 ? rgba('signal', 1) : rgba('bone', 0.94));
  c.fillText(o.text ?? formatRPM(v), x - 2 * k, y);
  if (o.bar !== false) {
    const bw = 220 * k, by = y + 16 * k;
    c.fillStyle = rgba('bone', 0.18);
    c.fillRect(x, by, bw, Math.max(1, k));
    for (let i = 0; i <= 15; i++) {
      const maj = i % 5 === 0;
      c.fillStyle = i >= 13 ? rgba('signal', 0.55) : rgba('bone', 0.25);
      c.fillRect(x + (bw * i) / 15, by - (maj ? 5.5 : 3) * k, Math.max(1, k), (maj ? 5.5 : 3) * k);
    }
    const fillW = bw * clamp(v);
    c.fillStyle = v >= 0.92 ? rgba('signal', 1) : rgba('ember', 0.95);
    c.fillRect(x, by - k, fillW, 3.2 * k);
  }
  c.restore();
}

export interface HudState {
  opacity: number;
  /** 0..1 FIA scrutineering crop-mark frame: 1 in place, 0 flown out past the edges. */
  frame: number;
  /** Opacity of the corner RPM readout (off by default: staged inside plates). */
  readout: number;
  /** 0..1: the plate is light (bone technical paper) — draw crop marks in ink. */
  paper: number;
  pdoomOverride?: string;
  corruption?: number;
}

export class Hud {
  layer = new Layer2D();
  private ink = false;
  constructor(public pdoom: PDoom, public captions: Caption[]) {}

  draw(t: number, st: HudState) {
    const L = this.layer;
    L.clear();
    const c = L.ctx;
    if (st.opacity <= 0.001) return L.upload();
    c.globalAlpha = st.opacity;
    this.ink = st.paper > 0.5;
    if (st.frame > 0.001) this.cropMarks(c, st.frame);
    if (st.readout > 0.001) { c.save(); c.globalAlpha *= st.readout; this.readout(c, t, st); c.restore(); }
    this.caption(c, t);
    return L.upload();
  }

  /** Scrutineering corner brackets + centre datum ticks; fly out along diagonals when k -> 0. */
  private cropMarks(c: CanvasRenderingContext2D, k: number) {
    const e = ease.inOutCubic(clamp(k));
    c.save();
    c.globalAlpha *= clamp(k * 3);
    c.strokeStyle = this.ink ? rgba('ink', 0.48) : rgba('bone', 0.36);
    c.lineWidth = 1.25;
    const m = lerp(-44, 36, e), l = 24;
    c.beginPath();
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]] as const) {
      c.moveTo(x + sx * l, y + 0.5 * sy); c.lineTo(x, y + 0.5 * sy); c.lineTo(x, y + sy * l);
    }
    // Mid-edge datum hairlines (wind-tunnel / FIA optical alignment marks)
    const tick = 10;
    c.moveTo(W / 2, m); c.lineTo(W / 2, m + tick);
    c.moveTo(W / 2, H - m); c.lineTo(W / 2, H - m - tick);
    c.moveTo(m, H / 2); c.lineTo(m + tick, H / 2);
    c.moveTo(W - m, H / 2); c.lineTo(W - m - tick, H / 2);
    c.stroke();
    c.restore();
  }

  private readout(c: CanvasRenderingContext2D, t: number, st: HudState) {
    const v = this.pdoom.value(t);
    const fl = this.pdoom.flash(t);
    const x = 64, y = H - 66;
    let s = st.pdoomOverride ?? formatRPM(v);
    if (st.corruption && st.corruption > 0) {
      const glyphs = '0189#-/?!';
      s = Array.from(s).map((ch, i) => (hash(i, Math.floor(t * 24)) < st.corruption! * 0.7 ? glyphs[Math.floor(hash(i, t) * glyphs.length)] : ch)).join('');
    }
    drawReadout(c, x, y, v, {
      text: s,
      digits: fl > 0.02 ? mix('bone', 'signal', Math.min(1, fl * 1.5)) : undefined,
    });
  }

  private caption(c: CanvasRenderingContext2D, t: number) {
    const cap = this.captions.find((k) => t >= k.start && t < k.end);
    if (!cap) return;
    const a = Math.min(smoothstep(cap.start, cap.start + 0.5, t), 1 - smoothstep(cap.end - 0.6, cap.end, t));
    if (a <= 0) return;
    c.save();
    c.globalAlpha *= a;
    const x = W - 64, y = H - 66;
    c.textBaseline = 'alphabetic';
    c.font = font(F.serif(400, true), 26);
    c.fillStyle = this.ink ? rgba('ink', 0.9) : rgba('bone', 0.85);
    c.shadowColor = rgba('ink', 0.85);
    c.shadowBlur = this.ink ? 0 : 10;
    const n = Math.floor(cap.text.length * prog(t, cap.start, cap.start + 0.8));
    const shown = cap.text.slice(0, n);
    const full = c.measureText(cap.text).width;
    c.textAlign = 'left';
    c.fillText(shown, x - full, y);
    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = this.ink ? rgba('blood', 1) : rgba('signal', 1);
    c.fillText(cap.fig, x - full, y - 34);
    c.restore();
  }
}

function mix(a: string, b: string, k: number) {
  const pa = rgba(a).match(/\d+/g)!.map(Number), pb = rgba(b).match(/\d+/g)!.map(Number);
  return `rgba(${[0, 1, 2].map((i) => Math.round(pa[i]! + (pb[i]! - pa[i]!) * k)).join(',')},1)`;
}
