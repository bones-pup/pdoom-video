// CLUTCH x2 — Pre-chorus pit-wall radio & clutch bite-point staging ("But I wait for you, still I wait for you").
// Variants:
//  - 'launch' (pre-chorus 1): concentric G-G friction rings contract around the cockpit centre as
//    clutch bite-point calibrates; pressing [CLUTCH RELEASE ⏎] dumps straight into Hook 1.
//  - 'rejoin' (pickup / breakdown): vertical pit-limiter bars cage the frame at 80 KM/H until
//    PIT EXIT CLEAR blows the bars outward on the chorus downbeat.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, measure, plain } from '../engine/type';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { clamp, ease, hash, lerp, prog, smoothstep, TAU, frameIdx } from '../engine/util';
import { drawShiftStrip2D, sparkHead } from './_motifs';

const BG_GLSL = /* glsl */ `
uniform float uTime, uTension, uDump, uRejoin;
void main() {
  vec2 p = (vUv - 0.5) * vec2(16.0 / 9.0, 1.0);
  vec3 col = C_INK;

  if (uRejoin < 0.5) {
    // Contracting concentric throat/reticle rings pulling inward toward clutch dump
    float r = length(p);
    float rings = fract(r * (8.0 + 4.0 * uTension) + uTime * (0.4 + 1.2 * uTension) + uDump * 3.0);
    float ln = pxLine(abs(rings - 0.5) / max(fwidth(r * 10.0), 1e-4), 0.0, 1.2);
    col += mix(C_INK2, C_GRAPHITE, 0.65) * ln * smoothstep(1.1, 0.08, r) * (0.35 + 0.45 * uTension);
  } else {
    // Pit-lane speed limiter vertical cage bars opening on uDump
    float spread = 1.0 + uDump * 2.8;
    float bar = abs(fract((p.x / spread) * 9.0) - 0.5);
    float ln = pxLine(bar / max(fwidth(p.x * 9.0), 1e-4), 0.0, 1.8);
    col += C_GRAPHITE * ln * 0.28 * (1.0 - uDump * 0.8);
  }

  col += C_SIGNAL * exp(-length(p) * 3.8) * (0.12 * uTension + 0.7 * uDump);
  fragColor = vec4(col, 1.0);
}`;

const RADIO_ALTS: Record<string, [string, number][]> = {
  but: [['but', 0.58], ['box', 0.21], ['push', 0.14], ['hold', 0.07]],
  wait: [['wait', 0.64], ['brake', 0.17], ['lift', 0.11], ['abort', 0.08]],
  still: [['still', 0.61], ['stay', 0.19], ['pit', 0.12], ['cool', 0.08]],
  for: [['for', 0.71], ['on', 0.15], ['past', 0.09], ['with', 0.05]],
  you: [['you', 0.69], ['green', 0.16], ['clear', 0.10], ['P1', 0.05]],
};

export default class ClutchScene extends Scene {
  variant: 'launch' | 'rejoin' = 'launch';
  bg = new FSPass(BG_GLSL, {
    uTime: { value: 0 },
    uTension: { value: 0 },
    uDump: { value: 0 },
    uRejoin: { value: 0 },
  });
  lines = new LineBatch(4000);
  ui = new Layer2D();
  words: Word[] = [];
  linesData: Line[] = [];
  tRelease = 0;

  override init() {
    const { lyrics, params, start, end } = this.ctx;
    this.variant = params.variant === 'rejoin' ? 'rejoin' : 'launch';
    const ls = lyrics.linesIn(start - 0.05, end);
    this.linesData = ls.filter((l) => l.words.some((w) => w.start >= start - 0.15 && w.start < end));
    this.words = this.linesData.flatMap((l) => l.words);
    this.tRelease = Math.max(start + 0.3, end - 0.24);
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const tension = prog(t, this.ctx.start, this.tRelease, ease.inQuad);
    const dump = prog(t, this.tRelease, this.ctx.end, ease.inExpo);

    this.bg.u.uTime!.value = t;
    this.bg.u.uTension!.value = tension;
    this.bg.u.uDump!.value = dump;
    this.bg.u.uRejoin!.value = this.variant === 'rejoin' ? 1 : 0;
    this.bg.render(renderer, out);

    // GPU LineBatch: clutch bite-point envelope & reticle
    const lb = this.lines;
    lb.clear();
    const cx = W / 2, cy = H / 2;
    const R = lerp(340, 145, tension) * (1 + dump * 3.5);
    const segs = 96;
    const ringCol: [number, number, number] = dump > 0.05
      ? [LIN.signal[0] * 2.2, LIN.signal[1] * 2.2, LIN.signal[2] * 2.2]
      : [LIN.bone[0] * 0.45, LIN.bone[1] * 0.45, LIN.bone[2] * 0.45];
    for (let i = 0; i < segs; i++) {
      if (i % 6 === 5) continue;
      const a0 = (i / segs) * TAU + t * 0.25, a1 = ((i + 1) / segs) * TAU + t * 0.25;
      lb.seg2(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, 1.5, ringCol, 0.75);
    }
    sparkHead(lb, cx, cy + 165, t, 0.65 + 0.9 * tension + 1.8 * dump, 0.7 + dump);
    lb.render(renderer, out);

    // Canvas2D: Pit-wall radio token prompt + next-token strategy distributions
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    const boxW = 1240, boxH = 104, bx = (W - boxW) / 2, by = H / 2 - boxH / 2;
    c.fillStyle = rgba('ink2', 0.9);
    c.strokeStyle = dump > 0.02 ? rgba('signal', 1) : rgba('bone', 0.42);
    c.lineWidth = dump > 0.02 ? 2.5 : 1.4;
    c.fillRect(bx, by, boxW, boxH);
    c.strokeRect(bx, by, boxW, boxH);

    // Top-left field tag & bite-point percentage
    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.8);
    c.fillText(this.variant === 'rejoin' ? 'PIT RADIO CH01 · SPEED LIMITER 80 KM/H' : 'PIT WALL RADIO · CLUTCH BITE-POINT STAGING', bx, by - 18);
    c.textAlign = 'right';
    const bite = lerp(48.0, 64.8, tension).toFixed(1);
    c.fillStyle = dump > 0.02 ? rgba('signal', 1) : rgba('ember', 0.95);
    c.fillText(dump > 0.02 ? 'CLUTCH DUMP ⏎ [LAUNCH]' : `BITE POINT ${bite}% · ${Math.round(lerp(6800, 11200, tension))} RPM`, bx + boxW, by - 18);
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    // Typed mono tokens + candidate probability popups above active word
    const monoFam = F.mono(500);
    const tokSize = 36;
    c.font = font(monoFam, tokSize);
    let tx = bx + 34;
    const ty = by + 65;

    let activeW: Word | null = null;
    let activeX = tx;

    // Pick active line for the radio prompt (each line is a distinct radio transmission)
    let activeLine: Line | null = null;
    for (const l of this.linesData) {
      if (t >= l.start - 0.1) activeLine = l;
    }
    if (!activeLine && this.linesData.length > 0) activeLine = this.linesData[0];

    const currentWords = activeLine ? activeLine.words : [];
    for (const w of currentWords) {
      if (t < w.start - 0.04) break;
      const wp = Lyrics.wordProgress(w, t);
      const raw = plain(w.w);
      const tw = measure(raw, monoFam, tokSize);

      const justSampled = wp > 0 && wp < 1;
      if (justSampled) {
        c.fillStyle = rgba('signal', 0.22);
        c.fillRect(tx - 5, by + 20, tw + 10, 58);
        activeW = w;
        activeX = tx;
      }

      c.font = font(monoFam, tokSize);
      c.fillStyle = justSampled ? rgba('signal', 1) : rgba('bone', 0.94);
      const chars = Math.max(1, Math.ceil(raw.length * clamp(wp * 1.35)));
      c.fillText(raw.slice(0, chars), tx, ty);
      tx += tw + 18;
    }

    // Determine camera tracking target following active text / typing cursor
    const lastWord = currentWords.filter((w) => t >= w.start - 0.04).pop();
    const targetTextX = activeW ? (activeX + 40) : (lastWord ? Math.min(bx + boxW - 120, tx) : bx + 120);
    const targetTextY = activeW ? (by - 30) : (by + 40);

    // Blinking cursor + [⏎] launch badge
    const blink = dump > 0 || Math.floor(frameIdx(t) / 14) % 2 === 0;
    if (blink) {
      c.fillStyle = rgba('signal', 0.95);
      c.fillRect(tx + 2, by + 26, 14, 44);
    }
    c.font = font(F.mono(600), 24);
    c.fillStyle = dump > 0 ? rgba('signal', 1) : rgba('ash', 0.55);
    c.fillText('⏎', bx + boxW - 48, ty - 2);

    // Candidate telemetry distribution popup above currently sampled token
    if (activeW) {
      const cleanKey = plain(activeW.w).toLowerCase().replace(/[^a-z]/g, '');
      const cands = RADIO_ALTS[cleanKey] ?? [
        [plain(activeW.w), 0.63],
        ['box now', 0.18],
        ['overtake', 0.12],
        ['hold delta', 0.07],
      ];
      const px = clamp(activeX, bx, bx + boxW - 250);
      const py = by - 142;
      c.fillStyle = rgba('ink2', 0.94);
      c.strokeStyle = rgba('graphite', 0.7);
      c.lineWidth = 1;
      c.fillRect(px, py, 246, 108);
      c.strokeRect(px, py, 246, 108);

      c.font = font(F.mono(400), 13);
      cands.forEach(([tok, pr], idx) => {
        const ry = py + 22 + idx * 22;
        const chosen = idx === 0;
        c.fillStyle = chosen ? rgba('signal', 0.9) : rgba('graphite', 0.45);
        c.fillRect(px + 12, ry - 9, 76 * Number(pr), 9);
        c.fillStyle = chosen ? rgba('signal', 1) : rgba('ash', 0.8);
        c.fillText(`${tok}  ${Number(pr).toFixed(2)}`, px + 96, ry);
      });
    }

    // Shift-light array climbing toward launch underneath prompt box
    drawShiftStrip2D(c, W / 2 - 240, by + boxH + 34, 480, 9, lerp(0.35, 0.98, tension), t, { alpha: 0.9 });

    comp.draw(renderer, L.upload(), out);

    // Dynamic camera:
    // 1. Text-tracking pan: smooth parallax pan following the typed words and candidate distribution popup.
    //    When dumping into launch, snap directly onto the [⏎] launch badge!
    const targetCamX = dump > 0.05 ? (bx + boxW - 48) : targetTextX;
    const targetCamY = dump > 0.05 ? (by + 40) : targetTextY;
    const panX = clamp((W * 0.5 - targetCamX) * 0.42, -180, 180);
    const panY = clamp((H * 0.5 - targetCamY) * 0.35, -70, 70);

    // 2. Dynamic zoom: base zoom elevated to 1.15x for intimate macro terminal feel,
    //    smoothly rising as tension builds, and slamming punch-in on clutch dump (+55%) with ZERO back-and-forth wobble
    const clutchZoom = 1.15 + 0.15 * tension + 0.55 * dump;

    // 3. High-frequency staging vibration
    const camShakeY = Math.sin(t * 54.0) * (1.2 + 2.8 * tension) * (dump > 0.05 ? 0.3 : 1.0);
    const camShakeX = Math.cos(t * 38.0) * (0.8 + 1.8 * tension) * (dump > 0.05 ? 0.3 : 1.0);

    return {
      bloom: 0.55 + 0.55 * dump,
      zoom: clutchZoom,
      flash: dump * 0.65,
      ca: 1.0 + 4.5 * dump + 1.2 * tension,
      vignette: 0.45 + 0.15 * tension,
      shake: [panX + camShakeX, panY + camShakeY],
    };
  }
}
