import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as rules from '../public/microwave/rules.js';

// Execute the real controller with a clock and the DOM surface it uses.
function game() {
  class Element {
    textContent = '';
    dataset = {};
    hidden = false;
    listeners = {};
    addEventListener(type, listener) { this.listeners[type] = listener; }
    closest() { return this.interactive ? this : null; }
    setAttribute(name, value) { this[name] = value; }
  }
  const elements = Object.fromEntries(['timer', 'action', 'microwave', 'message', 'detail', 'result', 'sound', 'best', 'storage-note'].map(id => [id, new Element()]));
  elements.action.interactive = true;
  elements.sound.interactive = true;
  const document = new Element();
  document.querySelector = selector => elements[selector.slice(1)];
  const audioEvents = [];
  let enabled = false;
  const audio = {
    async enable(value, elapsed) { enabled = value; audioEvents.push(['enable', value, elapsed]); return value; },
    start() { audioEvents.push(['start', enabled]); },
    finish(success) { audioEvents.push(['finish', success]); },
  };
  let now = 0;
  let nextFrame;
  vm.runInNewContext(readFileSync(new URL('../public/microwave/game.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').split('// The game remains playable')[0], {
    ...rules, createSound: () => audio, document, window: {}, performance: { now: () => now },
    requestAnimationFrame: callback => { nextFrame = callback; return 1; },
    cancelAnimationFrame: () => { nextFrame = null; },
  });
  return {
    elements, audioEvents,
    sound() { return elements.sound.listeners.click(); },
    advance(ms) { now += ms; },
    frame() { nextFrame?.(); },
    click() { elements.action.listeners.click(); },
    key({ repeat = false, target = elements.action } = {}) {
      document.listeners.keydown({ code: 'Space', target, repeat, preventDefault() {} });
    },
    hide() { document.hidden = true; document.listeners.visibilitychange(); },
  };
}

test('held Space cannot stop the round, another press can, and retry starts fresh', () => {
  const g = game();
  g.key();
  g.advance(9000);
  g.key({ repeat: true });
  assert.equal(g.elements.microwave.dataset.state, 'running');
  g.key();
  assert.equal(g.elements.result.textContent, '1.000초 남김 · 900점');
  g.key();
  assert.equal(g.elements.timer.textContent, '00:10');
  assert.equal(g.elements.result.hidden, true);
});

test('a late click loses even before the next animation frame runs', () => {
  const g = game();
  g.click();
  g.advance(10000);
  g.click();
  assert.equal(g.elements.microwave.dataset.state, 'failure');
  assert.equal(g.elements.result.textContent, '0.000초 남김 · 0점');
});

test('deadline frame ends the round and hidden pages cannot preserve a running attempt', () => {
  const g = game();
  g.click();
  g.advance(10001);
  g.frame();
  assert.equal(g.elements.microwave.dataset.state, 'failure');
  g.click();
  g.hide();
  assert.equal(g.elements.microwave.dataset.state, 'failure');
});

test('Space on sound control does not start the game', () => {
  const g = game();
  g.key({ target: g.elements.sound });
  assert.equal(g.elements.action.textContent, '돌리기');
});

test('fractional winning time stays positive and missing storage does not break replay', () => {
  const g = game();
  g.click();
  g.advance(9999.9);
  g.click();
  assert.equal(g.elements.result.textContent, '0.001초 남김 · 999점');
  assert.equal(g.elements.best.textContent, '999점 · 0.001초 남김');
  assert.match(g.elements['storage-note'].textContent, /이번 페이지/);
  g.click();
  assert.equal(g.elements.microwave.dataset.state, 'running');
});


test('audio tracks running state when toggled and stops on success and failure', async () => {
  const g = game();
  g.click();
  g.advance(500);
  await g.sound();
  assert.deepEqual(g.audioEvents.at(-1), ['enable', true, 500]);
  g.click();
  assert.deepEqual(g.audioEvents.at(-1), ['finish', true]);
  g.click();
  assert.deepEqual(g.audioEvents.at(-1), ['start', true]);
  g.advance(10000);
  g.frame();
  assert.deepEqual(g.audioEvents.at(-1), ['finish', false]);
  await g.sound();
  assert.deepEqual(g.audioEvents.at(-1), ['enable', false, null]);
});

test('critical cue begins at three seconds and replay clears the previous result timing', () => {
  const g = game();
  g.click();
  g.advance(6999); g.frame();
  assert.equal(g.elements.microwave.dataset.critical, 'false');
  g.advance(1); g.frame();
  assert.equal(g.elements.microwave.dataset.critical, 'true');
  g.click();
  assert.equal(g.elements.microwave.dataset.elapsed, '7000');
  assert.equal(g.elements.microwave.dataset.critical, 'false');
  g.advance(1500);
  assert.equal(g.elements.microwave.dataset.elapsed, '7000');
  g.click();
  assert.equal(g.elements.microwave.dataset.elapsed, '0');
  assert.equal(g.elements.microwave.dataset.finished, '');
  assert.equal(g.elements.microwave.dataset.critical, 'false');
});
