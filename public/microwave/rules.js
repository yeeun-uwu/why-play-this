export const DURATION = 10_000;
const BEST_KEY = 'why-play-this:microwave:best:v1';

export function resultAt(elapsed) {
  const success = Number.isFinite(elapsed) && elapsed >= 0 && elapsed < DURATION;
  return {
    success,
    remaining: success ? DURATION - elapsed : 0,
    score: success ? Math.floor(elapsed / 10) : 0,
  };
}

export function displayTime(elapsed) {
  const seconds = Math.ceil(Math.max(0, DURATION - elapsed) / 1000);
  return `00:${String(seconds).padStart(2, '0')}`;
}

function validRecord(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= DURATION;
}

export function readBest(storage) {
  try {
    const value = JSON.parse(storage.getItem(BEST_KEY));
    return validRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveBest(storage, remaining) {
  if (!validRecord(remaining)) return false;
  try {
    const best = readBest(storage);
    if (best === null || remaining < best) storage.setItem(BEST_KEY, JSON.stringify(remaining));
    return true;
  } catch {
    return false;
  }
}
