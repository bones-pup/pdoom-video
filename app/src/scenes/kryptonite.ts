// KRYPTONITE — Verse 1 Part 2 (Don Toliver):
// Phase 1 ("In my world, in my mind, always runnin' out of time"):
// Supersonic aerodynamic wind-tunnel CFD velocity streamlines sweeping with epic camera tracking,
// dynamic pressure isobars, and real-time sector delta matrices.
// Phase 2 ("In my love, in my heart, you're the only kryptonite"):
// Dramatic cinematic camera crash-zoom plunge into the structural fracture epicenter;
// finite-element stress mesh ruptures through carbon weave with von Mises thermal yield glow,
// and "kryptonite" is set in razor Cormorant italic at the fracture origin.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, layout, measure } from '../engine/type';
import { Lyrics, type Line } from '../engine/lyrics';
import { clamp, ease, hash, lerp, noise1, prog, pulse, smoothstep, frameIdx, TAU } from '../engine/util';
import { sparkHead, sparkParticles } from './_motifs';

const CFD_FRACTURE_GLSL = /* glsl */ `
uniform float uTime, uFracture, uKryptoHit, uBass;
uniform vec2 uCamPan;
uniform float uCamZoom, uCamRot;

// Voronoi cell edge distance for finite-element carbon stress fissures
float fissureField(vec2 p) {
  vec2 n = floor(p), f = fract(p);
  float md = 8.0;
  vec2 mr = vec2(0.0);
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) { md = d; mr = r; }
    }
  md = 8.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      vec2 r = g + o - f;
      if (dot(mr - r, mr - r) > 1e-4)
        md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
    }
  return md;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(16.0 / 9.0, 1.0);

  // Apply Camera Transform (Pan, Rotate, Zoom) to background coordinates
  p -= uCamPan;
  float c = cos(-uCamRot), s = sin(-uCamRot);
  p = mat2(c, -s, s, c) * p;
  p /= max(uCamZoom, 0.1);

  vec3 col = C_INK;

  // Carbon-composite structural weave micro-hatching across frame
  float weave = engrave(p, 0.28, 56.0, 0.52);
  col = mix(col, C_INK2, weave * 0.75);

  // Phase 1: Supersonic Wind-Tunnel CFD Velocity Streamlines & Isobars
  if (uFracture < 0.98) {
    vec2 flow = p + curl2(p * 2.2, uTime * 0.45) * 0.08;
    // Aerodynamic shear layers & Mach shockwave ripples
    float shear = snoise(vec2(flow.x * 3.8 - uTime * 3.2, flow.y * 5.2));
    float bands = hatch(flow.y * 38.0 + shear * 1.6, 0.34);
    
    // Core supersonic stream tube
    float streamCore = exp(-pow(abs(flow.y), 1.6) * 4.2) * (0.5 + 0.5 * sin(flow.x * 8.0 - uTime * 6.0));
    // Pressure isobar contours
    float isobar = abs(fract(flow.x * 5.5 + sin(flow.y * 4.0) * 0.8 - uTime * 0.9) - 0.5);
    float isobarLine = pxLine(isobar / max(fwidth(flow.x * 5.5), 1e-4), 0.0, 1.2);

    vec3 cfdCol = mix(C_GRAPHITE, C_SIGNAL * 1.8, streamCore * 0.85);
    col += cfdCol * bands * 0.36 * (1.0 - uFracture);
    col += C_SIGNAL * isobarLine * 0.16 * (1.0 - uFracture);
    col += C_EMBER * streamCore * 0.28 * (1.0 - uFracture);
  }

  // Phase 2: Finite-Element Kryptonite Stress Fractures radiating from epicentre
  if (uFracture > 0.01) {
    float dist = length(p);
    float radius = uFracture * 1.65;
    float reach = smoothstep(radius, radius - 0.28, dist);
    float fis = fissureField(p * 6.8 + curl2(p * 2.2, 1.8) * 0.32);
    float crack = pxLine(fis / max(fwidth(fis), 1e-4), 0.0, 1.8 + 2.4 * uKryptoHit) * reach;
    
    // Multi-tier thermal stress propagation (von Mises yield breach)
    float coreHeat = exp(-dist * 2.6) * (0.75 + 0.7 * uKryptoHit + 0.35 * uBass);
    vec3 crackCol = mix(C_SIGNAL * 1.8, C_EMBER * 3.2, coreHeat);
    col += crackCol * crack;
    col += C_BLOOD * exp(-dist * 3.2) * uFracture * 0.52;

    // Finite-Element stress mesh grid lines glowing under tensile load
    float feaGrid = pxLine(fract(p.x * 12.0) / max(fwidth(p.x * 12.0), 1e-4), 0.0, 1.1) +
                    pxLine(fract(p.y * 12.0) / max(fwidth(p.y * 12.0), 1e-4), 0.0, 1.1);
    col += C_SIGNAL * feaGrid * 0.09 * reach * (1.0 - uKryptoHit * 0.4);
  }

  fragColor = vec4(col, 1.0);
}
`;

export default class KryptoniteScene extends Scene {
  bg = new FSPass(CFD_FRACTURE_GLSL, {
    uTime: { value: 0 },
    uFracture: { value: 0 },
    uKryptoHit: { value: 0 },
    uBass: { value: 0 },
    uCamPan: { value: new THREE.Vector2(0, 0) },
    uCamZoom: { value: 1 },
    uCamRot: { value: 0 },
  });
  lines = new LineBatch(16000);
  ui = new Layer2D();

  sceneLines: Line[] = [];
  tLove = 0;
  tKrypto = 0;

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.sceneLines = lyrics.linesIn(start - 0.1, end - 0.05);
    const loveLine = this.sceneLines.find((l) => /love|heart|kryptonite/i.test(l.text)) ?? this.sceneLines[Math.floor(this.sceneLines.length / 2)];
    this.tLove = loveLine ? loveLine.start - 0.15 : lerp(start, end, 0.5);
    const kw = loveLine?.words.find((w) => /kryptonite/i.test(w.w)) ?? loveLine?.words[loveLine.words.length - 1];
    this.tKrypto = kw ? kw.start : lerp(start, end, 0.78);
  }

  /**
   * Draw FEA stress mesh triangles and fracture lines during Phase 2
   */
  private drawFeaStressMesh(lb: LineBatch, frac: number, kHit: number, tf: (x: number, y: number) => { x: number; y: number }) {
    if (frac <= 0.02) return;
    const cx = W / 2, cy = H / 2;
    const sigHot: [number, number, number] = [LIN.signal[0] * 2.2, LIN.signal[1] * 2.2, LIN.signal[2] * 2.2];
    const embHot: [number, number, number] = [LIN.ember[0] * 2.4, LIN.ember[1] * 2.4, LIN.ember[2] * 2.4];
    const boneCol: [number, number, number] = [LIN.bone[0] * 0.65, LIN.bone[1] * 0.65, LIN.bone[2] * 0.65];

    // Radial stress nodes radiating from centre fracture origin
    const nRings = 6;
    const nSectors = 18;
    const maxRadius = frac * 580;

    for (let r = 1; r <= nRings; r++) {
      const rad0 = ((r - 1) / nRings) * maxRadius;
      const rad1 = (r / nRings) * maxRadius;
      const alphaR = clamp(1 - (rad1 / maxRadius) * 0.55) * frac;

      for (let s = 0; s < nSectors; s++) {
        const a0 = (s / nSectors) * TAU;
        const a1 = ((s + 1) / nSectors) * TAU;
        const aMid = (a0 + a1) * 0.5;

        // Perturbed FEA nodes
        const j0 = hash(s, r * 3) * 18 * frac;
        const j1 = hash(s + 1, r * 3) * 18 * frac;

        const raw0 = { x: cx + Math.cos(a0) * (rad1 + j0), y: cy + Math.sin(a0) * (rad1 + j0) * 0.75 };
        const raw1 = { x: cx + Math.cos(a1) * (rad1 + j1), y: cy + Math.sin(a1) * (rad1 + j1) * 0.75 };
        const rawIn = { x: cx + Math.cos(aMid) * rad0, y: cy + Math.sin(aMid) * rad0 * 0.75 };

        const p0 = tf(raw0.x, raw0.y);
        const p1 = tf(raw1.x, raw1.y);
        const pIn = tf(rawIn.x, rawIn.y);

        const isHot = (s % 3 === 0) || r <= 2;
        const col = isHot ? (r === 1 ? embHot : sigHot) : boneCol;

        // Circumferential edge
        lb.seg2(p0.x, p0.y, p1.x, p1.y, isHot ? 2.0 : 1.0, col, alphaR * 0.8);
        // Radial diagonal ribs
        if (r > 1) {
          lb.seg2(pIn.x, pIn.y, p0.x, p0.y, 1.1, col, alphaR * 0.6);
          lb.seg2(pIn.x, pIn.y, p1.x, p1.y, 1.1, col, alphaR * 0.6);
        }
      }
    }

    // Sharp primary crack propagation vectors
    const nCracks = 8;
    for (let c = 0; c < nCracks; c++) {
      const baseA = (c / nCracks) * TAU + 0.18;
      let curRawX = cx, curRawY = cy;
      const crackLen = frac * 520 * (0.75 + 0.5 * hash(c, 9));
      const segs = 12;
      for (let s = 0; s < segs; s++) {
        const segDist = crackLen / segs;
        const a = baseA + (hash(c * 10 + s, 23) - 0.5) * 0.65;
        const nextRawX = curRawX + Math.cos(a) * segDist;
        const nextRawY = curRawY + Math.sin(a) * segDist * 0.75;
        const ca = (1 - s / segs) * frac;

        const p0 = tf(curRawX, curRawY);
        const p1 = tf(nextRawX, nextRawY);
        lb.seg2(p0.x, p0.y, p1.x, p1.y, 2.8 + 2.2 * kHit, embHot, ca * 0.98);
        curRawX = nextRawX;
        curRawY = nextRawY;
      }
    }
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const frac = prog(t, this.tLove, this.ctx.end - 0.15, ease.outCubic);
    const kHit = pulse(t, this.tKrypto, 0.22);
    const fIdx = frameIdx(t);

    // ---- Epic Camera Choreography ----
    // Phase 1 (start to tLove): supersonic lateral tracking pan, aerodynamic drift, and subtle yaw tilt
    // Phase 2 (tLove to end): dramatic cinematic crash-zoom plunge directly into the fracture epicenter!
    const pProg = prog(t, this.ctx.start, this.tLove, ease.inOutQuad);
    const camPanX = frac < 0.05
      ? Math.sin((t - this.ctx.start) * 0.95) * 110 + lerp(-90, 90, pProg)
      : lerp(90, 0, frac) + (kHit > 0 ? (noise1(fIdx, 12) - 0.5) * 45 * kHit : 0);
    const camPanY = frac < 0.05
      ? Math.cos((t - this.ctx.start) * 0.8) * 38 + 12 * Math.sin(t * 2.4)
      : (kHit > 0 ? (noise1(fIdx, 18) - 0.5) * 32 * kHit : 0);
    const camZoom = frac < 0.05
      ? 1.05 + 0.06 * Math.sin(t * 1.6) + 0.04 * f.a.bass
      : lerp(1.08, 1.72, ease.inOutCubic(frac)) + 0.14 * kHit;
    const camRot = frac < 0.05
      ? Math.sin((t - this.ctx.start) * 0.65) * 0.038
      : lerp(0.02, -0.05, frac) + (kHit > 0 ? (noise1(fIdx, 24) - 0.5) * 0.045 * kHit : 0);

    // Pass camera state to GPU shader
    this.bg.u.uTime!.value = t;
    this.bg.u.uFracture!.value = frac;
    this.bg.u.uKryptoHit!.value = kHit;
    this.bg.u.uBass!.value = f.a.bass;
    this.bg.u.uCamPan!.value.set(camPanX / (W * 0.5), camPanY / (H * 0.5));
    this.bg.u.uCamZoom!.value = camZoom;
    this.bg.u.uCamRot!.value = camRot;
    this.bg.render(renderer, out);

    // Coordinate transformation helper mapping local scene (x,y) through epic camera
    const tf = (x: number, y: number) => {
      const dx = x - W / 2, dy = y - H / 2;
      const cosR = Math.cos(camRot) * camZoom, sinR = Math.sin(camRot) * camZoom;
      return {
        x: W / 2 + camPanX + (dx * cosR - dy * sinR),
        y: H / 2 + camPanY + (dx * sinR + dy * cosR),
      };
    };

    // GPU CFD Streamlines (Phase 1) -> Stress Vectors (Phase 2)
    const lb = this.lines;
    lb.clear();
    const cfdAlpha = 1 - smoothstep(0.05, 0.55, frac);

    // 1. Supersonic CFD Streamlines flowing dynamically across the camera space
    if (cfdAlpha > 0.01) {
      const nStreams = 42;
      const segs = 48;
      for (let s = 0; s < nStreams; s++) {
        const yNorm = (s / (nStreams - 1)) * 2 - 1;
        const baseY = H / 2 + yNorm * 460;
        const isCore = Math.abs(yNorm) < 0.24;
        const col: [number, number, number] = isCore
          ? [LIN.signal[0] * 2.2, LIN.signal[1] * 2.2, LIN.signal[2] * 2.2]
          : [LIN.bone[0] * 0.45, LIN.bone[1] * 0.45, LIN.bone[2] * 0.45];

        for (let j = 0; j < segs; j++) {
          const u0 = j / segs, u1 = (j + 1) / segs;
          const pt = (u: number) => {
            const rawX = lerp(20, W - 20, u);
            // Aerodynamic supersonic expansion & contraction
            const dx = (rawX - W * 0.5) / 380;
            const dy = (baseY - H * 0.5) / 180;
            const r2 = dx * dx + dy * dy + 0.22;
            const deflect = (dy / r2) * 58;
            const wave = Math.sin(u * 18 - t * 9.2 + s * 0.65) * 12 * Math.abs(dy);
            return tf(rawX, baseY + deflect + wave);
          };
          const p0 = pt(u0), p1 = pt(u1);
          const packet = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(u0 * 14 - t * 8.5 + s * 0.8), 3);
          lb.seg2(p0.x, p0.y, p1.x, p1.y, isCore ? 2.2 : 1.1, col, cfdAlpha * packet * 0.88);
        }
      }

      // Supersonic Stagnation Spark
      const sRawX = lerp(160, W * 0.42, prog(t, this.ctx.start, this.tLove, ease.inOutQuad));
      const sPt = tf(sRawX, H / 2);
      sparkParticles(lb, t, (tb) => {
        const tx = lerp(160, W * 0.42, prog(tb, this.ctx.start, this.tLove, ease.inOutQuad));
        return tf(tx, H / 2);
      }, {
        rate: 90,
        speed: 280,
        driftX: 320,
        intensity: cfdAlpha * 1.1,
        seed: 19,
      });
      sparkHead(lb, sPt.x, sPt.y, t, 1.2, cfdAlpha);
    }

    // 2. Phase 2: Finite Element Stress Mesh & Fissure Cracks
    if (frac > 0.02) {
      this.drawFeaStressMesh(lb, frac, kHit, tf);
      const centrePt = tf(W / 2, H / 2);
      sparkHead(lb, centrePt.x, centrePt.y, t, 1.1 + 1.3 * kHit, 0.95 + kHit);
      if (t >= this.tKrypto && t < this.tKrypto + 0.95) {
        sparkParticles(lb, t, (tb) => (tb >= this.tKrypto ? tf(W / 2, H / 2) : null), {
          rate: 280,
          speed: 560,
          intensity: 1.6,
          seed: 31,
        });
      }
    }
    lb.render(renderer, out);

    // Canvas2D: Sector Delta Matrix + FEA Telemetry + Karaoke Typography
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    // Apply camera transform to UI layer so elements track the epic camera movement
    c.save();
    c.translate(W / 2 + camPanX, H / 2 + camPanY);
    c.rotate(camRot);
    c.scale(camZoom, camZoom);
    c.translate(-W / 2, -H / 2);

    // Sector countdown table on Phase 1 ("always runnin' out of time")
    if (cfdAlpha > 0.05) {
      c.save();
      c.globalAlpha = cfdAlpha;
      const rows = [
        ['S1 SPLIT', '28.412 s', '+0.104 s'],
        ['S2 SPLIT', '31.889 s', `+${(0.21 + f.lt * 0.08).toFixed(3)} s`],
        ['LAMINAR AIRSPEED', '334 KM/H', 'WIND TUNNEL 100%'],
        ['TIME REMAINING', `${Math.max(0, 9.99 - f.lt * 1.45).toFixed(2)} s`, 'OVERDUE'],
      ];
      c.font = font(F.mono(500), 14);
      rows.forEach(([lbl, val, dlt], i) => {
        const y = H - 175 + i * 26;
        c.fillStyle = rgba('graphite', 0.95);
        c.fillText(lbl!, 96, y);
        c.fillStyle = rgba('bone', 0.92);
        c.fillText(val!, 270, y);
        c.fillStyle = i === 3 ? rgba('signal', 1) : rgba('signal', 0.9);
        c.fillText(dlt!, 410, y);
      });
      c.restore();
    }

    // FEA Engineering callouts on Phase 2
    if (frac > 0.35) {
      c.save();
      c.globalAlpha = smoothstep(0.35, 0.7, frac);
      c.font = font(F.mono(500), 13);
      c.textAlign = 'right';
      const feaNotes = [
        'TENSILE STRAIN TENSOR: ε_xx = 0.0482',
        'TITANIUM PLANK DELAMINATION: ACTIVE',
        'STRUCTURAL RESIDUAL MARGIN: 0.00%',
        'OBSESSION COEFFICIENT: MAXIMUM',
      ];
      feaNotes.forEach((note, i) => {
        const y = H - 175 + i * 26;
        c.fillStyle = rgba('signal', 0.92);
        c.fillText(`${note} ▲`, W - 96, y);
      });
      c.textAlign = 'left';
      c.restore();
    }

    // Active lyric line
    const activeLine =
      this.sceneLines.find((l) => t >= l.start - 0.3 && t <= l.end + 0.25) ??
      this.sceneLines.filter((l) => l.start <= t).pop();

    if (activeLine) {
      const hasKrypto = /kryptonite/i.test(activeLine.text);
      const a = smoothstep(activeLine.start - 0.3, activeLine.start - 0.03, t) * (1 - smoothstep(activeLine.end + 0.08, activeLine.end + 0.28, t));

      if (a > 0.01) {
        c.save();
        c.globalAlpha = a;
        if (hasKrypto) {
          // Phase 2: Mythic center-staged presentation
          const kw = activeLine.words.find((w) => /kryptonite/i.test(w.w)) ?? activeLine.words[activeLine.words.length - 1]!;
          const preWords = activeLine.words.filter((w) => w !== kw);

          // 1. Render pre-words "IN MY LOVE, IN MY HEART, YOU'RE THE ONLY" centered at H/2 - 95
          c.font = font(F.mono(500), 18);
          c.letterSpacing = '4px';
          c.textAlign = 'center';
          const preText = preWords.map((w) => w.w).join(' ').toUpperCase();
          const preW = c.measureText(preText).width;
          const preX0 = W / 2 - preW / 2;
          
          let curPreX = preX0;
          c.textAlign = 'left';
          for (const pw of preWords) {
            const pwp = Lyrics.wordProgress(pw, t);
            const wStr = pw.w.toUpperCase() + ' ';
            const wWidth = c.measureText(wStr).width;
            c.fillStyle = rgba('bone', 0.35);
            c.fillText(wStr, curPreX, H / 2 - 95);
            if (pwp > 0) {
              c.save();
              c.beginPath();
              c.rect(curPreX - 2, H / 2 - 120, (wWidth + 4) * pwp, 34);
              c.clip();
              c.fillStyle = /love|heart/i.test(pw.w) ? rgba('signal', 1) : rgba('bone', 0.98);
              c.fillText(wStr, curPreX, H / 2 - 95);
              c.restore();
            }
            curPreX += wWidth;
          }
          c.letterSpacing = '0px';

          // 2. Render "kryptonite" in monumental Cormorant Garamond italic at fracture origin!
          const kp = Lyrics.wordProgress(kw, t);
          const kFam = F.serif(600, true);
          const kSize = 186;
          const lay = layout(kw.w, kFam, kSize, 2);
          const x0 = W / 2 - lay.width / 2;
          const y0 = H / 2 + 58;
          c.font = font(kFam, kSize);
          c.textAlign = 'left';

          for (let gi = 0; gi < lay.glyphs.length; gi++) {
            const g = lay.glyphs[gi]!;
            const lit = clamp(kp * lay.glyphs.length - gi);
            const jx = (hash(gi, 7) - 0.5) * 12 * kHit;
            const jy = (hash(gi, 13) - 0.5) * 14 * kHit;
            // Ghosted elegant bone -> searing signal red when sung!
            c.fillStyle = lit > 0.5 ? rgba('signal', 1) : rgba('bone', 0.28 + 0.72 * lit);
            c.fillText(g.ch, x0 + g.x + jx, y0 + jy);
          }
        } else {
          // Aero-stretched Archivo riding the laminar slipstream in Phase 1
          const stretchW = lerp(87.5, 125, clamp(f.lt / 3.5));
          const fam = F.archivo(stretchW, 700);
          const sz = Math.min(68, (W - 220) / Math.max(1, measure(activeLine.text, fam, 100) / 100));
          const full = activeLine.words.map((w) => w.w).join(' ');
          const baseY = 210;
          c.font = font(fam, sz);
          let idx = 0;
          for (const w of activeLine.words) {
            const wp = Lyrics.wordProgress(w, t);
            const wx = 96 + glyphX(full, idx, fam, sz);
            const ww = measure(w.w, fam, sz);
            c.fillStyle = rgba('bone', 0.28);
            c.fillText(w.w, wx, baseY);
            if (wp > 0) {
              c.save();
              c.beginPath(); c.rect(wx - 3, baseY - sz, (ww + 6) * wp, sz * 1.35); c.clip();
              c.fillStyle = /time|mind|heart/i.test(w.w) ? rgba('signal', 1) : rgba('bone', 0.96);
              c.fillText(w.w, wx, baseY);
              c.restore();
            }
            idx += Array.from(w.w).length + 1;
          }
        }
        c.restore();
      }
    }
    c.restore(); // Restore camera transform

    // Fixed Top Status Bar
    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.78);
    c.fillText(
      frac > 0.35
        ? 'FINITE-ELEMENT ANALYSIS // MONOCOQUE COMPOSITE CELL SHEAR'
        : 'WIND TUNNEL RUN 04 // 1:1 SCALE LAMINAR CFD & SECTOR DELTA',
      96,
      82,
    );
    c.textAlign = 'right';
    const delta = (0.12 + f.lt * 0.19).toFixed(3);
    c.fillStyle = frac > 0.35 ? rgba('signal', 1) : rgba('ember', 0.95);
    c.fillText(
      frac > 0.35
        ? `VON MISES STRESS: ${(1420 + frac * 1280).toFixed(0)} MPa [YIELD BREACH]`
        : `SECTOR DELTA: +${delta} s [RUNNING OUT]`,
      W - 96,
      82,
    );
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    comp.draw(renderer, L.upload(), out);

    return {
      bloom: 0.58 + 0.44 * kHit,
      ca: 1.2 + 3.8 * kHit,
      vignette: 0.38 + 0.22 * frac,
      flash: 0.2 * kHit,
      shake: kHit > 0.05 ? [noise1(fIdx, 17) * 12 * kHit, noise1(fIdx, 29) * 12 * kHit] : [0, 0],
    };
  }
}
