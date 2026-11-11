import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, kick, step, isParked, WORLD, DESK, EXIT, MAX_DRAG } from '../public/chair/rules.js';

function settle(game) {
  for (let i = 0; i < 1500; i++) step(game, 1 / 120);
}

test('three kicks only; invalid input and tiny drags do not spend a kick', () => {
  const game = createGame();
  for (const [x, y] of [[0, 0], [2, 2], [NaN, 2], [Infinity, 3]]) assert.equal(kick(game, x, y), false);
  assert.equal(game.kicks, 3);
  for (let i = 0; i < 3; i++) assert.equal(kick(game, 20, 0), true);
  assert.equal(kick(game, 20, 0), false);
  assert.equal(game.kicks, 0);
});

test('long drags clamp power; an opposite kick brakes existing movement', () => {
  const a = createGame();
  const b = createGame();
  kick(a, MAX_DRAG, 0);
  kick(b, MAX_DRAG * 10, 0);
  assert.ok(Math.abs(a.chair.vx - b.chair.vx) < 1e-9);
  kick(a, -MAX_DRAG, 0);
  assert.equal(a.chair.vx, 0);
});

test('a strong reverse kick stops a coasting chair instead of launching it backward', () => {
  const game = createGame();
  kick(game, 80, 0);
  for (let i = 0; i < 180; i++) step(game, 1 / 120);
  assert.ok(game.chair.vx > 62 && game.chair.vx < 64);
  kick(game, -110, 0);
  assert.equal(game.chair.vx, 0);
  assert.equal(game.chair.vy, 0);
  assert.equal(game.stats.brakes, 1);
  assert.equal(game.kicks, 1);
});

test('diagonal reverse kicks slow the current travel without adding sideways speed', () => {
  const game = createGame();
  kick(game, 100, 0);
  kick(game, -20, 10);
  assert.ok(game.chair.vx > 0 && game.chair.vx < 300);
  assert.equal(game.chair.vy, 0);
  assert.equal(game.stats.brakes, 1);
});

test('braking cannot reverse slow movement; a later kick can launch a stopped chair', () => {
  for (const speed of [1, 20, 39, 40, 63]) {
    const game = createGame();
    game.chair.vx = speed;
    kick(game, -110, 0);
    assert.equal(game.chair.vx, 0, `speed ${speed}`);
    assert.equal(game.stats.brakes, speed >= 40 ? 1 : 0);
    kick(game, -20, 0);
    assert.equal(game.chair.vx, -60);
  }
});

test('friction stops the chair; a spent attempt fails and restart restores everything', () => {
  const game = createGame();
  kick(game, 10, 0);
  kick(game, 10, 0);
  kick(game, 10, 0);
  settle(game);
  assert.equal(game.chair.vx, 0);
  assert.equal(game.status, 'miss');
  assert.ok(game.trail.length > 1);
  assert.equal(kick(game, 40, 0), false);
  assert.equal(createGame().kicks, 3);
  assert.equal(createGame().status, 'ready');
});

test('success requires the whole chair inside and stopped; passing through does not win', () => {
  const game = createGame();
  Object.assign(game.chair, { x: EXIT.x + 65, y: EXIT.y + 60, vx: 20 });
  game.status = 'playing';
  step(game, 1 / 120);
  assert.equal(game.status, 'playing');
  assert.equal(isParked(game.chair), true);
  game.chair.vx = 0;
  settle(game);
  assert.equal(game.status, 'win');
  game.chair.x = EXIT.x + game.chair.r - 1;
  assert.equal(isParked(game.chair), false);
});

test('desk impacts bounce and spin; walls contain maximum-speed kicks', () => {
  const game = createGame();
  game.status = 'playing';
  Object.assign(game.chair, { x: DESK.x - 23, y: DESK.y + 35, vx: 200, vy: -70 });
  step(game, 1 / 120);
  assert.ok(game.chair.vx < 0);
  assert.ok(Math.abs(game.chair.spin) > 0);
  assert.equal(game.hits, 1);
  for (let i = 0; i < 3; i++) kick(game, -110, -110);
  settle(game);
  assert.ok(game.chair.x >= WORLD.left + game.chair.r);
  assert.ok(game.chair.y >= WORLD.top + game.chair.r);
});

test('the bin receives momentum instead of acting as a fixed wall', () => {
  const game = createGame();
  game.status = 'playing';
  Object.assign(game.chair, { x: game.bin.x - game.bin.r - game.chair.r - 1, y: game.bin.y, vx: 220 });
  step(game, 1 / 120);
  assert.ok(game.bin.vx > 0);
  assert.ok(game.chair.vx < 220);
  assert.equal(game.hits, 1);
});

test('an intentional three-kick route can reach the elevator', () => {
  const game = createGame();
  kick(game, 0, -95);
  settle(game);
  kick(game, 89, 0);
  settle(game);
  kick(game, 0, -54);
  settle(game);
  assert.equal(game.status, 'win');
});
