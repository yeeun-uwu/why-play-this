import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, kick, step, EXIT, DESK } from '../public/chair/rules.js';
import { ROUTE_TYPES, RARITIES, CATEGORIES, makeRecord, earnedTypes, featuredType, readCollection, STORAGE_KEY } from '../public/chair/records.js';
import { readFileSync } from 'node:fs';

test('32 collectible types have unique identities, four rarities, and four complete chapters', () => {
  assert.equal(ROUTE_TYPES.length, 32);
  assert.equal(new Set(ROUTE_TYPES.map(type => type.id)).size, 32);
  assert.equal(Object.keys(RARITIES).length, 4);
  for (const id of Object.keys(CATEGORIES)) assert.equal(ROUTE_TYPES.filter(type => type.category === id).length, 8);
  for (const type of ROUTE_TYPES) {
    assert.ok(RARITIES[type.rarity]); assert.ok(CATEGORIES[type.category]);
    assert.ok(type.name && type.hint && type.matches);
  }
});

test('braking, turning, and moving kicks are measured from velocity before an impulse', () => {
  const game = createGame();
  kick(game, 100, 0);
  kick(game, -20, 0);
  kick(game, 0, -60);
  assert.equal(game.stats.brakes, 1);
  assert.equal(game.stats.turns, 1);
  assert.equal(game.stats.rollingKicks, 2);
  assert.equal(game.stats.maxPower, 100 / 110);
});

test('impact measurement distinguishes the wall, desk, and movable bin', () => {
  const wall = createGame(); wall.status = 'playing';
  Object.assign(wall.chair, {x: 50, y: 500, vx: -100}); step(wall, 1/120);
  assert.equal(wall.stats.wallHits, 1); assert.equal(wall.stats.deskHits, 0);
  const desk = createGame(); desk.status = 'playing';
  Object.assign(desk.chair, {x: DESK.x - 23, y: DESK.y + 35, vx: 200, vy: -70}); step(desk, 1/120);
  assert.equal(desk.stats.deskHits, 1);
  const bin = createGame(); bin.status = 'playing';
  Object.assign(bin.chair, {x: bin.bin.x - 41, y: bin.bin.y, vx: 220}); step(bin, 1/120);
  assert.equal(bin.stats.binHits, 1);
});

test('passing through the elevator and accumulated spin are recorded without ending a moving round', () => {
  const game = createGame(); game.status = 'playing';
  Object.assign(game.chair, {x: EXIT.x + 60, y: EXIT.y + 60, vx: 40, spin: 3});
  step(game, 1/120);
  assert.equal(game.stats.enteredExit, true);
  assert.ok(game.stats.totalRotation > 0);
  assert.equal(game.status, 'playing');
});

test('legacy collected routes remain readable without new telemetry or retroactive unlocks', () => {
  const old = { status:'miss', used:3, hits:0, distance:20, gap:400, binMoved:0, fromStart:20, path:[[116,548],[136,548]], pushes:[[116,548]], bin:[396,250] };
  const stored = { lost:old };
  assert.deepEqual(readCollection({getItem: key => key === STORAGE_KEY ? JSON.stringify(stored) : null}), stored);
  assert.ok(!earnedTypes(old).some(type => type.id === 'brake'));
  const invalid = {...old, metrics:{brakes:'many'}};
  assert.deepEqual(readCollection({getItem:()=>JSON.stringify({lost:invalid})}), {});
});

test('new records persist independent telemetry with meaningful force and direction facts', () => {
  const game = createGame();
  for (const [dx,dy] of [[0,30],[30,0],[0,30]]) kick(game,dx,dy);
  for (let i=0;i<1200;i++) step(game,1/120);
  const record = makeRecord(game);
  assert.equal(record.metrics.firstDown, true);
  assert.equal(record.metrics.zigzag, true);
  const count = record.metrics.wallHits;
  game.stats.wallHits += 10;
  assert.equal(record.metrics.wallHits, count);
});

test('a newly earned type takes priority over an old rare result, then rarity breaks ties', () => {
  const record = {status:'miss', used:3, hits:0, distance:400, gap:1, binMoved:0, fromStart:300, metrics:{enteredExit:true}};
  assert.equal(featuredType(record).id, 'one_cm');
  assert.equal(featuredType(record, ['close']).id, 'close');
  assert.equal(featuredType(record, ['close','one_cm']).id, 'one_cm');
});

test('all 32 types have legal-input witnesses and their saved records pass validation', () => {
  const fixtures = JSON.parse(readFileSync(new URL('./fixtures/chair-rarity-routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(fixtures).sort(), ROUTE_TYPES.map(type => type.id).sort());
  for (const [id, { seed, inputs }] of Object.entries(fixtures)) {
    assert.ok(Number.isInteger(seed) && seed > 0, `${id} uses a real randomized layout`);
    const game = createGame(seed);
    for (const [dx,dy,frames] of inputs) {
      assert.equal(kick(game,dx,dy), true, id);
      for (let i=0;i<frames;i++) step(game,1/120);
    }
    for (let i=0;i<900 && game.status==='playing';i++) step(game,1/120);
    const record = makeRecord(game);
    assert.ok(earnedTypes(record).some(type => type.id===id), `${id} is attainable`);
    const stored = {[id]:record};
    assert.deepEqual(readCollection({getItem:()=>JSON.stringify(stored)}), stored, `${id} survives reload`);
  }
});
