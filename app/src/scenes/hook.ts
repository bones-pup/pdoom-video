// HOOK x4 — Full-frame gear-slam & tachometer redline ("Yeah/But it feels so good, I might just LOSE / MY / MIND").
// Escalates across n = 1..4:
//  1 (Chorus 1a): 11,600 RPM — surgical bone-on-ink, clean G-shear
//  2 (Chorus 1b): 13,200 RPM — inverted ink-on-signal brake-glow field
//  3 (Final Chorus a): 14,400 RPM — high-G dark cockpit with stacked G-load ghost echoes
//  4 (Final Chorus b): 15,000 RPM [REV LIMITER] — 16 Hz rev-limiter strobe, G-G envelope breach, spark storm
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, layout, measure } from '../engine/type';
import { Lyrics, type Line, type Word } from '../engine/lyrics';
import { clamp, ease, frameIdx, hash, lerp, noise1, prog, pulse, smoothstep, TAU } from '../engine/util';
import { drawGGCircle2D, drawShiftStrip2D, sparkHead, sparkParticles } from './_motifs';

const BG_GLSL = /* glsl */ `
uniform float uTime, uHit, uInvertField, uStrobe, uRpm01, uDialR;
void main() {
  // Match screen2D tachometer origin (cx = W/2, cy = H*0.54 -> vUv = (0.5, 0.46), +y down)
  vec2 p = vec2((vUv.x - 0.5) * (16.0 / 9.0), 0.46 - vUv.y);
  float r = length(p);

  // Base field: either deep carbon ink or blinding signal-orange brake-glow (n=2 / limiter strobe)
  vec3 darkCol = C_INK + C_INK2 * engrave(p, 0.25, 90.0, -0.45) * 0.6;
  // Radial tachometer dial ticks locked concentrically to the sweeping needle arc!
  float ang = atan(p.y, p.x);
  float angUnwrap = ang > 1.2 ? ang - TAU : ang; // continuous across [-PI*1.18, PI*0.18]
  float rIn = (uDialR + 12.0) / 1080.0;
  float rOut = (uDialR + 54.0) / 1080.0;
  float arcMask = smoothstep(rOut + 0.004, rOut - 0.004, r) * smoothstep(rIn - 0.004, rIn + 0.004, r)
                * step(-3.72, angUnwrap) * step(angUnwrap, 0.58);
  float tick = pxLine(abs(fract(angUnwrap / TAU * 60.0) - 0.5) / max(fwidth(angUnwrap / TAU * 60.0), 1e-4), 0.0, 1.3);
  darkCol += mix(C_GRAPHITE, C_SIGNAL * 1.6, smoothstep(-0.35, 0.5, angUnwrap)) * arcMask * tick * (0.32 + 0.55 * uHit);
  darkCol += C_SIGNAL * exp(-r * 2.4) * (0.18 * uRpm01 + 0.45 * uHit);

  // Blinding signal field for n=2 or rev-limiter strobe (kept controlled so dark ink type stays razor-sharp)
  vec3 sigField = mix(C_SIGNAL * 0.92, C_EMBER * 1.05, exp(-r * 1.8) * 0.55);
  sigField -= C_BLOOD * engrave(p, 0.18, 110.0, 0.78) * 0.22;

  float inv = clamp(uInvertField + uStrobe, 0.0, 1.0);
  vec3 col = mix(darkCol, sigField, inv);
  fragColor = vec4(col, 1.0);
}`;

const TARGET_RPMS = [11600, 13200, 14400, 15000];

export default class HookScene extends Scene {
  n = 1;
  bg = new FSPass(BG_GLSL, {
    uTime: { value: 0 },
    uHit: { value: 0 },
    uInvertField: { value: 0 },
    uStrobe: { value: 0 },
    uRpm01: { value: 0 },
    uDialR: { value: 310 },
  });
  lines = new LineBatch(9000);
  ui = new Layer2D();

  hookLine: Line | null = null;
  wLose: Word | null = null;
  wMy: Word | null = null;
  wMind: Word | null = null;
  preWords: Word[] = [];
  targetRpm = 11600;
  prevRpm = 8800;

  override init() {
    const { lyrics, params, start, end } = this.ctx;
    this.n = clamp(Number(params.n ?? 1), 1, 4);
    this.targetRpm = TARGET_RPMS[this.n - 1] ?? 15000;
    this.prevRpm = this.n === 1 ? 8800 : (TARGET_RPMS[this.n - 2] ?? 11600);

    const ls = lyrics.linesIn(start - 0.15, end + 0.05);
    this.hookLine = ls.find((l) => /lose my mind/i.test(l.text)) ?? ls[0] ?? null;
    if (this.hookLine) {
      const ws = this.hookLine.words;
      this.wLose = ws.find((w) => /^lose/i.test(w.w)) ?? null;
      this.wMy = ws.find((w) => /^my$/i.test(w.w)) ?? null;
      this.wMind = ws.find((w) => /^mind/i.test(w.w)) ?? ws[ws.length - 1] ?? null;
      const loseIdx = this.wLose ? ws.indexOf(this.wLose) : ws.length;
      this.preWords = ws.slice(0, Math.max(0, loseIdx));
    }
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const fIdx = frameIdx(t);

    const tLose = this.wLose?.start ?? lerp(this.ctx.start, this.ctx.end, 0.52);
    const tMy = this.wMy?.start ?? tLose + 0.28;
    const tMind = this.wMind?.start ?? tMy + 0.34;
    const tMindEnd = this.wMind?.end ?? this.ctx.end;

    const inSlam = t >= tLose - 0.02;
    const hitLose = pulse(t, tLose, 0.09);
    const hitMy = pulse(t, tMy, 0.09);
    const hitMind = pulse(t, tMind, 0.22);
    const hitAny = Math.max(hitLose, hitMy, hitMind);

    const mindProg = prog(t, tMind, Math.min(tMind + 0.85, tMindEnd), ease.outExpo);
    const dialR = inSlam ? lerp(310, 440, mindProg) : 290;
    const tSnap = fIdx / 60;
    const curRpm = inSlam
      ? lerp(this.prevRpm, this.targetRpm, smoothstep(tLose, tMind + 0.35, tSnap)) +
        (this.n >= 4 && tSnap >= tMind ? (fIdx % 2 === 0 ? 140 : -180) : Math.sin(tSnap * 48) * 45)
      : lerp(this.prevRpm - 1400, this.prevRpm, prog(tSnap, this.ctx.start, tLose));
    const rpm01 = clamp(curRpm / 15000, 0, 1.05);

    const limiterStrobe = this.n >= 4 && t >= tMind && t < tMind + 1.15 && Math.floor(fIdx / 2) % 2 === 1 ? 1 : 0;
    const isInverted = (this.n === 2 && inSlam) || limiterStrobe === 1;

    this.bg.u.uTime!.value = t;
    this.bg.u.uHit!.value = hitAny;
    this.bg.u.uInvertField!.value = this.n === 2 && inSlam ? 1 : 0;
    this.bg.u.uStrobe!.value = limiterStrobe;
    this.bg.u.uRpm01!.value = clamp(rpm01);
    this.bg.u.uDialR!.value = dialR;
    this.bg.render(renderer, out);

    // ---- GPU LineBatch: Tachometer needle sweep + titanium limiter sparks ----
    const lb = this.lines;
    lb.clear();
    const cx = W / 2, cy = H * 0.54;
    const needleA = lerp(-Math.PI * 1.18, Math.PI * 0.18, clamp(rpm01, 0, 1.02));
    const nx = cx + Math.cos(needleA) * dialR;
    const ny = cy + Math.sin(needleA) * dialR;

    const needleCol: [number, number, number] = isInverted
      ? [LIN.ink[0], LIN.ink[1], LIN.ink[2]]
      : [LIN.signal[0] * 2.4, LIN.signal[1] * 2.4, LIN.signal[2] * 2.4];

    // Sweeping tachometer needle + outer arc
    const arcSegs = 72;
    const maxSeg = Math.floor(arcSegs * clamp(rpm01));
    for (let i = 0; i < maxSeg; i++) {
      const a0 = lerp(-Math.PI * 1.18, Math.PI * 0.18, i / arcSegs);
      const a1 = lerp(-Math.PI * 1.18, Math.PI * 0.18, (i + 1) / arcSegs);
      const hot = i / arcSegs > 0.82;
      const cSeg: [number, number, number] = isInverted
        ? [LIN.ink[0], LIN.ink[1], LIN.ink[2]]
        : hot
          ? [LIN.signal[0] * 2.1, LIN.signal[1] * 2.1, LIN.signal[2] * 2.1]
          : [LIN.bone[0] * 0.55, LIN.bone[1] * 0.55, LIN.bone[2] * 0.55];
      lb.seg2(cx + Math.cos(a0) * dialR, cy + Math.sin(a0) * dialR, cx + Math.cos(a1) * dialR, cy + Math.sin(a1) * dialR, hot ? 4.2 : 2.2, cSeg, 0.85);
    }
    lb.seg2(cx + Math.cos(needleA) * 58, cy + Math.sin(needleA) * 58, nx, ny, 3.6, needleCol, 0.95);

    if (!isInverted) {
      sparkHead(lb, nx, ny, t, 1.1 + 0.8 * hitMind, 1.1 + 0.6 * hitAny);
      if (t >= tLose) {
        sparkParticles(
          lb,
          t,
          (tb) => {
            const r01 = clamp(lerp(this.prevRpm, this.targetRpm, smoothstep(tLose, tMind + 0.35, tb)) / 15000);
            const rr = lerp(310, 440, prog(tb, tMind, Math.min(tMind + 0.85, tMindEnd), ease.outExpo));
            const a = lerp(-Math.PI * 1.18, Math.PI * 0.18, r01);
            return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr };
          },
          { rate: this.n >= 3 ? 210 : 130, speed: 420, intensity: 1.35, seed: 40 + this.n },
        );
      }
    }
    lb.render(renderer, out);

    // ---- Canvas2D: Sequential Gear Upshifts -> Monumental LOSE / MY / MIND + Full-Frame RPM ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;
    const fg = isInverted ? 'ink' : 'bone';
    const acc = isInverted ? 'ink' : 'signal';

    // Top shift-light array + telemetry bar
    drawShiftStrip2D(c, 96, 56, W - 192, 14, rpm01, t, { ink: fg, alpha: 0.95 });

    c.font = font(F.mono(600), 14);
    c.letterSpacing = '3px';
    c.fillStyle = rgba(fg, 0.72);
    c.fillText(`ECU REDLINE STAGE 0${this.n} // SEQUENTIAL UPSHIFT`, 96, 98);
    c.textAlign = 'right';
    c.fillStyle = rpm01 >= 0.98 ? rgba(acc, 1) : rgba(fg, 0.85);
    c.fillText(
      this.n >= 4 && t >= tMind ? '▲ REV LIMITER 15,000 RPM [FUEL CUT]' : `TARGET CEILING: ${this.targetRpm.toLocaleString('en-US')} RPM`,
      W - 96,
      98,
    );
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    if (!inSlam) {
      // Pre-slam build: "Yeah / But it feeels so good, I might just" synced to GEAR 5 -> 6 -> 7 -> 8
      const activeIdx = this.preWords.reduce((accI, w, idx) => (t >= w.start ? idx : accI), 0);
      const gear = Math.min(8, 5 + Math.floor((activeIdx / Math.max(1, this.preWords.length)) * 4));

      // Giant gear indicator behind pre-hook build
      const gFam = F.archivo(125, 900);
      c.font = font(gFam, 320);
      c.fillStyle = rgba(fg, 0.09);
      c.textAlign = 'center';
      c.fillText(`G${gear}`, W / 2, H * 0.66);

      // Crisp karaoke line for the pre-slam words
      if (this.preWords.length > 0) {
        const preText = this.preWords.map((w) => w.w).join(' ');
        const fam = F.archivo(108, 800);
        const sz = Math.min(84, (W - 240) / Math.max(1, measure(preText, fam, 100) / 100));
        const totalW = measure(preText, fam, sz);
        const sx = W / 2 - totalW / 2;
        const sy = H * 0.53;
        c.font = font(fam, sz);
        c.textAlign = 'left';

        let cur = 0;
        for (const w of this.preWords) {
          const wp = Lyrics.wordProgress(w, t);
          const wx = sx + glyphX(preText, cur, fam, sz);
          const ww = measure(w.w, fam, sz);
          c.fillStyle = rgba(fg, 0.26);
          c.fillText(w.w, wx, sy);
          if (wp > 0) {
            c.save();
            c.beginPath(); c.rect(wx - 4, sy - sz, (ww + 8) * wp, sz * 1.35); c.clip();
            c.fillStyle = /feeels|feels|good|might|just/i.test(w.w) ? rgba('signal', 1) : rgba(fg, 0.98);
            c.fillText(w.w, wx, sy);
            c.restore();
          }
          cur += Array.from(w.w).length + 1;
        }
      }

      // Live pre-slam digital RPM counter
      c.font = font(F.mono(600), 34);
      c.fillStyle = rgba(fg, 0.82);
      c.textAlign = 'center';
      c.fillText(`GEAR ${gear}  ·  ${Math.round(curRpm).toLocaleString('en-US')} RPM`, W / 2, H * 0.72);
      c.textAlign = 'left';
    } else {
      // Full-frame monumental word slams: LOSE -> MY -> MIND
      const phase = t < tMy - 0.01 ? 'LOSE' : t < tMind - 0.01 ? 'MY' : 'MIND';
      const wScale = phase === 'LOSE' ? 100 : phase === 'MY' ? 62 : lerp(62, 125, ease.outExpo(clamp((t - tMind) / 0.42)));
      const fam = F.archivo(wScale, 900);
      const wordSize = phase === 'MIND' ? 248 : 272;
      const shear = phase === 'LOSE' ? -0.22 * (0.4 + 0.6 * hitLose) : 0;
      const squashY = phase === 'MY' ? lerp(0.76, 0.96, 1 - hitMy) : 1;

      // Stacked G-load ghost echoes on n >= 3
      const ghosts = this.n >= 3 ? (this.n === 4 ? 4 : 2) : 0;
      for (let g = ghosts; g >= 0; g--) {
        c.save();
        const offG = g * (14 + 18 * hitAny);
        c.translate(W / 2 + offG * (g % 2 === 0 ? 1 : -1), H * 0.50 - (phase === 'MIND' ? 38 : 0) + g * 8);
        if (shear !== 0) c.transform(1, 0, shear, 1, 0, 0);
        c.scale(1, squashY);

        const lay = layout(phase, fam, wordSize, phase === 'MIND' ? 6 : 2);
        c.font = font(fam, wordSize);
        c.textBaseline = 'middle';
        if (g > 0) {
          c.fillStyle = isInverted ? rgba('ink', 0.16) : rgba('signal', 0.26 / g);
        } else {
          c.fillStyle = isInverted ? rgba('ink', 0.98) : phase === 'MIND' && limiterStrobe ? rgba('signal', 1) : rgba('bone', 0.96);
        }
        const x0 = -lay.width / 2;
        for (const gl of lay.glyphs) c.fillText(gl.ch, x0 + gl.x, 0);
        c.restore();
      }

      // Full-screen tachometer digital readout torn loose underneath MIND
      const rpmStr = `${Math.round(curRpm).toLocaleString('en-US')} RPM`;
      c.save();
      c.font = font(F.mono(700), phase === 'MIND' ? 76 : 48);
      c.textAlign = 'center';
      c.fillStyle = isInverted ? rgba('ink', 0.92) : rpm01 >= 0.96 ? rgba('signal', 1) : rgba('bone', 0.9);
      c.fillText(rpmStr, W / 2, H * 0.78);

      c.font = font(F.mono(500), 16);
      c.letterSpacing = '4px';
      c.fillStyle = rgba(fg, 0.68);
      c.fillText(
        this.n >= 4 ? 'G-LOAD 5.9G · TRACTION ENVELOPE BREACHED · 8TH GEAR' : `GEAR 8 · MGU-K DEPLOY 100% · PEAK +${(3.8 + this.n * 0.55).toFixed(1)}G`,
        W / 2,
        H * 0.84,
      );
      c.restore();
    }

    // Bottom-right G-G circle violently breaching outer 5G ring on LOSE MY MIND
    const gMag = inSlam ? 0.95 + 0.18 * this.n + 0.25 * hitAny : 0.45 + 0.2 * f.a.bass;
    const gAng = t * (3.5 + this.n * 1.4);
    drawGGCircle2D(c, W - 156, H - 134, 58, Math.cos(gAng) * gMag, Math.sin(gAng) * gMag, { ink: fg, alpha: 0.9 });

    comp.draw(renderer, L.upload(), out);

    // Dynamic camera: monotonic forward push-in + stepped ratchet punch on gear slams (ZERO back-and-forth wobble!)
    const preProgress = clamp(prog(t, this.ctx.start, tLose, ease.inQuad));
    const stepLose = prog(t, tLose, tLose + 0.14, ease.outExpo);
    const stepMy = prog(t, tMy, tMy + 0.12, ease.outExpo);
    const stepMind = prog(t, tMind, tMind + 0.22, ease.outExpo);

    const hookZoom = 1.0
      + (0.02 * this.n)
      + 0.08 * preProgress
      + 0.12 * stepLose
      + 0.12 * stepMy
      + 0.18 * stepMind
      + (0.04 + this.n * 0.03) * mindProg;

    const shk = (8 + this.n * 4.0) * hitAny + (this.n >= 3 && inSlam ? 4.5 * f.a.bass : 1.5 * f.a.snare);
    const camLateral = inSlam ? Math.sin(t * 24.0) * (2.5 + this.n * 1.5) : 0;

    return {
      bloom: isInverted ? 0.38 : 0.68 + 0.35 * hitMind,
      ca: 1.4 + (2.5 + this.n * 1.8) * hitAny + 0.8 * (curRpm / 15000),
      zoom: hookZoom,
      flash: (this.n === 2 ? 0.28 : 0.18) * hitLose + 0.22 * hitMind,
      paper: isInverted ? 0.75 : 0,
      shake: shk > 0.1 ? [noise1(fIdx, 31) * shk + camLateral, noise1(fIdx, 47) * shk] : [camLateral, 0],
    };
  }
}
