// REDZONE — Final Chorus Body (Don Toliver + Doja Cat collide):
// Macro carbon-fibre twill weave + visible FIA Safe-Area / Traction Fences (`TITLE SAFE 90%`, `ACTION SAFE 93%`).
// Dual intertwined racing traces (Don = smooth spline, Doja = jagged late-braking vector) build G-load past 6.4G,
// shattering the safe-area brackets outward with ECU fault logs. On "too late, no way to take it slow",
// an infrared tyre-carcass thermal wave sweeps the frame blistering ember-hot!
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, measure } from '../engine/type';
import { Lyrics, type Line } from '../engine/lyrics';
import { clamp, ease, frameIdx, hash, lerp, noise1, prog, pulse, smoothstep } from '../engine/util';
import { drawGGCircle2D, drawShiftStrip2D, sparkHead, sparkParticles } from './_motifs';

const CARBON_IR_GLSL = /* glsl */ `
uniform float uTime, uThermal, uGLoad, uKick;
void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(16.0 / 9.0, 1.0);

  // Macro 2x2 carbon-fibre twill weave under stress
  vec2 cell = floor(FRAG_PX / 10.0);
  float checker = mod(cell.x + cell.y, 2.0);
  float angle = checker > 0.5 ? 0.785 : -0.785;
  float fiber = engrave(p, 0.35 + 0.2 * uGLoad, 95.0, angle);
  vec3 col = mix(C_INK, C_INK2 * 1.35, fiber * 0.85);

  // Stress heat bleeding through composite plies on kicks
  float plyStress = fbm(vec3(p * 3.6, uTime * 1.4), 4) * 0.5 + 0.5;
  col += C_BLOOD * pow(plyStress, 2.5) * (0.28 + 0.45 * uGLoad + 0.3 * uKick);

  // Infrared tyre-carcass thermal band sweeping across on "too late, no way to take it slow"
  if (uThermal > 0.01) {
    float band = smoothstep(uThermal * 1.35, uThermal * 1.35 - 0.45, uv.x + 0.12 * snoise(vec2(uv.y * 5.0, uTime * 2.5)));
    float temp = clamp(band * (0.58 + 0.38 * snoise(vec2(uv.x * 6.0 - uTime * 3.0, uv.y * 8.0))), 0.0, 1.0);
    vec3 ir = heat(temp) * 1.65;
    // Tyre tread shoulder ribs
    float ribs = smoothstep(0.06, 0.02, abs(fract(uv.y * 7.0) - 0.5));
    ir *= (1.0 - ribs * 0.45);
    col = mix(col, ir, band * 0.82);
  }

  fragColor = vec4(col, 1.0);
}`;

const FAULT_LOGS = [
  'ECU FAULT 0x41: TITLE SAFE BOUNDARY BREACHED',
  'TRACTION ENVELOPE > 6.1G // LATERAL OVERLOAD',
  'MGU-H THERMAL DERATE BYPASSED [MANUAL OVERRIDE]',
  'PLANK WEAR > 1.08 MM // TITANIUM SKID CONSUMED',
  'CARCASS CORE TEMP 148 °C // BLISTER THRESHOLD',
  'HYDRAULIC LINE PRESSURE SPIKE // NO WAY TO SLOW',
];

export default class RedzoneScene extends Scene {
  bg = new FSPass(CARBON_IR_GLSL, {
    uTime: { value: 0 },
    uThermal: { value: 0 },
    uGLoad: { value: 0 },
    uKick: { value: 0 },
  });
  lines = new LineBatch(10000);
  ui = new Layer2D();

  sceneLines: Line[] = [];
  tThermal = Infinity;

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.sceneLines = lyrics.linesIn(start - 0.1, end - 0.05);
    const lateLine = this.sceneLines.find((l) => /too late|take it slow/i.test(l.text));
    this.tThermal = lateLine ? lateLine.start - 0.1 : end + 10;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const fIdx = frameIdx(t);
    const gLoad = clamp(0.45 + 0.55 * f.p + 0.25 * f.a.bass, 0, 1.25);
    const thermal = prog(t, this.tThermal, this.ctx.end - 0.15, ease.inOutQuad);
    const breach = smoothstep(0.22, 0.78, f.p);

    this.bg.u.uTime!.value = t;
    this.bg.u.uThermal!.value = thermal;
    this.bg.u.uGLoad!.value = clamp(gLoad);
    this.bg.u.uKick!.value = f.a.kick;
    this.bg.render(renderer, out);

    // ---- GPU LineBatch: Dual Intertwined Telemetry Traces + Shattering Safe-Area Fences ----
    const lb = this.lines;
    lb.clear();

    const sigHot: [number, number, number] = [LIN.signal[0] * 2.3, LIN.signal[1] * 2.3, LIN.signal[2] * 2.3];
    const embHot: [number, number, number] = [LIN.ember[0] * 2.3, LIN.ember[1] * 2.3, LIN.ember[2] * 2.3];
    const boneCol: [number, number, number] = [LIN.bone[0] * 0.78, LIN.bone[1] * 0.78, LIN.bone[2] * 0.78];

    // Shattering Safe-Area Fences (90% Title Safe & 93% Action Safe) splaying outward under G-load!
    for (let fi = 0; fi < 2; fi++) {
      const baseM = fi === 0 ? 96 : 64;
      const expand = breach * (fi === 0 ? 74 : 92) + f.a.kick * 16;
      const mx = baseM - expand, my = (baseM * 0.56) - expand * 0.56;
      const fCol = breach > 0.35 ? sigHot : boneCol;
      const segs = 16;
      for (let s = 0; s < segs; s++) {
        if (breach > 0.4 && hash(s, fi + 9) < breach * 0.45) continue; // shattered segments drop out!
        const jx = breach * (hash(s, fIdx) - 0.5) * 14;
        const jy = breach * (hash(s + 30, fIdx) - 0.5) * 14;
        const u0 = s / segs, u1 = (s + 0.75) / segs;
        // Top & bottom fence rails
        lb.seg2(lerp(mx, W - mx, u0) + jx, my + jy, lerp(mx, W - mx, u1) + jx, my + jy, 1.6, fCol, 0.7);
        lb.seg2(lerp(mx, W - mx, u0) - jx, H - my - jy, lerp(mx, W - mx, u1) - jx, H - my - jy, 1.6, fCol, 0.7);
      }
    }

    // Dual intertwined racing traces: Don (liquid continuous spline) vs Doja (razor late-braking vector)
    const N = 160;
    const x0 = 40, x1 = W - 40;
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N;
      const donY = (u: number) =>
        H * 0.52 + Math.sin(u * 9.0 - t * 6.5) * (130 + 90 * f.a.vocal) + Math.cos(u * 4.5 + t * 3.2) * 55;
      const dojaY = (u: number) => {
        const q = Math.floor(u * 18) / 18;
        const saw = ((u * 18) % 1) * 2 - 1;
        return H * 0.52 - Math.sin(q * 9.0 - t * 6.5) * 145 + saw * (65 + 75 * f.a.drums);
      };

      lb.seg2(lerp(x0, x1, u0), donY(u0), lerp(x0, x1, u1), donY(u1), 3.2, embHot, 0.92);
      lb.seg2(lerp(x0, x1, u0), dojaY(u0), lerp(x0, x1, u1), dojaY(u1), 2.8, sigHot, 0.92);
    }

    // Twin colliding sparks converging toward centre for outro handoff
    const headU = clamp(0.15 + 0.75 * f.p);
    const sx = lerp(x0, x1, headU);
    const syDon = H * 0.52 + Math.sin(headU * 9.0 - t * 6.5) * (130 + 90 * f.a.vocal);
    sparkParticles(lb, t, () => ({ x: sx, y: syDon }), { rate: 190, speed: 460, intensity: 1.35, seed: 137 });
    sparkHead(lb, sx, syDon, t, 1.35, 1.35);

    lb.render(renderer, out);

    // ---- Canvas2D: Safe-Fence Warnings, ECU Fault Stack, High-Compression Duet Karaoke ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    // Dynamic Lateral G-Force camera drift and chassis roll under overload
    const gPanX = Math.sin(t * 4.2) * (16 + 28 * breach);
    const gPanY = Math.cos(t * 3.6) * (10 + 18 * breach);
    const gTilt = Math.sin(t * 3.8) * 0.022 * breach;

    c.save();
    c.translate(W / 2 + gPanX, H / 2 + gPanY);
    c.rotate(gTilt);
    c.translate(-W / 2, -H / 2);

    drawShiftStrip2D(c, 96, 42, W - 192, 12, 0.99, t, { alpha: 0.92 });

    c.font = font(F.mono(600), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('bone', 0.85);
    c.fillText('DUAL TELEMETRY OVERLAY // CH01 DON [SPLINE] × CH02 DOJA [VECTOR]', 96, 80);
    c.textAlign = 'right';
    const gVal = (4.8 + 1.8 * f.p + 0.4 * f.a.kick).toFixed(1);
    c.fillStyle = rgba('signal', 1);
    c.fillText(`PEAK LOAD: ${gVal}G [SAFE FENCE BREACHED]`, W - 96, 80);
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    // Deadpan ECU Fault Log scrolling in upper-left
    const nFaults = Math.min(FAULT_LOGS.length, 1 + Math.floor(f.p * FAULT_LOGS.length));
    c.font = font(F.mono(500), 13);
    for (let i = 0; i < nFaults; i++) {
      const isLatest = i === nFaults - 1;
      c.fillStyle = isLatest ? rgba('signal', 0.98) : rgba('bone', 0.55);
      c.fillText(`> ${FAULT_LOGS[i]}`, 96, 114 + i * 21);
    }

    // Monumental G-compressed / expanding Duet Karaoke (intentionally pushing right up to the breached fence!)
    const activeLine =
      this.sceneLines.find((l) => t >= l.start - 0.25 && t <= l.end + 0.22) ??
      this.sceneLines.filter((l) => l.start <= t).pop();

    if (activeLine) {
      const wAxis = thermal > 0.2 ? 125 : lerp(75, 112.5, f.a.kick);
      const fam = F.archivo(wAxis, 900);
      // Intentionally wider max width (W - 110) as safe-area fences shatter!
      const maxW = lerp(W - 200, W - 104, breach);
      const sz = Math.min(86, maxW / Math.max(1, measure(activeLine.text, fam, 100) / 100));
      const full = activeLine.words.map((w) => w.w).join(' ');
      const startX = lerp(96, 52, breach);
      const baseY = H - 126;

      c.save();
      c.font = font(fam, sz);
      let cur = 0;
      for (const w of activeLine.words) {
        const wp = Lyrics.wordProgress(w, t);
        const wx = startX + glyphX(full, cur, fam, sz);
        const ww = measure(w.w, fam, sz);

        c.fillStyle = rgba('bone', 0.3);
        c.fillText(w.w, wx, baseY);
        if (wp > 0) {
          c.save();
          c.beginPath(); c.rect(wx - 5, baseY - sz * 1.05, (ww + 10) * wp, sz * 1.42); c.clip();
          const hot = /wrong|right|late|slow|go/i.test(w.w);
          c.fillStyle = hot ? rgba('signal', 1) : rgba('bone', 1);
          c.fillText(w.w, wx, baseY);
          c.restore();
        }
        cur += Array.from(w.w).length + 1;
      }
      c.restore();
    }

    drawGGCircle2D(c, W - 152, H - 128, 56, Math.cos(t * 5.2) * 1.24, Math.sin(t * 4.1) * 1.18, { alpha: 0.92 });
    c.restore();
    comp.draw(renderer, L.upload(), out);

    const thHit = thermal > 0 ? pulse(t, this.tThermal, 0.16) : 0;
    const shk = 6.5 * f.a.kick + 4.5 * f.a.snare + 12 * thHit;
    // Dynamic camera: high G-force thermal zoom plunge & violent chassis pitch
    const redzoneZoom = 1.0 + 0.18 * breach + 0.08 * f.a.kick + 0.22 * thHit + 0.06 * Math.sin(t * 5.2);
    return {
      bloom: 0.68 + 0.28 * thermal,
      ca: 1.8 + 2.8 * breach + 3.0 * thHit,
      zoom: redzoneZoom,
      shake: shk > 0.1 ? [noise1(fIdx, 131) * shk, noise1(fIdx, 139) * shk] : [0, 0],
    };
  }
}
