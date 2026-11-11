import { synthesize } from './synthesis.js';

export function createSound() {
  let context;
  let master;
  let motor;
  let enabled = false;
  const buffers = new Map();
  const voices = new Set();

  function play(kind, loop = false, offset = 0) {
    if (!enabled || context?.state !== 'running') return;
    if (!buffers.has(kind)) {
      const samples = synthesize(kind, context.sampleRate);
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.copyToChannel(samples, 0);
      buffers.set(kind, buffer);
    }
    const source = context.createBufferSource();
    source.buffer = buffers.get(kind);
    source.loop = loop;
    source.connect(master);
    source.onended = () => { source.disconnect(); voices.delete(source); };
    voices.add(source);
    source.start(0, offset % source.buffer.duration);
    return source;
  }
  function stopMotor() {
    motor?.stop();
    motor = null;
  }
  function silence() {
    stopMotor();
    for (const source of voices) source.stop();
    voices.clear();
  }
  return {
    async enable(value, elapsed = null) {
      if (!value) { enabled = false; silence(); return false; }
      context ??= new AudioContext();
      if (!master) {
        master = context.createGain();
        master.gain.value = 0.7;
        master.connect(context.destination);
      }
      await context.resume();
      enabled = context.state === 'running';
      if (enabled && elapsed !== null) this.start(elapsed);
      return enabled;
    },
    start(elapsed = 0) {
      silence();
      motor = play('motor', true, elapsed / 1000);
      if (elapsed === 0) play('latch');
    },
    finish(success) {
      stopMotor();
      play('latch');
      if (!success) play('alarm');
    },
    silence,
  };
}
