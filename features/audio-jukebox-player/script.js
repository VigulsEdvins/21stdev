/**
 * WebAudio Synth Jukebox Pill & Sound Gate Modal
 * Extracted from betteroff/app.js (initAudioPlayer, initSoundGate, playClick)
 */
(function () {
  const TRACKS = [
    { title: 'Subzero Drift', artist: 'Better Off® Lab', notes: [220, 277.18, 329.63, 440] },
    { title: 'Velvet Horizon', artist: 'Archive Synth', notes: [196, 246.94, 293.66, 392] },
    { title: 'Obsidian Pulse', artist: 'Modular 03', notes: [164.81, 220, 261.63, 329.63] },
    { title: 'Solaris Arpeggio', artist: 'Design Engineer', notes: [261.63, 329.63, 392, 523.25] }
  ];

  const soundGate = document.getElementById('sound-gate');
  const btnEnterSound = document.getElementById('btn-enter-sound');
  const btnEnterSilent = document.getElementById('btn-enter-silent');
  const reopenBtn = document.getElementById('reopen-gate');
  const audioPill = document.getElementById('audio-pill');
  const playToggle = document.getElementById('audio-play-toggle');
  const marqueeText = document.getElementById('audio-marquee-text');
  const tracklistEl = document.getElementById('audio-tracklist');

  let audioCtx = null;
  let isPlaying = false;
  let currentTrackIndex = 0;
  let arpTimer = null;
  let noteStep = 0;

  function ensureCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playClick() {
    try {
      ensureCtx();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  function triggerSynthNote(freq) {
    try {
      ensureCtx();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, audioCtx.currentTime + 0.38);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  }

  function updateDisplay() {
    const t = TRACKS[currentTrackIndex];
    const label = `${t.artist} — ${t.title}   •   `;
    if (marqueeText) marqueeText.innerHTML = `<span>${label.repeat(4)}</span>`;
    if (playToggle) playToggle.textContent = isPlaying ? '❚❚' : '▶';
    if (audioPill) audioPill.classList.toggle('is-playing', isPlaying);

    if (tracklistEl) {
      tracklistEl.querySelectorAll('.track-item').forEach((btn, idx) => {
        btn.classList.toggle('is-active', idx === currentTrackIndex);
      });
    }
  }

  function startPlayback() {
    isPlaying = true;
    clearInterval(arpTimer);
    const playStep = () => {
      if (!isPlaying) return;
      const notes = TRACKS[currentTrackIndex].notes;
      triggerSynthNote(notes[noteStep % notes.length]);
      noteStep++;
    };
    playStep();
    arpTimer = setInterval(playStep, 320);
    updateDisplay();
  }

  function stopPlayback() {
    isPlaying = false;
    clearInterval(arpTimer);
    updateDisplay();
  }

  if (tracklistEl) {
    tracklistEl.innerHTML = TRACKS.map(
      (t, i) => `
      <button type="button" class="track-item ${i === 0 ? 'is-active' : ''}" data-index="${i}">
        <span>0${i + 1}. ${t.title}</span>
        <span style="opacity:0.6">${t.artist}</span>
      </button>`
    ).join('');

    tracklistEl.querySelectorAll('.track-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        playClick();
        currentTrackIndex = Number(btn.getAttribute('data-index'));
        noteStep = 0;
        startPlayback();
      });
    });
  }

  if (playToggle) {
    playToggle.addEventListener('click', () => {
      playClick();
      if (isPlaying) stopPlayback();
      else startPlayback();
    });
  }

  if (btnEnterSound) {
    btnEnterSound.addEventListener('click', () => {
      playClick();
      soundGate.classList.add('is-hidden');
      startPlayback();
    });
  }

  if (btnEnterSilent) {
    btnEnterSilent.addEventListener('click', () => {
      soundGate.classList.add('is-hidden');
      stopPlayback();
    });
  }

  if (reopenBtn) {
    reopenBtn.addEventListener('click', () => {
      playClick();
      soundGate.classList.remove('is-hidden');
    });
  }

  updateDisplay();
})();
