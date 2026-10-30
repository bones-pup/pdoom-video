// TUNNEL — Post-Chorus Hans Zimmer Synth Break.
// High-speed subterranean Monaco tunnel with sleek architectural vault ribs,
// overhead continuous sodium/LED neon strips casting specular road reflections,
// floor telemetry laser guide lines, and DRS detection zone arming at the exit.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, layout } from '../engine/type';
import { Redline, drawReadout } from '../engine/hud';
import { clamp, ease, frameIdx, lerp, noise1, prog, smoothstep, TAU } from '../engine/util';
import { drawShiftStrip2D, sparkHead, sparkParticles } from './_motifs';

const TUNNEL_GLSL = /* glsl */ `
uniform float uTime, uSpeedZ, uBass, uOther, uDrsArm, uBeat16;

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(16.0 / 9.0, 1.0);

  // Dynamic camera banking & curved subterranean vanishing point
  float roll = 0.065 * sin(uTime * 1.2);
  float c = cos(roll), s = sin(roll);
  p = mat2(c, -s, s, c) * p;

  vec2 vp = vec2(0.12 * sin(uTime * 0.7) + 0.04, -0.02);
  vec2 d = p - vp;

  // Parametric Monaco Tunnel Profile: Flat road floor + vaulted arched ceiling
  float rx = abs(d.x) / 1.18;
  float ry = d.y < 0.0 ? abs(d.y) / 0.44 : d.y / 0.72;
  float rad = d.y < 0.0 ? max(rx * 0.78, ry) : length(vec2(rx, ry));
  float depth = 1.0 / max(rad, 0.025);
  float zWorld = depth * 6.5 + uSpeedZ;

  // Deep carbon-composite asphalt road deck & tunnel wall
  vec3 col = C_INK;

  // Overhead continuous high-intensity LED / sodium light strip at ceiling vault
  float isCeiling = step(0.0, d.y) * smoothstep(0.18, 0.02, abs(d.x / max(rad, 0.06)));
  float lightRib = smoothstep(0.16, 0.02, abs(fract(zWorld * 0.22) - 0.5));
  float pulse16 = 0.6 + 0.4 * sin(uBeat16 * TAU);

  // Road surface specular reflection (glossy asphalt reflecting overhead neon)
  if (d.y < -0.01) {
    float floorMask = smoothstep(0.0, -0.04, d.y);
    float roadCenter = smoothstep(0.035, 0.005, abs(d.x / max(rad, 0.06)));
    float roadSides = smoothstep(0.025, 0.005, abs(rx - 0.68));

    // Reflected overhead light column on asphalt
    col += C_SIGNAL * 1.8 * roadCenter * lightRib * pulse16 * floorMask * (0.35 + 0.45 * uBass);
    col += C_BONE * 0.9 * roadSides * floorMask;
    // Asphalt micro-grain
    col += C_INK2 * (0.2 + 0.25 * fract(sin(dot(floor(uv * vec2(480.0, 270.0)), vec2(12.9898, 78.233))) * 43758.5453));
  } else {
    // Architectural tunnel arch wall shading
    float wallRib = smoothstep(0.12, 0.01, abs(fract(zWorld * 0.22) - 0.5));
    vec3 archCol = mix(C_INK, C_GRAPHITE * 0.7, wallRib * 0.65);
    col = archCol;

    // Overhead neon fixture body & bloom
    vec3 neonCol = mix(C_EMBER * 2.2, C_SIGNAL * 2.5, uDrsArm);
    col += neonCol * isCeiling * (0.7 + 0.8 * lightRib * pulse16);
  }

  // Radial speed streaks streaming from vanishing point
  float ang = atan(d.y, d.x);
  float speedStreak = pow(0.5 + 0.5 * sin(ang * 36.0 + uTime * 4.0), 12.0) * smoothstep(0.15, 0.7, rad);
  col += C_SIGNAL * speedStreak * 0.18 * (0.6 + 0.4 * uBass);

  // Atmospheric distance fog & glowing tunnel exit aperture
  float fog = exp(-depth * 0.042);
  vec3 exitGlow = mix(C_BLOOD * 0.45, C_SIGNAL * 1.6, uDrsArm * (0.55 + 0.45 * uBass));
  col = mix(exitGlow, col, fog);

  fragColor = vec4(col, 1.0);
}
`;

export default class TunnelScene extends Scene {
  bg = new FSPass(TUNNEL_GLSL, {
    uTime: { value: 0 },
    uSpeedZ: { value: 0 },
    uBass: { value: 0 },
    uOther: { value: 0 },
    uDrsArm: { value: 0 },
    uBeat16: { value: 0 },
  });
  lines3D = new LineBatch(16000, { screen2D: false, worldWidth: false });
  lines2D = new LineBatch(6000, { screen2D: true });
  cam = new THREE.PerspectiveCamera(65, W / H, 0.15, 260);
  ui = new Layer2D();
  rpm!: Redline;

  override init() {
    this.rpm = new Redline(this.ctx.lyrics);
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const speed = 72 + 28 * ease.inQuad(f.p); // Accelerating through tunnel toward exit
    const speedZ = f.lt * speed;
    const drsArm = smoothstep(0.72, 0.95, f.p);

    this.bg.u.uTime!.value = t;
    this.bg.u.uSpeedZ!.value = speedZ;
    this.bg.u.uBass!.value = f.a.bass;
    this.bg.u.uOther!.value = f.a.other;
    this.bg.u.uDrsArm!.value = drsArm;
    this.bg.u.uBeat16!.value = f.beat * 4;
    this.bg.render(renderer, out);

    // ---- 3D Architectural Tunnel Portals & Speed Lines ----
    const lb3 = this.lines3D;
    lb3.clear();

    // Camera: Dynamic banking hood-cam perspective racing down the tunnel
    const vpX = 0.12 * Math.sin(t * 0.7) + 0.04;
    const bank = Math.sin(t * 1.3) * 0.08;
    this.cam.position.set(vpX * 0.8, 0.42 + 0.05 * f.a.bass, speedZ);
    this.cam.up.set(bank, 1, 0);
    this.cam.lookAt(vpX * 6.5, 0.38, speedZ + 36);
    this.cam.updateMatrixWorld();

    const sigHot: [number, number, number] = [LIN.signal[0] * 2.2, LIN.signal[1] * 2.2, LIN.signal[2] * 2.2];
    const embHot: [number, number, number] = [LIN.ember[0] * 2.4, LIN.ember[1] * 2.4, LIN.ember[2] * 2.4];
    const boneCol: [number, number, number] = [LIN.bone[0] * 0.85, LIN.bone[1] * 0.85, LIN.bone[2] * 0.85];
    const graphDim: [number, number, number] = [LIN.graphite[0] * 0.65, LIN.graphite[1] * 0.65, LIN.graphite[2] * 0.65];

    // Longitudinal speed telemetry lines on the floor & walls
    const nLong = 8;
    for (let l = 0; l < nLong; l++) {
      const u = (l / (nLong - 1)) * 2 - 1;
      const lx = u * 5.8;
      const ly = 0.02;
      const lCol = Math.abs(u) < 0.2 ? sigHot : (l % 2 === 0 ? boneCol : graphDim);
      lb3.seg(lx, ly, speedZ + 2, lx, ly, speedZ + 140, Math.abs(u) < 0.2 ? 2.4 : 1.2, lCol[0], lCol[1], lCol[2], 0.8);
    }

    // High-precision architectural tunnel portals
    const portalSpacing = 8.0;
    const basePZ = Math.floor(speedZ / portalSpacing) * portalSpacing;
    const nPortals = 16;

    for (let p = 1; p <= nPortals; p++) {
      const pz = basePZ + p * portalSpacing;
      const dist = pz - speedZ;
      const fade = clamp(1 - dist / (nPortals * portalSpacing));
      const isGantry = p % 4 === 0;

      const pCol = isGantry ? (drsArm > 0.4 ? sigHot : embHot) : boneCol;
      const pAlpha = (isGantry ? 0.95 : 0.65) * fade;

      // Hexagonal vaulted arch geometry: floor (y=0), walls (y=0..2.8), ceiling arch (y=2.8..4.6)
      const hw = 5.6; // half width
      const wallH = 2.4;
      const crownH = 4.4;

      // Floor segment
      lb3.seg(-hw, 0, pz, hw, 0, pz, isGantry ? 2.2 : 1.0, pCol[0], pCol[1], pCol[2], pAlpha);
      // Left & right wall pillars
      lb3.seg(-hw, 0, pz, -hw, wallH, pz, isGantry ? 2.0 : 1.0, pCol[0], pCol[1], pCol[2], pAlpha);
      lb3.seg(hw, 0, pz, hw, wallH, pz, isGantry ? 2.0 : 1.0, pCol[0], pCol[1], pCol[2], pAlpha);
      // Diagonal ceiling haunches
      lb3.seg(-hw, wallH, pz, -hw * 0.45, crownH, pz, isGantry ? 2.2 : 1.2, pCol[0], pCol[1], pCol[2], pAlpha);
      lb3.seg(hw, wallH, pz, hw * 0.45, crownH, pz, isGantry ? 2.2 : 1.2, pCol[0], pCol[1], pCol[2], pAlpha);
      // Crown ceiling neon fixture
      lb3.seg(-hw * 0.45, crownH, pz, hw * 0.45, crownH, pz, isGantry ? 3.0 : 1.8, sigHot[0], sigHot[1], sigHot[2], (isGantry ? 1.0 : 0.85) * fade);

      // Floor kerb blocks (left & right)
      const kw = 0.8;
      lb3.seg(-hw, 0.12, pz, -hw + kw, 0.12, pz, 1.8, isGantry ? sigHot[0] : boneCol[0], isGantry ? sigHot[1] : boneCol[1], isGantry ? sigHot[2] : boneCol[2], pAlpha);
      lb3.seg(hw, 0.12, pz, hw - kw, 0.12, pz, 1.8, isGantry ? sigHot[0] : boneCol[0], isGantry ? sigHot[1] : boneCol[1], isGantry ? sigHot[2] : boneCol[2], pAlpha);
    }
    lb3.render(renderer, out, this.cam);

    // ---- 2D Horizon Spark & Slipstream Wake ----
    const lb2 = this.lines2D;
    lb2.clear();
    const vx = W * (0.5 + vpX * 0.52);
    const vy = H * 0.51;

    // Centered vanishing point ground-effect sparks
    sparkParticles(lb2, t, () => ({ x: vx, y: vy + 140 }), {
      rate: 160,
      speed: 560,
      driftX: 0,
      gravity: 220,
      intensity: 1.1 + 0.6 * f.a.bass,
      seed: 73,
    });
    sparkHead(lb2, vx, vy, t, 1.05 + 0.6 * drsArm, 1.1);
    lb2.render(renderer, out);

    // ---- Canvas2D: Monaco Tunnel Aero Telemetry + DRS Detection ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.78);
    c.fillText('CIRCUIT DE MONACO // SECTOR 2 SUBTERRANEAN BORE (TUNNEL)', 96, 82);
    c.textAlign = 'right';
    const gapS = lerp(1.42, 0.684, f.p).toFixed(3);
    c.fillStyle = drsArm > 0.4 ? rgba('signal', 1) : rgba('bone', 0.82);
    c.fillText(`GAP AHEAD: ${gapS} s ${drsArm > 0.4 ? '[< 1.000 s · DRS ARMED]' : '[CLOSING IN TOW]'}`, W - 96, 82);
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    // Aerodynamic Ground-Effect Venturi Suction Telemetry (Upper Left under Header)
    c.save();
    c.font = font(F.mono(500), 13);
    const curSpeed = Math.round(lerp(296, 338, f.p));
    const downforceKg = Math.round(lerp(1480, 2150, f.p));
    const aeroRows = [
      ['TUNNEL AIRSPEED', `${curSpeed} KM/H`, 'HIGH RESISTANCE'],
      ['UNDERFLOOR SUCTION', `${downforceKg} KG`, 'GROUND EFFECT 98%'],
      ['VENTURI PRESSURE', '-42.8 kPa', 'MAX DOWNFORCE'],
    ];
    aeroRows.forEach(([lbl, val, stat], i) => {
      const y = 122 + i * 24;
      c.fillStyle = rgba('graphite', 0.95);
      c.fillText(lbl!, 96, y);
      c.fillStyle = rgba('bone', 0.92);
      c.fillText(val!, 280, y);
      c.fillStyle = rgba('signal', 0.9);
      c.fillText(stat!, 400, y);
    });
    c.restore();

    // DRS Horizon Lock Bracket at Exit (Centered around vanishing point)
    if (drsArm > 0.05) {
      c.save();
      c.globalAlpha = drsArm;
      const bw = 520, bh = 105;
      const bx = vx - bw / 2, by = vy - bh / 2;

      // Outer targeting frame
      c.strokeStyle = rgba('signal', 0.95);
      c.lineWidth = 2.0;
      c.strokeRect(bx, by, bw, bh);

      // Corner brackets
      const cl = 16;
      c.lineWidth = 3.5;
      c.beginPath();
      // TL
      c.moveTo(bx - 4, by + cl); c.lineTo(bx - 4, by - 4); c.lineTo(bx + cl, by - 4);
      // TR
      c.moveTo(bx + bw + 4 - cl, by - 4); c.lineTo(bx + bw + 4, by - 4); c.lineTo(bx + bw + 4, by + cl);
      // BL
      c.moveTo(bx - 4, by + bh - cl); c.lineTo(bx - 4, by + bh + 4); c.lineTo(bx + cl, by + bh + 4);
      // BR
      c.moveTo(bx + bw + 4 - cl, by + bh + 4); c.lineTo(bx + bw + 4, by + bh + 4); c.lineTo(bx + bw + 4, by + bh - cl);
      c.stroke();

      const fam = F.archivo(115, 800);
      const txt = 'DRS DETECTION ZONE 1 · ARMED';
      const lay = layout(txt, fam, 26, 3);
      c.font = font(fam, 26);
      c.fillStyle = rgba('bone', 0.98);
      let x = vx - lay.width / 2;
      for (const g of lay.glyphs) c.fillText(g.ch, x + g.x, by + 44);

      c.font = font(F.mono(600), 14);
      c.fillStyle = rgba('signal', 1);
      c.textAlign = 'center';
      c.fillText(`SLIPSTREAM TOW +28 KM/H  ·  EXIT VELOCITY ${Math.round(318 + 26 * drsArm)} KM/H`, vx, by + 78);
      c.restore();
    }

    const vRpm = clamp(0.82 + 0.14 * f.p + 0.03 * Math.sin(t * 22), 0, 0.99);
    drawReadout(c, 96, H - 64, vRpm, { scale: 0.8, labelText: 'TUNNEL EXIT ACCELERATION · GEAR 8' });
    drawShiftStrip2D(c, W - 516, H - 82, 420, 10, vRpm, t, { alpha: 0.88 });

    comp.draw(renderer, L.upload(), out);

    const shk = 5.0 * f.a.bass + 6.5 * f.a.kick;
    // Dynamic camera: tunnel compression zoom surging as car approaches exit portal
    const tunnelZoom = 1.0 + 0.08 * f.a.kick + 0.28 * ease.inExpo(drsArm) + 0.05 * f.p;
    return {
      bloom: 0.65 + 0.35 * drsArm,
      ca: 1.4 + 2.5 * f.a.bass + 1.2 * drsArm,
      vignette: 0.44 + 0.12 * drsArm,
      zoom: tunnelZoom,
      shake: shk > 0.1 ? [noise1(frameIdx(t), 73) * shk, noise1(frameIdx(t), 79) * shk] : [0, 0],
    };
  }
}
