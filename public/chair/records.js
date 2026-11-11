import { WIDTH, HEIGHT, WORLD, DESK, EXIT, distanceToExit, isParked } from './rules.js';

export const STORAGE_KEY = 'why-play-this:chair:routes:v1';
export const RARITIES = {
  common: { name: '일반', mark: '◇', rank: 0 },
  rare: { name: '희귀', mark: '◆', rank: 1 },
  epic: { name: '초희귀', mark: '✦', rank: 2 },
  legendary: { name: '전설', mark: '✶', rank: 3 },
};
export const CATEGORIES = { commute: '퇴근', accident: '사고', wander: '방황', technique: '손기술' };
const returned = r => r.status === 'miss' && r.distance >= 180 && r.fromStart <= 50;
const legacyMiss = r => r.status === 'miss' && r.hits < 3 && r.binMoved < 60 && r.gap > 35 && !returned(r);
export const ROUTE_TYPES = [
  { id: 'clean', name: '무사퇴근', category: 'commute', rarity: 'common', hint: '한 번도 부딪히지 않고 퇴근 성공', matches: r => r.status === 'win' && r.hits === 0 },
  { id: 'bumpy', name: '우당탕 퇴근', category: 'commute', rarity: 'common', hint: '부딪혔지만 결국 퇴근 성공', matches: r => r.status === 'win' && r.hits > 0 },
  { id: 'pinball', name: '사무실 핀볼', category: 'accident', rarity: 'rare', hint: '한 판에서 세 번 이상 충돌', matches: r => r.hits >= 3 },
  { id: 'bin', name: '분리수거 담당', category: 'accident', rarity: 'rare', hint: '쓰레기통을 원래 자리에서 60cm 이상 옮기기', matches: r => r.binMoved >= 60 },
  { id: 'close', name: '문 앞 좌절', category: 'wander', rarity: 'rare', hint: '퇴근까지 35cm 이하를 남기고 실패', matches: r => r.status === 'miss' && r.gap <= 35 },
  { id: 'return', name: '제자리 출근', category: 'wander', rarity: 'rare', hint: '180cm 이상 움직인 뒤 출발점 50cm 안에서 실패', matches: returned },
  { id: 'lost', name: '퇴근 미수', category: 'wander', rarity: 'common', hint: '문 앞·제자리 복귀·큰 사고 없이 퇴근 실패', matches: legacyMiss },
  { id: 'economy', name: '한 발 아끼기', category: 'commute', rarity: 'rare', hint: '발구르기 두 번 안에 퇴근 성공', matches: r => r.status === 'win' && r.used <= 2 },
  { id: 'express', name: '무소음 급행', category: 'commute', rarity: 'epic', hint: '두 번 안에, 충돌 없이 퇴근 성공', matches: r => r.status === 'win' && r.used <= 2 && r.hits === 0 },
  { id: 'center', name: '정중앙의 신', category: 'commute', rarity: 'legendary', legacyHint: '충돌 없이 엘리베이터 중심 8cm 안에 멈추기', hint: '두 번 안에, 충돌 없이 엘리베이터 중심 3cm 안에 멈추기', matches: r => r.status === 'win' && r.used <= 2 && r.hits === 0 && r.metrics?.centerOffset <= 3 },
  { id: 'brake_win', name: '주차의 달인', category: 'commute', rarity: 'epic', hint: '움직이는 의자에 역방향 제동을 걸고 퇴근 성공', matches: r => r.status === 'win' && r.metrics?.brakes >= 1 },
  { id: 'together', name: '쓰레기통도 퇴근', category: 'commute', rarity: 'legendary', legacyHint: '의자와 쓰레기통을 모두 엘리베이터 안에 세우기', hint: '벽·책상 충돌 없이 의자와 쓰레기통을 모두 엘리베이터 안에 세우기', matches: r => r.status === 'win' && r.metrics?.binParked === true && r.metrics.wallHits === 0 && r.metrics.deskHits === 0 && r.metrics.binObstacleHits === 0 },
  { id: 'edge', name: '문턱 주차', category: 'commute', rarity: 'rare', hint: '의자 전체가 들어가되 경계까지 여유 5cm 이하로 퇴근', matches: r => r.status === 'win' && r.metrics?.parkMargin <= 5 },
  { id: 'wall', name: '벽과의 대화', category: 'accident', rarity: 'common', hint: '벽에 한 번 이상 부딪히기', matches: r => r.metrics?.wallHits >= 1 },
  { id: 'desk', name: '책상이 붙잡았다', category: 'accident', rarity: 'common', hint: '책상에 한 번 이상 부딪히기', matches: r => r.metrics?.deskHits >= 1 },
  { id: 'orchestra', name: '사무실 오케스트라', category: 'accident', rarity: 'epic', hint: '한 판에서 벽·책상·쓰레기통을 모두 들이받기', matches: r => r.metrics?.wallHits > 0 && r.metrics?.deskHits > 0 && r.metrics?.binHits > 0 },
  { id: 'cushion', name: '쿠션 퇴근', category: 'accident', rarity: 'rare', hint: '벽에 튕긴 뒤 퇴근 성공', matches: r => r.status === 'win' && r.metrics?.wallHits >= 1 },
  { id: 'spin', name: '회전 근무', category: 'accident', rarity: 'epic', hint: '충돌로 의자가 누적 한 바퀴 이상 회전하기', matches: r => r.metrics?.totalRotation >= Math.PI * 2 },
  { id: 'bin_trip', name: '쓰레기통 출장', category: 'accident', rarity: 'epic', hint: '쓰레기통을 원래 자리에서 150cm 이상 옮기기', matches: r => r.binMoved >= 150 },
  { id: 'short', name: '퇴근은 마음으로', category: 'wander', rarity: 'common', hint: '이동거리 1m 이하로 퇴근 실패', matches: r => r.status === 'miss' && r.distance <= 100 },
  { id: 'one_cm', name: '1cm의 야근', category: 'wander', rarity: 'legendary', legacyHint: '딱 1cm 이하가 모자라서 퇴근 실패', hint: '엘리베이터에 들어갔다 나와, 1cm 이하 차이로 퇴근 실패', matches: r => r.status === 'miss' && r.gap > 0 && r.gap <= 1 && r.metrics?.enteredExit === true },
  { id: 'overrun', name: '지나친 퇴근 욕심', category: 'wander', rarity: 'rare', hint: '엘리베이터 안에 들어갔다가 다시 나와 실패', matches: r => r.status === 'miss' && r.metrics?.enteredExit === true },
  { id: 'back_to_desk', name: '자진 야근', category: 'wander', rarity: 'common', hint: '책상에서 의자까지 30cm 이내에 멈춰 실패', matches: r => r.status === 'miss' && r.metrics?.deskGap <= 30 },
  { id: 'corner', name: '구석의 수호자', category: 'wander', rarity: 'rare', hint: '사무실 모서리 35cm 안에서 퇴근 실패', matches: r => r.status === 'miss' && r.metrics?.cornerGap <= 35 },
  { id: 'gentle', name: '살살 부탁드립니다', category: 'technique', rarity: 'common', hint: '모든 발구르기를 힘 45% 이하로 마치기', matches: r => r.metrics?.maxPower <= .45 },
  { id: 'full', name: '풀악셀 출근길', category: 'technique', rarity: 'common', hint: '힘 95% 이상의 발구르기를 한 번 이상 쓰기', matches: r => r.metrics?.maxPower >= .95 },
  { id: 'brake', name: '급브레이크', category: 'technique', rarity: 'rare', hint: '움직일 때 반대 방향으로 밀어 제동하기', matches: r => r.metrics?.brakes >= 1 },
  { id: 'turn', name: '급커브 주의', category: 'technique', rarity: 'rare', hint: '움직일 때 옆 방향으로 밀어 꺾기', matches: r => r.metrics?.turns >= 1 },
  { id: 'reverse', name: '청개구리 출발', category: 'technique', rarity: 'common', hint: '첫 발구르기를 출구 반대인 아래쪽으로 쓰기', matches: r => r.metrics?.firstDown === true },
  { id: 'zigzag', name: '갈 지 자 퇴근', category: 'technique', rarity: 'rare', hint: '세 발의 방향을 왼쪽·오른쪽으로 번갈아 크게 꺾기', matches: r => r.metrics?.zigzag === true },
  { id: 'rolling', name: '멈추지 않는 의자', category: 'technique', rarity: 'rare', hint: '두 번째와 세 번째 모두 굴러가는 중에 밀기', matches: r => r.metrics?.rollingKicks >= 2 },
  { id: 'double_brake', name: '이중 브레이크', category: 'technique', rarity: 'epic', hint: '한 판에서 역방향 제동을 두 번 걸기', matches: r => r.metrics?.brakes >= 2 },
];

export function earnedTypes(record) {
  if (!record) return [];
  return ROUTE_TYPES.filter(type => type.matches(record));
}

export function featuredType(record, newlyEarned = []) {
  const types = earnedTypes(record);
  const fresh = types.filter(type => newlyEarned.includes(type.id));
  return (fresh.length ? fresh : types).toSorted((a, b) => RARITIES[b.rarity].rank - RARITIES[a.rarity].rank)[0];
}

export function conditionHint(type, record) {
  return record && (record.catalogVersion ?? 1) < 2 && type.legacyHint ? type.legacyHint : type.hint;
}

export function makeRecord(game) {
  if (!['win', 'miss'].includes(game.status)) return null;
  const points = [...game.trail, game.chair];
  const start = points[0];
  const distance = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
  const stride = Math.max(1, Math.ceil(points.length / 160));
  const pair = p => [Math.round(p.x), Math.round(p.y)];
  const c = game.chair;
  const cross = (a, b) => a.dx * b.dy - a.dy * b.dx;
  const turns = game.pushes.slice(1).map((p, i) => cross(game.pushes[i], p));
  const nearestDeskX = Math.max(DESK.x, Math.min(DESK.x + DESK.w, c.x));
  const nearestDeskY = Math.max(DESK.y, Math.min(DESK.y + DESK.h, c.y));
  return {
    catalogVersion: 2,
    status: game.status, used: 3 - game.kicks, hits: game.hits,
    distance: Math.round(distance), gap: Math.ceil(distanceToExit(game.chair)),
    binMoved: Math.round(Math.hypot(game.bin.x - game.spawn.bin.x, game.bin.y - game.spawn.bin.y)),
    fromStart: Math.round(Math.hypot(game.chair.x - start.x, game.chair.y - start.y)),
    path: [...points.filter((_, i) => i % stride === 0).map(pair), pair(game.chair)],
    pushes: game.pushes.map(pair), bin: pair(game.bin), binStart: pair(game.spawn.bin),
    metrics: {
      ...game.stats,
      firstDown: (game.pushes[0]?.dy ?? 0) > .5,
      zigzag: turns.length === 2 && Math.abs(turns[0]) >= .7 && Math.abs(turns[1]) >= .7 && turns[0] * turns[1] < 0,
      centerOffset: Math.hypot(c.x - (EXIT.x + EXIT.w / 2), c.y - (EXIT.y + EXIT.h / 2)),
      parkMargin: Math.max(0, Math.min(c.x - c.r - EXIT.x, EXIT.x + EXIT.w - c.x - c.r, c.y - c.r - EXIT.y, EXIT.y + EXIT.h - c.y - c.r)),
      binParked: isParked(game.bin),
      deskGap: Math.max(0, Math.hypot(c.x - nearestDeskX, c.y - nearestDeskY) - c.r),
      cornerGap: Math.min(...[WORLD.left + c.r, WORLD.right - c.r].flatMap(x => [WORLD.top + c.r, WORLD.bottom - c.r].map(y => Math.hypot(c.x - x, c.y - y)))),
    },
  };
}

export function collectRecord(collection, record) {
  const added = [];
  for (const type of earnedTypes(record)) {
    if (!Object.hasOwn(collection, type.id)) {
      collection[type.id] = record;
      added.push(type.id);
    }
  }
  return added;
}

function validRecord(record) {
  const number = (value, max) => Number.isFinite(value) && value >= 0 && value <= max;
  const point = p => Array.isArray(p) && p.length === 2 && number(p[0], WIDTH) && number(p[1], HEIGHT);
  const m = record?.metrics;
  const validMetrics = m === undefined || (m && typeof m === 'object'
    && ['wallHits', 'deskHits', 'binHits'].every(key => Number.isInteger(m[key]) && number(m[key], 1000))
    && (m.binObstacleHits === undefined || (Number.isInteger(m.binObstacleHits) && number(m.binObstacleHits, 1000)))
    && ['brakes', 'turns', 'rollingKicks'].every(key => Number.isInteger(m[key]) && number(m[key], 2))
    && number(m.maxPower, 1) && number(m.totalRotation, 1000)
    && ['centerOffset', 'parkMargin', 'deskGap', 'cornerGap'].every(key => number(m[key], 1000))
    && ['enteredExit', 'firstDown', 'zigzag', 'binParked'].every(key => typeof m[key] === 'boolean'));
  return record && ['win', 'miss'].includes(record.status)
    && (record.catalogVersion === undefined || record.catalogVersion === 1 || record.catalogVersion === 2)
    && (record.binStart === undefined || point(record.binStart))
    && Number.isInteger(record.used) && record.used >= 1 && record.used <= 3
    && Number.isInteger(record.hits) && number(record.hits, 1000)
    && ['distance', 'gap', 'binMoved', 'fromStart'].every(key => number(record[key], 10000))
    && Array.isArray(record.path) && record.path.length >= 2 && record.path.length <= 162 && record.path.every(point)
    && Array.isArray(record.pushes) && record.pushes.length <= 3 && record.pushes.every(point) && point(record.bin) && validMetrics;
}

export function readCollection(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw || raw.length > 200000) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    // A later catalog expansion must not revoke an already earned card.
    return Object.fromEntries(ROUTE_TYPES
      .filter(type => validRecord(parsed[type.id]))
      .map(type => [type.id, parsed[type.id]]));
  } catch { return {}; }
}

export function saveCollection(storage, collection) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(collection));
    return true;
  } catch { return false; }
}
