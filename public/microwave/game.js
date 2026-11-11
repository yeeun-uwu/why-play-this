import { createSound } from './audio.js';
import { DURATION, resultAt, displayTime, readBest, saveBest } from './rules.js';

const timer = document.querySelector('#timer');
const action = document.querySelector('#action');
const microwave = document.querySelector('#microwave');
const message = document.querySelector('#message');
const detail = document.querySelector('#detail');
const result = document.querySelector('#result');
const sound = document.querySelector('#sound');
let storage;
try { storage = window.localStorage; } catch { /* Play remains available without storage. */ }
let best = readBest(storage);
let running = false;
let startedAt = 0;
let frame = 0;
const audio = createSound();
let soundEnabled = false;
function formatRemaining(ms) {
  // A positive fraction must never display as 0.000 on a successful stop.
  return (Math.ceil(ms) / 1000).toFixed(3);
}

function renderBest() {
  document.querySelector('#best').textContent = best === null
    ? '아직 기록이 없어요'
    : `${resultAt(DURATION - best).score}점 · ${formatRemaining(best)}초 남김`;
}

sound.addEventListener('click', async () => {
  sound.disabled = true;
  try {
    soundEnabled = await audio.enable(!soundEnabled, running ? performance.now() - startedAt : null);
  } catch {
    document.querySelector('#storage-note').textContent = '소리를 재생할 수 없어요. 무음으로 플레이할 수 있습니다.';
  } finally {
    sound.disabled = false;
    sound.setAttribute('aria-pressed', String(soundEnabled));
    sound.textContent = soundEnabled ? '소리 끄기' : '소리 켜기';
  }
});

function finish(elapsed) {
  if (!running) return;
  running = false;
  audio.finish(resultAt(elapsed).success);
  cancelAnimationFrame(frame);
  const outcome = resultAt(elapsed);
  timer.textContent = displayTime(elapsed);
  microwave.dataset.state = outcome.success ? 'success' : 'failure';
  microwave.dataset.elapsed = String(Math.min(elapsed, DURATION));
  microwave.dataset.finished = String(performance.now());
  microwave.dataset.critical = 'false';
  message.textContent = outcome.success ? '안 들켰다!' : '삐————!';
  detail.textContent = outcome.success ? '조용히 만두 확보.' : '…방에서 인기척이 난다.';
  result.hidden = false;
  result.textContent = `${formatRemaining(outcome.remaining)}초 남김 · ${outcome.score}점`;
  if (outcome.success && (best === null || outcome.remaining < best)) {
    best = outcome.remaining;
    const saved = saveBest(storage, best);
    detail.textContent = '최고 기록';
    if (!saved) document.querySelector('#storage-note').textContent = '저장할 수 없어 이번 페이지에서만 기록을 유지해요.';
    renderBest();
  }
  action.textContent = '한 판 더';
}

function tick() {
  const elapsed = performance.now() - startedAt;
  timer.textContent = displayTime(elapsed);
  microwave.dataset.elapsed = String(elapsed);
  microwave.dataset.critical = String(elapsed >= 7000);
  if (elapsed >= DURATION) finish(elapsed);
  else frame = requestAnimationFrame(tick);
}

function activate() {
  microwave.dataset.pressed = String(performance.now());
  if (running) {
    finish(performance.now() - startedAt);
    return;
  }
  startedAt = performance.now();
  running = true;
  audio.start();
  microwave.dataset.state = 'running';
  microwave.dataset.finished = '';
  microwave.dataset.critical = 'false';
  message.textContent = '';
  detail.textContent = '';
  result.hidden = true;
  action.textContent = '정지';
  tick();
}

action.addEventListener('click', activate);
document.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest('a, button, input, textarea, select, summary, [contenteditable="true"]') && event.target !== action) return;
  event.preventDefault();
  if (!event.repeat) activate();
});
// Native button Space keyup must not add a second action after our keydown.
action.addEventListener('keyup', (event) => {
  if (event.code === 'Space') event.preventDefault();
});
document.addEventListener('visibilitychange', () => {
  if (running && document.hidden) finish(DURATION);
});
renderBest();
if (!storage) document.querySelector('#storage-note').textContent = '저장할 수 없어 이번 페이지에서만 기록을 유지해요.';
action.disabled = false;
action.textContent = '돌리기';

// The game remains playable if the artwork is unavailable.
import('./scene.js').then(({ mountKitchen }) => mountKitchen(microwave)).catch(() => {
  microwave.classList.add('no-art');
  document.querySelector('#render-note').hidden = false;
});
