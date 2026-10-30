// OUTRO — Terminal Velocity Main Straight, Telemetry Flatline, Title Plate & Seamless Loop Reset.
//  1. 0.00..0.56: Infinite night main straight converging to vanishing point; RPM breaks past physical limits:
//                 15,000 -> 18,400 -> 24,000 (¹ pneumatic valve float exceeded) -> 1.4×10⁶ -> ∞ -> --- [TELEMETRY LOST].
//  2. 0.56..0.76: Wind-tunnel end card ("LOSE MY MIND") underlined by the cooling titanium spark.
//  3. 0.76..1.00: `post.frame` glides back in (0 -> 1) around `[ ↻ BOX / RESET LAP ]`; crosshair cursor clicks it,
//                 fast-rewinding sector plates and settling seamlessly onto frame 0 of `lights.ts`!
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, layout } from '../engine/type';
import { drawReadout } from '../engine/hud';
import { clamp, ease, frameIdx, lerp, noise1, prog, pulse, smoothstep, TAU } from '../engine/util';
import { drawGGCircle2D, drawShiftStrip2D, drawStartPods2D, sparkHead, sparkParticles } from './_motifs';

const OUTRO_BG_GLSL = /* glsl */ `
uniform float uTime, uStraight, uResetGrid, uFlashRewind;
void main() {
  vec2 px = FRAG_PX;
  vec2 uv = vUv;
  vec3 col = C_INK;

  // Carbon twill base matching lights.ts frame 0!
  float twill = engrave(uv * vec2(16.0 / 9.0, 1.0), 0.22, 160.0, 0.785);
  col = mix(col, C_INK2, twill * 0.55);

  // Terminal velocity horizon glow during Phase 1
  if (uStraight > 0.01) {
    vec2 p = (uv - 0.5) * vec2(16.0 / 9.0, 1.0);
    float dVp = length(p);
    col += C_SIGNAL * exp(-dVp * 4.2) * uStraight * 0.42;
    col += C_EMBER * exp(-dVp * 11.0) * uStraight * 0.65;
  }

  // Rewind scrub scanlines (subtle engraved horizontal sync lines)
  if (uFlashRewind > 0.01) {
    float scan = hatch(uv.y * 120.0 + uTime * 40.0, 0.22);
    col += C_SIGNAL * scan * uFlashRewind * 0.11;
  }

  // CAD 60px / 300px scrutineering grid fading in at tail to match lights.ts frame 0
  if (uResetGrid > 0.005) {
    vec2 g60 = abs(fract(px / 60.0 - 0.5) - 0.5) * 60.0;
    float line60 = pxLine(min(g60.x, g60.y), 0.0, 1.1) * 0.16 * uResetGrid;
    vec2 g300 = abs(fract(px / 300.0 - 0.5) - 0.5) * 300.0;
    float line300 = pxLine(min(g300.x, g300.y), 0.0, 1.3) * 0.28 * uResetGrid;
    col = mix(col, C_GRAPHITE, max(line60, line300));
  }

  fragColor = vec4(col, 1.0);
}`;

const REWIND_SECTORS = [
  'REWIND // S3 REDZONE · 6.4G SAFE FENCE',
  'REWIND // S3 WAVEFORM · 0.0 MM PLANK STRIKE',
  'REWIND // S2 OVERTAKE · DRS 356 KM/H',
  'REWIND // S2 DYNO · TORQUE SPEC OVERRIDE',
  'REWIND // S2 TUNNEL · VENTURI BORE',
  'REWIND // S1 APEX · BLIND CHICANE',
  'REWIND // S1 REDLINE · TRACK LIMITS',
  'RESET // BAY 01 SCRUTINEERING [00:00.000]',
];

export default class OutroScene extends Scene {
  bg = new FSPass(OUTRO_BG_GLSL, {
    uTime: { value: 0 },
    uStraight: { value: 0 },
    uResetGrid: { value: 0 },
    uFlashRewind: { value: 0 },
  });
  lines3D = new LineBatch(14000, { screen2D: false, worldWidth: false });
  lines2D = new LineBatch(6000, { screen2D: true });
  cam = new THREE.PerspectiveCamera(62, W / H, 0.2, 260);
  ui = new Layer2D();

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const p = f.p; // 0..1 across ~35 s outro

    const straightAlpha = 1 - smoothstep(0.50, 0.58, p);
    const flatlined = p >= 0.46;
    const cardAlpha = smoothstep(0.54, 0.60, p) * (1 - smoothstep(0.73, 0.78, p));
    const boxAlpha = smoothstep(0.76, 0.80, p) * (1 - smoothstep(0.852, 0.865, p));
    const clicked = p >= 0.845;
    const rewindAlpha = smoothstep(0.862, 0.872, p) * (1 - smoothstep(0.935, 0.95, p));
    const settlePark = smoothstep(0.93, 0.99, p);
    const frameBookend = smoothstep(0.75, 0.84, p);

    this.bg.u.uTime!.value = t;
    this.bg.u.uStraight!.value = straightAlpha * (flatlined ? 0.25 : 1);
    this.bg.u.uResetGrid!.value = settlePark * 0.25; // matches start of lights.ts where grid fades in from 0!
    this.bg.u.uFlashRewind!.value = rewindAlpha;
    this.bg.render(renderer, out);

    const boneCol: [number, number, number] = [LIN.bone[0] * 0.82, LIN.bone[1] * 0.82, LIN.bone[2] * 0.82];
    const sigHot: [number, number, number] = [LIN.signal[0] * 2.2, LIN.signal[1] * 2.2, LIN.signal[2] * 2.2];
    const embHot: [number, number, number] = [LIN.ember[0] * 2.3, LIN.ember[1] * 2.3, LIN.ember[2] * 2.3];

    // ---- Phase 1: Infinite Night Main Straight Converging to Vanishing Point ----
    if (straightAlpha > 0.01) {
      const lb3 = this.lines3D;
      lb3.clear();
      const zSpd = f.lt * (flatlined ? 35 : 96);
      // Dynamic camera: speed buffeting, banking weave and forward push towards singularity
      const camSway = Math.sin(t * 4.2) * (flatlined ? 0.2 : 0.85);
      const camBob = Math.cos(t * 8.4) * (flatlined ? 0.05 : 0.16) + Math.sin(p * Math.PI) * 0.2;
      this.cam.position.set(camSway, 1.15 + camBob, zSpd);
      this.cam.up.set(Math.sin(t * 4.2) * 0.05, 1, 0);
      this.cam.lookAt(camSway * 0.4, 1.05, zSpd + 50);
      this.cam.updateMatrixWorld();

      const stepZ = 2.5;
      const z0 = Math.floor(zSpd / stepZ) * stepZ;
      for (let z = z0; z < zSpd + 180; z += stepZ) {
        const zn = z + stepZ;
        const fade = clamp(1 - (z - zSpd) / 175) * straightAlpha;
        const idx = Math.abs(Math.floor(z / stepZ));
        for (const sgn of [-1, 1]) {
          const x = sgn * 5.8;
          lb3.seg(x, 0, z, x, 0, zn, 2.0, boneCol[0], boneCol[1], boneCol[2], 0.8 * fade);
          if (idx % 2 === 0) {
            lb3.seg(x, 0.03, z, x + sgn * 0.85, 0.03, z, 2.4, sigHot[0], sigHot[1], sigHot[2], 0.75 * fade);
          }
          // Overhead gantry light poles streaking past
          if (idx % 6 === 0) {
            lb3.seg(x * 1.25, 0, z, x * 1.25, 4.8, z, 1.1, boneCol[0], boneCol[1], boneCol[2], 0.35 * fade);
            lb3.seg(x * 1.25, 4.8, z, x * 0.7, 5.2, z, 1.8, embHot[0], embHot[1], embHot[2], 0.75 * fade);
          }
        }
        // Central glowing titanium racing line
        lb3.seg(0, 0.03, z, 0, 0.03, zn, 3.0, sigHot[0], sigHot[1], sigHot[2], 0.9 * fade);
      }
      lb3.render(renderer, out, this.cam);
    }

    // ---- 2D LineBatch: Lemniscate ∞ Trace, End-Card Underline & Cooling Spark ----
    const lb2 = this.lines2D;
    lb2.clear();

    if (p >= 0.34 && p < 0.48) {
      // Spark traces infinity lemniscate ∞ right before TELEMETRY LOST flatline!
      const infA = smoothstep(0.34, 0.37, p) * (1 - smoothstep(0.45, 0.48, p));
      const N = 96;
      const rx = 180, ry = 82;
      for (let i = 0; i < N; i++) {
        const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU;
        const d0 = 1 + Math.sin(a0) ** 2, d1 = 1 + Math.sin(a1) ** 2;
        const x0 = W / 2 + (rx * Math.cos(a0)) / d0, y0 = H * 0.42 + (ry * Math.sin(a0) * Math.cos(a0)) / d0;
        const x1 = W / 2 + (rx * Math.cos(a1)) / d1, y1 = H * 0.42 + (ry * Math.sin(a1) * Math.cos(a1)) / d1;
        lb2.seg2(x0, y0, x1, y1, 3.4, embHot, infA);
      }
    }

    if (cardAlpha > 0.01) {
      // Cooling spark underlining "LOSE MY MIND" title plate
      const ux = lerp(W * 0.28, W * 0.72, prog(p, 0.55, 0.72, ease.outCubic));
      lb2.seg2(W * 0.28, H * 0.56, ux, H * 0.56, 2.2, sigHot, cardAlpha);
      sparkHead(lb2, ux, H * 0.56, t, 1.0, cardAlpha);
    } else if (straightAlpha > 0.02 && !flatlined) {
      sparkParticles(lb2, t, () => ({ x: W / 2, y: H * 0.52 }), { rate: 170, speed: 540, intensity: straightAlpha, seed: 151 });
      sparkHead(lb2, W / 2, H * 0.52, t, 1.3, straightAlpha);
    } else if (settlePark > 0.05) {
      // Settle pilot spark to datum origin (W/2, H*0.62) matching lights.ts!
      sparkHead(lb2, W / 2, H * 0.62, t, 0.65 * (1 - settlePark * 0.5), 0.5 * (1 - settlePark * 0.6));
    }

    lb2.render(renderer, out);

    // ---- Canvas2D: Over-Limit RPM -> End Card -> [ ↻ BOX / RESET LAP ] -> Frame 0 Park ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    if (straightAlpha > 0.01) {
      c.save();
      c.globalAlpha = straightAlpha;
      const uLim = prog(p, 0.0, 0.46);
      let rpmText = '';
      let subNote = '';
      if (flatlined) {
        rpmText = '---';
        subNote = 'CARRIER SIGNAL LOST // TELEMETRY FLATLINE';
      } else if (uLim < 0.28) {
        rpmText = `${Math.round(lerp(15000, 18800, uLim / 0.28)).toLocaleString('en-US')} RPM`;
        subNote = 'REV LIMITER OVERRIDDEN // GEAR 8 TERMINAL STRAIGHT';
      } else if (uLim < 0.58) {
        rpmText = `${Math.round(lerp(18800, 26400, (uLim - 0.28) / 0.30)).toLocaleString('en-US')} RPM¹`;
        subNote = '¹ PNEUMATIC VALVE FLOAT EXCEEDED (ISO-FIA §5.1.4)';
      } else if (uLim < 0.82) {
        const exp = Math.floor(lerp(5, 12, (uLim - 0.58) / 0.24));
        rpmText = `1.${Math.floor((t * 9) % 9)} × 10^${exp} RPM`;
        subNote = 'SENSOR OVERFLOW // ASYMPTOTIC VELOCITY';
      } else {
        rpmText = '∞ RPM';
        subNote = 'REDLINE SINGULARITY';
      }

      c.font = font(F.mono(700), flatlined ? 110 : 84);
      c.textAlign = 'center';
      c.fillStyle = flatlined ? rgba('ash', 0.85) : rgba('signal', 1);
      c.fillText(rpmText, W / 2, H * 0.34);

      c.font = font(F.mono(500), 15);
      c.letterSpacing = '3px';
      c.fillStyle = rgba('bone', 0.78);
      c.fillText(subNote, W / 2, H * 0.40);
      c.restore();
    }

    // End Card ("LOSE MY MIND")
    if (cardAlpha > 0.01) {
      c.save();
      c.globalAlpha = cardAlpha;
      const tFam = F.archivo(125, 900);
      const lay = layout('LOSE MY MIND', tFam, 96, 8);
      c.font = font(tFam, 96);
      c.fillStyle = rgba('bone', 0.96);
      const x0 = W / 2 - lay.width / 2;
      for (const g of lay.glyphs) c.fillText(g.ch, x0 + g.x, H * 0.51);

      c.font = font(F.serif(400, true), 34);
      c.fillStyle = rgba('ash', 0.88);
      c.textAlign = 'center';
      c.fillText('Don Toliver  ·  Doja Cat', W / 2, H * 0.63);

      c.font = font(F.mono(400), 13);
      c.letterSpacing = '4px';
      c.fillStyle = rgba('graphite', 0.9);
      c.fillText('TELEMETRY PLATE SERIES // 110.0 BPM // 15,000 RPM', W / 2, H * 0.69);
      c.restore();
    }

    // [ ↻ BOX / RESET LAP ] Button + Crosshair Cursor Click
    if (boxAlpha > 0.01) {
      c.save();
      c.globalAlpha = boxAlpha;
      const bw = 380, bh = 68, bx = W / 2 - bw / 2, by = H / 2 - bh / 2;
      c.fillStyle = clicked ? rgba('signal', 0.95) : rgba('ink2', 0.95);
      c.strokeStyle = clicked ? rgba('bone', 1) : rgba('bone', 0.65);
      c.lineWidth = 1.8;
      c.fillRect(bx, by, bw, bh);
      c.strokeRect(bx, by, bw, bh);

      c.font = font(F.mono(600), 18);
      c.letterSpacing = '3px';
      c.textAlign = 'center';
      c.fillStyle = clicked ? rgba('ink', 1) : rgba('bone', 0.95);
      c.fillText('[ ↻ BOX / RESET LAP ]', W / 2, by + 40);

      // Crosshair cursor gliding from bottom-right to click button centre
      const curU = prog(p, 0.77, 0.842, ease.inOutCubic);
      const cx = lerp(W * 0.72, W * 0.5 + 24, curU);
      const cy = lerp(H * 0.78, H * 0.5 + 8, curU);
      c.strokeStyle = rgba('signal', 1);
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(cx - 14, cy); c.lineTo(cx + 14, cy);
      c.moveTo(cx, cy - 14); c.lineTo(cx, cy + 14);
      c.arc(cx, cy, clicked ? 5 : 9, 0, TAU);
      c.stroke();
      c.restore();
    }

    // Rapid Reverse Sector Scrub on Click! (quantized per frame for crisp shutter digits)
    if (rewindAlpha > 0.01) {
      c.save();
      c.globalAlpha = rewindAlpha;
      const pSnap = clamp((frameIdx(t) / 60 - this.ctx.start) / Math.max(0.1, this.ctx.end - this.ctx.start));
      const idx = Math.min(REWIND_SECTORS.length - 1, Math.floor(prog(pSnap, 0.862, 0.94) * REWIND_SECTORS.length));
      const rewTime = lerp(209.0, 0.0, prog(pSnap, 0.862, 0.94, ease.inOutQuad)).toFixed(3);
      c.font = font(F.mono(700), 46);
      c.textAlign = 'center';
      c.fillStyle = rgba('bone', 0.95);
      c.fillText(`◀◀  T - ${rewTime} s`, W / 2, H * 0.48);
      c.font = font(F.mono(500), 18);
      c.letterSpacing = '2px';
      c.fillStyle = rgba('signal', 1);
      c.fillText(REWIND_SECTORS[idx]!, W / 2, H * 0.55);
      c.restore();
    }

    // Seamless Park onto Frame 0 of `lights.ts`!
    if (settlePark > 0.01) {
      c.save();
      c.globalAlpha = settlePark;
      drawStartPods2D(c, W / 2, 240, 560, 24, 0, false, settlePark * 0.35);
      drawReadout(c, 118, H - 118, 3200 / 15000, {
        scale: 0.95,
        labelText: 'PU IDLE · MGU-K ARMED',
      });
      drawShiftStrip2D(c, W / 2 - 210, H - 132, 420, 10, 3200 / 15000, t, { alpha: 0.45 * settlePark });
      drawGGCircle2D(c, W - 180, H - 165, 68, 0, 0, { alpha: 0.45 * settlePark });
      c.restore();
    }

    comp.draw(renderer, L.upload(), out);

    const flatHit = pulse(p, 0.46, 0.025);
    const clickHit = pulse(p, 0.855, 0.02);
    const shk = (straightAlpha * (1 - (flatlined ? 1 : 0))) * (4.2 * f.a.bass + 5.5 * f.a.kick) + 16 * flatHit;

    // Dynamic camera: asymptotic punch-in approaching flatline and quick recoil on click
    const outroZoom = straightAlpha > 0.01
      ? 1.0 + (flatlined ? 0.08 : lerp(0.0, 0.14, prog(p, 0.0, 0.46, ease.inQuad)))
      : 1.0 + 0.05 * clickHit;

    return {
      frame: frameBookend,
      bloom: lerp(0.66, 0.58, settlePark) + 0.35 * clickHit + (flatlined ? 0.3 : 0),
      ca: lerp(2.2 * straightAlpha + 1.1, 1.1, settlePark) + (flatlined ? 1.5 : 0),
      flash: 0.38 * flatHit + 0.32 * clickHit,
      vignette: lerp(0.42, 0.35, settlePark),
      zoom: outroZoom,
      shake: shk > 0.1 ? [noise1(frameIdx(t), 157) * shk, noise1(frameIdx(t), 163) * shk] : [0, 0],
    };
  }
}
