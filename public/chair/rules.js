export const WIDTH = 520;
export const HEIGHT = 660;
export const WORLD = { left: 28, right: 492, top: 62, bottom: 628 };
export const DESK = { x: 205, y: 290, w: 142, h: 90 };
export const EXIT = { x: 350, y: 62, w: 142, h: 120 };
export const MAX_DRAG = 110;
export const BIN_START = { x: 396, y: 250 };

export function createGame(seed = 0) {
  seed = seed >>> 0;
  let random = seed;
  const pick = (min, max) => {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    return min + Math.floor(random / 4294967296 * (max - min + 1));
  };
  // Seed zero preserves the original layout for deterministic route fixtures.
  const spawn = seed === 0 ? { chair: { x: 116, y: 548 }, bin: { ...BIN_START } } : {
    chair: { x: pick(0, 1) ? pick(378, 448) : pick(72, 164), y: pick(500, 580) },
    bin: { x: pick(0, 1) ? pick(380, 452) : pick(66, 166), y: pick(228, 370) },
  };
  return {
    seed, spawn,
    chair: { ...spawn.chair, vx: 0, vy: 0, r: 22, angle: -.15, spin: 0 },
    bin: { ...spawn.bin, vx: 0, vy: 0, r: 18, angle: .1, spin: 0 },
    kicks: 3, hits: 0, status: 'ready', still: 0, time: 0,
    trail: [{ ...spawn.chair }], pushes: [], impact: null,
    stats: { wallHits: 0, deskHits: 0, binHits: 0, binObstacleHits: 0, brakes: 0, turns: 0, rollingKicks: 0, maxPower: 0, totalRotation: 0, enteredExit: false },
  };
}

export function isBraking(chair, dx, dy) {
  const length = Math.hypot(dx, dy);
  const speed = Math.hypot(chair.vx, chair.vy);
  return Number.isFinite(length) && length >= 8 && speed > 0
    && (chair.vx * dx + chair.vy * dy) / (speed * length) <= -.5;
}

export function kick(game, dx, dy) {
  const length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 8 || game.kicks === 0 || !['ready', 'playing'].includes(game.status)) return false;
  const before = Math.hypot(game.chair.vx, game.chair.vy);
  const braking = isBraking(game.chair, dx, dy);
  game.stats.maxPower = Math.max(game.stats.maxPower, Math.min(length, MAX_DRAG) / MAX_DRAG);
  if (before >= 40) {
    const alignment = (game.chair.vx * dx + game.chair.vy * dy) / (before * length);
    game.stats.rollingKicks++;
    if (braking) game.stats.brakes++;
    if (Math.abs(alignment) <= .35) game.stats.turns++;
  }
  const scale = Math.min(length, MAX_DRAG) / length * 3;
  if (braking) {
    // Reverse input removes forward speed; excess force must not launch the chair backward.
    const removed = -(game.chair.vx * dx + game.chair.vy * dy) / before * scale;
    const remaining = Math.max(0, before - removed) / before;
    game.chair.vx *= remaining;
    game.chair.vy *= remaining;
  } else {
    game.chair.vx += dx * scale;
    game.chair.vy += dy * scale;
  }
  const speed = Math.hypot(game.chair.vx, game.chair.vy);
  if (speed > 650) {
    game.chair.vx *= 650 / speed;
    game.chair.vy *= 650 / speed;
  }
  game.kicks--;
  game.status = 'playing';
  game.still = 0;
  game.pushes.push({ x: game.chair.x, y: game.chair.y, dx: dx / length, dy: dy / length, time: game.time, braking });
  return true;
}

export function isParked(body) {
  return body.x - body.r >= EXIT.x && body.x + body.r <= EXIT.x + EXIT.w
    && body.y - body.r >= EXIT.y && body.y + body.r <= EXIT.y + EXIT.h;
}

export function distanceToExit(body) {
  return Math.hypot(
    Math.max(EXIT.x + body.r - body.x, 0, body.x - (EXIT.x + EXIT.w - body.r)),
    Math.max(EXIT.y + body.r - body.y, 0, body.y - (EXIT.y + EXIT.h - body.r)),
  );
}

function move(body, dt, friction) {
  const speed = Math.hypot(body.vx, body.vy);
  const next = Math.max(0, speed - friction * dt);
  if (speed) {
    body.x += body.vx / speed * (speed + next) / 2 * dt;
    body.y += body.vy / speed * (speed + next) / 2 * dt;
    body.vx *= next / speed;
    body.vy *= next / speed;
  }
  body.angle += body.spin * dt;
  body.spin *= Math.exp(-2.8 * dt);
}

function recordHit(game, body, speed, kind) {
  if (body === game.bin && speed > 25) game.stats.binObstacleHits++;
  if (body === game.chair && speed > 25) {
    game.hits++;
    game.stats[kind]++;
    game.impact = { x: body.x, y: body.y, time: game.time };
  }
}

function bounce(game, body, nx, ny, kind) {
  const incoming = body.vx * nx + body.vy * ny;
  if (incoming >= 0) return;
  recordHit(game, body, -incoming, kind);
  body.spin += (body.vx * -ny + body.vy * nx) * .018;
  body.vx -= 1.52 * incoming * nx;
  body.vy -= 1.52 * incoming * ny;
}

function solidCollisions(game, body) {
  for (const [axis, edge, direction] of [
    ['x', WORLD.left + body.r, 1], ['x', WORLD.right - body.r, -1],
    ['y', WORLD.top + body.r, 1], ['y', WORLD.bottom - body.r, -1],
  ]) {
    if ((body[axis] - edge) * direction < 0) {
      body[axis] = edge;
      bounce(game, body, axis === 'x' ? direction : 0, axis === 'y' ? direction : 0, 'wallHits');
    }
  }
  const x = Math.max(DESK.x, Math.min(DESK.x + DESK.w, body.x));
  const y = Math.max(DESK.y, Math.min(DESK.y + DESK.h, body.y));
  const dx = body.x - x;
  const dy = body.y - y;
  const distance = Math.hypot(dx, dy);
  if (distance > 0 && distance < body.r) {
    body.x += dx / distance * (body.r - distance);
    body.y += dy / distance * (body.r - distance);
    bounce(game, body, dx / distance, dy / distance, 'deskHits');
  }
}

// shortcut: circular chair and bin colliders; use rigid bodies if furniture shapes become part of the puzzle.
function binCollision(game) {
  const a = game.chair;
  const b = game.bin;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.hypot(dx, dy);
  const overlap = a.r + b.r - distance;
  if (overlap <= 0) return;
  const nx = distance ? dx / distance : 1;
  const ny = distance ? dy / distance : 0;
  a.x += nx * overlap / 3;
  a.y += ny * overlap / 3;
  b.x -= nx * overlap * 2 / 3;
  b.y -= ny * overlap * 2 / 3;
  const relative = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (relative >= 0) return;
  const impulse = -1.45 * relative / 3;
  recordHit(game, a, -relative, 'binHits');
  a.spin += ((a.vx - b.vx) * -ny + (a.vy - b.vy) * nx) * .014;
  a.vx += impulse * nx;
  a.vy += impulse * ny;
  b.vx -= impulse * nx * 2;
  b.vy -= impulse * ny * 2;
  b.spin -= impulse * .015;
}

export function step(game, dt) {
  if (game.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
  game.time += dt;
  game.stats.totalRotation += Math.abs(game.chair.spin * dt);
  move(game.chair, dt, 118);
  move(game.bin, dt, 160);
  solidCollisions(game, game.chair);
  solidCollisions(game, game.bin);
  binCollision(game);
  if (isParked(game.chair)) game.stats.enteredExit = true;
  const last = game.trail.at(-1);
  if (Math.hypot(game.chair.x - last.x, game.chair.y - last.y) >= 3) {
    game.trail.push({ x: game.chair.x, y: game.chair.y });
  }
  const stopped = Math.hypot(game.chair.vx, game.chair.vy, game.bin.vx, game.bin.vy) === 0;
  game.still = stopped ? game.still + dt : 0;
  if (game.still > .4 && (isParked(game.chair) || game.kicks === 0)) {
    game.status = isParked(game.chair) ? 'win' : 'miss';
  }
}
