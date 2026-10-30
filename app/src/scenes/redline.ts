// REDLINE — Verse 1 Part 1 (Don Toliver):
// MoTeC telemetry strip-chart & painted white track-limit line. Lyrics ride along the telemetry
// trace word-synced. On "crossed a line", the titanium spark breaches the white boundary
// ("TRACK LIMITS EXCEEDED"), plunging the camera into a 3D wireframe street-circuit canyon,
// then whipping 180° backward on "blame" to reveal twin glowing skid marks.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, measure } from '../engine/type';
import { Lyrics, type Line } from '../engine/lyrics';
import { Redline, drawReadout } from '../engine/hud';
import { clamp, ease, lerp, noise1, prog, pulse, smoothstep, frameIdx } from '../engine/util';
import { drawGGCircle2D, sparkHead, sparkParticles } from './_motifs';

const BG_GLSL = /* glsl */ `
uniform float uTime, uPlunge, uVocal;
void main() {
  vec2 px = FRAG_PX;
  vec3 col = C_INK;
  // MoTeC strip-chart horizontal channel bands (fade out as 3D canyon plunges in)
  float chartA = 1.0 - uPlunge;
  if (chartA > 0.005) {
    float row = abs(fract(px.y / 90.0) - 0.5) * 90.0;
    float colG = abs(fract((px.x + uTime * 140.0) / 120.0) - 0.5) * 120.0;
    float g = max(pxLine(row, 0.0, 1.0) * 0.16, pxLine(colG, 0.0, 1.0) * 0.11);
    col = mix(col, C_GRAPHITE, g * chartA);
  }
  // Asphalt grain & horizon glow in 3D canyon
  if (uPlunge > 0.005) {
    float horizon = exp(-abs(vUv.y - 0.52) * 7.5) * uPlunge;
    col += C_BLOOD * horizon * (0.28 + 0.2 * uVocal);
  }
  fragColor = vec4(col, 1.0);
}`;

export default class RedlineScene extends Scene {
  bg = new FSPass(BG_GLSL, { uTime: { value: 0 }, uPlunge: { value: 0 }, uVocal: { value: 0 } });
  lines2D = new LineBatch(6000, { screen2D: true });
  lines3D = new LineBatch(18000, { screen2D: false, worldWidth: false });
  cam3D = new THREE.PerspectiveCamera(58, W / H, 0.2, 260);
  ui = new Layer2D();
  rpm!: Redline;

  sceneLines: Line[] = [];
  tCross = 0;
  tBlame = 0;

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.rpm = new Redline(lyrics);
    this.sceneLines = lyrics.linesIn(start - 0.1, end - 0.05);

    const crossLine = this.sceneLines.find((l) => /crossed|line/i.test(l.text)) ?? this.sceneLines[1];
    const crossWord = crossLine?.words.find((w) => /cross|line/i.test(w.w)) ?? crossLine?.words[0];
    this.tCross = crossWord ? crossWord.start : lerp(start, end, 0.36);

    const blameLine = this.sceneLines.find((l) => /blame/i.test(l.text)) ?? this.sceneLines[this.sceneLines.length - 1];
    const blameWord = blameLine?.words.find((w) => /blame/i.test(w.w)) ?? blameLine?.words[blameLine.words.length - 1];
    this.tBlame = blameWord ? blameWord.start : lerp(start, end, 0.82);
  }

  /** MoTeC trace Y at normalized X (0..1) and song time `t`. Breaches track limit at `tCross`! */
  private traceY(u: number, t: number): number {
    const limitY = H * 0.48;
    const scroll = (t - this.ctx.start) * 0.55 + u * 2.2;
    const base = limitY + 115 + Math.sin(scroll * 3.1) * 32 + noise1(scroll * 6.5, 4) * 24;
    const breach = smoothstep(this.tCross - 0.18, this.tCross + 0.15, t) * smoothstep(0.45, 0.82, u);
    return base - breach * 210;
  }

  /** 3D circuit centreline X offset as a function of Z along the canyon. */
  private trackX(z: number): number {
    return Math.sin(z * 0.032) * 6.5 + Math.cos(z * 0.014) * 4.2;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const plunge = prog(t, this.tCross + 0.12, this.tCross + 1.05, ease.inOutCubic);
    const whip180 = prog(t, this.tBlame - 0.06, this.tBlame + 0.38, ease.outExpo);

    this.bg.u.uTime!.value = t;
    this.bg.u.uPlunge!.value = plunge;
    this.bg.u.uVocal!.value = f.a.vocal;
    this.bg.render(renderer, out);

    const boneCol: [number, number, number] = [LIN.bone[0] * 0.85, LIN.bone[1] * 0.85, LIN.bone[2] * 0.85];
    const graphCol: [number, number, number] = [LIN.graphite[0] * 0.7, LIN.graphite[1] * 0.7, LIN.graphite[2] * 0.7];
    const sigHot: [number, number, number] = [LIN.signal[0] * 2.1, LIN.signal[1] * 2.1, LIN.signal[2] * 2.1];
    const embHot: [number, number, number] = [LIN.ember[0] * 2.2, LIN.ember[1] * 2.2, LIN.ember[2] * 2.2];

    // ---- Phase A: 2D MoTeC Telemetry Strip Chart + Track Limit Boundary ----
    if (plunge < 0.995) {
      const lb2 = this.lines2D;
      lb2.clear();
      const a2 = 1 - smoothstep(0.0, 0.72, plunge);
      const yShift = plunge * 240;
      const xL = 110, xR = W - 110;
      const limitY = H * 0.48 + yShift;

      // Painted white track-limit line (double crisp bone line)
      lb2.seg2(xL, limitY, xR, limitY, 3.2, boneCol, 0.9 * a2);
      lb2.seg2(xL, limitY - 7, xR, limitY - 7, 1.1, boneCol, 0.45 * a2);

      // Red/white kerb serrations above the white track limit
      for (let k = 0; k < 28; k++) {
        const kx0 = xL + ((k * 64 - ((t * 280) % 64) + 1800) % (xR - xL));
        const kx1 = Math.min(xR, kx0 + 30);
        if (kx1 > kx0 + 4) {
          lb2.seg2(kx0, limitY - 16, kx1, limitY - 16, 6, k % 2 ? sigHot : boneCol, 0.55 * a2);
        }
      }

      // Secondary throttle / BPM grey trace
      const N = 140;
      const headU = clamp(0.18 + 0.66 * prog(t, this.ctx.start, this.tCross + 0.25));
      const maxI = Math.max(2, Math.floor(N * headU));
      for (let i = 0; i < N - 1; i++) {
        const u0 = i / N, u1 = (i + 1) / N;
        const sy0 = H * 0.72 + yShift + Math.sin(u0 * 14 + t * 4) * 28 * (0.4 + f.a.bass);
        const sy1 = H * 0.72 + yShift + Math.sin(u1 * 14 + t * 4) * 28 * (0.4 + f.a.bass);
        lb2.seg2(lerp(xL, xR, u0), sy0, lerp(xL, xR, u1), sy1, 1.2, graphCol, 0.55 * a2);
      }

      // Primary glowing racing/pulse trace + spark head
      for (let i = 0; i < maxI; i++) {
        const u0 = i / N, u1 = (i + 1) / N;
        const y0 = this.traceY(u0, t) + yShift, y1 = this.traceY(u1, t) + yShift;
        const crossed = y1 < limitY;
        lb2.seg2(lerp(xL, xR, u0), y0, lerp(xL, xR, u1), y1, crossed ? 3.4 : 2.5, crossed ? embHot : sigHot, a2);
      }
      const hx = lerp(xL, xR, headU), hy = this.traceY(headU, t) + yShift;
      sparkParticles(
        lb2,
        t,
        (tb) => {
          const hu = clamp(0.18 + 0.66 * prog(tb, this.ctx.start, this.tCross + 0.25));
          return { x: lerp(xL, xR, hu), y: this.traceY(hu, tb) + yShift };
        },
        { rate: 110, speed: 290, intensity: a2, seed: 13 },
      );
      sparkHead(lb2, hx, hy, t, 1.15, a2);
      lb2.render(renderer, out);
    }

    // ---- Phase B & C: 3D Wireframe Street-Circuit Canyon + 180° Reverse Skid Cam ----
    if (plunge > 0.01) {
      const lb3 = this.lines3D;
      lb3.clear();
      const a3 = smoothstep(0.02, 0.45, plunge);
      const speedZ = (t - this.tCross) * 52;
      const camZ = speedZ;
      // Dynamic camera tracking in 3D canyon: intense G-force sway and apex dip
      const canyonSway = Math.sin(t * 3.4) * 1.6 + Math.cos(t * 1.7) * 0.9;
      const camX = this.trackX(camZ) + canyonSway;
      const apexDip = Math.sin(t * 6.8) * 0.22;
      const camY = lerp(9.5, 1.45 + apexDip, ease.outCubic(plunge));

      // 180° whip on "blame": camera swings around to look backward at twin glowing skid marks!
      const lookYaw = whip180 * Math.PI;
      const lookDist = 22;
      const targetZ = camZ + Math.cos(lookYaw) * lookDist;
      const targetX = this.trackX(targetZ) + Math.sin(lookYaw) * 2.5;
      this.cam3D.position.set(camX, camY, camZ);
      const camRoll = Math.sin(whip180 * Math.PI) * 0.28 + (1 - whip180) * Math.sin(t * 3.4) * 0.08;
      this.cam3D.up.set(camRoll, 1, 0);
      this.cam3D.lookAt(targetX, 1.1, targetZ);
      this.cam3D.updateMatrixWorld();

      const zMin = camZ - 110, zMax = camZ + 120;
      const stepZ = 2.0;
      const z0 = Math.floor(zMin / stepZ) * stepZ;
      const halfW = 5.4;

      for (let z = z0; z < zMax; z += stepZ) {
        const zNext = z + stepZ;
        const cx0 = this.trackX(z), cx1 = this.trackX(zNext);
        const distFade = clamp(1 - Math.abs(z - camZ) / 115) * a3;
        if (distFade <= 0.01) continue;

        // Left & right track edges + catch-fence posts
        for (const sgn of [-1, 1]) {
          const x0 = cx0 + sgn * halfW, x1 = cx1 + sgn * halfW;
          lb3.seg(x0, 0, z, x1, 0, zNext, 1.8, boneCol[0], boneCol[1], boneCol[2], 0.85 * distFade);
          // Kerb teeth every alternating segment
          if (Math.abs(Math.floor(z / stepZ)) % 2 === 0) {
            lb3.seg(x0, 0.04, z, x0 + sgn * 0.65, 0.04, z, 2.4, sigHot[0], sigHot[1], sigHot[2], 0.7 * distFade);
          }
          // Street-circuit debris fence verticals & top rail
          lb3.seg(x0 + sgn * 0.8, 0, z, x0 + sgn * 0.8, 3.2, z, 1.0, graphCol[0], graphCol[1], graphCol[2], 0.42 * distFade);
          lb3.seg(x0 + sgn * 0.8, 3.2, z, x1 + sgn * 0.8, 3.2, zNext, 1.1, graphCol[0], graphCol[1], graphCol[2], 0.5 * distFade);
        }

        // Cross-asphalt elevation grid
        if (Math.abs(Math.floor(z / stepZ)) % 3 === 0) {
          lb3.seg(cx0 - halfW, 0, z, cx0 + halfW, 0, z, 0.9, graphCol[0], graphCol[1], graphCol[2], 0.3 * distFade);
        }

        // Twin incandescent skid / racing marks weaving past track limits
        const weave0 = Math.sin(z * 0.09) * 3.8, weave1 = Math.sin(zNext * 0.09) * 3.8;
        for (const wheelOff of [-0.85, 0.85]) {
          const sx0 = cx0 + weave0 + wheelOff, sx1 = cx1 + weave1 + wheelOff;
          const hot = z <= camZ + 8 ? 1.35 : 0.75;
          lb3.seg(sx0, 0.03, z, sx1, 0.03, zNext, 2.6, sigHot[0] * hot, sigHot[1] * hot, sigHot[2] * hot, 0.92 * distFade);
        }
      }
      lb3.render(renderer, out, this.cam3D);
    }

    // ---- Canvas2D Typography & FIA Track-Limits Steward Banner ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    // Header bar
    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.7);
    c.fillText(plunge > 0.5 ? 'ONBOARD TELEMETRY · SECTOR 1 CANYON' : 'MOTEC STRIP LOG · CH01 SPEED / CH02 PULSE', 96, 82);
    c.textAlign = 'right';
    c.fillStyle = t >= this.tCross ? rgba('signal', 0.95) : rgba('bone', 0.65);
    c.fillText(whip180 > 0.5 ? 'CAM: REAR WING [180°]' : t >= this.tCross ? 'STEWARD FLAG: TRACK LIMITS' : 'TRACK LIMITS: WITHIN WHITE LINE', W - 96, 82);
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    // Track-limits violation stamp on "crossed a line"
    const violA = smoothstep(this.tCross - 0.02, this.tCross + 0.06, t) * (1 - smoothstep(this.tCross + 1.6, this.tCross + 2.1, t));
    if (violA > 0.01) {
      c.save();
      c.globalAlpha = violA;
      c.font = font(F.mono(700), 17);
      const banner = '▲ FIA STEWARDS: TRACK LIMITS EXCEEDED — LAP DELETED';
      const bx = 96, by = 108, bw = Math.ceil(c.measureText(banner).width) + 34, bh = 44;
      c.fillStyle = rgba('signal', 0.95);
      c.fillRect(bx, by, bw, bh);
      c.fillStyle = rgba('ink', 1);
      c.fillText(banner, bx + 17, by + 28);
      c.restore();
    }

    // Karaoke lyric rendering — integrated cleanly with G-load width shift
    const activeLine =
      this.sceneLines.find((l) => t >= l.start - 0.32 && t <= l.end + 0.22) ??
      this.sceneLines.filter((l) => l.start <= t).pop();

    if (activeLine) {
      const appear = smoothstep(activeLine.start - 0.32, activeLine.start - 0.04, t);
      const fadeOut = 1 - smoothstep(activeLine.end + 0.05, activeLine.end + 0.25, t);
      const alpha = appear * fadeOut;
      if (alpha > 0.01) {
        const fam = F.archivo(whip180 > 0.3 ? 112.5 : plunge > 0.4 ? 87.5 : 100, 700);
        const sz = Math.min(70, (W - 330) / Math.max(1, measure(activeLine.text, fam, 100) / 100));
        const baseY = plunge > 0.5 ? H - 185 : H * 0.29;
        const startX = 96;

        c.save();
        c.globalAlpha = alpha;
        c.font = font(fam, sz);
        c.textBaseline = 'alphabetic';

        // Word-by-word kerning-preserved karaoke wipe
        let cursor = 0;
        const full = activeLine.words.map((w) => w.w).join(' ');
        for (let wi = 0; wi < activeLine.words.length; wi++) {
          const w = activeLine.words[wi]!;
          const wp = Lyrics.wordProgress(w, t);
          const wx = startX + glyphX(full, cursor, fam, sz);
          const ww = measure(w.w, fam, sz);
          const lift = wp > 0 && wp < 1 ? -6 * Math.sin(wp * Math.PI) : 0;

          // Unsung base
          c.fillStyle = rgba('bone', 0.28);
          c.fillText(w.w, wx, baseY + lift);

          // Sung highlight clip
          if (wp > 0) {
            c.save();
            c.beginPath();
            c.rect(wx - 4, baseY - sz * 1.1, (ww + 8) * wp, sz * 1.45);
            c.clip();
            const isKey = /lose|crossed|line|blame/i.test(w.w);
            c.fillStyle = isKey ? rgba('signal', 1) : rgba('bone', 0.98);
            c.fillText(w.w, wx, baseY + lift);
            c.restore();
          }
          cursor += Array.from(w.w).length + 1;
        }
        c.restore();
      }
    }

    // Diegetic telemetry instruments at bottom corners (quantized per frame for crisp shutter digits)
    const tSnap = frameIdx(t) / 60;
    const plungeSnap = prog(tSnap, this.tCross + 0.12, this.tCross + 1.05, ease.inOutCubic);
    const vRpm = clamp(this.rpm.value(tSnap) + 0.22 * plungeSnap + 0.08 * this.ctx.audio.env('vocal', tSnap), 0.25, 0.88);
    drawReadout(c, 96, H - 72, vRpm, { scale: 0.78, labelText: 'CH01 · ENGINE RPM' });
    const gx = Math.sin(t * 2.8) * (0.35 + 0.55 * plunge) + (whip180 > 0.05 && whip180 < 0.9 ? 0.65 : 0);
    const gy = (plunge * 0.45 - f.a.kick * 0.25);
    drawGGCircle2D(c, W - 150, H - 122, 54, gx, gy, { alpha: 0.82 });

    comp.draw(renderer, L.upload(), out);

    const crossHit = pulse(t, this.tCross, 0.09);
    const blameHit = pulse(t, this.tBlame, 0.1);
    const shk = 12 * crossHit + 15 * blameHit + 3.2 * f.a.snare + (plunge > 0.5 ? 2.2 * f.a.bass : 0);
    // Dynamic camera: surge zoom on breach and camera compression during 180 snap
    const redlineZoom = 1.0 + 0.16 * crossHit + 0.25 * blameHit + (plunge > 0.1 && plunge < 0.9 ? 0.08 * Math.sin(plunge * Math.PI) : 0);
    const redlineDriftX = plunge > 0.5 ? Math.sin(t * 3.4) * 8.0 : 0;
    return {
      bloom: 0.62 + 0.28 * crossHit + 0.25 * blameHit,
      ca: 1.2 + 3.8 * crossHit + 5.2 * blameHit,
      zoom: redlineZoom,
      flash: 0.18 * crossHit + 0.24 * blameHit,
      shake: [
        (shk > 0.1 ? noise1(frameIdx(t), 5) * shk : 0) + redlineDriftX,
        shk > 0.1 ? noise1(frameIdx(t), 9) * shk : 0,
      ],
    };
  }
}
