# Lose My Mind — treatment & style bible

## The idea in one paragraph

The video is presented as **live pit-wall telemetry and aero-engineering plates from a machine pushed past redline**: each set piece has its own diagnostic instrument, graphic idiom, and ice-cold technical precision contrasting against emotional and physical overdrive. Instead of a static corner HUD, the **RPM / REDLINE value** climbs inside the plates every time the track surges toward the limit (`3,200` → `8,800` → `11,600` → `13,900` → `15,000 [LIMITER]` → `---` / telemetry lost). An FIA-style scrutineering crop-mark frame appears only at the bookends — around the opening's CAD setup sheet, flying outward past the edges on **LIGHTS OUT** into Verse 1, and snapping back in around the outro's `[ BOX / RESET ]` trigger — so the first and last frames match and the video loops seamlessly; everything in between runs full-bleed. Running through the whole video is **the spark**: one white-hot point of titanium-on-asphalt friction dragging a razor telemetry racing line behind it. It plots the wind-tunnel streamlines, traces dual throttle/heart-rate strip charts, breaches white track-limit lines, carves blind chicanes, overwrites dyno torque curves, shears the finish ribbon, and finally flatlines at terminal velocity. Around it, every plate shifts **engineering visual discipline** (CFD flow-vis, MoTeC strip chart, FIA scrutineering blueprint, thermal carcass IR, marshall transponder radar, oscilloscope waveform, carbon-weave composite layup), sharing one restrained motorsport palette, one Swiss-grid type system, film grain, and razor-sharp beat choreography. Subjects are concrete mechanical and aerodynamic instruments (five start pods, a titanium skid block, a G-G friction circle, glowing carbon-ceramic discs, wind-tunnel rakes, pit-wall transcripts) treated as **graphic metaphors and transformations**, never as literal racing-game replays or stock car renders.

## Tone

- **Dynamic & G-loaded**: camera motion obeys chassis physics — heavy braking compressions (`outExpo`), lateral-G whip-pans across kerbs, sequential gear-shift micro-snaps on snares, DRS accelerations easing into downbeats. Inside every plate there are sub-cuts, reframings, lock-offs, and sudden snaps. Zero floaty screensaver drift.
- **Precision engineering, not arcade**: razor 1 px CAD hairlines, Swiss telemetry typography, generous negative space, depth through rim lighting and surface hatching, bloom strictly reserved for incandescent brake/spark/LED channels.
- **Deadpan race-engineer register**: dry FIA technical callouts, micro-footnotes, sector deltas (`+0.004 s`), sensor warnings (`PLANK WEAR > 1.0 mm`, `TRACTION ENVELOPE EXCEEDED`, `TELEMETRY LOST`). No emoji, no cartoon speedometers, no arcade HUD clutter.
- **Not slop**: no purple/cyan synthwave grids, no *Fast & Furious* nitrous flames, no generic neon cityscapes, no lens-flare soup, no AI-generated car renders.
- **Originality & clean IP**: never draw real F1®, FIA, or team logos, liveries, or broadcast graphics packages. Every diagram, monocoque silhouette, steering matrix, and scrutineering sheet is our own bespoke industrial design. No realistic human faces or driver portraits anywhere — human presence is felt purely through vocal typography, pulse traces, visor reflections, and steering inputs.

## Palette (see `app/src/engine/palette.ts`)

The palette keeps the engine's nine canonical colour slots, tuned to carbon composite, Nomex paper, incandescent brake glow, and titanium friction:

- **ink** `#08090B` night-asphalt / raw carbon background, **ink2** `#121418` raised telemetry panels and composite weave, **graphite** `#565A61` CAD grid hairlines and secondary channels, **ash** `#9499A1` machined-aluminium mid-tones and annotations, **bone** `#ECEAE4` FIA technical paper / crisp primary type, **signal** `#FF2A1A` telemetry red (the racing trace, brake-disc glow, redline warnings, the sung word), **ember** `#FF7A26` white-hot titanium spark cores and exhaust heat, **blood** `#9E1108` deep rain-light crimson shadows.
- One rare accent, owned by one peak moment: **acid** `#C8FF2E` (purple/green **Sector-Best / DRS Active** flash during Doja Cat's P1 overtake in `overtake`, ~2.5 s). No other hues anywhere else.
- Selected plates invert to **bone technical paper with ink lines** (scrutineering CAD sheets, dyno torque rewrites), giving the edit a sharp light/dark stroboscopic contrast. `signal` red stays punchy on both.
- Only `signal`/`ember` (and the brief `acid` DRS strobe) exceed ~0.85 linear to trigger bloom. `bone` typography stays surgical and un-bloomed at all times.

## Typography

- **Archivo** (variable grotesk, width axis 62–125, weights 300–900): the voice of the vocals and chassis load. Animate width and weight physically — condense (`w62`, tight tracking) under 5G braking compression; stretch (`w125`) down full-throttle straights and held notes.
- **IBM Plex Mono**: the ECU and pit wall — sector splits, RPM/gear readouts, clutch bite percentages, transponder tags, scrutineering stamps, micro-footnotes.
- **Cormorant Garamond** (italic especially): the tunnel-vision / obsession register, used sparingly when cockpit noise drops away into suspended stillness (*"wait for you"*, *"kryptonite"*, the eye of the high-speed storm).
- **Single-stroke fonts** (`stroke.ts`): laser-etched titanium part numbers, CNC toolpaths, and lyrics plotted live by the spark trace.
- **Layout**: Swiss-grid discipline, asymmetric telemetry framing, hairline rules, tiny mono sensor tags anchored beside monumental display type. Avoid centred-subtitle defaults unless symmetry is the graphic joke (e.g. five start pods or a split chicane).
- **Craft**: every proportional line uses the font's kerning (`layout()` / `glyphX()` when split across sung/unsung runs; optical kerning on single-stroke fonts); proper typographic punctuation (’ “ ” … – — × −) everywhere except raw mono ECU logs; no outlined or haloed type.

## Karaoke rules (all plates)

- Every lyric line must be **instantly readable** and **synced per word**: each word triggers at `word.start` and completes by `word.end` (`Lyrics.wordProgress`). Dim anticipation up to ~0.4 s early is fine, but active highlight never outruns the vocal.
- Each plate stages the lyric **mechanically inside its world**: plotted along a velocity trace, stencilled onto painted track kerbs, flashed across steering-wheel shift matrices, laser-cut into carbon plies, stamped on FIA scrutineering forms, or sheared apart by slipstream wake. Words are structural components of the frame, never pasted subtitles.
- Default emphasis: sung portion in `signal` or crisp `bone`, unsung in ~30–40% `bone`/`graphite`.
- Keep lyric text inside the title-safe area (≥ 96 px from frame edges) and clear of active telemetry corners unless safe-area breach is the explicit visual gag (`redzone`).

## Motifs

1. **The spark and its racing line**: a white-hot titanium skid-block point with an `ember`/`signal` halo and deterministic sputtering particle streaks (`sparkHead` + `sparkParticles`), dragging a razor hairline trace. It threads transitions across nearly every plate.
2. **Five lights / Shift-light array**: the 5-pod FIA start gantry in the intro, evolving into the 15-LED steering-wheel shift strip that climbs from bone → ember → rapid-strobing `signal` red at redline.
3. **The G-G friction circle**: a crisp geometric reticle — concentric g-load rings (`1G · 3G · 5G`) and a live traction dot. Calm and centred at idle; pinned against the outer boundary in corners; violently breaching the circle whenever the lyric hits *"lose my mind"*.
4. **RPM / REDLINE**, staged in-world: no permanent corner HUD. Each plate embeds one cameo of the live engine speed in its own idiom (a strip-chart header, a dyno drum, a form field, a radar tag), while the hooks blow the tachometer readout up to full frame (`8,800` → `11,600` → `13,900` → `15,000 LIMITER`).
5. **Pit-wall staging (`clutch`)**: the pre-chorus pauses (*"But I wait for you, still I wait for you"*) share one recurring cockpit lock-in template — clutch bite-point calibration and probabilistic pit-radio transcription holding breath before clutch dump launches the chorus.
6. **The Hook (`hook`)**: *"I might just / LOSE / MY / MIND"* — a recurring full-frame typographic gear-slam that escalates in G-distortion, strobe intensity, and limiter bounce each chorus.

## Plates (scene modules)

Times are approximate across the ~3:29 (`209.1 s`) runtime; exact windows derive from `src/timeline.ts` and aligned word timestamps. Always query lines by content via `Lyrics`, never hard-code timestamps inside scenes.

| id | window | lyric / musical anchor | owner |
|---|---|---|---|
| `lights` | 0:00 → verse 1 | (Zimmer synth pulse, engine warmup, 5 start lights → LIGHTS OUT) | lead |
| `redline` | verse 1 part 1 (Don) | I don't wanna lose my mind… / crossed a line… / myself to blame | A1 |
| `kryptonite` | verse 1 part 2 (Don) | In my world, in my mind, always runnin' out of time… / only kryptonite | A2 |
| `clutch` ×2 | pre1, bridge-pickup | But I wait for you, still I wait for you | A3 |
| `hook` ×3 | chorus 1a, 1b, final | Yeah, it feels so good, I might just lose my mind | A3 |
| `apex` | chorus 1 body | No question if it's wrong or right… / no way to take it slow | A4 |
| `tunnel` | post-chorus break | (instrumental synth drop, sodium tunnel strobes, DRS arming) | A5 |
| `dyno` | verse 2 part 1 (Doja) | Bounce back… / pushin' a new pen, rewritin' the story / nosebleeds | A6 |
| `overtake` | verse 2 part 2 (Doja) | Ain't finna pop… / I run legions / over the top… / this is my season | A5 |
| `waveform` | verse 2 part 3 (Doja) | Itch to pull trigger… / rock bottom… / put it in wave form / game on | A7 |
| `redzone` | final chorus (Don + Doja) | Shared hook + No question… / too late, no way to take it slow | A8 |
| `outro` | outro | (terminal velocity straight, ∞ RPM → TELEMETRY LOST → BOX/RESET loop) | lead |

### `lights` — "Scrutineering & Lights Out"
Inside the bookend crop-mark frame sits a luminous dark CAD scrutineering plate (`ink` ground, hairline `graphite` grid, mono sensor callouts). On each opening synth pulse, laser callouts calibrate chassis datum lines, ride height (`RAKE 1.4°`), and idle `3,200 RPM`. Across the upper third hang **five start-gantry pods**: each bar illuminates one pod in deep `blood` → hot `signal` red with subtle bloom and low-end sub-bass tremor. Half a beat before Don Toliver's first word: **all five lights snap black simultaneously** (`0.000 s REACTION`), the titanium spark ignites at the origin, and the crop-mark frame flies outward past the screen edges on the cut.

### `redline` — "Track limits"
From black, MoTeC telemetry axes draw in (`SPEED`, `HR BPM`, `LAT G`). The spark plots a taut white track-boundary line alongside a jagged `signal` pulse trace; Don's opening lyric (*"I don't wanna lose my mind, I don't wanna lose myself"*) rides directly along the boundary with clinical restraint. On *"Tell me if I crossed a line"*, the orange trace **swerves hard across the white boundary** — an FIA marshal banner stamps `TRACK LIMITS EXCEEDED · LAP DELETED` on the snare, and the camera plunges through the 2D chart floor into a **3D wireframe elevation canyon** of high-speed kerbs and barriers. *"Only got myself to blame"*: camera whips 180° backward down the glowing skid marks left behind.

### `kryptonite` — "Aero wake & structural stress"
Two contrasting halves. First (*"In my world, in my mind, always runnin' out of time"*): a ticking split-timer matrix where every beat shaves tenths in `Plex Mono` (`-0.318` → `+0.042` → `+0.891 OVERDUE`), while wind-tunnel **CFD flow-vis streamlines** sweep across an unseen aerodynamic silhouette, words stretching horizontally into the laminar wake. Second (*"In my love, in my heart, you're the only kryptonite"*): everything slows into eerie wind-tunnel silence; *"kryptonite"* is set in razor **Cormorant italic** at frame centre as finite-element **stress fracture contours** radiate outward through carbon-weave hatching in glowing `signal`/`ember` fissures.

### CLUTCH ×2 `clutch` — params `{variant: 'launch'|'rejoin'}`
Vast dark cockpit void; a single horizontal **clutch bite-point finder** and incoming **pit-wall radio transcript** field. Each sung word types in `Plex Mono` alongside tiny live telemetry candidate readouts (e.g. for *"wait"* → `WAIT 0.68 · BOX NOW 0.19 · PUSH 0.09 · ABORT 0.04`; *"for you"* → `BITE POINT 64.2% · TYRE 98°C · ERS ARMED`).
- `launch` (pre-chorus 1): concentric G-G reticle rings slowly contract toward the centre dot as RPM climbs in tension; on the final *"you"*, `LAUNCH CONTROL READY ⏎` flashes and dumps the clutch straight into `hook` 1.
- `rejoin` (transition pickup before final chorus, if staged, or mid-chorus breath): vertical pit-lane speed-limiter bars hold the typography caged at `80 KM/H` until `PIT EXIT CLEAR` blows the bars off-screen.

### HOOK ×3 `hook` — params `{n: 1..3}`
*"YEAH, IT FEELS SO GOOD"* builds across sequential upshift clicks (`GEAR 5 → 6 → 7 → 8`), then **"LOSE / MY / MIND"** slams full-frame in **Archivo 900**, one monumental word per hit. `"LOSE"` shears laterally under G-load; `"MY"` compresses vertically; `"MIND"` expands from width `62` to `125` as the **RPM tachometer** tears loose from its housing and fills the screen (`11,600` → `13,900` → `15,000 [REV LIMITER]`). Escalation: (1) crisp `bone` on `ink`, surgical; (2) inverted `ink` type on blinding `signal`-orange brake-glow field; (3) maximal dual-vocal climax: rev-limiter 16 Hz strobe, stacked G-load ghost echoes, redline needle bouncing off the stop.

### `apex` — "Blind chicane, no braking"
*"No question if it's wrong or right / Ain't no way to tell which way it's gonna go"*: low-angle ground-effect camera skimming millimetres above serrated track kerbs (`LineBatch` perspective geometry + deterministic spark showers on every kick). On *"wrong or right"*, the glowing racing trace splits symmetrically into left/right chicane trajectories (`L 49.8% / R 50.2%`) and the camera whips violently through the S-bend. *"And now it's too late, no way to take it slow"*: close-up engraved **carbon-ceramic brake rotor** spinning at 2,500 RPM — caliper pads clamp, the ventilated disc blooms incandescent `signal` → `ember`, yet the mono `BRAKE PRESSURE` bar snaps to `0%` (`THROTTLE STUCK 100%`).

### `tunnel` — "Ground-effect tunnel"
The post-chorus Hans Zimmer synth break. Camera hurtles down an endless subterranean Monaco-style concrete curve rendered in stark **engraving hatching** (`engrave` GLSL shader). Overhead light ribs whip past on every 16th note, casting sweeping chiaroscuro bands across the walls; sub-bass hits ripple concentric **aerodynamic shock rings** through the particulate air. At the tail of the break, a crisp mono indicator arms on the horizon: `DRS DETECTION ZONE · GAP < 1.000 s`.

### `dyno` — "Rewriting the lap sheet"
Hard palette inversion: **bone FIA scrutineering paper, crisp ink lines**. Doja Cat crashes in (*"Bounce back when bottles is on me / I'm pushin' a new pen, rewritin' the story"*): a legacy telemetry report gets violently crossed out as a high-speed **CNC plotter head** (the spark acting as `"new pen"`) draws a brutal, steeper dyno torque curve right over the printed grid, plotting her rapid-fire syllables along the rising slope. *"Hello to my old ways, goodbye to the nosebleeds"*: an architectural stadium cross-section zooms at breakneck speed from upper-tier `TIER 4 · NOSEBLEEDS` down 60 metres straight onto `ELEVATION 0.00 m · PIT WALL`.

### `overtake` — "Slipstream & Sector Purple"
*"Ain't finna pop for no reason / I don't throw shots, I run legions"*: top-down **FIA Marshall Track Radar** — 20 numbered transponder pucks (`01`–`20`) streaming around a sleek circuit loop like an armada (`legions`). Puck `01` lights `signal` orange, carving through traffic on every snare. *"I been goin' over the top where no queen been / Die with no regrets, this is my season"*: camera banks into a 3D slipstream tow behind the leader, rear rain-light blinking `blood` red in dirty air — then **DRS FLAP OPENS**, triggering the video's **single `acid` (`#C8FF2E`) accent**: a razor-sharp `SECTOR 2: FASTEST` flash as the trace slingshots "over the top" into clean air at 350 km/h.

### `waveform` — "Bottoming out / Wave form"
High-cadence mechanical percussion synced to Doja's climax. *"Itch to pull trigger"* — carbon paddle-shift micro-switch clicks frame-accurately; *"ripped a new ribbon"* — a taut finish-line tape shears cleanly in two under laser tension. *"You saw me at rock bottom, you wanted a new winner"*: side-profile chassis ride-height gauge slams to `0.0 mm` (`BOTTOMING OUT`) — the titanium skid block strikes asphalt, flooding the lower frame with a horizontal storm of `sparkParticles`. *"Take the pain, doubled it, put it in wave form"*: the chaotic spark shower snaps mathematically onto a single glowing axis and **oscillates as a coupled harmonic standing wave** driven by `f.a.vocal` and `f.a.bass`, doubling amplitude on *"doubled it"*. *"I told 'em all game on the minute I came on"*: all 15 shift-light LEDs slam solid red across the top of the frame, locking straight into the final chorus.

### `redzone` — "Dual telemetry / Beyond the fence"
Don Toliver and Doja Cat collide on the final chorus. **Typographic & mechanical pressure** inside the video's own safe-area guides (`TITLE SAFE 90%`, `TRACTION SAFE 93%`): two intertwined racing traces — one liquid continuous spline (Don), one razor-segmented late-braking vector (Doja) — weave across a macro **carbon-fibre twill weave** (`engrave` + cross-hatch). On each kick, **Archivo** packs tighter and heavier as `G-LOAD` climbs past `5.0G` → `6.4G`, physically shattering the safe-area fences one by one (crop brackets splay and shear off with deadpan ECU fault logs: `SAFE FRAME EXCEEDED`, `THERMAL LIMIT BREACHED`). On *"no way to take it slow"*, an infrared **tyre-carcass thermal band** sweeps the frame, blistering `ember` hot before handing the lone spark into the final straight.

### Outro `outro` — "Terminal velocity & Box/Reset"
The Zimmer synth outro drives down an infinite night main straight — kerb lines converging to a single blinding vanishing point at frame centre. On every bar the RPM instrument breaks past physical limits: `15,000` → `18,000` → `24,000` (with a deadpan mono footnote: `¹ pneumatic valve float exceeded`), then exponential scientific readouts, until the tachometer traces `∞` and flatlines on the final drum hit to `---` (`TELEMETRY LOST`). End card: *"Lose my mind"* set cleanly in **Archivo** + **Cormorant italic** like a wind-tunnel test plate title, underlined by the cooling spark trace. Everything collapses back into one pulsing pit-limiter dot at `(W/2, H/2)` → the **scrutineering crop-mark frame** glides back in from the edges → a crisp mono `[ ↻ BOX / RESET LAP ]` switch appears; a crosshair cursor clicks it, fast-rewinding flashes of every sector (`redzone` → `waveform` → `overtake` → `apex` → `redline`) back to `00:00.000` — five unlit start pods over the CAD setup sheet — parking seamlessly on the video's first frame.

## Technical conventions

See `ENGINE.md`. Deterministic pure functions of `f.t`, per-word vocal sync, chassis-weighted beat motion, hard cuts on downbeats, frame budget < 25 ms/frame.
