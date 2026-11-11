import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { advanceMotion } from './motion.js';
import { createWrapperGeometry } from './dumpling.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';

const button = document.querySelector('#action');
const status = document.querySelector('#status');
const timer = document.querySelector('#timer');
try { mount(); } catch (error) {
  document.querySelector('#error').hidden = false;
  console.error(error);
}
function mount() {
  const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const labels = new CSS3DRenderer();
  // Clip without a scroll container: focusing a projected button must not scroll its labels off the panel.
  Object.assign(labels.domElement.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'clip' });
  document.querySelector('main').append(labels.domElement);
  const labelScene = new THREE.Scene();
  function panelLabel(element, x, y, z) {
    const object = new CSS3DObject(element);
    object.position.set(x, y, z); object.scale.setScalar(.006);
    labelScene.add(object); return object;
  }
  panelLabel(timer, 1.91, 2.02, 1.405);
  const buttonLabel = panelLabel(button, 1.91, 1.32, 1.49);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#111c23');
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 60);
  camera.position.set(4.2, 3.2, 10.5);
  camera.lookAt(0, 1.1, 0);
  const material = (color, metalness = 0, roughness = .6) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const shell = material('#a4b1ad', .35, .4);
  const trim = material('#273237', .4, .4);
  const inside = material('#b0b3a4', .2);
  const wood = material('#705648');
  function box(w, h, d, mat, x, y, z, radius = .04) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, radius), mat);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; scene.add(mesh); return mesh;
  }
  scene.add(new THREE.HemisphereLight('#afc9df', '#3b2c25', 1.7));
  const key = new THREE.DirectionalLight('#ffe1bb', 3.2);
  key.position.set(-3, 7, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = .025;
  scene.add(key);
  box(18, .22, 8, wood, 0, -.16, 0);
  box(18, 7, .2, material('#324d57'), 0, 3.2, -3);
  // Open shell keeps the cavity and rotating food readable through the front glass.
  box(4.9, .18, 2.8, shell, 0, 2.66, 0);
  box(4.9, .18, 2.8, shell, 0, .28, 0);
  box(.18, 2.35, 2.8, shell, -2.36, 1.47, 0);
  box(.18, 2.35, 2.8, shell, 2.36, 1.47, 0);
  box(4.6, 2.2, .14, inside, 0, 1.45, -1.28);
  box(3.6, .08, 2.5, inside, -.47, .43, 0);
  box(.85, 2.3, 2.65, shell, 1.9, 1.47, 0);
  for (const x of [-1.9, 1.9]) for (const z of [-.9, .9]) box(.4, .17, .4, trim, x, .08, z);
  box(3.78, .16, .18, trim, -.48, 2.47, 1.43);
  box(3.78, .16, .18, trim, -.48, .49, 1.43);
  box(.16, 1.9, .18, trim, -2.29, 1.48, 1.43);
  box(.18, 1.9, .18, trim, 1.34, 1.48, 1.43);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.45, 1.77), new THREE.MeshPhysicalMaterial({ color: '#75969b', transparent: true, opacity: .09, roughness: .15, depthWrite: false }));
  glass.position.set(-.48, 1.48, 1.45); scene.add(glass);
  box(.14, 1.35, .22, shell, 1.23, 1.5, 1.65);
  for (let i = 0; i < 6; i++) box(.44, .025, .025, trim, 1.92, .62 + i * .09, 1.36, .005);
  const platter = new THREE.Group(); platter.position.set(-.45, .54, .08); scene.add(platter);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.08, .98, .09, 64), material('#dddac4', .1, .24));
  plate.castShadow = plate.receiveShadow = true; platter.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.015, .035, 8, 64), material('#e9e5d0', .1, .24));
  rim.rotation.x = Math.PI / 2; rim.position.y = .045; platter.add(rim);
  const dough = new THREE.MeshPhysicalMaterial({ color: '#eee5d1', roughness: .58, sheen: .2, sheenRoughness: .8, sheenColor: '#fff2dc' });
  const wrapper = createWrapperGeometry();
  for (let i = 0; i < 3; i++) {
    const dumpling = new THREE.Group();
    const a = i * Math.PI * 2 / 3;
    dumpling.position.set(Math.cos(a) * .52, .09, Math.sin(a) * .52);
    dumpling.rotation.y = -a + .4;
    const body = new THREE.Mesh(wrapper, dough);
    body.castShadow = body.receiveShadow = true; dumpling.add(body);
    platter.add(dumpling);
  }
  const lamp = new THREE.PointLight('#ffd28a', 0, 5, 1.6);
  lamp.position.set(.7, 2.15, .5); scene.add(lamp);
  const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff0ba', emissive: '#ffba4b', emissiveIntensity: 0 });
  box(.12, .28, .18, bulbMat, 1.36, 2.15, .3);
  box(.69, .4, .07, trim, 1.91, 2.02, 1.36, .025);
  box(.62, .32, .025, material('#101b19'), 1.91, 2.02, 1.401, .015);
  box(.64, .56, .07, trim, 1.91, 1.32, 1.375, .07);
  const pressMat = material('#66746f', .45, .35);
  const keyMesh = box(.55, .47, .11, pressMat, 1.91, 1.32, 1.425, .06);
  const indicatorMat = new THREE.MeshStandardMaterial({ color: '#77835d', emissive: '#c5e982', emissiveIntensity: 0 });
  const indicator = box(.17, .025, .012, indicatorMat, 1.91, 1.49, 1.485, .008);
  let running = false, elapsed = 0, speed = 0, angle = 0, pressedAt = -1000, previous = performance.now();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function toggle() {
    running = !running; pressedAt = performance.now();
    button.setAttribute('aria-label', running ? '정지' : '돌리기');
    status.textContent = running ? '조명이 켜지고, 만두가 천천히 돌아갑니다.' : '멈췄어요. 다시 누르면 이어서 돌아갑니다.';
  }
  button.disabled = false; button.innerHTML = '<span aria-hidden="true">▷ / Ⅱ</span><small aria-hidden="true">시작 · 정지</small>';
  button.setAttribute('aria-label', '돌리기');
  button.addEventListener('click', toggle);
  document.addEventListener('keydown', event => {
    if (event.code !== 'Space' || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('a, button')) return;
    event.preventDefault(); toggle();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && running) toggle(); });
  function resize() {
    const width = innerWidth, height = document.querySelector('main').clientHeight;
    renderer.setSize(width, height, false); labels.setSize(width, height); camera.aspect = width / height;
    const distance = width < 600 ? 15.8 : 10.5;
    camera.position.set(distance * .4, distance * .24 + .7, distance);
    if (camera.aspect < .65) camera.position.multiplyScalar(.65 / camera.aspect);
    camera.lookAt(0, 1.25, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    const center = buttonLabel.position.clone().project(camera);
    const right = buttonLabel.position.clone().add(new THREE.Vector3(.006, 0, 0)).project(camera);
    const up = buttonLabel.position.clone().add(new THREE.Vector3(0, .006, 0)).project(camera);
    // Keep a 44px hit area even when the physical key is smaller on a phone.
    button.style.width = `${Math.max(100, 44 / (Math.abs(right.x - center.x) * width / 2))}px`;
    button.style.height = `${Math.max(90, 44 / (Math.abs(up.y - center.y) * height / 2))}px`;

  }
  new ResizeObserver(resize).observe(document.querySelector('main')); resize();
  renderer.setAnimationLoop(now => {
    const dt = Math.min((now - previous) / 1000, .05); previous = now;
    ({ speed, angle } = advanceMotion(speed, angle, running, dt));
    if (!reduced.matches) platter.rotation.y = angle;
    if (running) elapsed += dt;
    timer.textContent = running || elapsed ? `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${Math.floor(elapsed % 60).toString().padStart(2, '0')}` : 'READY';
    lamp.intensity += ((running ? 5 : .3) - lamp.intensity) * Math.min(1, dt * 12);
    bulbMat.emissiveIntensity = running ? 2 : 0;
    const press = Math.max(0, 1 - (now - pressedAt) / 200);
    keyMesh.position.z = 1.425 - press * .035;
    buttonLabel.position.z = 1.49 - press * .035;
    indicator.position.z = 1.485 - press * .035;
    indicatorMat.emissiveIntensity = running ? 2 : 0;
    renderer.render(scene, camera);
    labels.render(labelScene, camera);
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); running = false; button.disabled = true; document.querySelector('#error').hidden = false;
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => location.reload());
}
