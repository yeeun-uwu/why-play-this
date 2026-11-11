import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWrapperGeometry, wrapperPoint } from '../public/microwave/prototype/dumpling.js';

test('wrapper has tapered tips, a raised half-moon crest and a flat base', () => {
  const geometry = createWrapperGeometry();
  assert.ok([...geometry.attributes.position.array, ...geometry.attributes.normal.array].every(Number.isFinite));
  for (const u of [0, 1]) assert.ok(wrapperPoint(u, 0).distanceTo(wrapperPoint(u, .5)) < 1e-6);
  for (const u of [.16, .27, .51, .74, .84]) {
    assert.ok(wrapperPoint(u, 0).distanceTo(wrapperPoint(u, 1)) < 1e-6);
  }
  assert.ok(wrapperPoint(.5, 0).y > .5);
  assert.ok(Math.abs(wrapperPoint(.5, .5).y - .035) < 1e-6);
  assert.ok(wrapperPoint(.5, .25).distanceTo(wrapperPoint(.5, .75)) < .4);
  for (const u of [.26, .38, .52, .76]) {
    const lipWidth = Math.abs(wrapperPoint(u, .06).z - wrapperPoint(u, .94).z);
    const bellyWidth = Math.abs(wrapperPoint(u, .25).z - wrapperPoint(u, .75).z);
    assert.ok(lipWidth < bellyWidth * .1, 'pinched lip stays much thinner than the filling');
  }
  // The crest must face outward so the shell is visible with back-face culling.
  const crest = 48;
  assert.ok(geometry.attributes.normal.getY(crest) > .9);
  geometry.dispose();
});
