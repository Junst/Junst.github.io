/* ============================================================
   Tab Orchestra — app.js
   Multi-tab music decomposition art using BroadcastChannel,
   IndexedDB, Web Audio API, and Canvas 2D.
   ============================================================ */

(() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────
  const STEMS = ['vocals', 'drums', 'bass', 'other'];
  const STEM_COLORS = {
    vocals: '#00E5FF',
    drums:  '#FF4444',
    bass:   '#AA44FF',
    other:  '#44FF88',
  };
  const STEM_LABELS = {
    vocals: 'Vocals',
    drums:  'Drums',
    bass:   'Bass',
    other:  'Other',
  };
  const DB_NAME = 'tab-orchestra';
  const DB_STORE = 'stems';
  const DB_VERSION = 1;
  const HF_SPACE_BASE = 'https://solbon1212-tab-orchestra-demucs.hf.space';
  const CHANNEL_NAME = 'tab-orchestra';

  // ── State ──────────────────────────────────────────────────
  const tabId = crypto.randomUUID();
  let isCoordinator = false;
  let assignedStem = null;       // 'vocals' | 'drums' | 'bass' | 'other'
  let audioCtx = null;
  let sourceNode = null;
  let analyser = null;
  let audioBuffer = null;
  let isPlaying = false;
  let playStartTime = 0;         // audioCtx.currentTime when play began
  let playOffset = 0;            // offset in seconds into the buffer
  let activeTabs = new Map();    // tabId → stem
  let channel = null;
  let animationId = null;
  let particles = [];
  let loopEnabled = false;
  let isMuted = false;
  let gainNode = null;
  let eqLow = null;
  let eqMid = null;
  let eqHigh = null;
  let abLoopA = null;  // seconds
  let abLoopB = null;  // seconds
  let abCheckInterval = null;

  // ── DOM refs ───────────────────────────────────────────────
  const $upload     = document.getElementById('upload-screen');
  const $processing = document.getElementById('processing-screen');
  const $waiting    = document.getElementById('waiting-screen');
  const $full       = document.getElementById('full-screen');
  const $visualizer = document.getElementById('visualizer');
  const $canvas     = document.getElementById('canvas');
  const ctx2d       = $canvas.getContext('2d');
  const $dropZone   = document.getElementById('drop-zone');
  const $fileInput  = document.getElementById('file-input');
  const $demoBtn    = document.getElementById('demo-btn');
  const $statusText = document.getElementById('status-text');
  const $progressFill = document.getElementById('progress-fill');
  const $instrLabel = document.getElementById('instrument-label');
  const $tabCount   = document.getElementById('tab-count');
  const $playPause  = document.getElementById('play-pause-btn');
  const $timeDisplay = document.getElementById('time-display');
  const $missingStems = document.getElementById('missing-stems');
  const $addTabBtn  = document.getElementById('add-tab-btn');
  const $loopBtn    = document.getElementById('loop-btn');

  // ── IndexedDB helpers ──────────────────────────────────────
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function dbGet(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).get(key);
      req.onsuccess = () => { db.close(); resolve(req.result); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }

  async function dbHasStems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const req = tx.objectStore(DB_STORE).getAllKeys();
      req.onsuccess = () => {
        db.close();
        const keys = req.result;
        resolve(STEMS.every(s => keys.includes(s)));
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }

  // ── BroadcastChannel ───────────────────────────────────────
  function initChannel() {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = handleMessage;
  }

  function broadcast(type, data = {}) {
    channel.postMessage({ type, from: tabId, ...data });
  }

  function handleMessage(e) {
    const msg = e.data;
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
    if (msg.from === tabId) return; // ignore own messages
    if (msg.type === 'assign' && !STEMS.includes(msg.stem)) return;

    switch (msg.type) {
      case 'join':
        handleJoin(msg);
        break;
      case 'assign':
        if (msg.target === tabId) handleAssign(msg);
        break;
      case 'stems-ready':
        handleStemsReady(msg);
        break;
      case 'play':
        handleRemotePlay(msg);
        break;
      case 'pause':
        handleRemotePause(msg);
        break;
      case 'seek':
        handleRemoteSeek(msg);
        break;
      case 'leave':
        handleLeave(msg);
        break;
      case 'roster':
        handleRoster(msg);
        break;
      case 'roster-request':
        if (isCoordinator) sendRoster();
        break;
      case 'full':
        if (msg.target === tabId) showFull();
        break;
      case 'reset':
        resetToUpload();
        break;
      case 'loop':
        loopEnabled = msg.enabled;
        $loopBtn.classList.toggle('loop-active', loopEnabled);
        break;
    }
  }

  // ── Coordinator logic ──────────────────────────────────────
  function getAssignedStems() {
    return new Set(activeTabs.values());
  }

  function findFreeStem() {
    const assigned = getAssignedStems();
    return STEMS.find(s => !assigned.has(s)) || null;
  }

  function handleJoin(msg) {
    if (!isCoordinator) return;
    const stem = findFreeStem();
    if (stem) {
      activeTabs.set(msg.from, stem);
      broadcast('assign', {
        target: msg.from,
        stem,
        playing: isPlaying,
        offset: getCurrentOffset(),
      });
      sendRoster();
    } else {
      broadcast('full', { target: msg.from });
    }
  }

  function handleLeave(msg) {
    activeTabs.delete(msg.from);
    if (isCoordinator) {
      sendRoster();
    }
    updateTabCountDisplay();

    // If coordinator left, elect new coordinator (lowest tabId)
    if (msg.wasCoordinator) {
      electNewCoordinator();
    }
  }

  function electNewCoordinator() {
    const allIds = [...activeTabs.keys()].sort();
    if (allIds.length > 0 && allIds[0] === tabId) {
      isCoordinator = true;
      sendRoster();
    }
  }

  function sendRoster() {
    const roster = Object.fromEntries(activeTabs);
    broadcast('roster', { roster, playing: isPlaying, offset: getCurrentOffset() });
  }

  function handleRoster(msg) {
    activeTabs = new Map(Object.entries(msg.roster));
    updateTabCountDisplay();

    // Sync playback state from coordinator
    if (audioBuffer && msg.playing !== undefined) {
      if (msg.playing && !isPlaying) {
        startPlayback(msg.offset || 0);
      } else if (!msg.playing && isPlaying) {
        stopPlayback();
        playOffset = msg.offset || 0;
      }
    } else if (!audioBuffer && msg.playing !== undefined) {
      // Store sync info for when audio loads
      isPlaying = msg.playing;
      playOffset = msg.offset || 0;
    }
  }

  // ── Role assignment ────────────────────────────────────────
  function handleAssign(msg) {
    assignedStem = msg.stem;
    // Store sync state from coordinator
    if (msg.playing !== undefined) {
      isPlaying = msg.playing;
      playOffset = msg.offset || 0;
    }
    onStemAssigned();
  }

  async function onStemAssigned() {
    document.body.className = `stem-${assignedStem}`;
    $instrLabel.textContent = STEM_LABELS[assignedStem];
    $instrLabel.style.color = STEM_COLORS[assignedStem];
    updateTabCountDisplay();

    // Try loading stem from IndexedDB
    const hasStems = await dbHasStems();
    if (hasStems) {
      await loadAndPlayStem();
    } else {
      show($waiting);
    }
  }

  function handleStemsReady() {
    if (assignedStem) {
      hide($waiting);
      loadAndPlayStem();
    }
  }

  // ── Audio loading & playback ───────────────────────────────
  async function loadAndPlayStem() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const arrayBuf = await dbGet(assignedStem);
    if (!arrayBuf) return;

    audioBuffer = await audioCtx.decodeAudioData(arrayBuf.slice(0));

    // Audio chain: source → EQ low → EQ mid → EQ high → gain → analyser → destination
    eqLow = audioCtx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.value = 250;
    eqLow.gain.value = 0;

    eqMid = audioCtx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.value = 1500;
    eqMid.Q.value = 1;
    eqMid.gain.value = 0;

    eqHigh = audioCtx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.value = 4000;
    eqHigh.gain.value = 0;

    gainNode = audioCtx.createGain();
    gainNode.gain.value = isMuted ? 0 : 1;

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(gainNode);
    gainNode.connect(analyser);
    analyser.connect(audioCtx.destination);

    show($visualizer);
    resizeCanvas();
    startVisualizer();

    // Auto-play if other tabs are playing
    if (isPlaying) {
      startPlayback(playOffset);
    }

    updateTimeDisplay();
  }

  function startPlayback(offset = 0) {
    if (!audioBuffer || !audioCtx) return;

    // Stop existing source
    if (sourceNode) {
      try { sourceNode.stop(); } catch (_) {}
    }

    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(eqLow);
    sourceNode.onended = onPlaybackEnded;

    const clampedOffset = Math.min(offset, audioBuffer.duration);
    sourceNode.start(0, clampedOffset);
    playStartTime = audioCtx.currentTime;
    playOffset = clampedOffset;
    isPlaying = true;
    $playPause.textContent = '\u23F8';
  }

  function stopPlayback() {
    if (sourceNode) {
      try { sourceNode.stop(); } catch (_) {}
      sourceNode = null;
    }
    playOffset = getCurrentOffset();
    isPlaying = false;
    $playPause.textContent = '\u25B6';
  }

  function getCurrentOffset() {
    if (!isPlaying || !audioCtx) return playOffset;
    const elapsed = audioCtx.currentTime - playStartTime;
    const total = audioBuffer ? audioBuffer.duration : 0;
    return Math.min(playOffset + elapsed, total);
  }

  function onPlaybackEnded() {
    if (isPlaying && audioBuffer) {
      const elapsed = audioCtx.currentTime - playStartTime;
      if (playOffset + elapsed >= audioBuffer.duration - 0.1) {
        if (loopEnabled) {
          // Restart from beginning
          startPlayback(0);
          if (isCoordinator) {
            broadcast('play', { offset: 0 });
          }
        } else {
          // Song ended
          isPlaying = false;
          playOffset = 0;
          $playPause.textContent = '\u25B6';
          if (isCoordinator) {
            broadcast('pause', { offset: 0 });
          }
        }
      }
    }
  }

  // ── Sync ───────────────────────────────────────────────────
  function handleRemotePlay(msg) {
    playOffset = msg.offset || 0;
    startPlayback(playOffset);
  }

  function handleRemotePause(msg) {
    playOffset = msg.offset || 0;
    stopPlayback();
    playOffset = msg.offset || 0;
  }

  function handleRemoteSeek(msg) {
    playOffset = msg.offset || 0;
    if (isPlaying) {
      startPlayback(playOffset);
    }
  }

  // ── Play/Pause button (syncs all tabs) ──────────────────────
  $playPause.addEventListener('click', () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      const offset = getCurrentOffset();
      stopPlayback();
      broadcast('pause', { offset });
    } else {
      startPlayback(playOffset);
      broadcast('play', { offset: playOffset });
    }
  });

  // ── Mute button (local only — other tabs keep playing) ─────
  const $muteBtn = document.getElementById('mute-btn');
  $muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (gainNode) gainNode.gain.value = isMuted ? 0 : 1;
    $muteBtn.textContent = isMuted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
    $muteBtn.classList.toggle('muted', isMuted);
  });

  // ── EQ sliders ─────────────────────────────────────────────
  const $eqLow = document.getElementById('eq-low');
  const $eqMid = document.getElementById('eq-mid');
  const $eqHigh = document.getElementById('eq-high');
  const $eqLowVal = document.getElementById('eq-low-val');
  const $eqMidVal = document.getElementById('eq-mid-val');
  const $eqHighVal = document.getElementById('eq-high-val');

  $eqLow.addEventListener('input', () => {
    const v = parseFloat($eqLow.value);
    if (eqLow) eqLow.gain.value = v;
    $eqLowVal.textContent = (v > 0 ? '+' : '') + v;
  });
  $eqMid.addEventListener('input', () => {
    const v = parseFloat($eqMid.value);
    if (eqMid) eqMid.gain.value = v;
    $eqMidVal.textContent = (v > 0 ? '+' : '') + v;
  });
  $eqHigh.addEventListener('input', () => {
    const v = parseFloat($eqHigh.value);
    if (eqHigh) eqHigh.gain.value = v;
    $eqHighVal.textContent = (v > 0 ? '+' : '') + v;
  });

  // ── Loop button ──────────────────────────────────────────────
  $loopBtn.addEventListener('click', () => {
    loopEnabled = !loopEnabled;
    $loopBtn.classList.toggle('loop-active', loopEnabled);
    broadcast('loop', { enabled: loopEnabled });
  });

  // ── A-B Loop ────────────────────────────────────────────────
  const $abA = document.getElementById('ab-a-btn');
  const $abB = document.getElementById('ab-b-btn');
  const $abClear = document.getElementById('ab-clear-btn');

  $abA.addEventListener('click', () => {
    abLoopA = getCurrentOffset();
    $abA.classList.add('ab-set');
    $abA.title = `A: ${fmtTime(abLoopA)}`;
    startABCheck();
  });

  $abB.addEventListener('click', () => {
    abLoopB = getCurrentOffset();
    $abB.classList.add('ab-set');
    $abB.title = `B: ${fmtTime(abLoopB)}`;
    startABCheck();
  });

  $abClear.addEventListener('click', () => {
    abLoopA = null;
    abLoopB = null;
    $abA.classList.remove('ab-set');
    $abB.classList.remove('ab-set');
    $abA.title = 'Set loop start';
    $abB.title = 'Set loop end';
    stopABCheck();
  });

  function startABCheck() {
    if (abCheckInterval) return;
    abCheckInterval = setInterval(() => {
      if (abLoopA !== null && abLoopB !== null && abLoopA < abLoopB && isPlaying) {
        const cur = getCurrentOffset();
        if (cur >= abLoopB) {
          startPlayback(abLoopA);
        }
      }
    }, 50);
  }

  function stopABCheck() {
    if (abCheckInterval) {
      clearInterval(abCheckInterval);
      abCheckInterval = null;
    }
  }

  // ── File upload / Demo ─────────────────────────────────────
  $dropZone.addEventListener('click', () => $fileInput.click());
  $dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    $dropZone.classList.add('dragover');
  });
  $dropZone.addEventListener('dragleave', () => {
    $dropZone.classList.remove('dragover');
  });
  $dropZone.addEventListener('drop', e => {
    e.preventDefault();
    $dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  });
  $fileInput.addEventListener('change', () => {
    if ($fileInput.files.length > 0) {
      handleFileUpload($fileInput.files[0]);
    }
  });

  $demoBtn.addEventListener('click', () => loadDemo());

  async function handleFileUpload(file) {
    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_SIZE) {
      $statusText.textContent = 'Error: File too large (max 20 MB).';
      show($processing);
      return;
    }
    show($processing);
    $statusText.textContent = 'Uploading & separating stems...';
    $progressFill.style.width = '10%';

    try {
      const stems = await separateWithHFSpace(file);
      $progressFill.style.width = '80%';
      $statusText.textContent = 'Storing stems...';

      for (const [stemName, arrayBuffer] of Object.entries(stems)) {
        await dbPut(stemName, arrayBuffer);
      }
      $progressFill.style.width = '100%';
      $statusText.textContent = 'Ready!';

      broadcast('stems-ready', {});
      await loadAndPlayStem();
    } catch (err) {
      $statusText.textContent = `Error: ${err.message}`;
      console.error(err);
    }
  }

  async function separateWithHFSpace(file) {
    // Gradio 5.x SSE-based API

    // Step 0: Wake up Space if sleeping
    $statusText.textContent = 'Connecting to server...';
    $progressFill.style.width = '10%';
    try {
      const wake = await fetch(`${HF_SPACE_BASE}/config`, { method: 'GET' });
      if (!wake.ok) throw new Error(`Server not ready (${wake.status})`);
    } catch (e) {
      throw new Error(`Cannot reach server: ${e.message}`);
    }

    // Step 1: Upload file
    $statusText.textContent = 'Uploading audio...';
    $progressFill.style.width = '20%';

    const formData = new FormData();
    formData.append('files', file);
    let uploadRes;
    try {
      uploadRes = await fetch(`${HF_SPACE_BASE}/gradio_api/upload`, {
        method: 'POST',
        body: formData,
      });
    } catch (e) {
      throw new Error(`Upload network error: ${e.message}`);
    }
    if (!uploadRes.ok) {
      const body = await uploadRes.text().catch(() => '');
      throw new Error(`Upload failed (${uploadRes.status}): ${body.slice(0, 200)}`);
    }
    const uploadedPaths = await uploadRes.json();

    // Step 2: Call the function (SSE)
    $statusText.textContent = 'Separating stems (this may take ~2 min)...';
    $progressFill.style.width = '30%';

    const callRes = await fetch(`${HF_SPACE_BASE}/gradio_api/call/separate_stems`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          path: uploadedPaths[0],
          orig_name: file.name,
          mime_type: file.type,
          meta: { _type: 'gradio.FileData' },
        }],
      }),
    });
    if (!callRes.ok) {
      const body = await callRes.text().catch(() => '');
      throw new Error(`Separation request failed (${callRes.status}): ${body.slice(0, 200)}`);
    }
    const { event_id } = await callRes.json();

    // Step 3: Poll for result (more reliable than EventSource for cross-origin)
    const resultData = await pollForResult(event_id);

    $progressFill.style.width = '60%';
    $statusText.textContent = 'Downloading stems...';

    // Step 4: Download each stem file
    const stems = {};
    const stemNames = ['vocals', 'drums', 'bass', 'other'];
    for (let i = 0; i < 4; i++) {
      const stemData = resultData[i];
      // Use path to construct URL (the url field from Gradio can have double-path bugs)
      const filePath = stemData?.path || stemData;
      const url = `${HF_SPACE_BASE}/gradio_api/file=${filePath}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to download ${stemNames[i]} (${res.status})`);
      stems[stemNames[i]] = await res.arrayBuffer();
      $progressFill.style.width = `${60 + (i + 1) * 8}%`;
    }

    return stems;
  }

  async function loadDemo() {
    show($processing);
    $statusText.textContent = 'Loading demo stems...';
    $progressFill.style.width = '10%';

    try {
      for (let i = 0; i < STEMS.length; i++) {
        const stem = STEMS[i];
        const res = await fetch(`demo/${stem}.wav`);
        if (!res.ok) throw new Error(`demo/${stem}.wav not found`);
        const arrayBuffer = await res.arrayBuffer();
        await dbPut(stem, arrayBuffer);
        $progressFill.style.width = `${25 + (i + 1) * 18}%`;
      }

      $progressFill.style.width = '100%';
      $statusText.textContent = 'Ready!';
      broadcast('stems-ready', {});
      await loadAndPlayStem();
    } catch (err) {
      $statusText.textContent = `Error: ${err.message}`;
      console.error(err);
    }
  }

  // ── SSE via fetch (avoids EventSource CORS issues) ─────────
  async function pollForResult(eventId) {
    const url = `${HF_SPACE_BASE}/gradio_api/call/separate_stems/${eventId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SSE fetch failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const timeout = setTimeout(() => {
      reader.cancel();
    }, 300000); // 5 min

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep incomplete line

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (currentEvent === 'complete') {
              clearTimeout(timeout);
              return JSON.parse(data);
            } else if (currentEvent === 'error') {
              clearTimeout(timeout);
              throw new Error(`Server error: ${data}`);
            }
            // heartbeat or other events — continue
          }
        }
      }
    } catch (e) {
      clearTimeout(timeout);
      throw e;
    }
    clearTimeout(timeout);
    throw new Error('Stream ended without result');
  }

  // ── Canvas / Visualizer ────────────────────────────────────
  function resizeCanvas() {
    $canvas.width = window.innerWidth * devicePixelRatio;
    $canvas.height = window.innerHeight * devicePixelRatio;
    ctx2d.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', resizeCanvas);

  function startVisualizer() {
    if (animationId) cancelAnimationFrame(animationId);
    draw();
  }

  function draw() {
    animationId = requestAnimationFrame(draw);

    const W = window.innerWidth;
    const H = window.innerHeight;
    const color = STEM_COLORS[assignedStem] || '#ffffff';

    // Clear
    ctx2d.fillStyle = 'rgba(10, 10, 15, 0.15)';
    ctx2d.fillRect(0, 0, W, H);

    if (!analyser) return;

    // Frequency data for waveform
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    // Time domain data for amplitude
    const timeData = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(timeData);

    // Average amplitude (0–1)
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = (timeData[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / timeData.length);

    // ── Draw waveform (bottom half) ──
    const barCount = 128;
    const barWidth = W / barCount;
    const step = Math.floor(freqData.length / barCount);

    ctx2d.save();
    for (let i = 0; i < barCount; i++) {
      const val = freqData[i * step] / 255;
      const barH = val * H * 0.4;

      const alpha = 0.4 + val * 0.6;
      ctx2d.fillStyle = hexToRgba(color, alpha);
      ctx2d.fillRect(
        i * barWidth,
        H - barH,
        barWidth - 1,
        barH
      );
    }
    ctx2d.restore();

    // ── Draw waveform line (middle) ──
    ctx2d.beginPath();
    ctx2d.strokeStyle = hexToRgba(color, 0.6);
    ctx2d.lineWidth = 2;
    const sliceWidth = W / timeData.length;
    let x = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = (v * H) / 2;
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
      x += sliceWidth;
    }
    ctx2d.stroke();

    // ── Particles ──
    spawnParticles(rms, color, W, H);
    updateAndDrawParticles(W, H);

    // Update time
    updateTimeDisplay();
  }

  // ── Particles system ──
  function spawnParticles(rms, color, W, H) {
    const spawnCount = Math.floor(rms * 12);
    for (let i = 0; i < spawnCount; i++) {
      particles.push({
        x: Math.random() * W,
        y: H * 0.3 + Math.random() * H * 0.4,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 3 * rms,
        r: 2 + Math.random() * 4 * rms,
        alpha: 0.6 + Math.random() * 0.4,
        color: color,
        life: 1.0,
        decay: 0.005 + Math.random() * 0.015,
      });
    }

    // Cap particle count
    if (particles.length > 500) {
      particles = particles.slice(-500);
    }
  }

  function updateAndDrawParticles(W, H) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      p.alpha = p.life * 0.8;

      if (p.life <= 0 || p.y < -10 || p.x < -10 || p.x > W + 10) {
        particles.splice(i, 1);
        continue;
      }

      ctx2d.beginPath();
      ctx2d.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx2d.fillStyle = hexToRgba(p.color, p.alpha);
      ctx2d.fill();
    }
  }

  // ── UI helpers ──────────────────────────────────────────────
  function show(el) {
    [$upload, $processing, $waiting, $full, $visualizer].forEach(e => e.classList.add('hidden'));
    el.classList.remove('hidden');
  }

  function hide(el) {
    el.classList.add('hidden');
  }

  function showFull() {
    show($full);
  }

  function updateTabCountDisplay() {
    const count = activeTabs.size;
    $tabCount.textContent = `${count}/4 instruments playing`;

    // Update stem indicator dots
    const assigned = getAssignedStems();
    $missingStems.innerHTML = '';
    for (const stem of STEMS) {
      const dot = document.createElement('div');
      dot.className = 'stem-dot' + (assigned.has(stem) ? ' active' : '');
      dot.style.color = STEM_COLORS[stem];
      dot.style.backgroundColor = STEM_COLORS[stem];
      dot.title = STEM_LABELS[stem] + (assigned.has(stem) ? '' : ' (missing)');
      $missingStems.appendChild(dot);
    }

    // Show/hide add button
    if (count >= 4) {
      $addTabBtn.classList.add('all-assigned');
    } else {
      $addTabBtn.classList.remove('all-assigned');
    }
  }

  // Open a new tab for the next instrument
  $addTabBtn.addEventListener('click', () => {
    window.open(window.location.href, '_blank');
  });

  // Open all 4 tabs in a 4-split layout
  const $openAllBtn = document.getElementById('open-all-btn');
  $openAllBtn.addEventListener('click', () => {
    const sw = screen.availWidth;
    const sh = screen.availHeight;
    const hw = Math.floor(sw / 2);
    const hh = Math.floor(sh / 2);
    const positions = [
      { left: 0,  top: 0,  width: hw, height: hh },
      { left: hw, top: 0,  width: hw, height: hh },
      { left: 0,  top: hh, width: hw, height: hh },
    ];
    // Current window takes top-left
    window.moveTo(0, 0);
    window.resizeTo(hw, hh);
    // Open 3 more tabs
    const missing = 4 - activeTabs.size;
    for (let i = 0; i < Math.min(missing, 3); i++) {
      const p = positions[i];
      window.open(
        window.location.href,
        '_blank',
        `left=${p.left},top=${p.top},width=${p.width},height=${p.height}`
      );
    }
  });

  // New Song — clear everything and return to upload screen
  const $newSongBtn = document.getElementById('new-song-btn');
  $newSongBtn.addEventListener('click', async () => {
    // Stop playback
    stopPlayback();

    // Clear IndexedDB
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).clear();
    await new Promise(r => { tx.oncomplete = r; });
    db.close();

    // Notify all tabs to reset
    broadcast('reset', {});

    // Reset local state
    resetToUpload();
  });

  function updateTimeDisplay() {
    if (!audioBuffer) return;
    const current = getCurrentOffset();
    const total = audioBuffer.duration;
    $timeDisplay.textContent = `${fmtTime(current)} / ${fmtTime(total)}`;
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── Tab lifecycle ──────────────────────────────────────────
  async function init() {
    initChannel();

    // Register self with coordinator
    activeTabs.set(tabId, null);

    // Check if stems already exist (page reload scenario)
    const hasStems = await dbHasStems();

    // Announce join and wait for assignment
    broadcast('join', {});

    // Wait a bit for coordinator response
    await sleep(300);

    // If no one assigned us, we're the first tab → become coordinator
    if (!assignedStem) {
      const hasOtherTabs = activeTabs.size > 1;
      if (!hasOtherTabs) {
        becomeCoordinator(hasStems);
      } else {
        // Ask again
        broadcast('roster-request', {});
        await sleep(500);
        if (!assignedStem) {
          becomeCoordinator(hasStems);
        }
      }
    }
  }

  async function becomeCoordinator(hasStems) {
    isCoordinator = true;
    assignedStem = STEMS[0]; // Coordinator gets vocals
    activeTabs.set(tabId, assignedStem);
    sendRoster();

    document.body.className = `stem-${assignedStem}`;
    $instrLabel.textContent = STEM_LABELS[assignedStem];
    $instrLabel.style.color = STEM_COLORS[assignedStem];
    updateTabCountDisplay();

    if (hasStems) {
      // Stems already in IndexedDB, go straight to visualizer
      await loadAndPlayStem();
    } else {
      // Show upload UI
      show($upload);
    }
  }

  // ── Cleanup on tab close ───────────────────────────────────
  window.addEventListener('beforeunload', () => {
    broadcast('leave', { wasCoordinator: isCoordinator });
    activeTabs.delete(tabId);
    if (isCoordinator) {
      sendRoster();
    }
  });

  // ── Reset ─────────────────────────────────────────────────
  function resetToUpload() {
    // Stop audio
    if (sourceNode) {
      try { sourceNode.stop(); } catch (_) {}
      sourceNode = null;
    }
    if (audioCtx) {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    audioBuffer = null;
    analyser = null;
    gainNode = null;
    eqLow = null;
    eqMid = null;
    eqHigh = null;
    isMuted = false;
    isPlaying = false;
    abLoopA = null;
    abLoopB = null;
    stopABCheck();
    playOffset = 0;
    assignedStem = null;
    particles = [];
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    // Reset tab state
    activeTabs.clear();
    activeTabs.set(tabId, null);
    isCoordinator = false;

    // Back to upload
    document.body.className = '';
    $playPause.textContent = '\u25B6';
    $timeDisplay.textContent = '0:00 / 0:00';
    $progressFill.style.width = '0%';
    show($upload);

    // Re-elect as coordinator after a short delay
    setTimeout(() => {
      if (!assignedStem) {
        becomeCoordinator(false);
      }
    }, 400);
  }

  // ── Utilities ──────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Start ──────────────────────────────────────────────────
  init();
})();
