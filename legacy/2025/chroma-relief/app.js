import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── 10-color palette ──
const PALETTE = [
  { name: 'Red',    hex: 0xFF0000, rgb: [255, 0, 0] },
  { name: 'Orange', hex: 0xFF8C00, rgb: [255, 140, 0] },
  { name: 'Yellow', hex: 0xFFD700, rgb: [255, 215, 0] },
  { name: 'Green',  hex: 0x00AA00, rgb: [0, 170, 0] },
  { name: 'Blue',   hex: 0x0066FF, rgb: [0, 102, 255] },
  { name: 'Indigo', hex: 0x1B0066, rgb: [27, 0, 102] },
  { name: 'Violet', hex: 0x8B00FF, rgb: [139, 0, 255] },
  { name: 'Gray',   hex: 0x808080, rgb: [128, 128, 128] },
  { name: 'White',  hex: 0xFFFFFF, rgb: [255, 255, 255] },
  { name: 'Black',  hex: 0x000000, rgb: [0, 0, 0] },
];

// ── Space URL (obfuscated) ──
const _p = ['\x73\x6f\x6c\x62\x6f\x6e','1212','/','chroma-relief','-depth'];
const SPACE_URL = _p[0] + _p[1] + _p[2] + _p[3] + _p[4];

// ── DOM refs ──
const videoEl = document.getElementById('hidden-video');
const canvasEl = document.getElementById('hidden-canvas');
const ctx = canvasEl.getContext('2d', { willReadFrequently: true });
const depthCanvasEl = document.getElementById('depth-canvas');
const depthCtx = depthCanvasEl.getContext('2d', { willReadFrequently: true });
const containerEl = document.getElementById('container');
const uploadUI = document.getElementById('upload-ui');
const controlsUI = document.getElementById('controls');
const statusBar = document.getElementById('status-bar');
const videoInput = document.getElementById('video-input');
const colsSlider = document.getElementById('cols-slider');
const depthSlider = document.getElementById('depth-slider');
const colsValue = document.getElementById('cols-value');
const depthValue = document.getElementById('depth-value');
const depthModeBtn = document.getElementById('depth-mode-btn');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');

// ── State ──
let cols = 60;
let rows = 34;
let depthScale = 3.0;
let tiles = [];
let videoReady = false;
let needsRebuild = false;
const tileGap = 0.06;
const tileSize = 1;
const clock = new THREE.Clock();

// Depth estimation state
let useAIDepth = false;
let gradioClient = null;
let depthConnecting = false;
let depthReady = false;
let depthRunning = false;
let aiDepthGrid = null;
let lastDepthTime = 0;
const DEPTH_INTERVAL_MS = 1500;

// Audio state
let audioCtx = null;
let analyser = null;
let audioSource = null;
let smoothVolume = 0;
const AUDIO_ROW_OFFSET = 3; // 3rd row from bottom

// ── Three.js setup ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
containerEl.appendChild(renderer.domElement);

const orbitControls = new OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.target.set(0, 0, 0);

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(20, 20, 30);
scene.add(dirLight);
const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
dirLight2.position.set(-15, -10, 20);
scene.add(dirLight2);

// ── Status helpers ──
function showStatus(msg) {
  statusBar.textContent = msg;
  statusBar.classList.remove('hidden');
}
function hideStatus() {
  statusBar.classList.add('hidden');
}

// ── Color helpers ──
function nearestPaletteColor(r, g, b) {
  let minDist = Infinity;
  let best = PALETTE[0];
  for (const p of PALETTE) {
    const dr = r - p.rgb[0];
    const dg = g - p.rgb[1];
    const db = b - p.rgb[2];
    const d = dr * dr + dg * dg + db * db;
    if (d < minDist) {
      minDist = d;
      best = p;
    }
  }
  return best;
}

function brightness(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ── Audio analysis ──
function setupAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new AudioContext();
    audioSource = audioCtx.createMediaElementSource(videoEl);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    audioSource.connect(analyser);
    analyser.connect(audioCtx.destination);
    videoEl.muted = false;
    videoEl.volume = 1.0;
  } catch (e) {
    console.warn('Audio setup failed:', e);
  }
}

function getVolume() {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / data.length);
}

// ── HuggingFace Space Depth API ──
async function connectToSpace() {
  if (depthConnecting || depthReady) return;
  depthConnecting = true;
  showStatus('Connecting to depth server... (~30s on first load)');

  try {
    const { Client } = await import(
      'https://cdn.jsdelivr.net/npm/@gradio/client/+esm'
    );
    gradioClient = await Client.connect(SPACE_URL);
    depthReady = true;
    showStatus('AI depth server connected!');
    setTimeout(hideStatus, 2000);
  } catch (err) {
    console.error('Space connection failed:', err);
    showStatus('Server connection failed — falling back to brightness');
    useAIDepth = false;
    depthModeBtn.textContent = 'Depth: Brightness';
    depthModeBtn.classList.remove('active');
    setTimeout(hideStatus, 4000);
  }

  depthConnecting = false;
}

async function runDepthEstimation() {
  if (!depthReady || depthRunning || !videoReady || !gradioClient) return;
  if (videoEl.paused || videoEl.ended) return;

  const now = performance.now();
  if (now - lastDepthTime < DEPTH_INTERVAL_MS) return;

  depthRunning = true;
  lastDepthTime = now;

  try {
    const inputW = 512;
    const aspect = videoEl.videoWidth / videoEl.videoHeight;
    const inputH = Math.round(inputW / aspect);
    depthCanvasEl.width = inputW;
    depthCanvasEl.height = inputH;
    depthCtx.drawImage(videoEl, 0, 0, inputW, inputH);

    const blob = await new Promise(r => depthCanvasEl.toBlob(r, 'image/jpeg', 0.85));
    const result = await gradioClient.predict('/predict', [blob]);
    const depthImageUrl = result.data[0].url;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = depthImageUrl;
    });

    depthCanvasEl.width = cols;
    depthCanvasEl.height = rows;
    depthCtx.drawImage(img, 0, 0, cols, rows);
    const imageData = depthCtx.getImageData(0, 0, cols, rows);
    const pixels = imageData.data;

    const newGrid = new Float32Array(rows * cols);
    let minVal = 255, maxVal = 0;
    for (let i = 0; i < rows * cols; i++) {
      const v = pixels[i * 4];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const range = maxVal - minVal || 1;
    for (let i = 0; i < rows * cols; i++) {
      newGrid[i] = (pixels[i * 4] - minVal) / range;
    }

    aiDepthGrid = newGrid;
  } catch (err) {
    console.warn('Depth estimation error:', err);
  }

  depthRunning = false;
}

// ── Camera: fit grid to viewport ──
function fitCameraToGrid(totalW, totalH) {
  const fovRad = camera.fov * Math.PI / 180;
  const viewAspect = window.innerWidth / window.innerHeight;

  // Distance to fit the grid in view
  const dForHeight = (totalH / 2) / Math.tan(fovRad / 2);
  const dForWidth = (totalW / 2) / (Math.tan(fovRad / 2) * viewAspect);
  const d = Math.max(dForHeight, dForWidth) * 1.02; // 2% margin

  // Slight downward angle to reveal 3D depth
  camera.position.set(0, -d * 0.12, d);
  orbitControls.target.set(0, 0, 0);
  orbitControls.update();
}

// ── Build tile grid ──
function buildTiles() {
  for (const t of tiles) {
    scene.remove(t.mesh);
    t.mesh.geometry.dispose();
    t.mesh.material.dispose();
  }
  tiles = [];

  const totalW = cols * (tileSize + tileGap) - tileGap;
  const totalH = rows * (tileSize + tileGap) - tileGap;
  const offsetX = -totalW / 2;
  const offsetY = totalH / 2;

  const geo = new THREE.BoxGeometry(tileSize, tileSize, 0.6);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.55,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      const x = offsetX + col * (tileSize + tileGap) + tileSize / 2;
      const y = offsetY - row * (tileSize + tileGap) - tileSize / 2;
      mesh.position.set(x, y, 0);
      scene.add(mesh);
      tiles.push({
        mesh,
        targetColor: new THREE.Color(0x222222),
        targetZ: 0,
        currentZ: 0,
      });
    }
  }

  aiDepthGrid = null;
  fitCameraToGrid(totalW, totalH);
}

// ── Sample video frame ──
function sampleFrame() {
  if (!videoReady || videoEl.paused || videoEl.ended) return;
  if (!videoEl.videoWidth || !videoEl.videoHeight) return;

  canvasEl.width = cols;
  canvasEl.height = rows;
  ctx.drawImage(videoEl, 0, 0, cols, rows);
  const imageData = ctx.getImageData(0, 0, cols, rows);
  const data = imageData.data;

  if (useAIDepth && depthReady) {
    runDepthEstimation();
  }

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = (row * cols + col) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const palette = nearestPaletteColor(r, g, b);
      const tileIdx = row * cols + col;
      if (tileIdx >= tiles.length) continue;

      tiles[tileIdx].targetColor.setHex(palette.hex);

      if (useAIDepth && aiDepthGrid && tileIdx < aiDepthGrid.length) {
        tiles[tileIdx].targetZ = aiDepthGrid[tileIdx] * depthScale;
      } else {
        tiles[tileIdx].targetZ = brightness(r, g, b) * depthScale;
      }
    }
  }
}

// ── Animation loop ──
function animate() {
  requestAnimationFrame(animate);

  if (needsRebuild) {
    needsRebuild = false;
    buildTiles();
  }

  sampleFrame();

  // Audio volume (smoothed)
  const rawVol = getVolume();
  smoothVolume += (rawVol - smoothVolume) * 0.2;

  const elapsed = clock.getElapsedTime();
  const lerpFactor = 0.12;
  const audioRow = rows - AUDIO_ROW_OFFSET;

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i];
    const row = Math.floor(i / cols);
    const col = i % cols;

    // Smooth color transition
    t.mesh.material.color.lerp(t.targetColor, lerpFactor);

    // Breathing sine wave
    const breathe = Math.sin(elapsed * 1.5 + row * 0.15 + col * 0.1) * 0.12;

    // Smooth depth transition
    t.currentZ += (t.targetZ - t.currentZ) * lerpFactor;
    t.mesh.position.z = t.currentZ + breathe;

    // Audio-reactive: 3rd row from bottom pulses with volume
    if (row === audioRow && audioRow >= 0) {
      const pulse = 1 + smoothVolume * 3.0;
      t.mesh.scale.set(pulse, pulse, pulse);
    } else {
      t.mesh.scale.set(1, 1, 1);
    }
  }

  orbitControls.update();
  renderer.render(scene, camera);
}

// ── Event listeners ──
videoInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  videoEl.src = url;
  videoEl.muted = true; // muted initially for autoplay
  videoEl.load();

  videoEl.addEventListener('loadeddata', () => {
    videoReady = true;
    const aspect = videoEl.videoWidth / videoEl.videoHeight;
    rows = Math.round(cols / aspect);
    colsValue.textContent = cols;

    uploadUI.classList.add('hidden');
    controlsUI.classList.remove('hidden');

    buildTiles();

    // Setup audio on user interaction, then unmute and play
    setupAudio();
    videoEl.play();
  }, { once: true });
});

colsSlider.addEventListener('input', () => {
  cols = parseInt(colsSlider.value);
  colsValue.textContent = cols;
  if (videoReady) {
    const aspect = videoEl.videoWidth / videoEl.videoHeight;
    rows = Math.round(cols / aspect);
    needsRebuild = true;
  }
});

depthSlider.addEventListener('input', () => {
  depthScale = parseFloat(depthSlider.value);
  depthValue.textContent = depthScale.toFixed(1);
});

depthModeBtn.addEventListener('click', () => {
  useAIDepth = !useAIDepth;
  if (useAIDepth) {
    depthModeBtn.textContent = 'Depth: AI';
    depthModeBtn.classList.add('active');
    if (!depthReady && !depthConnecting) {
      connectToSpace();
    }
  } else {
    depthModeBtn.textContent = 'Depth: Brightness';
    depthModeBtn.classList.remove('active');
    aiDepthGrid = null;
  }
});

playBtn.addEventListener('click', () => {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  videoEl.play();
});
pauseBtn.addEventListener('click', () => videoEl.pause());

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (videoReady) {
    const totalW = cols * (tileSize + tileGap) - tileGap;
    const totalH = rows * (tileSize + tileGap) - tileGap;
    fitCameraToGrid(totalW, totalH);
  }
});

// ── Start ──
animate();
