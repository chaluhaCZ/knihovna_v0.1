import { characters } from './characters.js';
import { models } from './models.js';

const storageKey = 'library-treasure-hunt-v1';
const camera = document.querySelector('#camera');
const start = document.querySelector('#start');
const catchButton = document.querySelector('#catch');
const status = document.querySelector('#status');
const count = document.querySelector('#count');
const list = document.querySelector('#characters');
const warning = document.querySelector('#storage-warning');
const reset = document.querySelector('#reset');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const entries = new Map();
const visible = new Set();
let progress = loadProgress();
let active;
let operation;
let scene;
let cameraReady = false;
let cameraFailed = false;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey)) ?? {};
    const legacy = localStorage.getItem(storageKey) === null
      ? JSON.parse(localStorage.getItem('library-ar-hunt-v1')) : null;
    const states = new Map();
    for (const { id } of characters) {
      if (saved[id] === 'caught' || saved[id] === 'returned') states.set(id, saved[id]);
    }
    if (legacy?.foxReturned) states.set('fox', 'returned');
    else if (legacy?.foxFound) states.set('fox', 'caught');
    return states;
  } catch {
    return new Map();
  }
}

function saveProgress() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(progress)));
  } catch {
    warning.hidden = false;
  }
  renderCollection();
}

for (const character of characters) {
  const row = document.createElement('li');
  const icon = document.createElement('span');
  const detail = document.createElement('div');
  const name = document.createElement('strong');
  const label = document.createElement('small');
  icon.className = 'character-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = character.icon;
  name.textContent = character.name;
  detail.append(name, label);
  row.append(icon, detail);
  list.append(row);
  entries.set(character.id, { row, label, icon });
}

function renderCollection() {
  let returned = 0;
  for (const { id, book } of characters) {
    const state = progress.get(id) ?? 'missing';
    const { row, label } = entries.get(id);
    row.dataset.state = state;
    const labels = { missing: 'Still hiding', caught: `Find ${book}`, returned: `Back in ${book}` };
    label.textContent = labels[state];
    if (state === 'returned') returned++;
  }
  count.textContent = `${returned}/${characters.length} returned`;
}

function addMarker(character, kind) {
  const marker = document.createElement('a-marker');
  marker.id = `${character.id}-${kind}`;
  marker.setAttribute('type', 'pattern');
  marker.setAttribute('url', new URL(character[kind].pattern, document.baseURI).href);
  marker.setAttribute('emitevents', 'true');
  marker.setAttribute('smooth', 'true');
  const model = models[character.model](character.color);
  const target = { marker, model, character, kind };
  model.root.visible = false;
  marker.setObject3D('character', model.root);
  marker.addEventListener('markerFound', () => {
    visible.add(target);
    refreshTarget();
  });
  marker.addEventListener('markerLost', () => {
    visible.delete(target);
    if (operation?.target === target && operation.type === 'return') operation = undefined;
    refreshTarget();
  });
  scene.append(marker);
}

function refreshTarget() {
  if (active) active.model.root.visible = false;
  catchButton.hidden = true;
  reset.disabled = Boolean(operation);
  if (operation) {
    active = operation.target;
    active.model.root.visible = true;
    return;
  }
  active = [...visible].at(-1);
  if (!active) {
    status.textContent = cameraReady ? 'Point the camera at a hiding spot or a book marker.' : 'Starting the camera…';
    return;
  }
  const { character, model, kind } = active;
  const state = progress.get(character.id);
  if (kind === 'hideout') {
    if (state) {
      status.textContent = state === 'returned' ? `${character.name} is back in its book.` : `You caught this character. Look for ${character.book}.`;
      return;
    }
    model.root.visible = true;
    catchButton.hidden = false;
    status.textContent = `You found ${character.name.toLowerCase()}!`;
    return;
  }
  if (state === 'returned') {
    status.textContent = `${character.name} is back in ${character.book}.`;
  } else if (state === 'caught') {
    begin('return');
  } else {
    const caught = characters.filter(({ id }) => progress.get(id) === 'caught');
    status.textContent = caught.length
      ? `Try ${caught.map(({ book }) => book).join(' or ')} for your collection.`
      : `Find and catch ${character.name.toLowerCase()} before coming back to this page.`;
  }
}

function begin(type) {
  operation = { type, target: active, started: performance.now(), flying: false };
  active.model.root.visible = true;
  catchButton.hidden = true;
  reset.disabled = true;
  status.textContent = type === 'catch' ? 'Catching…' : 'Hold the book marker in view while the character returns.';
}

function finish(current, state) {
  progress.set(current.target.character.id, state);
  saveProgress();
  operation = undefined;
  if (cameraFailed) {
    reset.disabled = false;
    return;
  }
  refreshTarget();
  if (state === 'caught' && !operation) {
    status.textContent = `Caught! Look for ${current.target.character.book}.`;
  }
}

async function flyToCollection(current) {
  current.flying = true;
  const { character, model } = current.target;
  const icon = document.createElement('span');
  icon.className = 'flying-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = character.icon;
  const canvas = scene.canvas.getBoundingClientRect();
  const point = new window.THREE.Vector3(0, .45, 0);
  model.root.localToWorld(point).project(scene.camera);
  const clamp = (value, limit) => Number.isFinite(value) ? Math.max(24, Math.min(limit - 24, value)) : limit / 2;
  const x = clamp(canvas.left + (point.x + 1) * canvas.width / 2, innerWidth);
  const y = clamp(canvas.top + (1 - point.y) * canvas.height / 2, innerHeight);
  const target = entries.get(character.id).icon;
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  const end = target.getBoundingClientRect();
  document.body.append(icon);
  try {
    await icon.animate([
      { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(.65)` },
      { transform: `translate(${end.left + end.width / 2}px, ${end.top + end.height / 2}px) translate(-50%, -50%) scale(.55)` },
    ], { duration: reducedMotion.matches ? 100 : 380, easing: 'ease-in-out' }).finished;
  } catch {
    // The collection update can complete if the browser cancels the visual effect.
  } finally {
    icon.remove();
    finish(current, 'caught');
  }
}

const catchAnimations = {
  wave(root, t) { root.rotation.y = .22 * Math.sin(t * Math.PI * 4); return 1; },
  spin(root, t) { root.rotation.y = t * Math.PI * 2; return .35; },
};
const returnAnimations = {
  crawl(root, travel) { root.position.y = .035 * Math.sin(travel * Math.PI * 10); return .2; },
  hop(root, travel) { root.position.y = .28 * Math.abs(Math.sin(travel * Math.PI * 3)); return .45; },
  swim(root, travel) { root.position.y = .10 * Math.sin(travel * Math.PI * 4) + .10; return .8; },
};

function draw(now) {
  requestAnimationFrame(draw);
  if (!active?.model.root.visible) return;
  const { model, character } = active;
  const { root } = model;
  const time = reducedMotion.matches ? 0 : now / 1000;
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.scale.setScalar(character.size);
  if (!operation) {
    model.pose(time);
    return;
  }

  const current = operation;
  if (current.type === 'catch') {
    const t = Math.min(1, (now - current.started) / (reducedMotion.matches ? 230 : 1050));
    const wave = reducedMotion.matches ? 0 : catchAnimations[character.catchAnimation](root, t);
    root.scale.setScalar(character.size * Math.max(.04, 1 - Math.max(0, (t - .32) / .68) ** 1.6));
    model.pose(time, wave);
    if (t === 1 && !current.flying) void flyToCollection(current);
    return;
  }

  const t = Math.min(1, (now - current.started) / (reducedMotion.matches ? 500 : 2400));
  const travel = Math.max(0, Math.min(1, (t - .17) / .57));
  const sink = Math.max(0, (t - .74) / .26);
  const size = Math.min(1.15, character.size);
  root.position.x = -1.25 * (1 - travel);
  root.rotation.y = Math.PI / 2 * (1 - sink);
  const wave = reducedMotion.matches ? 0 : returnAnimations[character.returnAnimation](root, travel);
  root.position.y *= 1 - sink;
  root.scale.set(size * (1 - .97 * sink ** 3), size * (1 - .99 * Math.min(1, sink * 1.65)), size * (1 - .97 * sink ** 3));
  model.pose(time, wave * (1 - sink), sink ** 2);
  if (t === 1) finish(current, 'returned');
}

function failCamera(message) {
  cameraFailed = true;
  cameraReady = false;
  document.body.classList.remove('camera-running');
  visible.clear();
  if (active) active.model.root.visible = false;
  if (!operation?.flying) operation = undefined;
  active = undefined;
  catchButton.hidden = true;
  reset.disabled = Boolean(operation);
  start.textContent = 'Reload to retry';
  start.disabled = false;
  status.textContent = message;
}

window.addEventListener('arjs-video-loaded', ({ detail: { component: video } }) => {
  camera.prepend(video);
  new ResizeObserver(() => {
    const { width, height } = video.getBoundingClientRect();
    scene.style.width = `${width}px`;
    scene.style.height = `${height}px`;
    scene.resize();
  }).observe(video);
  cameraReady = true;
  document.body.classList.add('camera-running');
  refreshTarget();
  video.srcObject?.getVideoTracks().forEach(track => {
    track.addEventListener('ended', () => failCamera('The camera stopped. Retry to resume scanning.'));
  });
});
window.addEventListener('camera-error', () => {
  failCamera('Camera unavailable. Allow camera access in your browser, then retry.');
});

start.addEventListener('click', () => {
  if (cameraFailed) {
    location.reload();
    return;
  }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    status.textContent = 'Open this page over HTTPS in a browser with camera access.';
    return;
  }
  if (!window.AFRAME?.systems.arjs) {
    status.textContent = 'The scanner could not load. Reload this page to try again.';
    return;
  }
  start.disabled = true;
  status.textContent = 'Starting the camera…';
  scene = document.createElement('a-scene');
  scene.setAttribute('embedded', '');
  scene.setAttribute('vr-mode-ui', 'enabled: false');
  scene.setAttribute('arjs', `sourceType: webcam; trackingMethod: best; debugUIEnabled: false; cameraParametersUrl: ${new URL('vendor/camera_para.dat', document.baseURI).href}`);
  scene.setAttribute('renderer', 'alpha: true; antialias: true');
  scene.setAttribute('device-orientation-permission-ui', 'enabled: false');
  scene.innerHTML = '<a-entity camera></a-entity><a-light type="ambient" intensity=".85"></a-light><a-light type="directional" intensity=".8" position="1 3 2"></a-light>';
  for (const character of characters) {
    addMarker(character, 'hideout');
    addMarker(character, 'page');
  }
  camera.append(scene);
  requestAnimationFrame(draw);
});

catchButton.addEventListener('click', () => {
  if (active?.kind === 'hideout' && !operation && !progress.has(active.character.id)) begin('catch');
});
reset.addEventListener('click', () => {
  if (operation || !confirm('Reset progress on this phone?')) return;
  progress.clear();
  saveProgress();
  if (scene) refreshTarget();
});
renderCollection();
