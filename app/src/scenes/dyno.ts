// DYNO — Verse 2 Part 1 (Doja Cat):
// Hard palette inversion: BONE FIA scrutineering technical paper (#ECEAE4) with crisp INK lines (`post.paper = 1`).
// Phase 1 ("Bounce back... pushin' a new pen, rewritin' the story"): legacy baseline curve crossed out in signal red
//          while a CNC spark plotter ("new pen") draws a steeper dyno torque curve, plotting syllables live.
// Phase 2 ("Hello to my old ways, goodbye to the nosebleeds..."): architectural grandstand cross-section
//          whip-zooming 62 metres vertically down from TIER 4 NOSEBLEEDS straight onto ELEVATION 0.00 m PIT WALL.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../engine/scene';
import { FSPass, Layer2D, W, H } from '../engine/gl';
import { LineBatch } from '../engine/lines';
import { LIN, rgba } from '../engine/palette';
import { F, font, glyphX, measure } from '../engine/type';
import { strokeText, drawStrokeText } from '../engine/stroke';
import { Lyrics, type Line } from '../engine/lyrics';
import { clamp, ease, frameIdx, lerp, noise1, prog, pulse, smoothstep } from '../engine/util';
import { sparkHead2D, sparkParticles } from './_motifs';

const PAPER_BG_GLSL = /* glsl */ `
uniform float uTime, uZoomDrop;
void main() {
  vec2 px = FRAG_PX;
  // Warm bone technical blueprint stock (kept below bloom threshold!)
  vec3 paper = C_BONE * 0.88;
  float fiber = snoise(px * 0.18) * 0.014;
  vec3 col = paper + fiber;

  // Crisp 48px / 240px millimeter graph paper grid scrolling vertically during grandstand drop
  vec2 gp = vec2(px.x, px.y - uZoomDrop * 1600.0);
  float gMinor = pxLine(min(abs(fract(gp.x / 48.0 - 0.5) - 0.5) * 48.0, abs(fract(gp.y / 48.0 - 0.5) - 0.5) * 48.0), 0.0, 1.0);
  float gMajor = pxLine(min(abs(fract(gp.x / 240.0 - 0.5) - 0.5) * 240.0, abs(fract(gp.y / 240.0 - 0.5) - 0.5) * 240.0), 0.0, 1.25);

  col = mix(col, C_ASH * 0.65, gMinor * 0.24);
  col = mix(col, C_GRAPHITE * 0.45, gMajor * 0.36);

  // Outer blueprint border rule
  vec2 dEdge = min(px, vec2(1920.0, 1080.0) - px);
  float border = pxLine(abs(min(dEdge.x, dEdge.y) - 54.0), 0.0, 1.3);
  col = mix(col, C_INK, border * 0.65);

  fragColor = vec4(col, 1.0);
}`;

export default class DynoScene extends Scene {
  bg = new FSPass(PAPER_BG_GLSL, { uTime: { value: 0 }, uZoomDrop: { value: 0 } });
  sparks = new LineBatch(5000);
  ui = new Layer2D();

  sceneLines: Line[] = [];
  tNose = 0;

  override init() {
    const { lyrics, start, end } = this.ctx;
    this.sceneLines = lyrics.linesIn(start - 0.1, end - 0.05);
    const noseLine = this.sceneLines.find((l) => /old ways|nosebleeds/i.test(l.text)) ?? this.sceneLines[2];
    this.tNose = noseLine ? noseLine.start - 0.05 : lerp(start, end, 0.52);
  }

  private dynoY(u: number): number {
    // Aggressive MGU-K + turbo torque surge curve rising from bottom-left to upper-right
    return H * 0.78 - (Math.pow(u, 0.78) * 450 + Math.sin(u * 9.5) * 22 * (1 - u * 0.5));
  }

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const inGrandstand = t >= this.tNose;
    const dropProg = prog(t, this.tNose, this.ctx.end - 0.25, ease.inOutCubic);

    this.bg.u.uTime!.value = t;
    this.bg.u.uZoomDrop!.value = dropProg;
    this.bg.render(renderer, out);

    // ---- Canvas2D Blueprint Drafting: Dyno Plotter (Phase 1) & Stadium Elevation Drop (Phase 2) ----
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    // FIA Technical Document Title Block
    c.strokeStyle = rgba('ink', 0.82);
    c.lineWidth = 1.6;
    c.strokeRect(84, 72, W - 168, 56);
    c.font = font(F.mono(600), 14);
    c.letterSpacing = '2px';
    c.fillStyle = rgba('ink', 0.92);
    c.fillText(
      inGrandstand
        ? 'DWG NO. GP-02B // CIRCUIT GRANDSTAND SECTION — TIER 4 TO PIT WALL'
        : 'DWG NO. PU-02A // DYNO TORQUE REWRITE — MGU-K SPEC OVERRIDE',
      104,
      105,
    );
    c.textAlign = 'right';
    c.fillStyle = rgba('signal', 1);
    c.fillText(
      inGrandstand ? `ELEVATION: ${lerp(62.4, 0.0, dropProg).toFixed(1)} m` : `OUTPUT: ${Math.round(lerp(540, 785, prog(t, this.ctx.start, this.tNose)))} kW`,
      W - 104,
      105,
    );
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    let penPos: { x: number; y: number } | null = null;

    if (!inGrandstand) {
      // Phase 1: Legacy dyno curve crossed out + CNC "new pen" plotting steeper curve
      const x0 = 140, x1 = W - 160, yBase = H * 0.80;
      c.strokeStyle = rgba('ink', 0.85);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x0, 170); c.lineTo(x0, yBase); c.lineTo(x1, yBase);
      c.stroke();

      // Legacy flat/drooping torque curve in graphite
      c.strokeStyle = rgba('graphite', 0.65);
      c.setLineDash([8, 6]);
      c.lineWidth = 2.2;
      c.beginPath();
      for (let i = 0; i <= 80; i++) {
        const u = i / 80;
        const lx = lerp(x0, x1, u);
        const ly = yBase - (Math.sin(u * 2.3) * 190 - u * u * 55);
        if (i === 0) c.moveTo(lx, ly); else c.lineTo(lx, ly);
      }
      c.stroke();
      c.setLineDash([]);

      // Violent red cross-out slash over legacy curve
      const slashP = prog(t, this.ctx.start + 0.25, this.ctx.start + 0.85, ease.outExpo);
      if (slashP > 0) {
        c.strokeStyle = rgba('signal', 0.88);
        c.lineWidth = 3.5;
        c.beginPath();
        c.moveTo(x0 + 80, yBase - 60);
        c.lineTo(lerp(x0 + 80, x1 - 120, slashP), lerp(yBase - 60, yBase - 230, slashP));
        c.stroke();
        c.font = font(F.mono(700), 15);
        c.fillStyle = rgba('signal', 1);
        c.fillText('✗ LEGACY DYNO MAP VOIDED', x0 + 96, yBase - 34);
      }

      // New CNC torque curve drawn live by "a new pen"
      const penU = clamp(prog(t, this.ctx.start + 0.05, this.tNose - 0.1, ease.linear));
      c.strokeStyle = rgba('ink', 0.96);
      c.lineWidth = 4.2;
      c.beginPath();
      const steps = Math.max(2, Math.floor(120 * penU));
      for (let i = 0; i <= steps; i++) {
        const u = (i / 120);
        const px = lerp(x0, x1, u), py = this.dynoY(u);
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();

      // Secondary red power trace hugging above
      c.strokeStyle = rgba('signal', 0.95);
      c.lineWidth = 2.6;
      c.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = i / 120;
        const px = lerp(x0, x1, u), py = this.dynoY(u) - 24 * u;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.stroke();

      const hx = lerp(x0, x1, penU), hy = this.dynoY(penU);
      penPos = { x: hx, y: hy };

      // CNC gantry crosshair rails tracking the pen head
      c.strokeStyle = rgba('ink', 0.25);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(hx, 150); c.lineTo(hx, yBase);
      c.moveTo(x0, hy); c.lineTo(x1, hy);
      c.stroke();

      // Single-stroke CNC etched annotation ("NEW PEN // SPEC 2.0")
      const st = strokeText('NEW PEN // DYNO REWRITE +245 NM', 'tech', 26, 2);
      c.save();
      c.translate(x0 + 36, 212);
      c.strokeStyle = rgba('ink', 0.85);
      c.lineWidth = 1.8;
      drawStrokeText(c, st, st.total * clamp(penU * 1.6));
      c.restore();

      sparkHead2D(c, hx, hy, t, 1.15);
    } else {
      // Phase 2: Architectural Grandstand Cross-Section Whip-Zoom (TIER 4 NOSEBLEEDS -> PIT WALL)
      const camElev = lerp(64.0, 0.0, dropProg); // metres
      const pxPerM = 22.0;
      const elevY = (m: number) => H * 0.52 + (camElev - m) * pxPerM;

      // 1. Left-Hand Precision Architectural Altimeter Datum Scale
      const scaleX = 104;
      c.strokeStyle = rgba('ink', 0.85);
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(scaleX, 130);
      c.lineTo(scaleX, H - 110);
      c.stroke();

      for (let m = -8; m <= 76; m += 2) {
        const sy = elevY(m);
        if (sy < 130 || sy > H - 110) continue;
        const isMajor = m % 10 === 0;
        const isMid = m % 5 === 0 && !isMajor;
        const tickW = isMajor ? 18 : isMid ? 11 : 6;
        const isPitZero = m === 0;

        c.strokeStyle = isPitZero ? rgba('signal', 1) : isMajor ? rgba('ink', 0.9) : rgba('ash', 0.65);
        c.lineWidth = isPitZero ? 2.8 : isMajor ? 1.6 : 1.0;
        c.beginPath();
        c.moveTo(scaleX - tickW, sy);
        c.lineTo(scaleX, sy);
        c.stroke();

        if (isMajor) {
          c.font = font(F.mono(isPitZero ? 700 : 500), isPitZero ? 13 : 11);
          c.fillStyle = isPitZero ? rgba('signal', 1) : rgba('ink', 0.75);
          c.fillText(m >= 0 ? `+${m}m` : `${m}m`, scaleX - 44, sy + 4);
        }
      }

      // Live Laser Elevation Indicator Pointer tracking screen centre
      const curY = H * 0.52;
      c.fillStyle = rgba('signal', 1);
      c.beginPath();
      c.moveTo(scaleX + 2, curY);
      c.lineTo(scaleX + 14, curY - 6);
      c.lineTo(scaleX + 14, curY + 6);
      c.closePath();
      c.fill();
      c.font = font(F.mono(700), 12);
      c.fillText(
        camElev > 0.8 ? `▶ ELEV +${camElev.toFixed(1)}m [DESCENT]` : '▶ ELEV 0.00m [PIT WALL]',
        scaleX + 20,
        curY + 4,
      );

      // 2. Primary Structural Support Pylons (Vertical Columns plunging through tiers)
      const xPylonRear = 300, xPylonMid = 620, xPylonFront = 980;
      const pylonCols = [xPylonRear, xPylonMid, xPylonFront];

      c.strokeStyle = rgba('ink', 0.35);
      c.lineWidth = 1.2;
      for (const px of pylonCols) {
        const yTop = Math.max(130, elevY(72));
        const yBot = Math.min(H - 110, elevY(-14));
        if (yBot > yTop) {
          // Double line hollow flange column
          c.beginPath();
          c.moveTo(px - 6, yTop); c.lineTo(px - 6, yBot);
          c.moveTo(px + 6, yTop); c.lineTo(px + 6, yBot);
          c.stroke();
          // Cross-lacing webbing on columns
          for (let m = -12; m <= 70; m += 4) {
            const sy = elevY(m);
            if (sy >= yTop && sy <= yBot) {
              c.beginPath();
              c.moveTo(px - 6, sy); c.lineTo(px + 6, sy - 12);
              c.stroke();
            }
          }
        }
      }

      // 3. Cantilever Space-Frame Roof Truss (Above Tier 4: Elevation +58m to +76m)
      const yTrussTop = elevY(74);
      const yTrussBot = elevY(60);
      if (yTrussBot < H - 80 && yTrussTop > 100) {
        c.strokeStyle = rgba('ink', 0.88);
        c.lineWidth = 2.0;
        // Upper chord & lower chord
        c.beginPath();
        c.moveTo(260, yTrussTop); c.lineTo(1380, elevY(64));
        c.moveTo(260, yTrussBot); c.lineTo(1380, elevY(56));
        c.stroke();

        // Warren truss diagonal cross-braces
        c.lineWidth = 1.2;
        c.strokeStyle = rgba('ink', 0.55);
        c.beginPath();
        const nBays = 14;
        for (let b = 0; b <= nBays; b++) {
          const u = b / nBays;
          const bx = lerp(260, 1380, u);
          const topY = lerp(yTrussTop, elevY(64), u);
          const botY = lerp(yTrussBot, elevY(56), u);
          c.moveTo(bx, topY); c.lineTo(bx, botY);
          if (b < nBays) {
            const nextBx = lerp(260, 1380, (b + 1) / nBays);
            const nextBotY = lerp(yTrussBot, elevY(56), (b + 1) / nBays);
            c.moveTo(bx, topY); c.lineTo(nextBx, nextBotY);
          }
        }
        c.stroke();

        // Suspension stay cables
        c.strokeStyle = rgba('signal', 0.7);
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(260, elevY(80)); c.lineTo(840, elevY(62));
        c.moveTo(260, elevY(80)); c.lineTo(1380, elevY(60));
        c.stroke();

        // Truss annotation
        c.font = font(F.mono(600), 11);
        c.fillStyle = rgba('signal', 0.9);
        c.fillText('CANTILEVER ROOF TRUSS // 46.5 m SPAN // WIND UPLIFT: 4.8 kN/m²', 340, yTrussTop - 12);
      }

      // 4. Seating Tiers (Realistic Concrete Stepped Risers)
      const tiers = [
        {
          id: 'TIER 04',
          name: 'UPPER NOSEBLEED DECK',
          mTop: 62.4,
          mBot: 52.0,
          x0: 300,
          x1: 640,
          nSteps: 12,
          isNosebleed: true,
        },
        {
          id: 'TIER 03',
          name: 'UPPER CANTILEVER BOWL',
          mTop: 46.0,
          mBot: 36.0,
          x0: 360,
          x1: 760,
          nSteps: 10,
          isNosebleed: false,
        },
        {
          id: 'TIER 02',
          name: 'CLUB SUITES & PADDOCK BALCONY',
          mTop: 30.0,
          mBot: 22.0,
          x0: 420,
          x1: 860,
          nSteps: 8,
          isNosebleed: false,
        },
        {
          id: 'TIER 01',
          name: 'PIT STRAIGHT LOWER TERRACE',
          mTop: 16.0,
          mBot: 4.0,
          x0: 480,
          x1: 1060,
          nSteps: 14,
          isNosebleed: false,
        },
      ];

      for (const tier of tiers) {
        const yTop = elevY(tier.mTop);
        const yBot = elevY(tier.mBot);
        if (yBot < 100 || yTop > H + 50) continue;

        const isNoseActive = tier.isNosebleed && camElev >= 48;
        c.strokeStyle = isNoseActive ? rgba('signal', 1) : rgba('ink', 0.92);
        c.lineWidth = isNoseActive ? 2.6 : 1.8;

        // Draw Stepped Risers
        c.beginPath();
        for (let s = 0; s <= tier.nSteps; s++) {
          const u0 = s / tier.nSteps;
          const u1 = (s + 1) / tier.nSteps;
          const sx0 = lerp(tier.x0, tier.x1, u0);
          const sy0 = lerp(yTop, yBot, u0);
          const sx1 = lerp(tier.x0, tier.x1, u1);
          const sy1 = lerp(yTop, yBot, u1);

          if (s === 0) c.moveTo(sx0, sy0);
          c.lineTo(sx1, sy0); // tread horizontal
          c.lineTo(sx1, sy1); // riser vertical
        }
        c.stroke();

        // Concrete underbelly soffit diagonal slab
        c.strokeStyle = rgba('ink', 0.45);
        c.lineWidth = 1.2;
        c.beginPath();
        c.moveTo(tier.x0, yTop + 24);
        c.lineTo(tier.x1, yBot + 24);
        c.stroke();

        // Crowd density tick marks on treads
        c.strokeStyle = isNoseActive ? rgba('signal', 0.5) : rgba('ink', 0.3);
        c.lineWidth = 1.0;
        c.beginPath();
        for (let s = 0; s < tier.nSteps; s++) {
          const u = (s + 0.5) / tier.nSteps;
          const sx = lerp(tier.x0, tier.x1, u);
          const sy = lerp(yTop, yBot, s / tier.nSteps);
          c.moveTo(sx, sy); c.lineTo(sx, sy - 8);
          c.moveTo(sx + 5, sy); c.lineTo(sx + 5, sy - 6);
        }
        c.stroke();

        // Tier identification block
        c.font = font(F.mono(isNoseActive ? 700 : 600), isNoseActive ? 14 : 12);
        c.fillStyle = isNoseActive ? rgba('signal', 1) : rgba('ink', 0.85);
        c.fillText(`${tier.id} // ${tier.name} [ELEV +${tier.mTop.toFixed(1)}m]`, tier.x0 + 14, yTop - 12);
      }

      // 5. Emergency Egress Stairways (Zig-zagging between tiers at x = 200..300)
      c.strokeStyle = rgba('ash', 0.65);
      c.lineWidth = 1.1;
      c.beginPath();
      for (let m = 60; m >= 6; m -= 6) {
        const sy1 = elevY(m);
        const sy2 = elevY(m - 6);
        if (sy2 < 120 || sy1 > H - 80) continue;
        const xA = 220, xB = 290;
        c.moveTo(xA, sy1); c.lineTo(xB, sy1 + 18); c.lineTo(xA, sy2);
      }
      c.stroke();

      // 6. Track Level (Elevation 0.00m) & FIA Pit Wall Apron
      const yZero = elevY(0.0);
      if (yZero < H + 120 && yZero > 80) {
        // Race track surface line with -2.5% drainage cross-fall
        c.strokeStyle = rgba('signal', 1);
        c.lineWidth = 3.2;
        c.beginPath();
        c.moveTo(scaleX + 20, yZero);
        c.lineTo(W - 80, yZero + 18);
        c.stroke();

        // FIA Pit Wall Armco Barrier & Catch Fence at x = 1120
        const armcoX = 1120;
        const yFenceTop = elevY(3.8);
        c.strokeStyle = rgba('ink', 0.95);
        c.lineWidth = 2.4;
        c.beginPath();
        // Steel armco post
        c.moveTo(armcoX, yZero); c.lineTo(armcoX, yFenceTop);
        // Overhanging catch-fence arm angled toward track
        c.lineTo(armcoX - 28, yFenceTop - 16);
        c.stroke();

        // Catch fence mesh wire strings
        c.strokeStyle = rgba('ink', 0.35);
        c.lineWidth = 0.9;
        c.beginPath();
        for (let fh = 0.5; fh <= 3.8; fh += 0.5) {
          const fy = elevY(fh);
          c.moveTo(armcoX - 28, fy); c.lineTo(armcoX + 160, fy);
        }
        c.stroke();

        // Pit Perch Command Console (Team pit wall stand)
        const perchX = 1180;
        c.strokeStyle = rgba('ink', 0.88);
        c.lineWidth = 1.8;
        c.strokeRect(perchX, elevY(1.4), 160, elevY(0.0) - elevY(1.4));
        c.font = font(F.mono(600), 10);
        c.fillStyle = rgba('signal', 1);
        c.fillText('FIA PIT PERCH // CH01 TIMING', perchX + 10, elevY(1.4) + 16);

        // Bedrock foundation hatch below elevation 0.00m
        c.strokeStyle = rgba('graphite', 0.45);
        c.lineWidth = 1.0;
        c.beginPath();
        for (let gx = scaleX + 30; gx < W - 80; gx += 28) {
          c.moveTo(gx, yZero + 6);
          c.lineTo(gx - 20, yZero + 36);
        }
        c.stroke();

        c.font = font(F.mono(700), 16);
        c.fillStyle = rgba('signal', 1);
        c.fillText('ELEVATION 0.000 m // FIA GRADE 1 TRACK LEVEL & PIT WALL APRON', scaleX + 30, yZero - 14);
        c.font = font(F.mono(500), 12);
        c.fillStyle = rgba('ink', 0.7);
        c.fillText('ASPHALT CROSS-FALL: -2.5% // FRICTION COEFFICIENT µ = 0.88', scaleX + 30, yZero + 54);
      }

      // 7. Architectural Dimension Witness Lines (Right side)
      const dimX = W - 140;
      c.strokeStyle = rgba('ink', 0.45);
      c.lineWidth = 1.0;
      c.beginPath();
      c.moveTo(dimX, elevY(62.4)); c.lineTo(dimX, elevY(0.0));
      c.moveTo(dimX - 10, elevY(62.4)); c.lineTo(dimX + 10, elevY(62.4));
      c.moveTo(dimX - 10, elevY(0.0)); c.lineTo(dimX + 10, elevY(0.0));
      c.stroke();

      c.save();
      c.translate(dimX + 18, (elevY(62.4) + elevY(0.0)) * 0.5);
      c.rotate(Math.PI * 0.5);
      c.font = font(F.mono(600), 12);
      c.fillStyle = rgba('ink', 0.75);
      c.textAlign = 'center';
      c.fillText('SECTION VERTICAL DROP // 62,400 mm', 0, 0);
      c.restore();

      penPos = { x: W - 220, y: H * 0.52 };
      sparkHead2D(c, penPos.x, penPos.y, t, 1.0);
    }

    // ---- Rapid-Fire Ink-on-Bone Karaoke Typography ----
    const activeLine =
      this.sceneLines.find((l) => t >= l.start - 0.18 && t <= l.end + 0.15) ??
      this.sceneLines.filter((l) => l.start <= t).pop();

    if (activeLine) {
      const fam = F.archivo(106, 900);
      const sz = Math.min(70, (W - 240) / Math.max(1, measure(activeLine.text, fam, 100) / 100));
      const full = activeLine.words.map((w) => w.w).join(' ');
      const baseY = inGrandstand ? 208 : H - 108;

      if (inGrandstand) {
        // High-contrast drafting banner plate for pristine lyric legibility
        c.fillStyle = rgba('bone', 0.92);
        c.fillRect(84, baseY - sz * 0.92, W - 168, sz * 1.28);
        c.strokeStyle = rgba('ink', 0.35);
        c.lineWidth = 1.2;
        c.strokeRect(84, baseY - sz * 0.92, W - 168, sz * 1.28);
      }

      c.save();
      c.font = font(fam, sz);
      let cur = 0;
      for (const w of activeLine.words) {
        const wp = Lyrics.wordProgress(w, t);
        const wx = 104 + glyphX(full, cur, fam, sz);
        const ww = measure(w.w, fam, sz);
        const pop = wp > 0 && wp < 1 ? -5 * Math.sin(wp * Math.PI) : 0;

        c.fillStyle = rgba('ink', 0.24);
        c.fillText(w.w, wx, baseY + pop);

        if (wp > 0) {
          c.save();
          c.beginPath(); c.rect(wx - 4, baseY - sz * 1.05, (ww + 8) * wp, sz * 1.4); c.clip();
          const isRed = /bounce|pen|story|nosebleeds|odin/i.test(w.w.replace(/[^a-z]/gi, ''));
          c.fillStyle = isRed ? rgba('signal', 1) : rgba('ink', 0.98);
          c.fillText(w.w, wx, baseY + pop);
          c.restore();
        }
        cur += Array.from(w.w).length + 1;
      }
      c.restore();
    }

    comp.draw(renderer, L.upload(), out);

    // CNC titanium sparks over bone blueprint
    const lb = this.sparks;
    lb.clear();
    if (!inGrandstand) {
      const x0 = 140, x1 = W - 160;
      sparkParticles(
        lb,
        t,
        (tb) => {
          const u = clamp(prog(tb, this.ctx.start + 0.05, this.tNose - 0.1));
          return { x: lerp(x0, x1, u), y: this.dynoY(u) };
        },
        { rate: 95, speed: 280, intensity: 0.95, seed: 83 },
      );
      lb.render(renderer, out);
    }

    const cutHit = pulse(t, this.ctx.start, 0.1) + pulse(t, this.tNose, 0.1);
    // Dynamic camera: Phase 1 subtle CNC plotter tracking pan; Phase 2 vertical plunge zoom down grandstand
    const phase1Cam = inGrandstand ? 0 : prog(t, this.ctx.start, this.tNose);
    const dynoCamZoom = inGrandstand
      ? 1.0 + Math.sin(dropProg * Math.PI) * 0.28 + 0.12 * (1 - dropProg) + 0.18 * cutHit
      : 1.0 + 0.08 * phase1Cam + 0.12 * cutHit;
    const grandstandDrift = inGrandstand ? Math.sin(dropProg * 6.28) * 12 : (phase1Cam * 8 - 4);
    const shk = 7 * cutHit + 3.0 * f.a.snare + (inGrandstand ? (1 - dropProg) * 4.0 * f.a.kick : 0);
    return {
      paper: 1,
      bloom: 0.32,
      ca: 0.9 + 2.5 * cutHit + (inGrandstand ? 1.5 * Math.sin(dropProg * Math.PI) : 0),
      vignette: 0.22,
      zoom: dynoCamZoom,
      shake: [
        (shk > 0.1 ? noise1(frameIdx(t), 89) * shk : 0) + grandstandDrift,
        (shk > 0.1 ? noise1(frameIdx(t), 97) * shk : 0) + (inGrandstand ? Math.cos(dropProg * 6.28) * 6 : 0),
      ],
    };
  }
}
