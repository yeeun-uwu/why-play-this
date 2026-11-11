import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, kick, step, EXIT } from '../public/chair/rules.js';
import { makeRecord, earnedTypes, collectRecord, readCollection, saveCollection, STORAGE_KEY } from '../public/chair/records.js';

function finished() {
  const game = createGame();
  for (let i = 0; i < 3; i++) kick(game, 10, 0);
  for (let i = 0; i < 1200; i++) step(game, 1 / 120);
  return makeRecord(game);
}
const originalIds = new Set(['clean', 'bumpy', 'pinball', 'bin', 'close', 'return', 'lost']);
const ids = record => earnedTypes(record).map(type => type.id).filter(id => originalIds.has(id));

test('only ended attempts produce a snapshot, including the actual final point', () => {
  assert.equal(makeRecord(createGame()), null);
  const game = createGame();
  game.status = 'miss'; game.kicks = 0;
  game.chair.x += 1;
  const record = makeRecord(game);
  assert.deepEqual(record.path.at(-1), [117, 548]);
  assert.equal(record.distance, 1);
  assert.equal(record.used, 3);
});

test('route types follow gameplay facts and exact thresholds, not random scores', () => {
  const record = finished();
  assert.deepEqual(ids(record), ['lost']);
  assert.deepEqual(ids({ ...record, status: 'win', hits: 0 }), ['clean']);
  assert.deepEqual(ids({ ...record, status: 'win', hits: 1 }), ['bumpy']);
  assert.ok(!ids({ ...record, hits: 2 }).includes('pinball'));
  assert.ok(ids({ ...record, hits: 3 }).includes('pinball'));
  assert.ok(!ids({ ...record, binMoved: 59 }).includes('bin'));
  assert.ok(ids({ ...record, binMoved: 60 }).includes('bin'));
  assert.ok(ids({ ...record, gap: 35 }).includes('close'));
  assert.ok(!ids({ ...record, gap: 36 }).includes('close'));
  assert.ok(ids({ ...record, distance: 180, fromStart: 50 }).includes('return'));
  assert.ok(!ids({ ...record, distance: 179, fromStart: 50 }).includes('return'));
  assert.ok(!ids({ ...record, distance: 180, fromStart: 51 }).includes('return'));
});

test('one attempt can unlock several types; replay never replaces their first route', () => {
  const record = { ...finished(), status: 'win', hits: 3, binMoved: 60 };
  const collection = {};
  assert.deepEqual(collectRecord(collection, record).filter(id => originalIds.has(id)), ['bumpy', 'pinball', 'bin']);
  const first = structuredClone(collection);
  assert.deepEqual(collectRecord(collection, { ...record, hits: 8 }), []);
  assert.deepEqual(collection, first);
});

test('snapshots are detached and bounded even after a long route', () => {
  const game = createGame();
  game.status = 'miss'; game.kicks = 0;
  game.trail = Array.from({ length: 2000 }, (_, i) => ({ x: 100 + i % 100, y: 300 }));
  const record = makeRecord(game);
  assert.ok(record.path.length <= 162);
  const original = record.path[0][0];
  game.trail[0].x = 1;
  assert.equal(record.path[0][0], original);
});

test('collection survives reload and rejects malformed entries individually', () => {
  const map = new Map();
  const storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const record = finished();
  const collection = {};
  collectRecord(collection, record);
  assert.equal(saveCollection(storage, collection), true);
  assert.deepEqual(readCollection(storage), collection);
  map.set(STORAGE_KEY, JSON.stringify({ lost: record, close: { ...record, path: [[99999, -1]] }, surprise: record }));
  assert.deepEqual(readCollection(storage), { lost: record });
  for (const raw of ['{', 'null', '[]', '"text"', JSON.stringify({ lost: { ...record, hits: '3' } }), JSON.stringify({ lost: { ...record, path: Array(2000).fill([0, 0]) } })]) {
    map.set(STORAGE_KEY, raw);
    assert.deepEqual(readCollection(storage), {});
  }
});

test('blocked or full storage never prevents play or destroys this page collection', () => {
  const collection = {};
  collectRecord(collection, finished());
  const denied = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.deepEqual(readCollection(denied), {});
  assert.deepEqual(readCollection(undefined), {});
  assert.equal(saveCollection(denied, collection), false);
  assert.ok(collection.lost);
});

test('a real clean successful route earns the corresponding collection card', () => {
  const game = createGame();
  for (const [x, y] of [[0, -95], [89, 0], [0, -54]]) {
    kick(game, x, y);
    for (let i = 0; i < 600; i++) step(game, 1 / 120);
  }
  const record = makeRecord(game);
  assert.deepEqual(ids(record), ['clean']);
  assert.equal(record.gap, 0);
  assert.ok(record.path.at(-1)[0] > EXIT.x);
});

test('every collection type is reachable with legal kicks and real physics', () => {
  const routes = {
    lost: [[-94, -11], [17, -21], [-7, -88]],
    return: [[48, 55], [-23, 96], [-50, 17]],
    pinball: [[1, 40], [-85, -6], [68, -65]],
    bumpy: [[85, -24], [25, -94]],
    clean: [[5, -74], [-12, -27], [78, -57]],
    close: [[-32, -94], [70, -22], [50, -4]],
    bin: [[104, -27], [58, -93], [12, -39]],
  };
  for (const [type, inputs] of Object.entries(routes)) {
    const game = createGame();
    for (const [x, y] of inputs) {
      assert.equal(kick(game, x, y), true);
      for (let i = 0; i < 600; i++) step(game, 1 / 120);
    }
    assert.ok(ids(makeRecord(game)).includes(type), `${type} must be attainable`);
  }
});
