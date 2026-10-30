// APEX — Chorus 1 body ("No question if it's wrong or right... / no way to take it slow").
// Phase A: Low-angle ground-effect camera skimming millimetres above serrated kerbs; on "wrong or right"
//          the glowing racing trace splits into symmetric left/right chicane trajectories (L 49.8% / R 50.2%).
// Phase B ("too late, no way to take it slow"): macro engineering cross-section of carbon-ceramic ventilated
//          rotor spinning at 2,500 RPM clamped by a Brembo monobloc caliper, glowing incandescent signal->ember
//          while BRAKE PRESSURE snaps to 0.0 BAR (THROTTLE STUCK 100%).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, measure } from '../engine/type';
import { Lyrics, type Line } from '../engine/lyrics';
import { Redline, drawReadout } from '../engine/hud';
import { clamp, ease, frameIdx, lerp, noise1, prog, pulse, smoothstep, TAU } from '../engine/util';
import { drawGGCircle2D, sparkHead, sparkParticles } from './_motifs';

const ROTOR_BG_GLSL = /* glsl */ `
uniform float uTime, uRotorMode, uHeat, uKick;

// 2D Box signed distance
float sdRotorBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(16.0 / 9.0, 1.0);
  vec3 col = C_INK;

  if (uRotorMode < 0.99) {
    // Ground-effect asphalt blur, rubbered-in skid grooves & horizon floodlight haze
    float road = smoothstep(0.55, 0.0, vUv.y);
    float blurLines = hatch((p.x / max(0.08, 0.56 - vUv.y)) * 4.2 + snoise(vec2(p.x * 5.0, uTime * 11.0)) * 0.35, 0.28);
    // Dark rubber skid marks in tire contact patches
    float rubberL = exp(-pow((p.x + 0.18) / 0.12, 2.0));
    float rubberR = exp(-pow((p.x - 0.18) / 0.12, 2.0));
    col = mix(col, C_INK2 * 0.8, road * blurLines * 0.85 * (1.0 - uRotorMode));
    col = mix(col, vec3(0.01, 0.01, 0.01), (rubberL + rubberR) * road * 0.65 * (1.0 - uRotorMode));

    // Horizon atmospheric glow & floodlight beam flare
    float horiz = exp(-abs(vUv.y - 0.52) * 14.0);
    col += C_SIGNAL * horiz * 0.28 * (1.0 - uRotorMode);
    col += C_EMBER * exp(-abs(vUv.y - 0.52) * 32.0) * 0.42 * (1.0 - uRotorMode);
  }

  if (uRotorMode > 0.01) {
    // Authentic F1 Carbon-Ceramic Ventilated Brake Rotor & Monobloc Caliper
    vec2 rp = p - vec2(0.06, -0.02);
    float r = length(rp);
    float a = atan(rp.y, rp.x);
    float aSpin = a + uTime * 26.0; // ~2,500 RPM visual spin

    float outerR = 0.43, innerR = 0.17;
    float discMask = smoothstep(outerR + 0.003, outerR - 0.003, r) * smoothstep(innerR - 0.003, innerR + 0.003, r);

    // Fine concentric micro-machining lathe grooves across carbon disc face
    float grooves = hatch(r * 160.0, 0.48);

    // Multi-row spiral cross-drilled cooling ventilation ducts (F1 pattern)
    float ventRings = 0.0;
    for (int k = 0; k < 4; k++) {
      float vr = innerR + 0.05 + float(k) * 0.052;
      float vPhase = aSpin * 28.0 + float(k) * 0.85;
      float dVent = length(vec2(sin(vPhase) * 0.018, r - vr));
      ventRings = max(ventRings, smoothstep(0.009, 0.005, dVent));
    }

    // Thermal friction swept band: incandescence concentrated behind caliper trailing edge (~0.45 rad)
    float padCenterAngle = 0.65;
    float angularDist = mod(padCenterAngle - a + TAU, TAU);
    // Exponential thermal decay around the circumference
    float thermSweep = exp(-angularDist * 0.85);
    float radialHeat = exp(-pow((r - 0.305) / 0.082, 2.0));
    float discHeat = radialHeat * (0.35 + 0.65 * thermSweep) * uHeat;

    vec3 discCol = mix(C_INK2, C_GRAPHITE * 0.8, grooves * 0.5);
    // Incandescent von Mises thermal heat gradient (ember -> signal white-hot)
    vec3 glowCol = mix(C_EMBER * 2.2, C_SIGNAL * 3.4, smoothstep(0.45, 0.95, discHeat));
    discCol = mix(discCol, glowCol, clamp(discHeat * 1.25, 0.0, 1.0));
    discCol *= (1.0 - ventRings * 0.92);

    // Precision Brembo Monobloc Caliper Body (upper right quadrant)
    vec2 calP = rp - vec2(0.24, 0.22);
    calP = rot2(-0.62) * calP; // rotated to hug the 45-degree rotor arc
    float dCalBody = sdRotorBox(calP, vec2(0.18, 0.095)) - 0.025;
    float calMask = smoothstep(0.004, -0.004, dCalBody);

    // Caliper cooling ribs & hydraulic piston bores
    float calRibs = hatch(calP.x * 45.0, 0.42);
    vec3 calCol = mix(C_INK2 * 1.2, C_GRAPHITE, calRibs * 0.4);
    // Pad friction contact edge glow
    float padEdge = exp(-abs(calP.y + 0.07) * 28.0) * uHeat;
    calCol += C_SIGNAL * 2.6 * padEdge;
    calCol += C_BONE * aaStroke(dCalBody, 0.003) * 0.65;

    // Center Titanium Hub Bell & floating mounting bobbins
    float dHub = r - innerR;
    float hubMask = smoothstep(0.003, -0.003, dHub);
    vec3 hubCol = C_INK2 * 0.75;
    // 10 Floating titanium drive bobbins around PCD ring
    float bobbinA = mod(aSpin, TAU / 10.0) - TAU / 20.0;
    float dBobbin = length(vec2(bobbinA * innerR, r - (innerR - 0.024))) - 0.012;
    hubCol += C_BONE * smoothstep(0.003, -0.003, dBobbin) * 0.8;
    hubCol += C_ASH * aaStroke(dBobbin, 0.002) * 0.7;
    hubCol += C_GRAPHITE * aaStroke(r - 0.07, 0.003) * 0.5;

    vec3 rotorScene = C_INK;
    rotorScene = mix(rotorScene, discCol, discMask);
    rotorScene = mix(rotorScene, hubCol, hubMask);
    rotorScene = mix(rotorScene, calCol, calMask);

    // Global rotor volumetric ambient thermal haze
    rotorScene += C_EMBER * exp(-max(0.0, r - 0.25) * 4.5) * uHeat * (0.35 + 0.2 * uKick);

    col = mix(col, rotorScene, uRotorMode);
  }

  fragColor = vec4(col, 1.0);
}
`;

export default class ApexScene extends Scene {
  bg = new FSPass(ROTOR_BG_GLSL, {
    uTime: { value: 0 },
    uRotorMode: { value: 0 },
    uHeat: { value: 0 },
    uKick: { value: 0 },
  });
  lines3D = new LineBatch(18000, { screen2D: false, worldWidth: false });
  lines2D = new LineBatch(6000, { screen2D: true });
  cam = new THREE.PerspectiveCamera(64, W / H, 0.15, 240);
  ui = new Layer2D();
  rpm!: Redline;

  sceneLines: Line[] = [];
  tSplit = 0;
  tRotor = Infinity;

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.rpm = new Redline(lyrics);
    this.sceneLines = lyrics.linesIn(start - 0.1, end - 0.05);

    const wrongLine = this.sceneLines.find((l) => /wrong or right/i.test(l.text)) ?? this.sceneLines[0];
    const wrongWord = wrongLine?.words.find((w) => /wrong/i.test(w.w)) ?? wrongLine?.words[0];
    this.tSplit = wrongWord ? wrongWord.start : start + 1.2;

    const lateLine = this.sceneLines.find((l) => /too late|take it slow/i.test(l.text));
    if (lateLine) {
      this.tRotor = lateLine.start - 0.12;
    } else {
      this.tRotor = end + 10;
    }
  }

  private chicaneCenter(z: number): number {
    return Math.sin(z * 0.055) * 5.8 + Math.sin(z * 0.023) * 3.1;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const rotorMode = prog(t, this.tRotor, this.tRotor + 0.38, ease.outExpo);
    const splitAmt = smoothstep(this.tSplit - 0.1, this.tSplit + 0.45, t);
    const rotorHeat = clamp(prog(t, this.tRotor, this.ctx.end - 0.15, ease.outQuad) * 1.2, 0, 1);

    this.bg.u.uTime!.value = t;
    this.bg.u.uRotorMode!.value = rotorMode;
    this.bg.u.uHeat!.value = rotorHeat;
    this.bg.u.uKick!.value = f.a.kick;
    this.bg.render(renderer, out);

    const boneCol: [number, number, number] = [LIN.bone[0] * 0.85, LIN.bone[1] * 0.85, LIN.bone[2] * 0.85];
    const sigHot: [number, number, number] = [LIN.signal[0] * 2.3, LIN.signal[1] * 2.3, LIN.signal[2] * 2.3];
    const embHot: [number, number, number] = [LIN.ember[0] * 2.4, LIN.ember[1] * 2.4, LIN.ember[2] * 2.4];
    const graphCol: [number, number, number] = [LIN.graphite[0] * 0.65, LIN.graphite[1] * 0.65, LIN.graphite[2] * 0.65];

    // ---- Phase A: Ground-effect Kerb Skimming + Bifurcating Chicane Racing Line ----
    if (rotorMode < 0.99) {
      const lb3 = this.lines3D;
      lb3.clear();
      const a3 = 1 - rotorMode;
      const camZ = (t - this.ctx.start) * 72;
      const cxCam = this.chicaneCenter(camZ);
      const bank = Math.cos(camZ * 0.055) * 0.24;
      // Low-angle kerb tracking camera with dynamic chicane banking and apex compression
      const apexDip = Math.sin(t * 8.4) * 0.08;
      this.cam.position.set(cxCam - 2.0 * Math.sin(t * 2.2), 0.44 + apexDip + 0.06 * f.a.bass, camZ);
      this.cam.up.set(bank * 1.35, 1, 0);
      this.cam.lookAt(this.chicaneCenter(camZ + 22), 0.38, camZ + 22);
      this.cam.updateMatrixWorld();

      const stepZ = 1.6;
      const z0 = Math.floor((camZ + 0.5) / stepZ) * stepZ;
      const halfW = 5.4;

      for (let z = z0; z < camZ + 125; z += stepZ) {
        const zn = z + stepZ;
        const c0 = this.chicaneCenter(z), c1 = this.chicaneCenter(zn);
        const fade = clamp(1 - (z - camZ) / 120) * a3;
        const idx = Math.abs(Math.floor(z / stepZ));

        // Left & right serrated FIA apex kerbs (curved bevel with 3D riser)
        for (const sgn of [-1, 1]) {
          const x0 = c0 + sgn * halfW, x1 = c1 + sgn * halfW;
          const kerbCol = idx % 2 === 0 ? sigHot : boneCol;
          lb3.seg(x0, 0, z, x1, 0, zn, 2.6, kerbCol[0], kerbCol[1], kerbCol[2], 0.92 * fade);
          lb3.seg(x0 + sgn * 1.05, 0.10, z, x1 + sgn * 1.05, 0.10, zn, 1.6, boneCol[0], boneCol[1], boneCol[2], 0.65 * fade);
          // Serrated kerb ribs
          lb3.seg(x0, 0, z, x0 + sgn * 1.05, 0.10, z, 2.0, kerbCol[0], kerbCol[1], kerbCol[2], 0.8 * fade);
        }

        // Asphalt transverse telemetry grid lines
        if (idx % 3 === 0) {
          lb3.seg(c0 - halfW, 0, z, c0 + halfW, 0, z, 0.8, graphCol[0], graphCol[1], graphCol[2], 0.25 * fade);
        }

        // Circuit Floodlight Gantries along outside edge
        if (idx % 18 === 0) {
          const fx = c0 + 9.5;
          lb3.seg(fx, 0, z, fx, 8.5, z, 1.8, boneCol[0], boneCol[1], boneCol[2], 0.6 * fade);
          lb3.seg(fx, 8.5, z, fx - 2.8, 8.2, z, 2.2, sigHot[0], sigHot[1], sigHot[2], 0.8 * fade);
        }

        // Bifurcating racing line on "wrong or right"!
        const forkDist = smoothstep(camZ + 6, camZ + 58, z) * splitAmt;
        const spread0 = forkDist * 3.2;
        const spread1 = smoothstep(camZ + 6, camZ + 58, zn) * splitAmt * 3.2;
        // Left branch ("WRONG" / late-apex) & Right branch ("RIGHT" / early-apex)
        lb3.seg(c0 - spread0, 0.04, z, c1 - spread1, 0.04, zn, 3.2, sigHot[0], sigHot[1], sigHot[2], 0.96 * fade);
        if (splitAmt > 0.02) {
          lb3.seg(c0 + spread0, 0.04, z, c1 + spread1, 0.04, zn, 3.0, embHot[0], embHot[1], embHot[2], 0.92 * splitAmt * fade);
        }
      }
      lb3.render(renderer, out, this.cam);

      // Clean ground-effect racing line heads (particles excised per user request)
      const lb2 = this.lines2D;
      lb2.clear();
      const sparkCenterX = W * 0.5;
      const sparkCenterY = H * 0.68;
      sparkHead(lb2, sparkCenterX - splitAmt * 180, sparkCenterY - 30, t, 1.2, a3);
      if (splitAmt > 0.1) sparkHead(lb2, sparkCenterX + splitAmt * 180, sparkCenterY - 30, t, 1.2, a3 * splitAmt);
      lb2.render(renderer, out);
    } else {
      // ---- Phase B: Brake Rotor Caliper Sparks ----
      const lb2 = this.lines2D;
      lb2.clear();
      const padX = W * 0.5 + 230, padY = H * 0.5 - 200;
      sparkParticles(lb2, t, () => ({ x: padX, y: padY }), {
        rate: 260,
        speed: 540,
        driftX: 380,
        gravity: 280,
        intensity: 1.45 * rotorMode,
        seed: 61,
      });
      sparkHead(lb2, padX, padY, t, 1.4, 1.35 * rotorMode);
      lb2.render(renderer, out);
    }

    // ---- Canvas2D: Split Decision Callouts / Brake Failure Telemetry + Karaoke ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.78);
    c.fillText(
      rotorMode > 0.5
        ? 'CARBON-CERAMIC DISC FL // THERMAL RUNAWAY & ACTUATOR BYPASS'
        : 'GROUND-EFFECT FLOOR CAM // BLIND CHICANE T11-T12 TELEMETRY',
      96,
      80,
    );
    c.textAlign = 'right';
    c.fillStyle = rotorMode > 0.5 ? rgba('signal', 1) : rgba('bone', 0.85);
    c.fillText(
      rotorMode > 0.5
        ? `DISC TEMP: ${Math.round(lerp(680, 1195, rotorHeat))} °C [CRITICAL]`
        : `RIDE HEIGHT: ${(3.2 - 2.4 * f.a.bass).toFixed(1)} mm`,
      W - 96,
      80,
    );
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    if (rotorMode < 0.5 && splitAmt > 0.15) {
      // Bifurcated chicane probabilities
      c.save();
      c.globalAlpha = splitAmt * (1 - rotorMode * 2);
      c.font = font(F.mono(600), 16);
      c.fillStyle = rgba('signal', 0.98);
      c.fillText('◀ LINE A [WRONG] · P = 0.498 · +4.8G', W * 0.5 - 430, H * 0.58);
      c.fillStyle = rgba('ember', 0.98);
      c.fillText('LINE B [RIGHT] · P = 0.502 · +4.9G ▶', W * 0.5 + 110, H * 0.58);
      c.restore();
    }

    if (rotorMode > 0.4) {
      // Deadpan brake failure & stuck throttle telemetry bars ("no way to take it slow")
      c.save();
      c.globalAlpha = smoothstep(0.4, 0.8, rotorMode);
      const bx = 96, by = H / 2 - 60;
      c.font = font(F.mono(600), 15);
      c.fillStyle = rgba('ash', 0.85);
      c.fillText('BRAKE HYDRAULIC PRESSURE', bx, by);
      c.fillStyle = rgba('signal', 1);
      c.fillText('0.0 BAR [BYPASS]', bx + 280, by);
      c.strokeStyle = rgba('graphite', 0.6);
      c.strokeRect(bx, by + 10, 390, 14);

      c.fillStyle = rgba('ash', 0.85);
      c.fillText('THROTTLE ACTUATOR DEMAND', bx, by + 58);
      c.fillStyle = rgba('ember', 1);
      c.fillText('100.0% [STUCK OPEN]', bx + 280, by + 58);
      c.fillStyle = rgba('signal', 0.95);
      c.fillRect(bx, by + 68, 390, 14);
      c.restore();
    }

    // Active lyric line staged cleanly across upper/lower safe zone
    const activeLine =
      this.sceneLines.find((l) => t >= l.start - 0.28 && t <= l.end + 0.22) ??
      this.sceneLines.filter((l) => l.start <= t).pop();

    if (activeLine) {
      const a = smoothstep(activeLine.start - 0.28, activeLine.start - 0.03, t) * (1 - smoothstep(activeLine.end + 0.06, activeLine.end + 0.24, t));
      if (a > 0.01) {
        const fam = F.archivo(rotorMode > 0.5 ? 112.5 : 100, 800);
        const maxW = rotorMode > 0.5 ? W - 380 : W - 220;
        const sz = Math.min(72, maxW / Math.max(1, measure(activeLine.text, fam, 100) / 100));
        const full = activeLine.words.map((w) => w.w).join(' ');
        const baseY = rotorMode > 0.5 ? H - 150 : 204;

        c.save();
        c.globalAlpha = a;
        if (rotorMode > 0.4) {
          c.shadowColor = rgba('ink', 0.95);
          c.shadowBlur = 18;
        }
        c.font = font(fam, sz);
        let cur = 0;
        for (const w of activeLine.words) {
          const wp = Lyrics.wordProgress(w, t);
          const wx = 96 + glyphX(full, cur, fam, sz);
          const ww = measure(w.w, fam, sz);
          c.fillStyle = rgba('bone', 0.34);
          c.fillText(w.w, wx, baseY);
          if (wp > 0) {
            c.save();
            c.beginPath(); c.rect(wx - 4, baseY - sz, (ww + 8) * wp, sz * 1.35); c.clip();
            const hotWord = /wrong|right|late|slow|go/i.test(w.w);
            c.fillStyle = hotWord ? (rotorMode > 0.5 ? rgba('ember', 1) : rgba('signal', 1)) : rgba('bone', 0.98);
            c.fillText(w.w, wx, baseY);
            c.restore();
          }
          cur += Array.from(w.w).length + 1;
        }
        c.restore();
      }
    }

    const tSnap = frameIdx(t) / 60;
    drawReadout(c, 96, H - 64, this.rpm.value(tSnap), { scale: 0.78, labelText: 'GEAR 7 · APEX SPEED 294 KM/H' });
    drawGGCircle2D(c, W - 150, H - 122, 54, Math.sin(t * 3.8) * 0.94, rotorMode > 0.5 ? 0.98 : 0.35, { alpha: 0.85 });

    comp.draw(renderer, L.upload(), out);

    const splitHit = pulse(t, this.tSplit, 0.1);
    const rotorHit = rotorMode > 0 ? pulse(t, this.tRotor, 0.12) : 0;
    const shk = 8 * splitHit + 13 * rotorHit + 4.0 * f.a.kick;
    // Dynamic camera: deep high-speed zoom punch on apex split and macro plunge into rotor
    const apexZoom = 1.0 + 0.14 * splitHit + 0.22 * rotorMode + 0.04 * Math.sin(t * 8.4);
    return {
      bloom: 0.62 + 0.32 * rotorMode,
      ca: 1.4 + 2.8 * splitHit + 2.2 * rotorMode,
      zoom: apexZoom,
      shake: shk > 0.1 ? [noise1(frameIdx(t), 61) * shk, noise1(frameIdx(t), 67) * shk] : [0, 0],
    };
  }
}
