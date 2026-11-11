import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, kick, step, WORLD, DESK, EXIT } from '../public/chair/rules.js';
import { makeRecord, ROUTE_TYPES, earnedTypes, conditionHint, readCollection } from '../public/chair/records.js';

test('a layout seed restores both starts and other seeds change the arrangement', () => {
  assert.deepEqual(createGame(123).spawn, createGame(123).spawn);
  assert.notDeepEqual(createGame(123).spawn, createGame(987654).spawn);
  const game=createGame(123); game.chair.x+=50; game.bin.y-=20;
  assert.deepEqual(createGame(123).spawn, game.spawn);
  assert.notEqual(game.chair.x, game.spawn.chair.x);
});

test('random starts do not overlap walls, desk, exit, or each other', () => {
  for(let seed=1;seed<=1000;seed++) {
    const game=createGame(seed*2654435761);
    for(const body of [game.chair,game.bin]) {
      assert.ok(body.x-body.r>WORLD.left && body.x+body.r<WORLD.right);
      assert.ok(body.y-body.r>WORLD.top && body.y+body.r<WORLD.bottom);
      assert.ok(body.x+body.r<DESK.x || body.x-body.r>DESK.x+DESK.w || body.y-body.r>DESK.y+DESK.h);
      assert.ok(body.y-body.r>EXIT.y+EXIT.h);
    }
    assert.ok(Math.hypot(game.chair.x-game.bin.x,game.chair.y-game.bin.y)>game.chair.r+game.bin.r);
  }
});

test('each sampled random arrangement has a collision-free route within three kicks', () => {
  for(let seed=1;seed<=1000;seed++) {
    const game=createGame(seed*2654435761);
    const clearX=game.spawn.bin.x<260 ? 421 : 76;
    for(const [x,y] of [[clearX,game.chair.y],[clearX,140],[421,140]]) {
      if(game.status==='win') break;
      const dx=x-game.chair.x,dy=y-game.chair.y,d=Math.hypot(dx,dy);
      if(d<3) continue;
      const drag=Math.sqrt(2*118*d)/3;
      assert.ok(drag<=110, `seed ${seed} needs excessive force`);
      assert.equal(kick(game,dx/d*drag,dy/d*drag),true);
      for(let i=0;i<650;i++) step(game,1/120);
    }
    assert.equal(game.status,'win',`layout ${seed} must be solvable`);
    assert.equal(game.hits,0);
  }
});

test('bin displacement and stored origin are relative to this layout', () => {
  const game=createGame(239814);
  game.status='miss';game.kicks=0;
  const record=makeRecord(game);
  assert.equal(record.binMoved,0);
  assert.deepEqual(record.binStart,[game.spawn.bin.x,game.spawn.bin.y]);
  game.bin.x-=65;
  assert.equal(makeRecord(game).binMoved,65);
});

test('legendary center needs two kicks and three centimeters; other legendary conditions require the new feats', () => {
  const center=ROUTE_TYPES.find(t=>t.id==='center');
  const record={status:'win',used:2,hits:0,metrics:{centerOffset:3,binParked:true,wallHits:0,deskHits:0,enteredExit:true}};
  assert.equal(center.matches(record),true);
  assert.equal(center.matches({...record,used:3}),false);
  assert.equal(center.matches({...record,metrics:{...record.metrics,centerOffset:3.01}}),false);
  assert.equal(ROUTE_TYPES.find(t=>t.id==='together').matches({...record,metrics:{...record.metrics,deskHits:1}}),false);
  assert.equal(ROUTE_TYPES.find(t=>t.id==='one_cm').matches({...record,status:'miss',gap:1,metrics:{enteredExit:false}}),false);
});

test('a bin that bounces off a wall cannot earn collision-free companion parking', () => {
  const game=createGame(2345242951);
  for(const [x,y,n] of [[26.60826939130014,0,650],[0,-110,650],[17.935207459321777,-41.62164529762047,650]]) {
    kick(game,x,y);for(let i=0;i<n;i++)step(game,1/120);
  }
  assert.equal(game.status,'win');
  assert.ok(game.stats.binObstacleHits>0);
  assert.ok(!earnedTypes(makeRecord(game)).some(type=>type.id==='together'));
});

test('legacy legendary achievements retain their first record and original condition', () => {
  const g=createGame();g.status='win';g.kicks=0;
  const old=makeRecord(g);delete old.catalogVersion;
  const collection={center:old};
  assert.deepEqual(readCollection({getItem:()=>JSON.stringify(collection)}),collection);
  const type=ROUTE_TYPES.find(t=>t.id==='center');
  assert.match(conditionHint(type,old),/8cm/);
  assert.match(conditionHint(type,{...old,catalogVersion:2}),/3cm/);
  assert.ok(!earnedTypes(old).some(t=>t.id==='center'));
});
