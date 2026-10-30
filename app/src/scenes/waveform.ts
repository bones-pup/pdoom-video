// WAVEFORM — Verse 2 Part 3 (Doja Cat):
// Four high-cadence mechanical phases synced to Doja's climax:
//  1. "Itch to pull trigger... ripped a new ribbon": carbon paddle-shift trigger + taut finish ribbon shearing in two.
//  2. "You saw me at rock bottom...": chassis ride-height slams to 0.0 mm, flooding the floor with titanium sparks.
//  3. "Take the pain, doubled it, put it in wave form": spark storm snaps onto a harmonic standing-wave oscilloscope!
//  4. "I told 'em all game on the minute I came on": all 15 shift LEDs slam solid red across the top of the frame.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, layout, measure } from '../engine/type';
import { Lyrics, type Line } from '../engine/lyrics';
import { clamp, ease, frameIdx, lerp, noise1, prog, pulse, smoothstep } from '../engine/util';
import { drawShiftStrip2D, sparkHead, sparkParticles } from './_motifs';

const OSC_BG_GLSL = /* glsl */ `
uniform float uTime, uWaveMode, uBottomHit, uGameOn;
void main() {
  vec2 px = FRAG_PX;
  vec2 p = (vUv - 0.5) * vec2(16.0 / 9.0, 1.0);
  vec3 col = C_INK;

  // Oscilloscope graticule & center crosshair ticks
  vec2 g = abs(fract(px / 96.0 - 0.5) - 0.5) * 96.0;
  float grid = pxLine(min(g.x, g.y), 0.0, 1.0) * (0.12 + 0.12 * uWaveMode);
  col = mix(col, C_GRAPHITE, grid);

  // Titanium floor heat glow during ROCK BOTTOM plank strike
  float floorGlow = exp(-max(0.0, vUv.y - 0.18) * 9.0) * uBottomHit;
  col += C_EMBER * floorGlow * 0.48;

  // Top red shift-bar wash on GAME ON
  col += C_SIGNAL * exp(-(1.0 - vUv.y) * 7.5) * uGameOn * 0.45;

  fragColor = vec4(col, 1.0);
}`;

export default class WaveformScene extends Scene {
  bg = new FSPass(OSC_BG_GLSL, {
    uTime: { value: 0 },
    uWaveMode: { value: 0 },
    uBottomHit: { value: 0 },
    uGameOn: { value: 0 },
  });
  lines = new LineBatch(12000);
  ui = new Layer2D();

  sceneLines: Line[] = [];
  tRibbon = 0;
  tBottom = 0;
  tDouble = 0;
  tWave = 0;
  tGameOn = 0;

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.sceneLines = lyrics.linesIn(start - 0.1, end - 0.05);

    const findWordT = (reLine: RegExp, reWord: RegExp, fallbackFrac: number) => {
      const l = this.sceneLines.find((x) => reLine.test(x.text));
      const w = l?.words.find((x) => reWord.test(x.w)) ?? l?.words[0];
      return w ? w.start : lerp(start, end, fallbackFrac);
    };

    this.tRibbon = findWordT(/ribbon|wrap/i, /ripped|ribbon/i, 0.19);
    this.tBottom = findWordT(/rock bottom/i, /rock|bottom/i, 0.41);
    this.tDouble = findWordT(/doubled|paved/i, /doubled|pain/i, 0.59);
    this.tWave = findWordT(/wave form/i, /wave/i, 0.66);
    this.tGameOn = findWordT(/game on/i, /game/i, 0.88);
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;

    const inBottom = t >= this.tBottom - 0.1 && t < this.tWave - 0.05;
    const waveMode = smoothstep(this.tWave - 0.12, this.tWave + 0.25, t);
    const gameOn = smoothstep(this.tGameOn - 0.05, this.tGameOn + 0.15, t);
    const bottomEnv = smoothstep(this.tBottom - 0.08, this.tBottom + 0.08, t) * (1 - waveMode);
    const doubleBoost = smoothstep(this.tDouble - 0.05, this.tDouble + 0.15, t);

    this.bg.u.uTime!.value = t;
    this.bg.u.uWaveMode!.value = waveMode;
    this.bg.u.uBottomHit!.value = bottomEnv;
    this.bg.u.uGameOn!.value = gameOn;
    this.bg.render(renderer, out);

    // ---- GPU LineBatch: Sheared Ribbon -> Rock-Bottom Plank Sparks -> Harmonic Standing Wave ----
    const lb = this.lines;
    lb.clear();

    const boneCol: [number, number, number] = [LIN.bone[0] * 0.85, LIN.bone[1] * 0.85, LIN.bone[2] * 0.85];
    const sigHot: [number, number, number] = [LIN.signal[0] * 2.3, LIN.signal[1] * 2.3, LIN.signal[2] * 2.3];
    const embHot: [number, number, number] = [LIN.ember[0] * 2.4, LIN.ember[1] * 2.4, LIN.ember[2] * 2.4];

    if (t < this.tBottom - 0.08) {
      // Phase 1: Taut finish-line laser tape shearing cleanly in two on "ripped a new ribbon"
      const shear = prog(t, this.tRibbon, this.tRibbon + 0.55, ease.outExpo);
      const cy = H * 0.50;
      const gap = shear * 220;
      const drop = shear * shear * 85;
      lb.seg2(110, cy - shear * 18, W / 2 - gap, cy + drop, 4.0, shear > 0 ? sigHot : boneCol, 0.92);
      lb.seg2(W / 2 + gap, cy - drop, W - 110, cy + shear * 18, 4.0, shear > 0 ? sigHot : boneCol, 0.92);

      // Vertical laser cutter slicing through at tRibbon
      if (t >= this.tRibbon - 0.08 && t < this.tRibbon + 0.6) {
        const la = 1 - prog(t, this.tRibbon, this.tRibbon + 0.6);
        lb.seg2(W / 2, 140, W / 2, H - 140, 2.2, embHot, la);
        sparkParticles(lb, t, (tb) => (tb >= this.tRibbon ? { x: W / 2, y: cy } : null), {
          rate: 220, speed: 480, intensity: 1.35, seed: 111,
        });
      }
      sparkHead(lb, W / 2, cy, t, 1.1, 1.0);
    } else if (waveMode < 0.98) {
      // Phase 2: "ROCK BOTTOM" — Chassis floor slams onto asphalt at y = H * 0.76, storm of titanium sparks!
      const floorY = H * 0.76;
      const rideMm = lerp(24.0, 0.0, smoothstep(this.tBottom - 0.15, this.tBottom + 0.06, t)) + doubleBoost * 8 * Math.abs(Math.sin(t * 28));
      const plankY = floorY - rideMm * 4.5;

      // Asphalt datum + chassis carbon plank
      lb.seg2(96, floorY, W - 96, floorY, 2.4, boneCol, 0.85 * (1 - waveMode));
      lb.seg2(W * 0.22, plankY, W * 0.78, plankY - 8, 5.0, rideMm < 2.0 ? sigHot : boneCol, 0.95 * (1 - waveMode));

      // Massive horizontal titanium spark shower from skid-block contact!
      sparkParticles(
        lb,
        t,
        () => ({ x: W * 0.36, y: floorY - 2 }),
        { rate: 320, speed: 520, driftX: 620, gravity: 480, intensity: 1.45 * (1 - waveMode), seed: 127 },
      );
      sparkHead(lb, W * 0.36, floorY - 2, t, 1.5, 1.4 * (1 - waveMode));
    }

    if (waveMode > 0.02) {
      // Phase 3 & 4: Coupled Harmonic Standing Wave ("put it in wave form" / "doubled it")
      const xL = 96, xR = W - 96, cy = H * 0.52;
      const N = 260;
      const amp = (115 + 165 * f.a.vocal + 110 * f.a.bass) * (1 + 0.55 * doubleBoost) * waveMode;

      // 3 coupled harmonic modes (fundamental + 3rd + 7th vocal overtone)
      for (let mode = 0; mode < 3; mode++) {
        const col = mode === 0 ? sigHot : mode === 1 ? embHot : boneCol;
        const wLine = mode === 0 ? 3.4 : mode === 1 ? 2.0 : 1.1;
        const freq = mode === 0 ? 3.0 : mode === 1 ? 7.0 : 15.0;
        const phaseSpd = mode === 0 ? 11.0 : mode === 1 ? -17.0 : 29.0;
        const scaleM = mode === 0 ? 1.0 : mode === 1 ? 0.52 : 0.25;

        for (let i = 0; i < N; i++) {
          const u0 = i / N, u1 = (i + 1) / N;
          const env0 = Math.sin(u0 * Math.PI), env1 = Math.sin(u1 * Math.PI);
          const y0 = cy + Math.sin(u0 * Math.PI * freq + t * phaseSpd) * amp * scaleM * env0;
          const y1 = cy + Math.sin(u1 * Math.PI * freq + t * phaseSpd) * amp * scaleM * env1;
          lb.seg2(lerp(xL, xR, u0), y0, lerp(xL, xR, u1), y1, wLine, col, waveMode * (mode === 2 ? 0.55 : 0.95));
        }
      }
      // Travelling antinode spark
      const sx = lerp(xL, xR, (t * 0.85) % 1);
      const uS = (sx - xL) / (xR - xL);
      const sy = cy + Math.sin(uS * Math.PI * 3.0 + t * 11.0) * amp * Math.sin(uS * Math.PI);
      sparkHead(lb, sx, sy, t, 1.25, waveMode * 1.3);
    }

    lb.render(renderer, out);

    // ---- Canvas2D: Mechanical Callouts, Full-Width Shift Strip on GAME ON, Karaoke ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    // Dynamic suspension bounce tracking chassis bottoming out
    const bounceY = inBottom ? Math.sin((t - this.tBottom) * 28) * Math.exp(-(t - this.tBottom) * 3.5) * 24 : 0;

    c.save();
    c.translate(0, bounceY);

    // 15-LED Shift Strip across top — slams 100% solid signal red on "game on the minute I came on"!
    drawShiftStrip2D(c, 96, 52, W - 192, gameOn > 0.2 ? 22 : 12, gameOn > 0.2 ? 1.0 : 0.55 + 0.4 * f.p, t, { alpha: 0.96 });

    c.font = font(F.mono(600), 13);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('ash', 0.8);
    const modeLabel =
      gameOn > 0.3
        ? 'STEERING WHEEL MATRIX // ALL 15 SHIFT LEDS LOCKED'
        : waveMode > 0.3
          ? 'ACOUSTIC & SUSPENSION HARMONIC OSCILLOSCOPE // CH04 WAVEFORM'
          : inBottom
            ? 'LASER RIDE-HEIGHT SENSOR // TITANIUM SKID BLOCK CONTACT'
            : 'CARBON PADDLE-SHIFT MICRO-SWITCH // +12 MS SEQUENTIAL TRIGGER';
    c.fillText(modeLabel, 96, 98);
    c.textAlign = 'right';
    c.fillStyle = inBottom || gameOn > 0.3 ? rgba('signal', 1) : rgba('bone', 0.85);
    c.fillText(
      gameOn > 0.3
        ? 'STATUS: GAME ON [FULL DEPLOY]'
        : waveMode > 0.3
          ? `GAIN: ${(1 + doubleBoost).toFixed(1)}× [DOUBLED]`
          : inBottom
            ? 'RIDE HEIGHT: 0.0 mm [ROCK BOTTOM]'
            : 'SHIFT TRIGGER: ARMED',
      W - 96,
      98,
    );
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    // Monumental background stamp on GAME ON
    if (gameOn > 0.1) {
      c.save();
      c.globalAlpha = gameOn * 0.22;
      const gFam = F.archivo(125, 900);
      const lay = layout('GAME ON', gFam, 230, 8);
      c.font = font(gFam, 230);
      c.fillStyle = rgba('signal', 1);
      const x0 = W / 2 - lay.width / 2;
      for (const g of lay.glyphs) c.fillText(g.ch, x0 + g.x, H * 0.58);
      c.restore();
    }

    // Active lyric line with crisp word-by-word karaoke
    const activeLine =
      this.sceneLines.find((l) => t >= l.start - 0.18 && t <= l.end + 0.15) ??
      this.sceneLines.filter((l) => l.start <= t).pop();

    if (activeLine) {
      const fam = F.archivo(waveMode > 0.5 ? 112.5 : 100, 800);
      const sz = Math.min(68, (W - 220) / Math.max(1, measure(activeLine.text, fam, 100) / 100));
      const full = activeLine.words.map((w) => w.w).join(' ');
      const baseY = H - 108;

      c.save();
      c.font = font(fam, sz);
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
          const isKey = /trigger|ribbon|rock|bottom|doubled|wave|form|game|came/i.test(w.w);
          c.fillStyle = isKey ? rgba('signal', 1) : rgba('bone', 0.98);
          c.fillText(w.w, wx, baseY);
          c.restore();
        }
        cur += Array.from(w.w).length + 1;
      }
      c.restore();
    }
    c.restore();

    comp.draw(renderer, L.upload(), out);

    const bottomHit = pulse(t, this.tBottom, 0.16);
    const hit =
      pulse(t, this.tRibbon, 0.09) +
      bottomHit * 1.6 +
      pulse(t, this.tWave, 0.11) +
      pulse(t, this.tGameOn, 0.14);
    const shk = 13 * hit + 4.5 * f.a.kick;
    // Dynamic camera: violent suspension bottom-out punch-in on "ROCK BOTTOM"
    const waveZoom = 1.0 + 0.22 * Math.min(1.2, hit) + 0.14 * bottomHit + (inBottom ? 0.08 : 0);
    return {
      bloom: 0.62 + 0.35 * Math.min(1, hit),
      ca: 1.3 + 3.8 * Math.min(1, hit),
      zoom: waveZoom,
      shake: shk > 0.1 ? [noise1(frameIdx(t), 113) * shk, noise1(frameIdx(t), 119) * shk + bounceY * 0.35] : [0, 0],
    };
  }
}
