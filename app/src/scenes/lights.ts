// LIGHTS — FIA CAD scrutineering rig & 5-pod start gantry.
// Framed inside the bookend scrutineering crop marks (`post.frame = 1`), datum lasers calibrate
// chassis rake and idle RPM (3,200) on the opening synth pulses. Five start pods illuminate one
// by one; half a beat before Verse 1 all five snap black ("LIGHTS OUT"), the titanium spark
// ignites, and the crop-mark frame flies out past the edges.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, layout } from '../engine/type';
import { drawReadout } from '../engine/hud';
import { clamp, ease, hash, lerp, noise1, prog, pulse, smoothstep, TAU, frameIdx } from '../engine/util';
import { drawGGCircle2D, drawShiftStrip2D, drawStartPods2D, sparkHead, sparkParticles } from './_motifs';

const BG_GLSL = /* glsl */ `
uniform float uTime, uBass, uPods, uBlackout, uGridReveal;
void main() {
  vec2 px = FRAG_PX;
  vec2 uv = vUv;
  // Raw carbon-asphalt ground with subtle diagonal twill hatch in deep shadow
  vec3 col = C_INK;
  float twill = engrave(uv * vec2(16.0 / 9.0, 1.0), 0.22, 160.0, 0.785);
  col = mix(col, C_INK2, twill * 0.55);

  // Calibrated 60px CAD grid (fades in with uGridReveal)
  vec2 g60 = abs(fract(px / 60.0 - 0.5) - 0.5) * 60.0;
  float dGrid = min(g60.x, g60.y);
  float line60 = pxLine(dGrid, 0.0, 1.1) * 0.16 * uGridReveal;

  vec2 g300 = abs(fract(px / 300.0 - 0.5) - 0.5) * 300.0;
  float line300 = pxLine(min(g300.x, g300.y), 0.0, 1.3) * 0.28 * uGridReveal;
  col = mix(col, C_GRAPHITE, max(line60, line300));

  // Subtle aero pressure contours around chassis centreline (y = 0.62)
  vec2 cp = (uv - vec2(0.5, 0.62)) * vec2(1.7778, 1.0);
  float body = length(cp * vec2(0.62, 2.3)) + 0.04 * snoise(cp * 5.0 + vec2(uTime * 0.35, 0.0));
  float rings = abs(fract(body * 9.0 - uTime * 0.18) - 0.5);
  float contour = pxLine(rings / max(fwidth(body * 9.0), 1e-4), 0.0, 1.2) * smoothstep(0.75, 0.12, body);
  col += C_GRAPHITE * contour * (0.14 + 0.22 * uBass) * uGridReveal;

  // Start pods ambient spill: sinister red during staging, EXPLOSIVE GREEN on launch!
  float dPod = length((uv - vec2(0.5, 0.24)) * vec2(1.2, 2.2));
  if (uBlackout > 0.5) {
    vec3 cGreen = vec3(0.0, 1.0, 0.42);
    col += cGreen * exp(-dPod * 2.8) * (0.48 + 0.28 * uBass);
  } else {
    float podGlow = (uPods / 5.0);
    col += C_SIGNAL * podGlow * exp(-dPod * 3.6) * (0.28 + 0.12 * uBass);
  }

  fragColor = vec4(col, 1.0);
}`;

export default class LightsScene extends Scene {
  bg = new FSPass(BG_GLSL, {
    uTime: { value: 0 },
    uBass: { value: 0 },
    uPods: { value: 0 },
    uBlackout: { value: 0 },
    uGridReveal: { value: 0 },
  });
  lines = new LineBatch(8000);
  ui = new Layer2D();

  podTimes: number[] = [];
  lightsOutT = 0;

  override init() {
    const { start, end, audio } = this.ctx;
    const dur = Math.max(2.5, end - start);
    // Green light triggers 4 beats before Verse 1 downbeat (~2.18s of high-speed launch & camera zoom)
    const bEnd = audio.beatAt(end);
    this.lightsOutT = audio.timeOfBeat(Math.floor(bEnd) - 4);
    // Space the 5 red pods evenly on beats up to lightsOutT
    const pStart = start + dur * 0.38;
    const pSpan = Math.max(1.2, this.lightsOutT - pStart - 0.6);
    this.podTimes = Array.from({ length: 5 }, (_, i) =>
      audio.nearestBeat(pStart + (pSpan * i) / 4),
    );
  }

  private sparkPos(t: number): { x: number; y: number } | null {
    if (t < this.lightsOutT) return null;
    const pLaunch = clamp((t - this.lightsOutT) / Math.max(0.35, this.ctx.end - this.lightsOutT), 0, 1);
    const launchDist = (pLaunch * 0.3 + Math.pow(pLaunch, 2.2) * 0.7) * 1800;
    const cy = H * 0.62;
    const gy = cy + 90;
    const cx0 = W / 2 - 500;
    const pZoomIn = ease.outCubic(clamp((t - this.lightsOutT) / 0.75, 0, 1));
    const zoom = lerp(1.0, 2.2, pZoomIn);
    const stagedTargX = cx0 + 480 + launchDist * 0.72 + lerp(0, 50, pZoomIn);
    const stagedTargY = gy - 70;
    const ancX = W * 0.5;
    const ancY = cy + 35;
    // Flipped skid block under floor (CAR_W - 520 = 440, y=10)
    return {
      x: ancX + (cx0 + launchDist + 440 - stagedTargX) * zoom,
      y: ancY + (gy - 10 - stagedTargY) * zoom,
    };
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const dur = Math.max(0.1, this.ctx.end - this.ctx.start);
    const lt = f.lt;
    const litPods = this.podTimes.filter((pt) => t >= pt).length;
    const blackout = t >= this.lightsOutT;
    const outProg = blackout ? prog(t, this.lightsOutT, this.ctx.end, ease.inOutCubic) : 0;

    // --- TIMING & DYNAMICS ---
    // 1. Car rolls in forward from left to right, coming to a complete stop at tStop
    const CAR_W = 960;
    const rollDur = Math.min(3.6, dur * 0.32);
    const pRoll = clamp(lt / rollDur, 0, 1);
    const carDriveX = lerp(-450, 0, ease.outCubic(pRoll));

    // 2. Launch when GREEN lights ignite (t >= lightsOutT): car accelerates violently forward to right
    const pLaunch = blackout ? clamp((t - this.lightsOutT) / Math.max(0.35, this.ctx.end - this.lightsOutT), 0, 1) : 0;
    const launchDist = (pLaunch * 0.3 + Math.pow(pLaunch, 2.2) * 0.7) * 1800;
    const totalCarX = carDriveX + launchDist;

    // 3. Wheel rotation:
    //    - Rolls forward to the right (clockwise positive spin)
    //    - Completely stops (stationary) while waiting on grid
    //    - Violent burnout spin on launch
    const FRONT_X = 220, REAR_X = 820, FR = 60, RR = 60;
    const spinStop = 450 / FR;
    let spin = pRoll < 1
      ? (450 + carDriveX) / FR
      : blackout
        ? spinStop + pLaunch * 120 + Math.pow(pLaunch, 2.2) * 380
        : spinStop;

    // 4. Camera framing & zoom:
    //    - Starts extreme close-up on front spinning wheel (zoom: 7.2x) as car rolls in
    //    - Pulls back smoothly to wide view (1.0x) as car halts
    //    - "Pas ijo langsung maju sambil camera zoom in cepet": rapid zoom-in (1.0x -> 2.2x) on launch!
    const zoomEnd = rollDur;
    const zp = prog(lt, 0.3, zoomEnd, ease.inOutCubic);
    const openingZoom = lerp(7.2, 1.0, zp);
    const pZoomIn = blackout ? ease.outCubic(clamp((t - this.lightsOutT) / 0.75, 0, 1)) : 0;
    const zoom = blackout ? lerp(1.0, 2.2, pZoomIn) : openingZoom;

    const gridRev = lerp(0.35, 1, smoothstep(0.35, 1, zp));
    const hudRev = smoothstep(0.7, 1, zp);

    // Engine shudder while staged on launch control (revving engine waiting for green)
    const puShudder = (pRoll === 1 && !blackout && litPods > 0)
      ? Math.sin(frameIdx(t) * 0.9) * (litPods / 5) * (0.9 + 0.6 * f.a.low)
      : 0;

    // 1. Background shader
    this.bg.u.uTime!.value = t;
    this.bg.u.uBass!.value = f.a.bass;
    this.bg.u.uPods!.value = litPods;
    this.bg.u.uBlackout!.value = blackout ? 1 : 0;
    this.bg.u.uGridReveal!.value = gridRev;
    this.bg.render(renderer, out);

    // 2. GPU LineBatch: chassis datum lines, wind-tunnel laser crosshairs, titanium launch spark
    const lb = this.lines;
    lb.clear();

    const cy = H * 0.62;
    const boneDim: [number, number, number] = [LIN.bone[0] * 0.35, LIN.bone[1] * 0.35, LIN.bone[2] * 0.35];
    const bone75: [number, number, number] = [LIN.bone[0] * 0.8, LIN.bone[1] * 0.8, LIN.bone[2] * 0.8];
    const sigHot: [number, number, number] = [LIN.signal[0] * 2.1, LIN.signal[1] * 2.1, LIN.signal[2] * 2.1];

    const gy = cy + 90;
    const cx0 = W / 2 - 500;

    // Camera targets tracking car movement:
    // In Phase 1: locked to front wheel as it rolls in, smoothly pulling back to wide shot
    // In Phase 2: centered on staged car
    // In Phase 3: zooms in fast on car as it launches forward
    // In Phase 1: locked to front wheel (on the right: CAR_W - FRONT_X), pulling back to center
    // In Phase 2: centered on staged car (480)
    // In Phase 3: zooms in fast on car as it launches forward to the right
    const stagedTargX = cx0 + (blackout ? 480 + launchDist * 0.72 + lerp(0, 50, pZoomIn) : lerp(carDriveX + (CAR_W - FRONT_X), 480, zp));
    const stagedTargY = gy - (blackout ? 70 : lerp(FR, 70, zp));
    const ancX = W * 0.5;
    const ancY = blackout ? cy + 35 : lerp(H * 0.52, cy + 35, zp);

    // Horizontal flip mapping: x maps to (CAR_W - x) so car faces RIGHT
    const X = (x: number, y: number) => ({
      x: ancX + (cx0 + totalCarX + (CAR_W - x) - stagedTargX) * zoom,
      y: ancY + (gy - y + puShudder - stagedTargY) * zoom,
    });
    const lw = (w: number) => w * Math.min(2.6, Math.sqrt(zoom));
    const build = smoothstep(0.08, 0.95, zp);

    const P = (pts: [number, number][], smooth = false) => {
      if (!smooth) return pts.map(([x, y]) => X(x, y));
      const out: [number, number][] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(pts.length - 1, i + 2)]!;
        for (let k = 0; k < 12; k++) {
          const u = k / 12, u2 = u * u, u3 = u2 * u;
          const c = (j: 0 | 1) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
          out.push([c(0), c(1)]);
        }
      }
      out.push(pts[pts.length - 1]!);
      return out.map(([x, y]) => X(x, y));
    };
    const reveal = (pts: { x: number; y: number }[], u: number) => {
      const n = (pts.length - 1) * u;
      const k = Math.floor(n);
      const out = pts.slice(0, k + 1);
      if (k < pts.length - 1) {
        const q = n - k;
        out.push({ x: lerp(pts[k]!.x, pts[k + 1]!.x, q), y: lerp(pts[k]!.y, pts[k + 1]!.y, q) });
      }
      return out;
    };

    // Ground datum (stationary race track surface)
    const gWorldX0 = ancX + (cx0 - 1500 - stagedTargX) * zoom;
    const gWorldX1 = ancX + (cx0 + 3500 - stagedTargX) * zoom;
    const gWorldY = ancY + (gy - stagedTargY) * zoom;
    lb.seg2(gWorldX0, gWorldY, gWorldX1, gWorldY, lw(1.2), boneDim, 0.75);

    // Track grid slot marker ticks
    for (let gx = -1400; gx <= 3200; gx += 200) {
      const gtx = ancX + (cx0 + gx - stagedTargX) * zoom;
      lb.seg2(gtx, gWorldY, gtx, gWorldY + 8 * zoom, lw(1.0), boneDim, 0.55);
    }

    // Body line-work: [points, width, colour, alpha, reveal-start, reveal-end, smooth]
    // Authentic, high-precision Formula 1 technical telemetry CAD silhouette
    type Part = [[number, number][], number, [number, number, number], number, number, number, boolean];
    const parts: Part[] = [
      // === 1. NOSECONE & CHASSIS MONOCOQUE ===
      // Upper nose droop to chassis bulkhead (sleek muscular shoulder)
      [[[35, 26], [75, 36], [145, 58], [220, 78], [340, 88], [420, 90]], 2.0, bone75, 0.95, 0.0, 0.5, true],
      // Lower nose keel / under-nose airflow channel
      [[[45, 22], [120, 28], [220, 42], [330, 44]], 1.5, boneDim, 0.85, 0.05, 0.5, true],
      // Nose tip impact cap
      [[[35, 26], [28, 22], [35, 18], [48, 20]], 1.6, bone75, 0.9, 0.0, 0.3, false],
      // S-duct / Vanity panel shutline
      [[[260, 72], [310, 80]], 1.0, boneDim, 0.7, 0.2, 0.5, false],

      // === 2. COCKPIT, DRIVER HELMET & HALO ===
      // Cockpit rim / monocoque opening
      [[[415, 90], [430, 88], [540, 88], [555, 98]], 1.6, bone75, 0.9, 0.2, 0.6, false],
      // Driver helmet profile (aerodynamic helmet with rear spoiler)
      [[[468, 92], [466, 106], [476, 116], [496, 116], [506, 106], [506, 92]], 1.4, bone75, 0.9, 0.25, 0.65, true],
      // Helmet visor slit (driver focus line in signal red)
      [[[468, 104], [482, 104]], 2.2, sigHot, 1.0, 0.3, 0.65, false],
      // HALO safety titanium central pillar
      [[[430, 88], [466, 120]], 2.4, bone75, 0.95, 0.3, 0.7, false],
      // HALO hoop wrapping driver head
      [[[466, 120], [505, 122], [538, 112], [550, 98]], 2.0, [LIN.signal[0] * 1.3, LIN.signal[1] * 1.3, LIN.signal[2] * 1.3], 0.9, 0.35, 0.75, true],
      // Halo aerodynamic fairing flap
      [[[502, 123], [522, 124]], 1.1, boneDim, 0.75, 0.4, 0.75, false],

      // === 3. AIRBOX SCOOP & SHARK FIN ===
      // Roll hoop airbox intake cowl
      [[[548, 98], [555, 150], [576, 150], [585, 126]], 1.8, bone75, 0.95, 0.35, 0.8, false],
      // Airbox intake aperture (triangular intake opening)
      [[[556, 118], [558, 142], [572, 142], [570, 118], [556, 118]], 1.2, boneDim, 0.8, 0.4, 0.8, false],
      // FIA T-cam onboard camera pod
      [[[562, 156], [574, 156]], 2.2, sigHot, 0.95, 0.45, 0.8, false],
      [[[568, 150], [568, 156]], 1.2, bone75, 0.9, 0.45, 0.8, false],
      // Engine cover dorsal ridge / Shark Fin (terminating cleanly ahead of rear wheel)
      [[[576, 150], [680, 142], [760, 124]], 1.8, bone75, 0.95, 0.45, 0.85, false],
      // Shark Fin rear vertical drop
      [[[760, 124], [760, 68]], 1.6, bone75, 0.9, 0.5, 0.85, false],
      // Engine cowl downwash taper over power unit & gearbox
      [[[585, 126], [660, 104], [730, 72], [780, 52], [840, 48]], 1.6, bone75, 0.9, 0.45, 0.85, true],

      // === 4. SIDEPODS (GROUND EFFECT DOWNWASH & UNDERCUT) ===
      // Sidepod forward air intake lip & aggressive undercut channel
      [[[415, 78], [425, 56], [450, 30], [520, 24]], 1.6, boneDim, 0.85, 0.25, 0.7, true],
      // Sidepod shoulder downwash ramp (sweeping down to coke-bottle waist)
      [[[425, 78], [510, 78], [610, 66], [710, 44], [780, 28]], 1.8, bone75, 0.95, 0.3, 0.8, true],
      // Sidepod lower waistline
      [[[450, 30], [560, 26], [680, 22], [760, 20]], 1.2, boneDim, 0.75, 0.35, 0.8, true],
      // Sidepod cooling louvres / heat extraction gills
      [[[580, 64], [600, 62]], 1.0, boneDim, 0.7, 0.5, 0.8, false],
      [[[608, 60], [628, 58]], 1.0, boneDim, 0.7, 0.52, 0.82, false],
      [[[636, 54], [656, 52]], 1.0, boneDim, 0.7, 0.54, 0.84, false],
      [[[664, 48], [684, 46]], 1.0, boneDim, 0.7, 0.56, 0.86, false],

      // === 5. FLOOR, VENTURI STRAKES & REAR DIFFUSER ===
      // Reference plane / Skid plank (straight chassis bottom)
      [[[260, 10], [780, 10]], 1.6, boneDim, 0.9, 0.1, 0.8, false],
      // Floor edge wing
      [[[280, 16], [420, 18], [600, 18], [770, 16]], 1.2, bone75, 0.85, 0.2, 0.8, false],
      // Underfloor leading strakes / tunnel fences
      [[[310, 14], [315, 28]], 1.2, boneDim, 0.8, 0.25, 0.6, false],
      [[[345, 14], [350, 30]], 1.2, boneDim, 0.8, 0.3, 0.65, false],
      [[[380, 14], [385, 26]], 1.2, boneDim, 0.8, 0.35, 0.7, false],
      // Rear diffuser expansion ramp (upward venturi flare)
      [[[770, 10], [830, 32], [880, 54]], 1.8, bone75, 0.95, 0.5, 0.9, true],
      // Diffuser vertical boundary strakes
      [[[850, 16], [850, 44]], 1.2, boneDim, 0.75, 0.55, 0.9, false],
      [[[875, 24], [875, 52]], 1.2, boneDim, 0.75, 0.6, 0.9, false],
      // Rear crash structure box
      [[[860, 46], [905, 46], [905, 34], [870, 34]], 1.2, bone75, 0.85, 0.6, 0.9, false],
      // FIA flashing rain light cluster
      [[[905, 40], [912, 40]], 3.0, sigHot, 1.0, 0.65, 0.95, false],
      // Central exhaust tailpipe exit
      [[[835, 56], [865, 56]], 1.6, boneDim, 0.85, 0.55, 0.85, false],

      // === 6. MULTI-ELEMENT FRONT WING ===
      // Cascaded mainplane and aerodynamic flaps
      [[[25, 12], [85, 14], [185, 18]], 1.8, bone75, 0.95, 0.0, 0.45, true],
      [[[30, 20], [90, 22], [180, 25]], 1.4, bone75, 0.9, 0.05, 0.45, true],
      [[[35, 28], [95, 29], [175, 32]], 1.2, boneDim, 0.8, 0.1, 0.45, true],
      [[[40, 35], [100, 36], [170, 38]], 1.2, boneDim, 0.75, 0.15, 0.45, true],
      // Front wing endplate outer frame
      [[[25, 10], [25, 52], [115, 50], [185, 22], [185, 10], [25, 10]], 1.6, bone75, 0.9, 0.0, 0.45, false],
      // Endplate outwash diveplane (canard winglet)
      [[[40, 36], [85, 44], [135, 40]], 1.5, sigHot, 0.9, 0.1, 0.45, true],

      // === 7. REAR WING ASSEMBLY & DRS ===
      // Rear wing contoured endplate
      [[[835, 64], [835, 156], [925, 156], [925, 80], [880, 64], [835, 64]], 1.8, bone75, 0.95, 0.5, 0.95, false],
      // Main aerofoil foil element
      [[[840, 130], [920, 130]], 1.6, boneDim, 0.85, 0.6, 0.95, false],
      // DRS upper active flap (highlighted in signal red)
      [[[840, 154], [920, 154]], 2.4, sigHot, 1.0, 0.65, 0.95, false],
      // DRS hydraulic actuator pod
      [[[875, 150], [875, 162], [890, 162], [890, 150], [875, 150]], 1.4, bone75, 0.9, 0.7, 0.95, false],
      // Swan-neck central mounting pylon (aerodynamic arch to rear wing)
      [[[765, 68], [800, 115], [845, 154]], 1.8, bone75, 0.9, 0.55, 0.95, true],
      // Beam wing lower two-tier elements
      [[[830, 66], [880, 66]], 1.2, boneDim, 0.8, 0.55, 0.9, false],
      [[[830, 76], [875, 76]], 1.2, boneDim, 0.8, 0.58, 0.9, false],

      // === 8. SUSPENSIONS (PUSHROD / WISHBONES) ===
      // Front push-rod suspension wishbones
      [[[FRONT_X, 64], [325, 68]], 1.3, boneDim, 0.85, 0.15, 0.6, false],
      [[[FRONT_X, 64], [340, 58]], 1.3, boneDim, 0.85, 0.18, 0.6, false],
      [[[FRONT_X, 46], [320, 36]], 1.3, boneDim, 0.85, 0.2, 0.6, false],
      [[[FRONT_X, 48], [340, 76]], 1.4, [LIN.signal[0] * 1.2, LIN.signal[1] * 1.2, LIN.signal[2] * 1.2], 0.85, 0.22, 0.65, false],
      // Rear multi-link suspension wishbones
      [[[REAR_X, 66], [755, 58]], 1.3, boneDim, 0.85, 0.5, 0.85, false],
      [[[REAR_X, 46], [765, 24]], 1.3, boneDim, 0.85, 0.52, 0.85, false],
      [[[REAR_X, 50], [775, 68]], 1.4, [LIN.signal[0] * 1.2, LIN.signal[1] * 1.2, LIN.signal[2] * 1.2], 0.85, 0.55, 0.85, false],
    ];
    for (const [pts, w, c, a, r0, r1, sm] of parts) {
      const u = clamp((build - r0) / Math.max(0.01, r1 - r0));
      if (u > 0) lb.polyline(reveal(P(pts, sm), u), lw(w), c, a);
    }

    // CFD Aerodynamic streamlines (laminar wind-tunnel flow visualization)
    const streamlines = [
      // Streamline 1: Over front wing -> along nose -> over helmet -> over shark fin -> into rear wing
      [[[10, 32], [80, 48], [200, 78], [350, 96], [480, 134], [570, 166], [740, 156], [930, 166]], [LIN.signal[0] * 0.9, LIN.signal[1] * 0.9, LIN.signal[2] * 0.9], 0.55],
      // Streamline 2: Front wing underside -> into underfloor Venturi tunnel -> exiting diffuser flare
      [[[15, 16], [160, 20], [300, 22], [500, 22], [740, 20], [840, 42], [930, 70]], [LIN.bone[0] * 0.6, LIN.bone[1] * 0.6, LIN.bone[2] * 0.6], 0.45],
      // Streamline 3: Under-nose keel -> through sidepod undercut -> downwash along coke-bottle flank
      [[[30, 26], [180, 44], [380, 52], [460, 36], [620, 32], [780, 34], [890, 52]], [LIN.bone[0] * 0.5, LIN.bone[1] * 0.5, LIN.bone[2] * 0.5], 0.4],
    ] as const;
    if (build > 0.4) {
      const su = smoothstep(0.4, 0.95, build);
      for (const [spts, sc, sa] of streamlines) {
        lb.polyline(reveal(P(spts as unknown as [number, number][], true), su), lw(0.9), sc as [number, number, number], sa * 0.7);
      }
    }

    // Rake datum: signal line floor-referenced, 1.4 deg nose-down (rear higher on left, nose lower on right)
    {
      const a0 = X(940, 10), a1 = X(-40, 10);
      const xEnd = lerp(a0.x, a1.x, build);
      lb.seg2(a0.x, a0.y, xEnd, a0.y + (xEnd - a0.x) * 0.024, lw(1.5), [LIN.signal[0] * 1.3, LIN.signal[1] * 1.3, LIN.signal[2] * 1.3], 0.85 * smoothstep(0.8, 1, zp));
    }

    // Wheels: tyre, sidewall bands, rim, drum, 6-spoke aero fairing, central lock nut.
    for (const [wx, wr] of [[FRONT_X, FR], [REAR_X, RR]] as const) {
      const wc = X(wx, wr);
      const R = wr * zoom;
      const ring = (rr: number, w: number, c: [number, number, number], a: number, segs: number) => {
        for (let s = 0; s < segs; s++) {
          const a0 = (s / segs) * TAU, a1 = ((s + 1) / segs) * TAU;
          lb.seg2(wc.x + Math.cos(a0) * rr, wc.y + Math.sin(a0) * rr, wc.x + Math.cos(a1) * rr, wc.y + Math.sin(a1) * rr, lw(w), c, a);
        }
      };
      const segs = zoom > 3 ? 160 : 72;
      ring(R, 2.0, bone75, 0.95, segs);
      ring(R * 0.92, 1.1, boneDim, 0.8, segs);
      ring(R * 0.72, 1.6, bone75, 0.9, segs);
      ring(R * 0.64, 1.0, boneDim, 0.75, segs);
      ring(R * 0.20, 1.8, bone75, 0.95, 48);
      ring(R * 0.10, 2.0, sigHot, 1.0, 32); // central locking nut (signal red)

      // Tread blocks around the shoulder
      for (let k = 0; k < 48; k++) {
        const ak = spin * 0.5 + (k / 48) * TAU;
        lb.seg2(wc.x + Math.cos(ak) * R * 0.92, wc.y + Math.sin(ak) * R * 0.92, wc.x + Math.cos(ak) * R, wc.y + Math.sin(ak) * R, lw(1.0), boneDim, 0.8);
      }
      // Aero-disc wheel cover spokes
      for (let k = 0; k < 6; k++) {
        const ak = spin + (k / 6) * TAU;
        lb.seg2(wc.x + Math.cos(ak) * R * 0.2, wc.y + Math.sin(ak) * R * 0.2, wc.x + Math.cos(ak) * R * 0.72, wc.y + Math.sin(ak) * R * 0.72, lw(1.8), bone75, 0.9);
        lb.seg2(wc.x + Math.cos(ak + 0.26) * R * 0.2, wc.y + Math.sin(ak + 0.26) * R * 0.2, wc.x + Math.cos(ak + 0.26) * R * 0.72, wc.y + Math.sin(ak + 0.26) * R * 0.72, lw(1.1), boneDim, 0.8);
      }
      // Drilled brake rotor cooling vents inside rim
      for (let k = 0; k < 24; k++) {
        const ak = -spin * 0.8 + (k / 24) * TAU;
        const rr = R * 0.46;
        lb.seg2(wc.x + Math.cos(ak) * rr, wc.y + Math.sin(ak) * rr, wc.x + Math.cos(ak) * (rr + R * 0.08), wc.y + Math.sin(ak) * (rr + R * 0.08), lw(1.0), boneDim, 0.85);
      }
    }

    // Laser scan line sweeping across the car as the camera pulls back
    if (zp > 0.2 && zp < 1) {
      const sx = lerp(X(950, 0).x, X(0, 0).x, build);
      lb.seg2(sx, X(0, 200).y, sx, X(0, -10).y, lw(1.2), [LIN.signal[0] * 1.6, LIN.signal[1] * 1.6, LIN.signal[2] * 1.6], 0.7);
    }

    // Launch trace on LIGHTS OUT (sparks drift backwards to the left)
    if (blackout) {
      const sp = this.sparkPos(t)!;
      lb.seg2(W * 0.5, cy, sp.x, sp.y, 3.2, sigHot, 1);
      sparkParticles(lb, t, (tb) => this.sparkPos(tb), { rate: 160, speed: 380, intensity: 1.25, driftX: -420, seed: 7 });
      sparkHead(lb, sp.x, sp.y, t, 1.35, 1.3);
    } else if (zp > 0.98) {
      // Idle pilot spark breathing at datum origin
      const idleI = 0.45 + 0.35 * f.a.rms;
      sparkHead(lb, W * 0.5, cy, t, 0.65, idleI);
    }

    lb.render(renderer, out);

    // 3. Canvas2D Layer: FIA start pods, scrutineering callouts, live idle RPM, title stamp
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    // Start pods: 5 red lights during staging, FLASHING GREEN ON LAUNCH!
    const podAlpha = hudRev;
    const gantryX = blackout ? W / 2 - launchDist * 0.45 * zoom : W / 2;
    const gantryAlpha = blackout ? Math.max(0, 1 - pLaunch * 1.6) * podAlpha : podAlpha;
    if (gantryAlpha > 0.01) {
      drawStartPods2D(c, gantryX, 240, 560, 24, litPods, blackout, gantryAlpha);
      if (blackout) {
        const step = 560 / 4;
        const podR = 24;
        for (let i = 0; i < 5; i++) {
          const px = gantryX - 560 / 2 + i * step;
          const py = 240 - podR * 1.05; // upper green row
          const g = c.createRadialGradient(px, py, 0, px, py, podR * 2.8);
          g.addColorStop(0, 'rgba(235, 255, 240, 1)');
          g.addColorStop(0.35, 'rgba(0, 255, 120, 0.95)');
          g.addColorStop(1, 'rgba(0, 255, 120, 0)');
          c.fillStyle = g;
          c.beginPath(); c.arc(px, py, podR * 2.8, 0, TAU); c.fill();
          c.fillStyle = '#00ff77';
          c.beginPath(); c.arc(px, py, podR, 0, TAU); c.fill();
        }
      }
    }

    // Top scrutineering header
    c.font = font(F.mono(500), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.72 * hudRev);
    c.fillText('FIA TECHNICAL SCRUTINEERING · BAY 01 // AERO & TELEMETRY RIG', 96, 86);
    c.textAlign = 'right';
    c.fillStyle = blackout ? '#00ff88' : rgba('bone', 0.75 * hudRev);
    c.fillText(blackout ? 'STATUS: GREEN // LAUNCH ACTIVE [0.000 s]' : `START SEQUENCE: ${litPods} / 5 PODS`, W - 96, 86);
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    // Chassis telemetry specs around wireframe
    if (hudRev > 0.2) {
      c.font = font(F.mono(400), 14);
      c.fillStyle = rgba('ash', 0.75 * hudRev);
      const specs = [
        ['FRONT RIDE HEIGHT', '18.2 mm'],
        ['DYNAMIC RAKE', '1.42 deg'],
        ['PLANK THICKNESS', '10.00 mm [OK]'],
        ['TYRE BLANKET CORE', `${(72 + litPods * 5.4).toFixed(1)} °C`],
      ];
      specs.forEach(([k, v], i) => {
        const y = 430 + i * 26;
        c.fillStyle = rgba('graphite', 0.9);
        c.fillText(k!, 118, y);
        c.fillStyle = rgba('bone', 0.88);
        c.fillText(v!, 310, y);
      });

      // CAD Blueprint Dimension Line (3,600 mm Wheelbase)
      const fAxle = X(FRONT_X, 0);
      const rAxle = X(REAR_X, 0);
      const dimY1 = fAxle.y + 44;
      c.save();
      c.strokeStyle = rgba('ash', 0.45 * hudRev);
      c.lineWidth = 1;
      c.beginPath();
      const minX = Math.min(fAxle.x, rAxle.x);
      const maxX = Math.max(fAxle.x, rAxle.x);
      c.moveTo(minX, dimY1 - 8); c.lineTo(minX, dimY1 + 8);
      c.moveTo(maxX, dimY1 - 8); c.lineTo(maxX, dimY1 + 8);
      const midX = (minX + maxX) * 0.5;
      c.moveTo(minX, dimY1); c.lineTo(midX - 115, dimY1);
      c.moveTo(midX + 115, dimY1); c.lineTo(maxX, dimY1);
      c.stroke();

      c.font = font(F.mono(500), 11);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = rgba('bone', 0.82 * hudRev);
      c.fillText('◀── 3,600 mm WHEELBASE [FIA MAX] ──▶', midX, dimY1);

      // Component Callout Leaders
      const drawCallout = (targetX: number, targetY: number, lineDx: number, lineDy: number, label: string, sub: string) => {
        const p0 = X(targetX, targetY);
        const p1 = { x: p0.x + lineDx, y: p0.y + lineDy };
        const p2 = { x: p1.x + (lineDx > 0 ? 55 : -55), y: p1.y };

        c.strokeStyle = rgba('signal', 0.8 * hudRev);
        c.fillStyle = rgba('signal', 0.95 * hudRev);
        c.lineWidth = 1;

        c.beginPath();
        c.arc(p0.x, p0.y, 2.5, 0, Math.PI * 2);
        c.fill();

        c.beginPath();
        c.moveTo(p0.x, p0.y);
        c.lineTo(p1.x, p1.y);
        c.lineTo(p2.x, p2.y);
        c.stroke();

        c.font = font(F.mono(600), 10);
        c.textAlign = lineDx > 0 ? 'left' : 'right';
        c.textBaseline = 'bottom';
        c.fillStyle = rgba('bone', 0.88 * hudRev);
        c.fillText(label, p2.x + (lineDx > 0 ? 6 : -6), p2.y - 2);

        c.font = font(F.mono(400), 9);
        c.textBaseline = 'top';
        c.fillStyle = rgba('ash', 0.68 * hudRev);
        c.fillText(sub, p2.x + (lineDx > 0 ? 6 : -6), p2.y + 2);
      };

      drawCallout(485, 122, -48, -48, 'TITANIUM HALO', '125 kN VERTICAL LOAD SPEC');
      drawCallout(430, 72, 45, -45, 'UNDERCUT INLET', 'AERO DOWNWASH DUCT');
      drawCallout(880, 154, -42, -42, 'ACTIVE DRS', '85 mm HYDRAULIC APERTURE');
      c.restore();
    }

    // Bottom-left RPM instrument: idle 3,200 when rolling in -> climbs with pods -> 12,200 limiter on 5 pods -> launch!
    const idleNorm = blackout
      ? 0.88 + Math.sin(frameIdx(t) * 0.8) * 0.04
      : pRoll < 1
        ? 0.22 + Math.sin(frameIdx(t) * 0.3) * 0.02
        : (3200 + Math.pow(litPods / 5, 1.4) * 8900 + Math.sin(frameIdx(t) * 0.5) * (70 + litPods * 65)) / 15000;
    drawReadout(c, 118, H - 118, idleNorm, {
      scale: 0.95,
      labelText: blackout ? 'LAUNCH CONTROL · ACTIVE' : (litPods >= 4 ? 'LAUNCH CONTROL · ENGAGED' : 'PU IDLE · MGU-K ARMED'),
    });

    // Shift-light strip centred below chassis
    drawShiftStrip2D(c, W / 2 - 210, H - 132, 420, 10, idleNorm, t, { alpha: 0.85 * hudRev });

    // Bottom-right G-G Friction Circle (calm at 0G until launch)
    const launchGx = blackout ? noise1(t * 28, 3) * 0.18 : 0;
    const launchGy = blackout ? -lerp(0.2, 0.92, outProg) : noise1(t * 9, 4) * 0.03;
    drawGGCircle2D(c, W - 180, H - 165, 68, launchGx, launchGy, { alpha: 0.85 * hudRev });

    // Subtle title flash on LIGHTS OUT
    if (blackout) {
      const slamA = 1 - smoothstep(0.55, 0.98, outProg);
      if (slamA > 0.01) {
        const fam = F.archivo(125, 900);
        const txt = 'LIGHTS OUT';
        const lay = layout(txt, fam, 92, 6);
        c.save();
        c.globalAlpha = slamA;
        c.font = font(fam, 92);
        c.fillStyle = rgba('bone', 0.96);
        let x = W / 2 - lay.width / 2;
        for (const g of lay.glyphs) c.fillText(g.ch, x + g.x, 382);
        c.restore();
      }
    }

    comp.draw(renderer, L.upload(), out);

    // Post-processing: bookend crop-mark frame flies out on LIGHTS OUT!
    let podPulse = 0;
    for (const pt of this.podTimes) podPulse = Math.max(podPulse, pulse(t, pt, 0.07));
    const loHit = blackout ? pulse(t, this.lightsOutT, 0.09) : 0;
    const tremor = (litPods / 5) * 2.2 * f.a.low + loHit * 11;

    return {
      frame: blackout ? 1 - ease.inCubic(clamp((t - this.lightsOutT) / Math.min(0.45, this.ctx.end - this.lightsOutT))) : 1,
      bloom: 0.58 + 0.35 * loHit + 0.12 * podPulse,
      flash: loHit * 0.32,
      zoom: 1 + 0.045 * outProg,
      ca: 1.1 + 2.8 * outProg,
      shake: tremor > 0.1 ? [noise1(frameIdx(t), 11) * tremor, noise1(frameIdx(t), 23) * tremor] : [0, 0],
    };
  }
}


