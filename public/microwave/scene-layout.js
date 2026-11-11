// Zoom around the oven, keeping the painted key inside the viewport.
export function sceneLayout(width, height, tension = 0) {
  const scale = Math.min(width / 256, height * 1.5 / 384) * (1 + .07 * tension);
  return { width: 256 * scale, height: 384 * scale, left: (width - 256 * scale) / 2, top: height * .5 - 190 * scale, scale };
}

export function sceneBeat(state, elapsed, sinceResult = 0) {
  return {
    tension: state === 'running' ? Math.max(0, Math.min(1, (elapsed - 7000) / 3000)) : 0,
    foodFrame: Math.floor(Math.max(0, elapsed) / 150) % 8,
    light: state === 'running',
    family: state === 'failure' && sinceResult >= 650,
    dialogue: state === 'failure' && sinceResult >= 1200,
  };
}
