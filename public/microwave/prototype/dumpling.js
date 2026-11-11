import { Vector3 } from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

const pleats = [
  [.15, .039, .7, 3.2], [.26, .032, .95, 4.5], [.38, .044, .65, 3.8],
  [.52, .037, .85, 5.2], [.63, .046, .6, 3.1], [.76, .034, .9, 4.2], [.85, .03, .55, 5],
];

// A thin pinched lip grows out of the filled belly, with uneven folds below it.
export function wrapperPoint(u, v, target = new Vector3()) {
  const arch = Math.sin(Math.PI * u);
  const around = v * Math.PI * 2;
  const height = (1 + Math.cos(around)) / 2;
  const upper = Math.pow(height, 4);
  const pinch = Math.max(0, Math.min(1, (height - .76) / .22));
  const thickness = 1 - .86 * pinch * pinch * (3 - 2 * pinch);
  const shoulder = Math.max(0, Math.min(1, (.94 - height) / .14));
  let fold = 0;
  for (const [center, width, strength, reach] of pleats) {
    const distance = u - center - (.025 + center * .025) * (1 - height);
    fold += strength * Math.pow(height, reach) * (Math.exp(-Math.pow(distance / width, 2))
      - .45 * Math.exp(-Math.pow((distance - width) / (width * .75), 2)));
  }
  return target.set(
    (u - .5) * 1.12,
    .035 + arch * (.52 * height + .007 * fold + .004 * Math.sin(u * 19) * upper),
    .11 * arch * arch + arch * Math.sin(around) * ((.19 + .075 * fold) * thickness
      + .14 * fold * shoulder * shoulder * (3 - 2 * shoulder))
      + .028 * fold * arch * upper,
  );
}

export function createWrapperGeometry() {
  return new ParametricGeometry((u, v, target) => wrapperPoint(u, 1 - v, target), 96, 40);
}
