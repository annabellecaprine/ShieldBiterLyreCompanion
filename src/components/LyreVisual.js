/**
 * LyreVisual - Interactive 6-string lyre visualization.
 * Renders strings that can be toggled between open (O) and muted (X).
 */

import { getStringFrequencies } from '../data/chordData.js';
import { pluckString, strumChord, resumeAudio } from '../engine/AudioEngine.js';

export class LyreVisual {
  constructor(container, options = {}) {
    this.container = container;
    this.currentKey = options.initialKey || 'C';
    this.currentMode = options.initialMode || 'major';
    this.stringStates = [1, 0, 1, 0, 1, 0]; // Default: I/i chord pattern
    this.onStateChange = options.onStateChange || (() => { });
    this.stringData = [];

    this.render();
    this.updateStrings();
  }

  render() {
    this.container.innerHTML = `
      <div class="lyre-visual" id="lyre-visual">
        <div class="lyre-body">
          <div class="lyre-yoke">
            <div class="yoke-arm yoke-left"></div>
            <div class="yoke-crossbar"></div>
            <div class="yoke-arm yoke-right"></div>
          </div>
          <div class="lyre-strings-area">
            <div class="strings-container" id="strings-container"></div>
          </div>
          <div class="lyre-soundboard">
            <div class="soundboard-decoration"></div>
          </div>
        </div>
        <div class="lyre-controls">
          <button class="strum-btn" id="strum-down" title="Strum Down">
            <span class="strum-icon">⟱</span>
            <span class="strum-label">Strum</span>
          </button>
          <div class="chord-display" id="chord-display">
            <span class="chord-name" id="chord-name">—</span>
            <span class="chord-type" id="chord-type"></span>
          </div>
          <button class="strum-btn" id="strum-up" title="Strum Up">
            <span class="strum-icon">⟰</span>
            <span class="strum-label">Strum</span>
          </button>
        </div>
      </div>
    `;

    // Bind strum buttons
    this.container.querySelector('#strum-down').addEventListener('click', () => this.strum('down'));
    this.container.querySelector('#strum-up').addEventListener('click', () => this.strum('up'));
  }

  updateStrings() {
    this.stringData = getStringFrequencies(this.currentKey, this.currentMode);
    const container = this.container.querySelector('#strings-container');
    container.innerHTML = '';

    this.stringData.forEach((strData, index) => {
      const isOpen = this.stringStates[index] === 1;
      const stringEl = document.createElement('div');
      stringEl.className = `lyre-string ${isOpen ? 'string-open' : 'string-muted'}`;
      stringEl.dataset.index = index;

      stringEl.innerHTML = `
        <span class="string-note-top">${strData.note}</span>
        <div class="string-line-wrapper">
          <div class="string-line"></div>
          <div class="string-glow"></div>
        </div>
        <span class="string-state">${isOpen ? 'O' : 'X'}</span>
      `;

      stringEl.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleString(index);
      });

      container.appendChild(stringEl);
    });
  }

  toggleString(index) {
    resumeAudio();
    this.stringStates[index] = this.stringStates[index] === 1 ? 0 : 1;

    // If string is now open, play it
    if (this.stringStates[index] === 1) {
      pluckString(this.stringData[index].frequency);
    }

    this.updateStrings();
    this.onStateChange([...this.stringStates]);
  }

  setPattern(pattern) {
    this.stringStates = [...pattern];
    this.updateStrings();
    this.onStateChange([...this.stringStates]);
  }

  setKey(key) {
    this.currentKey = key;
    this.updateStrings();
    this.onStateChange([...this.stringStates]);
  }

  setMode(mode) {
    this.currentMode = mode;
    this.updateStrings();
    this.onStateChange([...this.stringStates]);
  }

  strum(direction = 'down') {
    resumeAudio();
    const freqs = this.stringData.map((str, i) => ({
      frequency: str.frequency,
      isOpen: this.stringStates[i] === 1
    }));
    strumChord(freqs, 60, direction);

    // Animate strings
    const stringEls = this.container.querySelectorAll('.lyre-string.string-open');
    stringEls.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('string-vibrating');
        setTimeout(() => el.classList.remove('string-vibrating'), 600);
      }, i * 60);
    });
  }

  setChordDisplay(name, type = '') {
    const nameEl = this.container.querySelector('#chord-name');
    const typeEl = this.container.querySelector('#chord-type');
    if (nameEl) nameEl.textContent = name || '—';
    if (typeEl) typeEl.textContent = type || '';
  }
}
