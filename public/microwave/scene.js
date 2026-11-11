import { sceneLayout, sceneBeat } from './scene-layout.js';

export async function mountKitchen(host) {
  const canvas = host.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  const [art, food, handArt, familyArt] = await Promise.all([new URL('./art/kitchen-empty.png', import.meta.url), new URL('./art/turntable-strip.png', import.meta.url), new URL('./art/hand-b.png', import.meta.url), new URL('./art/family-b.png', import.meta.url)].map(async url => {
    const image = new Image();
    image.src = url.href;
    await image.decode();
    return image;
  }));
  canvas.width = 256;
  canvas.height = 384;
  ctx.imageSmoothingEnabled = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const line = host.querySelector('#family-line');
  let tension = 0;
  function resize() {
    const layout = sceneLayout(host.clientWidth, host.clientHeight, tension);
    Object.assign(canvas.style, { width: `${layout.width}px`, height: `${layout.height}px`, left: `${layout.left}px`, top: `${layout.top}px` });
    for (const [id, x, y, width] of [['timer', 215, 175, 37], ['action', 218, 224, 34]]) {
      const element = host.querySelector(`#${id}`);
      Object.assign(element.style, {
        left: `${layout.left + x * layout.scale}px`, top: `${layout.top + y * layout.scale}px`,
        width: `${Math.max(id === 'action' ? 48 : 38, width * layout.scale)}px`,
        fontSize: `${Math.max(id === 'timer' ? 14 : 13, (id === 'timer' ? 8 : 6) * layout.scale)}px`,
      });
    }
  }
  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath(); ctx.fill();
  }
  function hand(press) {
    ctx.save();
    ctx.filter = 'brightness(0.75)';
    ctx.drawImage(handArt, press ? 208 : 210, press ? 214 : 218, 52, 78);
    ctx.restore();
  }
  function family() {
    ctx.save();
    // Clip the figure behind the counter, retaining the painted doorway and room depth.
    ctx.beginPath(); ctx.rect(216, 48, 36, 80); ctx.clip();
    ctx.fillStyle = '#d5ad631c'; ctx.fillRect(216, 48, 36, 80);
    ctx.drawImage(familyArt, 215, 58, 38, 76);
    ctx.restore();
  }
  let frame;
  let previous = -1;
  function render(now) {
    const step = Math.floor(now / 83);
    if (step !== previous) {
      previous = step;
      const state = host.dataset.state;
      const elapsed = Number(host.dataset.elapsed || 0);
      const beat = sceneBeat(state, elapsed, now - Number(host.dataset.finished || now));
      const nextTension = reduced.matches ? 0 : beat.tension;
      if (nextTension !== tension) { tension = nextTension; resize(); }
      ctx.drawImage(art, 0, 0, 256, 384);
      if (beat.family) family();
      const cell = food.width / 8;
      const foodFrame = reduced.matches ? 0 : beat.foodFrame;
      ctx.drawImage(food, cell * foodFrame, food.height * .39, cell, food.height * .23, 49, 202, 115, 45);
      // Put the moving food behind the door's pixel mesh, rather than on top of the glass.
      ctx.fillStyle = '#171411';
      ctx.globalAlpha = .4;
      for (let y = 202; y < 247; y += 2) for (let x = 49 + y % 4; x < 164; x += 4) ctx.fillRect(x, y, 1, 1);
      ctx.globalAlpha = 1;
      if (!beat.light) {
        ctx.globalAlpha = .48;
        polygon([[48,175],[165,168],[166,242],[49,253]], '#080b13');
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#f4d99f';
        ctx.globalAlpha = .35;
        for (let i = 0; i < 3; i++) {
          const rise = reduced.matches ? 4 : (step + i * 4) % 12;
          ctx.fillRect(82 + i * 26, 213 - rise, 1, 3);
          ctx.fillRect(83 + i * 26, 210 - rise, 1, 3);
        }
        ctx.globalAlpha = 1;
      }
      const pressed = host.dataset.pressed && now - Number(host.dataset.pressed) < 250;
      if (pressed) { ctx.fillStyle = '#4b201b'; ctx.fillRect(204,213,28,24); }
      hand(pressed);
      line.hidden = !beat.dialogue;
    }
    frame = requestAnimationFrame(render);
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const visibility = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden) frame = requestAnimationFrame(render);
  };
  document.addEventListener('visibilitychange', visibility);
  resize(); frame = requestAnimationFrame(render);
  return () => { observer.disconnect(); cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); };
}
