// OVERTAKE — Verse 2 Part 2 (Doja Cat):
// Phase 1 ("Ain't finna pop... I run legions"): top-down FIA Marshall Track Radar with 20 numbered
//          transponder pucks (01..20) streaming around a technical Grand Prix circuit loop like an armada.
// Phase 2 ("over the top where no queen been / Die with no regrets, this is my season"): camera banks into
//          a 3D slipstream tow behind a blinking blood-red rain light, then pops DRS ACTIVE — triggering
//          the video's SOLE `acid` (#C8FF2E) accent ("SECTOR 2: FASTEST") as Car 01 slingshots into P1!
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, measure } from '../engine/type';
import { Lyrics, type Line } from '../engine/lyrics';
import { clamp, ease, frameIdx, lerp, noise1, pointAtLength, polylineLengths, prog, pulse, smoothstep, TAU, type V2 } from '../engine/util';
import { drawGGCircle2D, sparkHead, sparkParticles } from './_motifs';

const SLIPSTREAM_BG_GLSL = /* glsl */ `
uniform float uTime, uTowMode, uDrsAcid, uRainBlink;
void main() {
  vec2 px = FRAG_PX;
  vec2 p = (vUv - 0.5) * vec2(16.0 / 9.0, 1.0);
  vec3 col = C_INK;

  if (uTowMode < 0.99) {
    // FIA Radar table grid & concentric range rings
    float r = length(p);
    float ring = pxLine(abs(fract(r * 4.5) - 0.5) / max(fwidth(r * 4.5), 1e-4), 0.0, 1.1);
    vec2 g = abs(fract(px / 80.0 - 0.5) - 0.5) * 80.0;
    float grid = pxLine(min(g.x, g.y), 0.0, 1.0) * 0.14;
    col += C_GRAPHITE * max(ring * 0.18, grid) * (1.0 - uTowMode);
  }

  if (uTowMode > 0.01) {
    // 3D Slipstream wake & blinking blood-red FIA rain light ahead (clears on DRS slingshot!)
    vec2 leadPos = vec2(-0.22 * uDrsAcid, 0.02 - 0.12 * uDrsAcid);
    float dRain = length(p - leadPos);
    float dirtyWake = fbm(vec3(p * 4.5, uTime * 3.8), 3) * 0.5 + 0.5;
    vec3 towCol = C_INK + C_INK2 * dirtyWake * 0.55 * (1.0 - uDrsAcid * 0.6);

    // Blinking blood-red rain light in turbulent spray
    towCol += C_BLOOD * exp(-dRain * 6.5) * (0.65 + 1.1 * uRainBlink) * (1.0 - uDrsAcid * 0.5);
    towCol += C_SIGNAL * exp(-dRain * 22.0) * (1.2 + 1.8 * uRainBlink) * (1.0 - uDrsAcid * 0.4);

    // Rare ACID (#C8FF2E) DRS slingshot wash — sleek peripheral aero warp, keeping centre & HUD crisp!
    if (uDrsAcid > 0.01) {
      float edgeMask = smoothstep(0.52, 1.05, length(p));
      float streak = hatch(atan(p.y, p.x) / TAU * 64.0, 0.14) * edgeMask;
      towCol += C_ACID * streak * uDrsAcid * 0.16;
      towCol += C_ACID * exp(-abs(vUv.y - 0.50) * 14.0) * edgeMask * uDrsAcid * 0.18;
    }

    col = mix(col, towCol, uTowMode);
  }

  fragColor = vec4(col, 1.0);
}`;

export default class OvertakeScene extends Scene {
  bg = new FSPass(SLIPSTREAM_BG_GLSL, {
    uTime: { value: 0 },
    uTowMode: { value: 0 },
    uDrsAcid: { value: 0 },
    uRainBlink: { value: 0 },
  });
  lines2D = new LineBatch(7000, { screen2D: true });
  lines3D = new LineBatch(12000, { screen2D: false, worldWidth: false });
  cam = new THREE.PerspectiveCamera(64, W / H, 0.2, 220);
  ui = new Layer2D();

  circuitPts: V2[] = [];
  circuitLens!: Float32Array;
  circuitTotal = 1;
  sceneLines: Line[] = [];
  tOverTop = 0;
  tDrsPop = 0;

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.sceneLines = lyrics.linesIn(start - 0.1, end - 0.05);

    const topLine = this.sceneLines.find((l) => /over the top|queen/i.test(l.text)) ?? this.sceneLines[2];
    this.tOverTop = topLine ? topLine.start - 0.1 : lerp(start, end, 0.48);
    const topWord = topLine?.words.find((w) => /^top/i.test(w.w)) ?? topLine?.words[3];
    this.tDrsPop = topWord ? topWord.start : this.tOverTop + 0.85;

    // Build bespoke technical Grand Prix circuit loop (220 smooth samples)
    const N = 220;
    const pts: V2[] = [];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * TAU;
      const rx = 540 + 135 * Math.cos(2 * a) - 65 * Math.sin(3 * a) + 38 * Math.cos(5 * a);
      const ry = 250 + 75 * Math.sin(2 * a) + 48 * Math.cos(3 * a);
      pts.push({ x: W * 0.5 + Math.cos(a) * rx, y: H * 0.54 + Math.sin(a) * ry });
    }
    this.circuitPts = pts;
    this.circuitLens = polylineLengths(pts);
    this.circuitTotal = this.circuitLens[this.circuitLens.length - 1] ?? 1;
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const fIdx = frameIdx(t);
    const towMode = prog(t, this.tOverTop - 0.08, this.tOverTop + 0.35, ease.inOutCubic);
    // Acid DRS accent strictly bounded (~2.5s peak window around "over the top... this is my season")
    const drsOpen = smoothstep(this.tDrsPop - 0.04, this.tDrsPop + 0.18, t) * (1 - smoothstep(this.ctx.end - 0.35, this.ctx.end, t));
    const rainBlink = Math.floor(t * 8) % 2 === 0 ? 1 : 0.15;

    this.bg.u.uTime!.value = t;
    this.bg.u.uTowMode!.value = towMode;
    this.bg.u.uDrsAcid!.value = drsOpen;
    this.bg.u.uRainBlink!.value = rainBlink;
    this.bg.render(renderer, out);

    const boneCol: [number, number, number] = [LIN.bone[0] * 0.8, LIN.bone[1] * 0.8, LIN.bone[2] * 0.8];
    const graphCol: [number, number, number] = [LIN.graphite[0] * 0.7, LIN.graphite[1] * 0.7, LIN.graphite[2] * 0.7];
    const sigHot: [number, number, number] = [LIN.signal[0] * 2.2, LIN.signal[1] * 2.2, LIN.signal[2] * 2.2];
    const acidHot: [number, number, number] = [LIN.acid[0] * 1.9, LIN.acid[1] * 1.9, LIN.acid[2] * 1.9];

    // ---- Phase 1: FIA Marshall Track Radar (20 Transponder Pucks — "I run legions") ----
    const puckCoords: { id: string; x: number; y: number; lead: boolean }[] = [];
    if (towMode < 0.99) {
      const lb2 = this.lines2D;
      lb2.clear();
      const a2 = 1 - towMode;

      // Dynamic cinematic camera pan tracking Hero Car 01 across the circuit
      const baseLap = (t - this.ctx.start) * 0.16;
      const car01S = ((baseLap * 1.65 + 0.12) % 1) * this.circuitTotal;
      const heroPt = pointAtLength(this.circuitPts, this.circuitLens, car01S);
      const camX = (W * 0.5 - heroPt.x) * 0.22 * a2;
      const camY = (H * 0.54 - heroPt.y) * 0.22 * a2;
      const tf2 = (px: number, py: number) => ({ x: px + camX, y: py + camY });

      // Circuit tarmac outline & sector boundaries
      const transformedPts = this.circuitPts.map(p => tf2(p.x, p.y));
      lb2.polyline(transformedPts, 9.0, [LIN.ink2[0] * 1.4, LIN.ink2[1] * 1.4, LIN.ink2[2] * 1.4], a2 * 0.9);
      lb2.polyline(transformedPts, 2.0, boneCol, a2 * 0.72);

      // Car 01 surging forward through the 20-car pack ("legions")
      const trailSteps = 36;
      for (let k = 0; k < trailSteps; k++) {
        const s0 = (car01S - k * 12 + this.circuitTotal) % this.circuitTotal;
        const s1 = (car01S - (k + 1) * 12 + this.circuitTotal) % this.circuitTotal;
        const p0 = tf2(pointAtLength(this.circuitPts, this.circuitLens, s0).x, pointAtLength(this.circuitPts, this.circuitLens, s0).y);
        const p1 = tf2(pointAtLength(this.circuitPts, this.circuitLens, s1).x, pointAtLength(this.circuitPts, this.circuitLens, s1).y);
        if (Math.hypot(p0.x - p1.x, p0.y - p1.y) < 60) {
          lb2.seg2(p0.x, p0.y, p1.x, p1.y, 4.0, sigHot, a2 * (1 - k / trailSteps));
        }
      }

      for (let i = 0; i < 20; i++) {
        const isHero = i === 0;
        const s = isHero
          ? car01S
          : ((baseLap * (0.88 + (i % 5) * 0.03) + i / 20) % 1) * this.circuitTotal;
        const pt = tf2(pointAtLength(this.circuitPts, this.circuitLens, s).x, pointAtLength(this.circuitPts, this.circuitLens, s).y);
        puckCoords.push({ id: String(i + 1).padStart(2, '0'), x: pt.x, y: pt.y, lead: isHero });
        if (isHero) sparkHead(lb2, pt.x, pt.y, t, 1.15, a2 * 1.25);
      }

      lb2.render(renderer, out);
    }

    // ---- Phase 2: 3D Slipstream Tow & DRS Overtake Slingshot ("over the top") ----
    if (towMode > 0.01) {
      const lb3 = this.lines3D;
      lb3.clear();
      const a3 = towMode;
      const zSpeed = (t - this.tOverTop) * 88;
      // Lateral pull-out & slingshot past the rival chassis on DRS activation!
      const pullOutX = lerp(0, 3.15, ease.inOutCubic(drsOpen));
      const bankRoll = Math.sin(drsOpen * Math.PI) * -0.22 + 0.02 * Math.sin(t * 3.2);
      const camZLead = zSpeed + (drsOpen > 0.08 ? 3.2 * ease.outQuad(drsOpen) : 0);

      this.cam.position.set(pullOutX + (noise1(fIdx, 3) - 0.5) * 0.06 * drsOpen, 0.92 - 0.22 * drsOpen + 0.04 * f.a.bass, camZLead);
      this.cam.up.set(bankRoll, 1, 0);
      this.cam.lookAt(pullOutX * 0.55, 0.72, camZLead + 30);
      this.cam.updateMatrixWorld();

      const stepZ = 2.0;
      const z0 = Math.floor(zSpeed / stepZ) * stepZ;
      for (let z = z0; z < zSpeed + 130; z += stepZ) {
        const zn = z + stepZ;
        const fade = clamp(1 - (z - zSpeed) / 128) * a3;
        // Track-edge kerbs
        for (const sgn of [-1, 1]) {
          const xEdge = sgn * 6.0;
          lb3.seg(xEdge, 0, z, xEdge, 0, zn, 2.0, boneCol[0], boneCol[1], boneCol[2], 0.8 * fade);
          if (Math.abs(Math.floor(z / stepZ)) % 2 === 0) {
            const kCol = drsOpen > 0.2 ? acidHot : sigHot;
            lb3.seg(xEdge, 0.03, z, xEdge + sgn * 0.8, 0.03, z, 2.2, kCol[0], kCol[1], kCol[2], 0.7 * fade);
          }
        }
      }

      // Smooth sub-sampled slipstream wingtip vortex ribbons peeling off rival rear wing
      const rivalZ = zSpeed + lerp(11.5, -6.0, ease.inOutQuad(drsOpen));
      const wakeStep = 0.45;
      for (let dz = 0; dz < 42; dz += wakeStep) {
        const wz0 = rivalZ + dz, wz1 = wz0 + wakeStep;
        if (wz1 <= zSpeed + 0.5) continue;
        const wFade = clamp(1 - dz / 42) * clamp((wz0 - zSpeed) / 4) * a3;
        const wCol = drsOpen > 0.3 ? acidHot : sigHot;
        for (const side of [-1.08, 1.08]) {
          const r0 = 0.18 + dz * 0.028, r1 = 0.18 + (dz + wakeStep) * 0.028;
          const sgnS = Math.sign(side);
          const a0 = sgnS * (dz * 0.26 - t * 9), a1 = sgnS * ((dz + wakeStep) * 0.26 - t * 9);
          lb3.seg(
            side + Math.cos(a0) * r0, 1.12 + Math.sin(a0) * r0, wz0,
            side + Math.cos(a1) * r1, 1.12 + Math.sin(a1) * r1, wz1,
            1.5, wCol[0], wCol[1], wCol[2], 0.52 * wFade,
          );
        }
      }

      // Wireframe silhouette of rival rear wing & diffuser being overtaken!
      const rZ = zSpeed + lerp(11.5, -6.0, ease.inOutQuad(drsOpen));
      if (rZ > zSpeed + 0.6) {
        const wCol = boneCol;
        // Rear wing endplates + mainplane
        lb3.seg(-1.05, 0.35, rZ, -1.05, 1.25, rZ, 2.2, wCol[0], wCol[1], wCol[2], a3);
        lb3.seg(1.05, 0.35, rZ, 1.05, 1.25, rZ, 2.2, wCol[0], wCol[1], wCol[2], a3);
        lb3.seg(-1.05, 1.22, rZ, 1.05, 1.22, rZ, 2.6, wCol[0], wCol[1], wCol[2], a3);
        lb3.seg(-1.05, 0.96, rZ, 1.05, 0.96, rZ, 1.8, sigHot[0], sigHot[1], sigHot[2], a3);
      }

      lb3.render(renderer, out, this.cam);
    }

    // ---- Canvas2D: Puck Callouts, ACID Sector-Best DRS Banner, Karaoke ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.78);
    c.fillText(
      towMode > 0.5 ? 'ONBOARD SLIPSTREAM // DRS ZONE 02' : 'FIA MARSHALL TRANSPONDER RADAR · 20 ACTIVE UNITS [LEGIONS]',
      96,
      80,
    );
    c.textAlign = 'right';
    const spd = Math.round(lerp(308, 356, drsOpen));
    c.fillStyle = drsOpen > 0.2 ? rgba('acid', 1) : rgba('signal', 1);
    c.fillText(
      drsOpen > 0.2 ? `DRS FLAP OPEN · ${spd} KM/H [P1 OVERTAKE]` : `CAR 01 · +18 POSITIONS GAINED`,
      W - 96,
      80,
    );
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    // Draw radar transponder numbered pucks in Phase 1
    if (towMode < 0.95) {
      c.save();
      c.globalAlpha = 1 - towMode;
      c.font = font(F.mono(700), 12);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      for (const pk of puckCoords) {
        const r = pk.lead ? 16 : 11;
        c.fillStyle = pk.lead ? rgba('signal', 1) : rgba('ink2', 0.92);
        c.strokeStyle = pk.lead ? rgba('bone', 1) : rgba('bone', 0.55);
        c.lineWidth = pk.lead ? 2 : 1.2;
        c.beginPath(); c.arc(pk.x, pk.y, r, 0, TAU); c.fill(); c.stroke();
        c.fillStyle = pk.lead ? rgba('ink', 1) : rgba('bone', 0.85);
        c.fillText(pk.id, pk.x, pk.y + 0.5);
      }
      c.restore();
    }

    // Rare ACID (#C8FF2E) Sector-Best / DRS Active Stamp!
    if (drsOpen > 0.05) {
      c.save();
      c.globalAlpha = drsOpen;
      c.font = font(F.mono(700), 17);
      const banner = '▲ DRS ACTIVE // SECTOR 2: 26.804 s [FASTEST OVERALL — P1]';
      const bx = 96, by = 108, bw = Math.ceil(c.measureText(banner).width) + 34, bh = 46;
      c.fillStyle = rgba('acid', 0.96);
      c.fillRect(bx, by, bw, bh);
      c.fillStyle = rgba('ink', 1);
      c.fillText(banner, bx + 17, by + 29);
      c.restore();
    }

    // Word-synced karaoke typography (constrained clear of bottom-right G-G circle)
    const activeLine =
      this.sceneLines.find((l) => t >= l.start - 0.22 && t <= l.end + 0.18) ??
      this.sceneLines.filter((l) => l.start <= t).pop();

    if (activeLine) {
      const fam = F.archivo(drsOpen > 0.2 ? 125 : 105, 900);
      const sz = Math.min(68, (W - 360) / Math.max(1, measure(activeLine.text, fam, 100) / 100));
      const full = activeLine.words.map((w) => w.w).join(' ');
      const baseY = H - 122;

      c.save();
      c.font = font(fam, sz);
      c.textBaseline = 'alphabetic';
      let cur = 0;
      for (const w of activeLine.words) {
        const wp = Lyrics.wordProgress(w, t);
        const wx = 96 + glyphX(full, cur, fam, sz);
        const ww = measure(w.w, fam, sz);

        c.fillStyle = rgba('bone', 0.28);
        c.fillText(w.w, wx, baseY);
        if (wp > 0) {
          c.save();
          c.beginPath(); c.rect(wx - 4, baseY - sz, (ww + 8) * wp, sz * 1.38); c.clip();
          const isAcidWord = drsOpen > 0.15 && /top|queen|season|regrets/i.test(w.w);
          const isSigWord = /pop|legions|shots/i.test(w.w);
          c.fillStyle = isAcidWord ? rgba('acid', 1) : isSigWord ? rgba('signal', 1) : rgba('bone', 0.98);
          c.fillText(w.w, wx, baseY);
          c.restore();
        }
        cur += Array.from(w.w).length + 1;
      }
      c.restore();
    }

    drawGGCircle2D(c, W - 150, H - 126, 52, drsOpen > 0.2 ? 0.35 : 0.78 * Math.sin(t * 3.2), -0.88, { alpha: 0.85 });
    comp.draw(renderer, L.upload(), out);

    const drsHit = pulse(t, this.tDrsPop, 0.14);
    const shk = 12 * drsHit + 3.8 * f.a.snare + (drsOpen > 0.2 ? 3.5 * f.a.bass : 0);
    // Dynamic camera: slingshot zoom & high-speed camera compression during overtake
    const drsZoom = 1.0 + 0.26 * drsOpen + 0.18 * drsHit + (drsOpen < 0.2 ? 0.05 * Math.sin(t * 3.2) : 0);
    return {
      bloom: 0.62 + 0.38 * drsHit,
      ca: 1.3 + 4.2 * drsHit + 1.2 * drsOpen,
      zoom: drsZoom,
      flash: 0.18 * drsHit,
      shake: shk > 0.1 ? [noise1(frameIdx(t), 101) * shk, noise1(frameIdx(t), 107) * shk] : [0, 0],
    };
  }
}
