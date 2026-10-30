import { hexToLinear } from './util';

// F1 / High-Speed Motorsport Telemetry palette:
// Carbon/asphalt darks, FIA Nomex/technical bone, incandescent brake/telemetry red,
// titanium skid-spark ember, and one rare DRS / Fastest-Sector acid accent — see docs/TREATMENT.md.
export const HEX = {
  ink: '#08090B', // night asphalt / raw carbon background
  ink2: '#121418', // raised telemetry panels & composite weave
  graphite: '#565A61', // CAD grid hairlines, secondary channels
  ash: '#9499A1', // machined aluminium annotations
  bone: '#ECEAE4', // FIA technical paper, crisp primary type
  signal: '#FF2A1A', // telemetry red: racing trace, brake glow, redline, sung word
  ember: '#FF7A26', // white-hot titanium spark cores & exhaust heat
  blood: '#9E1108', // deep rain-light crimson shadows
  acid: '#C8FF2E', // rare Sector-Best / DRS Active flash (overtake scene only)
} as const;

export type PaletteKey = keyof typeof HEX;

/** Linear RGB triplets for GL uniforms. */
export const LIN: Record<PaletteKey, [number, number, number]> = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)]),
) as Record<PaletteKey, [number, number, number]>;

/** CSS rgba() for Canvas2D. */
export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
