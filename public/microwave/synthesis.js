// Deterministic noise keeps the loop reproducible and testable without audio hardware.
export function synthesize(kind, rate = 44100) {
  const seconds = kind === 'motor' ? 2 : kind === 'alarm' ? 1.5 : 0.12;
  const samples = new Float32Array(Math.ceil(rate * seconds));
  let seed = 32841;
  let low = 0;
  let previous = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = seed / 2147483648 - 1;
    low += 0.09 * (noise - low);
    let value;
    if (kind === 'motor') {
      const fan = low * 0.32 * (0.9 + 0.1 * Math.sin(2 * Math.PI * 23 * t));
      const motor = (Math.sin(2 * Math.PI * 60 * t) * 0.13
        + Math.sin(2 * Math.PI * 120 * t) * 0.065
        + Math.sin(2 * Math.PI * 180 * t) * 0.025
        + Math.sin(2 * Math.PI * 357 * t) * 0.008)
        * (0.94 + 0.06 * Math.sin(2 * Math.PI * 3 * t));
      // Fan rattle and a dry mechanical escapement, rather than a pitched metronome.
      const tickTime = t % 0.5;
      const tick = (noise - previous) * Math.exp(-tickTime * 220) * 0.09;
      value = fan + motor + tick;
      const edge = Math.min(1, i / 220, (samples.length - 1 - i) / 220);
      value *= edge;
    } else if (kind === 'alarm') {
      const pulse = t % 0.5;
      const envelope = pulse < 0.26 ? Math.min(1, pulse / 0.008, (0.26 - pulse) / 0.018) : 0;
      value = envelope * (Math.sin(2 * Math.PI * 2450 * t) * 0.16 + Math.sin(2 * Math.PI * 4900 * t) * 0.025);
    } else {
      value = low * Math.exp(-t * 48) * 0.8 + Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 70) * 0.15;
    }
    samples[i] = value;
    previous = noise;
  }
  return samples;
}
