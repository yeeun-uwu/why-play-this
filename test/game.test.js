import test from 'node:test';
import assert from 'node:assert/strict';
import { resultAt, displayTime, readBest, saveBest } from '../public/microwave/rules.js';

test('closer to zero earns more, but zero and late stops lose', () => {
  assert.equal(resultAt(0).score, 0);
  assert.equal(resultAt(9000).score, 900);
  assert.equal(resultAt(9900).score, 990);
  assert.equal(resultAt(9999).score, 999);
  assert.equal(resultAt(9999).remaining, 1);
  assert.equal(resultAt(10000).success, false);
  assert.equal(resultAt(10100).score, 0);
});

test('the countdown shows whole seconds, never zero before the deadline', () => {
  assert.equal(displayTime(0), '00:10');
  assert.equal(displayTime(1000), '00:09');
  assert.equal(displayTime(9999), '00:01');
  assert.equal(displayTime(10000), '00:00');
});

test('bad clocks cannot produce a winning result', () => {
  for (const value of [NaN, Infinity, -1]) assert.equal(resultAt(value).success, false);
});

test('best record keeps the closer stop, including scores that tie', () => {
  const storage = { value: null, getItem() { return this.value; }, setItem(key, value) { this.value = value; } };
  assert.equal(readBest(storage), null);
  saveBest(storage, 55);
  saveBest(storage, 80);
  assert.equal(readBest(storage), 55);
  saveBest(storage, 54);
  assert.equal(readBest(storage), 54);
  saveBest(storage, 0);
  assert.equal(readBest(storage), 54);
});

test('unavailable or malformed browser storage never prevents playing', () => {
  for (const value of ['NaN', '-1', '0', '10001', '"hello"', '{}']) {
    assert.equal(readBest({ getItem: () => value }), null);
  }
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.equal(readBest(denied), null);
  assert.equal(saveBest(denied, 20), false);
});
