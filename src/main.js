/**
 * Shieldbiter Lyre Companion — Main Application
 * An interactive chord reference and tuner for the 6-string Kolne Lyre.
 */

import './style.css';
import { LyreVisual } from './components/LyreVisual.js';
import { KeySelector } from './components/KeySelector.js';
import { ChordReference } from './components/ChordReference.js';
import { TunerView } from './components/TunerView.js';
import { detectChord } from './engine/ChordDetector.js';
import { resumeAudio } from './engine/AudioEngine.js';

class ShieldbiterApp {
  constructor() {
    this.currentKey = 'C';
    this.currentMode = 'major';
    this.currentTab = 'chords'; // 'chords' or 'tuner'
    this.init();
  }

  init() {
    // Build app shell
    document.querySelector('#app').innerHTML = `
      <header class="app-header">
        <div class="header-content">
          <div class="brand">
            <img src="./shieldbiter-logo.png" alt="Shieldbiter" class="brand-logo" />
            <div class="brand-text">
              <h1 class="brand-title">Shieldbiter</h1>
              <span class="brand-subtitle">Lyre Companion</span>
            </div>
          </div>
          <div id="key-selector-mount"></div>
        </div>
        <nav class="tab-nav" id="tab-nav">
          <button class="tab-btn tab-active" data-tab="chords" id="tab-chords">
            <span class="tab-icon">🎵</span>
            <span class="tab-label">Chords</span>
          </button>
          <button class="tab-btn" data-tab="tuner" id="tab-tuner">
            <span class="tab-icon">🎯</span>
            <span class="tab-label">Tuner</span>
          </button>
        </nav>
        <div class="header-border"></div>
      </header>

      <main class="app-main">
        <!-- Chords View -->
        <div class="tab-content tab-content-active" id="view-chords">
          <section class="lyre-section">
            <div id="lyre-mount"></div>
          </section>
          <section class="reference-section">
            <div id="chord-reference-mount"></div>
          </section>
        </div>

        <!-- Tuner View -->
        <div class="tab-content" id="view-tuner">
          <section class="tuner-section">
            <div id="tuner-mount"></div>
          </section>
        </div>
      </main>

      <footer class="app-footer">
        <div class="footer-content">
          <span class="footer-brand">A companion for instruments by</span>
          <span class="footer-maker">Shieldbiter Viking Crafts</span>
          <div class="footer-links">
            <a href="https://shieldbitercrafts.store/" target="_blank" rel="noopener" class="footer-link" title="Shieldbiter Store">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              <span>Store</span>
            </a>
            <a href="https://www.facebook.com/ShieldbitrVikingCrafts" target="_blank" rel="noopener" class="footer-link" title="Facebook">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              <span>Facebook</span>
            </a>
          </div>
        </div>
        <div class="knotwork-border"></div>
      </footer>
    `;

    // Initialize components
    this.keySelector = new KeySelector(
      document.querySelector('#key-selector-mount'),
      {
        initialKey: this.currentKey,
        initialMode: this.currentMode,
        onChange: (key) => this.onKeyChange(key),
        onModeChange: (mode) => this.onModeChange(mode),
      }
    );

    this.lyreVisual = new LyreVisual(
      document.querySelector('#lyre-mount'),
      {
        initialKey: this.currentKey,
        initialMode: this.currentMode,
        onStateChange: (states) => this.onStringStateChange(states),
      }
    );

    this.chordReference = new ChordReference(
      document.querySelector('#chord-reference-mount'),
      {
        initialKey: this.currentKey,
        initialMode: this.currentMode,
        onChordSelect: (pattern, name) => this.onChordSelect(pattern, name),
      }
    );

    this.tunerView = new TunerView(
      document.querySelector('#tuner-mount'),
      {
        initialKey: this.currentKey,
        initialMode: this.currentMode,
      }
    );

    // Initial chord detection
    this.onStringStateChange([1, 0, 1, 0, 1, 0]);

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Resume audio on first interaction
    document.addEventListener('click', () => resumeAudio(), { once: true });
  }

  switchTab(tabName) {
    if (tabName === this.currentTab) return;

    // Deactivate old tab
    if (this.currentTab === 'tuner') {
      this.tunerView.deactivate();
    }

    this.currentTab = tabName;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('tab-active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(el => {
      el.classList.remove('tab-content-active');
    });
    document.querySelector(`#view-${tabName}`).classList.add('tab-content-active');

    // Activate new tab
    if (tabName === 'tuner') {
      this.tunerView.activate();
    }
  }

  onKeyChange(key) {
    this.currentKey = key;
    this.lyreVisual.setKey(key);
    this.chordReference.setKey(key);
    this.tunerView.setKey(key);

    // Re-detect chord with current pattern
    const states = this.lyreVisual.stringStates;
    this.onStringStateChange(states);
  }

  onModeChange(mode) {
    this.currentMode = mode;
    this.lyreVisual.setMode(mode);
    this.chordReference.setMode(mode);
    this.tunerView.setMode(mode);

    // Re-detect chord with current pattern
    const states = this.lyreVisual.stringStates;
    this.onStringStateChange(states);
  }

  onStringStateChange(states) {
    const result = detectChord(this.currentKey, states, this.currentMode);

    if (result) {
      this.lyreVisual.setChordDisplay(result.name, result.type);
      this.chordReference.setActiveChord(result.name);
    } else {
      this.lyreVisual.setChordDisplay('?', 'Unknown pattern');
      this.chordReference.clearActive();
    }
  }

  onChordSelect(pattern, name) {
    this.lyreVisual.setPattern(pattern);
    setTimeout(() => this.lyreVisual.strum('down'), 100);
  }
}

// Boot
new ShieldbiterApp();
