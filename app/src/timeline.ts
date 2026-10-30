// The edit: which F1 telemetry plate plays when. Boundaries are anchored to lyric lines
// in `data/lyrics.json` and snapped to the constant 110 BPM beat grid (`data/audio.json`).
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

// Scene modules are discovered lazily so a missing/broken scene never breaks the build.
const modules = import.meta.glob<{ default: SceneClass }>('./scenes/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** Cut on the last beat at/before the first word of the matching line (never after the word). */
  const cut = (q: string, nth = 0, tol = 0.03) => {
    const s = ly.get(q, nth).words[0]!.start;
    return au.timeOfBeat(Math.floor(au.beatAt(s + tol)));
  };
  /** Nearest downbeat to the end of a line. */
  const after = (q: string, nth = 0) => {
    const e = ly.get(q, nth).end;
    return au.downbeats.reduce((b, d) => (Math.abs(d - e) < Math.abs(b - e) ? d : b), au.downbeats[0] ?? e);
  };

  const b = {
    redline: cut("I don't wanna lose my mind"),
    krypto: cut('In my world'),
    clutch1: cut('But I, but I wait'),
    hook1: au.timeOfBeat(Math.round(au.beatAt(51.0))), // Retimed to downbeat/beat at ~51s (51.03s)
    apex1: cut("No question if it's wrong or right", 0),
    hook2: cut('But it feels so good', 0),
    apex2: cut("No question if it's wrong or right", 1),
    tunnel: after('no way to take it slow', 0),
    dyno: cut('Bounce back when bottles'),
    overtake: cut("Ain't finna pop"),
    waveform: cut('Itch to pull trigger'),
    hook3: au.nearestBeat(140.0), // Detik 140 (139.938s downbeat)
    redzone1: cut("No question if it's wrong or right", 2),
    hook4: cut('But it feels so good', 1),
    redzone2: cut("No question if it's wrong or right", 3),
    outro: au.sections.find((x) => x.name === 'outro')?.start ?? after('no way to take it slow', 1),
    end: au.duration,
  };

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  return [
    E('lights', 'lights', 0, b.redline),
    E('redline', 'redline', b.redline, b.krypto),
    E('kryptonite', 'kryptonite', b.krypto, b.clutch1),
    E('clutch1', 'clutch', b.clutch1, b.hook1, { params: { variant: 'launch' } }),
    E('hook1', 'hook', b.hook1, b.apex1, { params: { n: 1 } }),
    E('apex', 'apex', b.apex1, b.hook2),
    E('hook2', 'hook', b.hook2, b.apex2, { params: { n: 2 } }),
    E('apex2', 'apex', b.apex2, b.tunnel),
    E('tunnel', 'tunnel', b.tunnel, b.dyno),
    E('dyno', 'dyno', b.dyno, b.overtake),
    E('overtake', 'overtake', b.overtake, b.waveform),
    E('waveform', 'waveform', b.waveform, b.hook3),
    E('hook3', 'hook', b.hook3, b.redzone1, { params: { n: 3 } }),
    E('redzone', 'redzone', b.redzone1, b.hook4),
    E('hook4', 'hook', b.hook4, b.redzone2, { params: { n: 4 } }),
    E('redzone2', 'redzone', b.redzone2, b.outro),
    E('outro', 'outro', b.outro, b.end),
  ];
}
