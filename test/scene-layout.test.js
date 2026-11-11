import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneLayout } from '../public/microwave/scene-layout.js';

test('painted controls remain visible on mobile, desktop and short landscape screens', () => {
  for (const [w, h] of [[320, 568], [390, 796], [1280, 672], [844, 330]]) {
    const box = sceneLayout(w, h);
    assert.ok(box.width <= w);
    assert.equal(box.width / box.height, 2 / 3);
    for (const [x, y] of [[215, 175], [218, 224]]) {
      const left = box.left + x * box.scale;
      const top = box.top + y * box.scale;
      assert.ok(left - 22 >= 0 && left + 22 <= w);
      assert.ok(top - 22 >= 0 && top + 22 <= h);
    }
  }
});

test('last three seconds build tension, food freezes at elapsed time, and failure has a staged punchline', async () => {
  const { sceneBeat } = await import('../public/microwave/scene-layout.js');
  assert.equal(sceneBeat('running', 6999).tension, 0);
  assert.equal(sceneBeat('running', 8500).tension, .5);
  assert.equal(sceneBeat('running', 10000).tension, 1);
  assert.equal(sceneBeat('success', 8500).light, false);
  assert.equal(sceneBeat('success', 8500, 0).foodFrame, sceneBeat('success', 8500, 5000).foodFrame);
  assert.equal(sceneBeat('failure', 10000, 649).family, false);
  assert.equal(sceneBeat('failure', 10000, 650).family, true);
  assert.equal(sceneBeat('failure', 10000, 1199).dialogue, false);
  assert.equal(sceneBeat('failure', 10000, 1200).dialogue, true);
  for (const [w, h] of [[320, 568], [390, 796], [1280, 672], [844, 330]]) {
    const b = sceneLayout(w, h, 1);
    assert.ok(b.left + 218 * b.scale + 22 < w);
    assert.ok(b.top + 224 * b.scale + 22 < h);
  }
});
