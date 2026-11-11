import { WIDTH, HEIGHT, WORLD, DESK, EXIT, MAX_DRAG, isBraking } from './rules.js';

const INK = '#344c43';
function box(ctx, x, y, w, h, fill, radius = 0, stroke = null) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}
function circle(ctx, x, y, r, fill) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
}
function line(ctx, points, color, width = 2) {
  ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
}
function label(ctx, text, x, y, size = 12, color = INK) {
  ctx.fillStyle = color; ctx.font = `600 ${size}px 'Apple SD Gothic Neo', sans-serif`;
  ctx.textAlign = 'center'; ctx.fillText(text, x, y);
}

function room(ctx, won, start) {
  box(ctx, 0, 0, WIDTH, HEIGHT, '#d5ddcb');
  box(ctx, 20, 54, 480, 584, '#9da992', 3);
  box(ctx, WORLD.left, WORLD.top, WORLD.right - WORLD.left, WORLD.bottom - WORLD.top, '#e5e6d7');
  ctx.save();
  ctx.beginPath(); ctx.rect(28, 62, 464, 566); ctx.clip();
  for (let y = 62; y < 628; y += 44) {
    line(ctx, [[28, y], [492, y]], '#d2d7c4', 1);
    for (let x = 28 + ((y - 62) / 44 % 2) * 44; x < 492; x += 88) line(ctx, [[x, y], [x, y + 44]], '#d2d7c4', 1);
  }
  ctx.restore();
  line(ctx, [[28, 628], [492, 628], [492, 62]], '#b3bda6', 4);
  box(ctx, 35, 13, 114, 28, '#ecedde', 4);
  label(ctx, '총무팀  ·  18:00', 92, 32, 12);
  label(ctx, '불은 끄고 가세요', 253, 32, 10, '#647865');
  box(ctx, EXIT.x, EXIT.y, EXIT.w, EXIT.h, won ? '#bad4ad' : '#c8d6bd');
  box(ctx, EXIT.x + 7, EXIT.y + 6, EXIT.w - 14, 13, '#8ea18c');
  for (let x = EXIT.x + 12; x < EXIT.x + EXIT.w - 8; x += 9) line(ctx, [[x, EXIT.y + 8], [x, EXIT.y + 16]], '#c5d0bc', 2);
  box(ctx, EXIT.x + 25, 18, EXIT.w - 50, 30, '#345c46', 3);
  label(ctx, '↓  퇴근', EXIT.x + EXIT.w / 2, 39, 16, '#f1f1de');
  ctx.setLineDash([5, 5]);
  line(ctx, [[EXIT.x + 6, EXIT.y + EXIT.h], [EXIT.x + EXIT.w - 6, EXIT.y + EXIT.h]], '#76916e', 3);
  ctx.setLineDash([]);
  line(ctx, [[EXIT.x + EXIT.w / 2 - 5, EXIT.y + EXIT.h / 2], [EXIT.x + EXIT.w / 2 + 5, EXIT.y + EXIT.h / 2]], '#6b8968', 1.5);
  line(ctx, [[EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 - 5], [EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2 + 5]], '#6b8968', 1.5);
  label(ctx, won ? '퇴근 완료' : '안에 멈추기', EXIT.x + EXIT.w / 2, 137, 13, '#4d7053');
  label(ctx, 'ELEVATOR', EXIT.x + EXIT.w / 2, 154, 8, '#657d60');
  ctx.save(); ctx.translate(start.x, start.y); ctx.rotate(-.08);
  ctx.setLineDash([5, 5]); ctx.strokeStyle = '#a8b59c'; ctx.lineWidth = 2;
  ctx.strokeRect(-37, -39, 74, 77); ctx.setLineDash([]);
  label(ctx, '내 자리', 0, 57, 11, '#788a70'); ctx.restore();
}

function desk(ctx) {
  const { x, y, w, h } = DESK;
  box(ctx, x + 5, y + 8, w, h, '#a9ae9870', 9);
  box(ctx, x, y, w, h, '#bca47b', 8, '#8b795d');
  box(ctx, x + 4, y + 3, w - 8, h - 9, '#d9c29a', 5);
  line(ctx, [[x + 11, y + h - 10], [x + w - 11, y + h - 10]], '#bfa77b', 1);
  box(ctx, x + 51, y + 22, 40, 24, '#657569', 3);
  box(ctx, x + 39, y + 8, 65, 33, '#384d45', 3);
  box(ctx, x + 43, y + 12, 57, 24, '#73918a', 1);
  line(ctx, [[x + 50, y + 19], [x + 71, y + 19]], '#c0d6bc', 2);
  line(ctx, [[x + 50, y + 25], [x + 88, y + 25]], '#a2b9a8', 2);
  box(ctx, x + 39, y + 53, 62, 17, '#f1ebd8', 2, '#a5997c');
  for (let i = 0; i < 9; i++) line(ctx, [[x + 45 + i * 6, y + 57], [x + 45 + i * 6, y + 66]], '#b4ad96', 2);
  ctx.save(); ctx.translate(x + 19, y + 46); ctx.rotate(-.15);
  box(ctx, -10, -17, 20, 29, '#f8f2df', 1);
  line(ctx, [[-6, -9], [6, -9]], '#b2bea8', 2); line(ctx, [[-6, -3], [5, -3]], '#b2bea8', 2); ctx.restore();
  circle(ctx, x + 120, y + 56, 9, '#f2ead6'); circle(ctx, x + 120, y + 56, 6, '#80684a');
  box(ctx, x + 128, y + 53, 5, 6, '#eee4cb', 2);
}

function bin(ctx, body) {
  circle(ctx, body.x + 3, body.y + 6, body.r + 1, '#9ba48d60');
  ctx.save(); ctx.translate(body.x, body.y); ctx.rotate(body.angle);
  circle(ctx, 0, 0, body.r, '#6e8474'); circle(ctx, 0, 0, body.r - 3, '#486759');
  for (const [x, y, angle] of [[-6, 3, .3], [4, -5, -.6], [6, 6, .8]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    box(ctx, -6, -5, 12, 10, '#e3e3ce', 2); line(ctx, [[-3, 0], [2, -2], [4, 2]], '#b8c0aa', 1); ctx.restore();
  }
  ctx.restore();
}

function chair(ctx, body, lastKick, time, reducedMotion) {
  ctx.save(); ctx.translate(body.x, body.y);
  circle(ctx, 3, 5, 25, '#7d8d7760');
  if (lastKick && time - lastKick.time < .24 && !reducedMotion) {
    const reach = Math.sin((time - lastKick.time) / .24 * Math.PI) * 15;
    line(ctx, [[-lastKick.dx * 15, -lastKick.dy * 15], [-lastKick.dx * (25 + reach), -lastKick.dy * (25 + reach)]], '#3f514a', 7);
  }
  ctx.rotate(body.angle);
  for (let i = 0; i < 5; i++) {
    const angle = i / 5 * Math.PI * 2;
    const x = Math.cos(angle) * 19, y = Math.sin(angle) * 19;
    line(ctx, [[0, 3], [x, y]], '#647468', 3);
    circle(ctx, x, y, 3, '#354b40');
  }
  box(ctx, -15, -13, 30, 29, '#d2764c', 8, '#8a523b');
  box(ctx, -10, -19, 8, 12, '#304740', 3); box(ctx, 3, -19, 8, 12, '#304740', 3);
  box(ctx, -13, -13, 26, 24, '#6e9eac', 8);
  line(ctx, [[-11, -8], [-16, -3]], '#e2af82', 6); line(ctx, [[11, -8], [16, -3]], '#e2af82', 6);
  box(ctx, -20, 0, 5, 13, '#354b40', 2); box(ctx, 15, 0, 5, 13, '#354b40', 2);
  circle(ctx, 0, -9, 9, '#e9b58a');
  ctx.beginPath(); ctx.arc(0, -7, 9, 0, Math.PI); ctx.lineTo(-9, -12); ctx.quadraticCurveTo(1, -19, 9, -10); ctx.fillStyle = '#354038'; ctx.fill();
  box(ctx, -14, 10, 28, 9, '#bb623d', 4, '#8a523b');
  ctx.restore();
}

function aimArrow(ctx, chairBody, aim) {
  const length = Math.hypot(aim.dx, aim.dy);
  if (length < 8) return;
  const power = Math.min(length, MAX_DRAG) / MAX_DRAG;
  const braking = isBraking(chairBody, aim.dx, aim.dy);
  const color = braking ? '#286679' : '#c3653d';
  const angle = Math.atan2(aim.dy, aim.dx);
  ctx.save(); ctx.translate(chairBody.x, chairBody.y); ctx.rotate(angle);
  const end = 30 + power * 80;
  line(ctx, [[28, 0], [end, 0]], color, 4);
  line(ctx, [[end - 11, -7], [end, 0], [end - 11, 7]], color, 4);
  ctx.restore();
  const labelX = Math.max(64, Math.min(WIDTH - 64, chairBody.x));
  const labelY = chairBody.y > HEIGHT - 85 ? chairBody.y - 43 : chairBody.y + 51;
  box(ctx, labelX - 58, labelY - 15, 116, 23, braking ? '#e4f0ee' : '#f5efdc', 5);
  label(ctx, `${braking ? '브레이크' : '힘'} ${Math.round(power * 100)}%`, labelX, labelY, 12, braking ? color : '#8b462b');
}

export function draw(ctx, game, aim, reducedMotion) {
  room(ctx, game.status === 'win', game.spawn.chair);
  if (game.trail.length > 1) {
    ctx.setLineDash([3, 6]); ctx.lineCap = 'round';
    line(ctx, [...game.trail.map(p => [p.x, p.y]), [game.chair.x, game.chair.y]], '#719986', 2.5);
    ctx.setLineDash([]);
  }
  game.pushes.forEach((push, i) => {
    circle(ctx, push.x, push.y, 10, '#f4ebd8'); label(ctx, String(i + 1), push.x, push.y + 4, 11, '#a56240');
  });
  desk(ctx); bin(ctx, game.bin);
  if (game.status === 'ready') {
    label(ctx, '끌어서 출발 ↗', game.chair.x + 10, game.chair.y - 53, 14, '#466953');
    line(ctx, [[game.chair.x + 19, game.chair.y - 42], [game.chair.x + 32, game.chair.y - 56]], '#77966f', 2);
  }
  if (aim) aimArrow(ctx, game.chair, aim);
  chair(ctx, game.chair, game.pushes.at(-1), game.time, reducedMotion);
  if (game.impact && game.time - game.impact.time < .32 && !reducedMotion) {
    label(ctx, '쿵', Math.max(47, Math.min(473, game.impact.x + 27)), Math.max(88, game.impact.y - 28), 20, '#b05f39');
  }
  if (game.status === 'win' || game.status === 'miss') {
    circle(ctx, game.chair.x, game.chair.y, 3, '#f5e7be');
    if (game.status === 'miss') {
      const x = Math.max(70, Math.min(WIDTH - 70, game.chair.x));
      const y = Math.min(615, game.chair.y + 48);
      box(ctx, x - 42, y - 15, 84, 22, '#f3eedb', 4);
      label(ctx, '여기서 멈춤', x, y, 12, '#485f4d');
    }
  }
}

export function drawRoute(ctx, record) {
  ctx.save();
  ctx.setTransform(ctx.canvas.width / WIDTH, 0, 0, ctx.canvas.height / HEIGHT, 0, 0);
  box(ctx, 0, 0, WIDTH, HEIGHT, '#e6e7d7');
  box(ctx, WORLD.left, WORLD.top, WORLD.right - WORLD.left, WORLD.bottom - WORLD.top, '#f4f0df', 5, '#a4b39b');
  box(ctx, EXIT.x, EXIT.y, EXIT.w, EXIT.h, '#bfd6b6');
  label(ctx, '퇴근 ↓', EXIT.x + EXIT.w / 2, EXIT.y + 42, 23, '#3c684d');
  circle(ctx, EXIT.x + EXIT.w / 2, EXIT.y + EXIT.h / 2, 3, '#6b8968');
  box(ctx, DESK.x, DESK.y, DESK.w, DESK.h, '#d9c29a', 8, '#a58b65');
  label(ctx, '책상', DESK.x + DESK.w / 2, DESK.y + 53, 22, '#856d4d');
  circle(ctx, record.bin[0], record.bin[1], 18, '#8caa98');
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  line(ctx, record.path, '#c37543', 7);
  circle(ctx, record.path[0][0], record.path[0][1], 13, '#3b7653');
  record.pushes.forEach(([x, y], i) => {
    circle(ctx, x, y, 15, '#fff8de');
    label(ctx, String(i + 1), x, y + 6, 18, '#8b5734');
  });
  const [x, y] = record.path.at(-1);
  circle(ctx, x, y, 18, record.status === 'win' ? '#326744' : '#b85437');
  label(ctx, record.status === 'win' ? '✓' : '×', x, y + 9, 29, '#fff7df');
  ctx.restore();
}
