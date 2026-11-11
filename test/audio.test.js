import test from 'node:test';
import assert from 'node:assert/strict';
import { synthesize } from '../public/microwave/synthesis.js';
import { createSound } from '../public/microwave/audio.js';

test('sound buffers contain bounded, non-silent samples with a seamless motor edge', () => {
  for (const kind of ['motor', 'latch', 'alarm']) {
    const samples = synthesize(kind, 22050);
    let energy = 0;
    for (const value of samples) {
      assert.ok(Number.isFinite(value) && Math.abs(value) < 1);
      energy += value * value;
    }
    assert.ok(energy / samples.length > .00001);
    if (kind === 'motor') {
      assert.equal(samples.length, 44100);
      assert.equal(samples[0], 0);
      assert.equal(Math.abs(samples.at(-1)), 0);
    }
    if (kind === 'alarm') {
      assert.equal(samples[Math.floor(.35 * 22050)], 0);
      assert.equal(samples[Math.floor(.85 * 22050)], 0);
    }
  }
});

test('motor loops at the current time and all sound sources stop on mute', async () => {
  const sources = [];
  class Context {
    state = 'running'; sampleRate = 22050; destination = {};
    async resume() {}
    createGain() { return { gain: {}, connect() {} }; }
    createBuffer(channels, length, rate) { return { duration: length / rate, copyToChannel() {} }; }
    createBufferSource() {
      const source = { connect() {}, disconnect() {}, start(time, offset) { this.offset = offset; }, stop() { this.stopped = true; } };
      sources.push(source);
      return source;
    }
  }
  const original = globalThis.AudioContext;
  globalThis.AudioContext = Context;
  try {
    const sound = createSound();
    sound.start();
    assert.equal(sources.length, 0);
    await sound.enable(true, 3500);
    assert.equal(sources[0].loop, true);
    assert.equal(sources[0].offset, 1.5);
    sound.finish(false);
    assert.equal(sources[0].stopped, true);
    assert.equal(sources.length, 3);
    await sound.enable(false);
    assert.ok(sources.every(source => source.stopped));
    await sound.enable(true);
    sound.start();
    assert.equal(sources.at(-2).loop, true);
    sound.finish(true);
    assert.equal(sources.at(-2).buffer.duration, .12);
    assert.equal(sources.at(-1).buffer.duration, .12);
  } finally {
    if (original === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = original;
  }
});
