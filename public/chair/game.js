import { WIDTH, HEIGHT, MAX_DRAG, createGame, kick, step, distanceToExit, isBraking } from './rules.js';
import { draw, drawRoute } from './scene.js';
import { ROUTE_TYPES, RARITIES, CATEGORIES, makeRecord, earnedTypes, featuredType, conditionHint, collectRecord, readCollection, saveCollection } from './records.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const status = document.querySelector('#status');
const instructions = document.querySelector('#instructions');
const kicks = document.querySelector('#kicks');
const pauseButton = document.querySelector('#pause');
const pauseCover = document.querySelector('#pause-cover');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const journal = document.querySelector('#journal');
const resultView = document.querySelector('#result-view');
const collectionView = document.querySelector('#collection-view');
const journalTitle = document.querySelector('#journal-title');
const collectionCount = document.querySelector('#collection-count');
const categoryFilter = document.querySelector('#category-filter');
const rarityFilter = document.querySelector('#rarity-filter');
const missingOnly = document.querySelector('#missing-only');
let targetType = null;
let storage;
try { storage = window.localStorage; } catch { /* The journal still works for this page. */ }
const collection = readCollection(storage);
let lastRecord = null;
let newTypes = [];
let pendingReveal = false;
let journalWasPaused = false;
let game = createGame(1 + Math.floor(Math.random() * 4294967295));
let drag = null;
let keyboardAim = false;
let angle = -Math.PI / 3;
let power = .6;
let paused = false;
let lastTime = performance.now();
let accumulator = 0;
let lastUI = '';

function active() { return game.status === 'ready' || game.status === 'playing'; }
function aim() {
  if (drag) return { dx: drag.x - drag.startX, dy: drag.y - drag.startY };
  return keyboardAim && active() && game.kicks ? { dx: Math.cos(angle) * MAX_DRAG * power, dy: Math.sin(angle) * MAX_DRAG * power } : null;
}

function updateUI() {
  const direction = paused ? null : aim();
  const braking = direction && isBraking(game.chair, direction.dx, direction.dy);
  const lastKick = game.pushes.at(-1);
  const justBraked = lastKick?.braking && game.time - lastKick.time < .8;
  const key = `${game.status}:${game.kicks}:${game.still > .4}:${paused}:${!!braking}:${!!justBraked}:${!!drag}`;
  if (key === lastUI) return;
  lastUI = key;
  kicks.setAttribute('aria-label', `${game.kicks}번 남음`);
  kicks.querySelector('b').textContent = game.kicks;
  kicks.querySelectorAll('i').forEach((el, i) => el.classList.toggle('used', i >= game.kicks));
  pauseButton.disabled = !active();
  pauseButton.textContent = paused ? '계속하기' : '잠깐 멈춤';
  pauseCover.hidden = !paused;
  document.querySelector('#result-open').hidden = !lastRecord;
  if (game.status === 'win') {
    status.textContent = '의자째 퇴근 성공!';
    instructions.textContent = `${3 - game.kicks}번 밀고, ${game.hits}번 부딪혔어요. 오늘은 여기까지.`;
  } else if (game.status === 'miss') {
    status.textContent = '퇴근하기엔 조금 모자랐다.';
    instructions.textContent = `엘리베이터까지 ${Math.ceil(distanceToExit(game.chair))}cm · 충돌 ${game.hits}번. 점선은 내가 지나온 길이에요.`;
  } else if (braking) {
    status.textContent = '브레이크 조준 중';
    instructions.textContent = `${drag ? '놓으면' : 'Space를 누르면'} 감속해요. 힘이 충분하면 정지 · 발구르기 1회 사용.`;
  } else if (justBraked) {
    status.textContent = '브레이크!';
    instructions.textContent = `역방향으로 제동했어요. 남은 발구르기 ${game.kicks}번.`;
  } else if (game.kicks === 0) {
    status.textContent = '이제 의자에게 맡기는 수밖에.';
    instructions.textContent = '발구르기 끝. 완전히 멈추면 결과가 나와요.';
  } else if (game.status === 'ready') {
    status.textContent = '의자를 가고 싶은 쪽으로 드래그';
    instructions.textContent = '길게 끌수록 세게. 움직일 때 반대로 밀면 브레이크!';
  } else {
    status.textContent = game.still > .4 ? `아직 ${game.kicks}번 더 밀 수 있어요.` : `${game.kicks}번 남았어요. 어디로 밀까요?`;
    instructions.textContent = '움직이는 의자도 다시 잡을 수 있어요. 반대쪽으로 밀면 감속해요.';
  }
  if (!active() && !lastRecord) {
    lastRecord = makeRecord(game);
    newTypes = collectRecord(collection, lastRecord);
    pendingReveal = newTypes.length > 0;
    if (targetType && newTypes.includes(targetType.id)) { targetType = null; updateTarget(); }
    if (newTypes.length && !saveCollection(storage, collection)) {
      const note = document.querySelector('#storage-note');
      note.textContent = '저장할 수 없어 이번 페이지에서만 도감이 유지돼요. 새로고침하면 새 수집 기록이 사라져요.';
      note.classList.add('warning');
    }
    updateCollectionCount();
    document.querySelector('#result-open').hidden = false;
    showResult(lastRecord);
  }
}

function updateCollectionCount() {
  collectionCount.textContent = `${Object.keys(collection).length} / ${ROUTE_TYPES.length}`;
}

function openJournal(view) {
  if (!journal.open) {
    journalWasPaused = paused;
    cancelAim();
    if (active()) setPaused(true);
  }
  resultView.hidden = view !== 'result';
  collectionView.hidden = view !== 'collection';
  if (!journal.open) journal.showModal();
  journal.scrollTop = 0;
  journalTitle.focus({ preventScroll: true });
}

function showResult(record, archiveType = null) {
  const types = archiveType ? [archiveType] : earnedTypes(record);
  const featured = archiveType || featuredType(record, newTypes);
  journal.dataset.outcome = record.status;
  journal.dataset.rarity = featured.rarity;
  const celebrate = !archiveType && pendingReveal;
  pendingReveal = false;
  delete journal.dataset.celebration;
  const acquisition = document.querySelector('#acquisition');
  acquisition.hidden = !celebrate;
  if (celebrate) {
    const titles = { common: '새 경로 발견', rare: '희귀 경로 발견', epic: '초희귀 경로 발견!', legendary: '전설 발견' };
    journal.dataset.celebration = featured.rarity;
    acquisition.dataset.rarity = featured.rarity;
    document.querySelector('#acquisition-mark').textContent = RARITIES[featured.rarity].mark;
    document.querySelector('#acquisition-title').textContent = titles[featured.rarity];
    document.querySelector('#acquisition-name').textContent = featured.name;
  }
  document.querySelector('#journal-label').textContent = archiveType ? '도감에 남긴 첫 경로' : record.status === 'win' ? '퇴근길 감정서 · CLEAR' : '퇴근길 감정서 · GAME OVER';
  journalTitle.textContent = record.status === 'win' ? '퇴근 성공' : '퇴근 실패';
  document.querySelector('#route-name').textContent = featured.name;
  document.querySelector('#route-rarity').replaceChildren(rarityBadge(featured.rarity));
  document.querySelector('#route-number').textContent = `NO. ${String(ROUTE_TYPES.indexOf(featured) + 1).padStart(2, '0')}`;
  document.querySelector('#route-reason').textContent = conditionHint(featured, record);
  drawRoute(document.querySelector('#route-map').getContext('2d'), record);
  const stats = document.querySelector('#route-stats');
  stats.replaceChildren();
  for (const [name, value] of [
    ['이동 거리', `약 ${(record.distance / 100).toFixed(2)}m`], ['충돌', `${record.hits}번`],
    ['퇴근까지', `${record.gap}cm`], ['발구르기', `${record.used} / 3번`],
    ...(record.status === 'win' && record.metrics ? [['중앙 오차', `${record.metrics.centerOffset.toFixed(1)}cm`]] : []),
    ...(types.some(type => type.id === 'bin') ? [['쓰레기통 이동', `${record.binMoved}cm`]] : []),
  ]) {
    const item = document.createElement('div');
    const term = document.createElement('dt'); term.textContent = name;
    const valueNode = document.createElement('dd'); valueNode.textContent = value;
    item.append(term, valueNode); stats.append(item);
  }
  const legacy = archiveType?.legacyHint && (record.catalogVersion ?? 1) < 2;
  document.querySelector('#unlock-message').textContent = legacy ? '이전 조건으로 수집한 최초 경로입니다. 새 도전에는 강화된 조건이 적용돼요.' : archiveType ? '이 유형을 처음 얻은 순간을 보관했어요.' : newTypes.length ? `새로운 퇴근길 ${newTypes.length}종을 수집했어요!` : '이미 모은 유형이에요. 다른 경로도 만들어 보세요.';
  const badges = document.querySelector('#earned-badges');
  badges.replaceChildren();
  for (const type of types) {
    const badge = document.createElement('span');
    const isNew = !archiveType && newTypes.includes(type.id);
    const rarity = RARITIES[type.rarity];
    badge.textContent = `${isNew ? 'NEW · ' : ''}${rarity.mark} ${rarity.name} · ${type.name}`;
    badge.dataset.rarity = type.rarity;
    badge.classList.toggle('new', isNew); badges.append(badge);
  }
  document.querySelector('#result-retry').hidden = Boolean(archiveType);
  document.querySelector('#retry-same').hidden = Boolean(archiveType);
  document.querySelector('#result-collection').textContent = archiveType ? '← 도감으로 돌아가기' : `도감 보기 · ${Object.keys(collection).length}/${ROUTE_TYPES.length}`;
  openJournal('result');
}

function rarityBadge(id, suffix = '') {
  const rarity = RARITIES[id];
  const badge = document.createElement('span');
  badge.className = 'rarity-badge'; badge.dataset.rarity = id;
  badge.textContent = `${rarity.mark} ${rarity.name}${suffix}`;
  return badge;
}

function updateTarget() {
  const target = document.querySelector('#collection-target');
  target.hidden = !targetType;
  if (!targetType) return;
  target.dataset.rarity = targetType.rarity;
  document.querySelector('#target-name').textContent = `다음 목표 · ${RARITIES[targetType.rarity].mark} ${targetType.name}`;
  document.querySelector('#target-condition').textContent = targetType.hint;
}

function renderCollection() {
  const chapters = document.querySelector('#chapter-progress');
  chapters.replaceChildren();
  for (const [id, name] of Object.entries(CATEGORIES)) {
    const types = ROUTE_TYPES.filter(type => type.category === id);
    const count = types.filter(type => collection[type.id]).length;
    const item = document.createElement('div');
    const label = document.createElement('span'); label.textContent = `${name} ${count}/${types.length}${count === types.length ? ' ✓' : ''}`;
    const progress = document.createElement('progress');
    progress.max = types.length; progress.value = count; progress.setAttribute('aria-label', `${name} 수집 완성도`);
    item.append(label, progress); chapters.append(item);
  }
  const rarityProgress = document.querySelector('#rarity-progress');
  rarityProgress.replaceChildren();
  for (const id of Object.keys(RARITIES)) {
    const types = ROUTE_TYPES.filter(type => type.rarity === id);
    rarityProgress.append(rarityBadge(id, ` ${types.filter(type => collection[type.id]).length}/${types.length}`));
  }
  const grid = document.querySelector('#collection-grid');
  grid.replaceChildren();
  let visible = 0;
  ROUTE_TYPES.forEach((type, i) => {
    const record = collection[type.id];
    if (categoryFilter.value !== 'all' && type.category !== categoryFilter.value) return;
    if (rarityFilter.value !== 'all' && type.rarity !== rarityFilter.value) return;
    if (missingOnly.checked && record) return;
    visible++;
    const card = document.createElement('button');
    card.className = 'route-card'; card.dataset.rarity = type.rarity;
    card.classList.toggle('locked', !record);
    const number = document.createElement('span'); number.className = 'card-number';
    number.textContent = `NO. ${String(i + 1).padStart(2, '0')} · ${record ? '수집 완료' : targetType?.id === type.id ? '현재 목표' : '미발견'}`;
    card.append(number, rarityBadge(type.rarity));
    if (type.rarity === 'epic' || type.rarity === 'legendary') {
      const emblem = document.createElement('span'); emblem.className = 'card-emblem';
      emblem.textContent = RARITIES[type.rarity].mark; emblem.setAttribute('aria-hidden', 'true');
      card.append(emblem);
    }
    if (record) {
      const preview = document.createElement('canvas');
      preview.width = 260; preview.height = 330; preview.setAttribute('aria-hidden', 'true');
      drawRoute(preview.getContext('2d'), record); card.append(preview);
      card.addEventListener('click', () => showResult(record, type));
    } else {
      const locked = document.createElement('span'); locked.className = 'locked-route'; locked.textContent = '?';
      locked.setAttribute('aria-hidden', 'true'); card.append(locked);
      card.addEventListener('click', () => { targetType = type; updateTarget(); journal.close(); });
    }
    const name = document.createElement('strong'); name.textContent = type.name;
    const hint = document.createElement('span'); hint.className = 'card-hint'; hint.textContent = conditionHint(type, record);
    card.append(name, hint); grid.append(card);
  });
  document.querySelector('#collection-visible-count').textContent = `${visible}종 표시 · 수집 ${Object.keys(collection).length}/${ROUTE_TYPES.length}`;
  document.querySelector('#collection-empty').hidden = visible !== 0;
  document.querySelector('#collection-result').hidden = !lastRecord;
}

function showCollection() {
  delete journal.dataset.outcome;
  delete journal.dataset.rarity;
  delete journal.dataset.celebration;
  document.querySelector('#journal-label').textContent = '퇴근길 수집 기록';
  journalTitle.textContent = `퇴근길 도감 ${Object.keys(collection).length}/${ROUTE_TYPES.length}`;
  renderCollection();
  openJournal('collection');
}

function cancelAim() {
  const pointerId = drag?.id;
  drag = null;
  keyboardAim = false;
  if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}

function setPaused(value) {
  paused = value && active();
  cancelAim();
  accumulator = 0;
  lastTime = performance.now();
  updateUI();
}

function point(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width * WIDTH, y: (event.clientY - rect.top) / rect.height * HEIGHT };
}

canvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || drag || paused || journal.open || !active() || !game.kicks) return;
  const p = point(event);
  if (Math.hypot(p.x - game.chair.x, p.y - game.chair.y) > 46) return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  keyboardAim = false;
  drag = { id: event.pointerId, startX: p.x, startY: p.y, ...p };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (drag?.id === event.pointerId) Object.assign(drag, point(event));
});
canvas.addEventListener('pointerup', event => {
  if (drag?.id !== event.pointerId) return;
  Object.assign(drag, point(event));
  const direction = aim();
  cancelAim();
  kick(game, direction.dx, direction.dy);
  updateUI();
});
canvas.addEventListener('pointercancel', cancelAim);
canvas.addEventListener('lostpointercapture', cancelAim);
canvas.addEventListener('blur', cancelAim);
canvas.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Escape') {
    if (drag || keyboardAim) cancelAim();
    else setPaused(!paused);
    return;
  }
  if (paused || journal.open || !active() || !game.kicks || drag) return;
  keyboardAim = true;
  if (event.key === 'ArrowLeft') angle -= Math.PI / 12;
  if (event.key === 'ArrowRight') angle += Math.PI / 12;
  if (event.key === 'ArrowUp') power = Math.min(1, power + .1);
  if (event.key === 'ArrowDown') power = Math.max(.1, power - .1);
  if (event.key === ' ' && !event.repeat) {
    const direction = aim();
    kick(game, direction.dx, direction.dy);
    keyboardAim = false;
    updateUI();
  }
});

function restart(sameLayout = false) {
  cancelAim();
  game = createGame(sameLayout ? game.seed : 1 + Math.floor(Math.random() * 4294967295));
  lastRecord = null;
  newTypes = [];
  pendingReveal = false;
  journalWasPaused = false;
  if (journal.open) journal.close();
  angle = -Math.PI / 3;
  power = .6;
  lastUI = '';
  setPaused(false);
  canvas.focus({ preventScroll: true });
}
document.querySelector('#restart').addEventListener('click', () => restart());
document.querySelector('#result-retry').addEventListener('click', () => restart());
document.querySelector('#retry-same').addEventListener('click', () => restart(true));
document.querySelector('#collection-open').addEventListener('click', showCollection);
document.querySelector('#result-collection').addEventListener('click', showCollection);
document.querySelector('#result-open').addEventListener('click', () => showResult(lastRecord));
document.querySelector('#collection-result').addEventListener('click', () => showResult(lastRecord));
document.querySelector('#journal-close').addEventListener('click', () => journal.close());
document.querySelector('#target-clear').addEventListener('click', () => { targetType = null; updateTarget(); canvas.focus({preventScroll:true}); });
for (const [select, values] of [[categoryFilter, CATEGORIES], [rarityFilter, RARITIES]]) {
  for (const [id, value] of Object.entries(values)) {
    const option = document.createElement('option'); option.value = id; option.textContent = typeof value === 'string' ? value : `${value.mark} ${value.name}`;
    select.append(option);
  }
  select.addEventListener('change', renderCollection);
}
missingOnly.addEventListener('change', renderCollection);
for (let i = 0; i < 12; i++) {
  const particle = document.createElement('i'); particle.style.setProperty('--i', i);
  document.querySelector('#acquisition-particles').append(particle);
}
journal.addEventListener('close', () => { if (active()) setPaused(journalWasPaused || document.hidden); });
pauseButton.addEventListener('click', () => { setPaused(!paused); if (!paused) canvas.focus({ preventScroll: true }); });
document.querySelector('#resume').addEventListener('click', () => { setPaused(false); canvas.focus({ preventScroll: true }); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAim(); if (game.status === 'playing') setPaused(true); }
});
window.addEventListener('blur', () => { cancelAim(); if (game.status === 'playing') setPaused(true); });

function resize() {
  const scale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = WIDTH * scale;
  canvas.height = HEIGHT * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  draw(ctx, game, paused ? null : aim(), reducedMotion.matches);
}
window.addEventListener('resize', resize);
resize();
updateCollectionCount();
updateUI();
function frame(now) {
  const elapsed = Math.min((now - lastTime) / 1000, .1);
  lastTime = now;
  if (!paused) {
    accumulator += elapsed;
    while (accumulator >= 1 / 120) { step(game, 1 / 120); accumulator -= 1 / 120; }
  }
  updateUI();
  draw(ctx, game, paused ? null : aim(), reducedMotion.matches);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
