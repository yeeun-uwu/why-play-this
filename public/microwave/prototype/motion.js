export function advanceMotion(speed, angle, running, dt) {
  const target = running ? .7 : 0;
  const next = target + (speed - target) * Math.exp(-dt * (running ? 4 : 9));
  return { speed: next < .001 ? 0 : next, angle: angle + next * dt };
}
