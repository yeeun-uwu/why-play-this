import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceMotion } from '../public/microwave/prototype/motion.js';
test('turntable accelerates and settles at its stopped angle', () => {
  let state = { speed: 0, angle: 0 };
  for (let i = 0; i < 120; i++) state = advanceMotion(state.speed, state.angle, true, 1 / 60);
  assert.ok(state.speed > .69 && state.angle > 1);
  for (let i = 0; i < 120; i++) state = advanceMotion(state.speed, state.angle, false, 1 / 60);
  assert.equal(state.speed, 0);
  assert.equal(advanceMotion(state.speed, state.angle, false, 1 / 60).angle, state.angle);
});
