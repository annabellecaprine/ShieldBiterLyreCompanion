/**
 * TunerView — Visual chromatic tuner for the Kolne Lyre.
 * Shows detected pitch, cents deviation gauge, and string guide.
 */

import { PitchDetector } from '../engine/PitchDetector.js';
import { getStringFrequencies } from '../data/chordData.js';
import { pluckString, resumeAudio } from '../engine/AudioEngine.js';

export class TunerView {
    constructor(container, options = {}) {
        this.container = container;
        this.currentKey = options.initialKey || 'C';
        this.pitchDetector = null;
        this.isActive = false;
        this.currentStringTarget = null; // which string the user is targeting
        this.lastPitchData = null;
        this.smoothedCents = 0;

        this.render();
    }

    render() {
        this.container.innerHTML = `
      <div class="tuner-view" id="tuner-view">
        <!-- Detected Note Display -->
        <div class="tuner-note-display">
          <div class="tuner-octave" id="tuner-octave"></div>
          <div class="tuner-note" id="tuner-note">—</div>
          <div class="tuner-frequency" id="tuner-frequency">
            <span id="tuner-hz">—</span> Hz
          </div>
        </div>

        <!-- Cents Gauge -->
        <div class="tuner-gauge-container">
          <div class="gauge-labels">
            <span class="gauge-label-flat">♭ Flat</span>
            <span class="gauge-label-center">In Tune</span>
            <span class="gauge-label-sharp">Sharp ♯</span>
          </div>
          <div class="tuner-gauge" id="tuner-gauge">
            <div class="gauge-track">
              <div class="gauge-ticks">
                ${this._renderTicks()}
              </div>
              <div class="gauge-center-mark"></div>
              <div class="gauge-needle" id="gauge-needle"></div>
            </div>
          </div>
          <div class="gauge-cents" id="gauge-cents">0 ¢</div>
        </div>

        <!-- Mic Control -->
        <button class="tuner-mic-btn" id="tuner-mic-btn">
          <span class="mic-icon" id="mic-icon">🎤</span>
          <span class="mic-label" id="mic-label">Start Tuner</span>
        </button>
        <div class="tuner-volume-meter" id="tuner-volume-meter">
          <div class="volume-bar" id="volume-bar"></div>
          <span class="volume-label">MIC LEVEL</span>
        </div>
        <div class="tuner-status" id="tuner-status"></div>

        <!-- String Guide -->
        <div class="tuner-string-guide">
          <h3 class="string-guide-title">Target Strings</h3>
          <div class="string-guide-buttons" id="string-guide-buttons"></div>
        </div>
      </div>
    `;

        // Bind mic button
        this.container.querySelector('#tuner-mic-btn').addEventListener('click', () => {
            this.toggleListening();
        });

        this.updateStringGuide();
    }

    _renderTicks() {
        let ticks = '';
        for (let i = -50; i <= 50; i += 5) {
            const isMajor = i % 10 === 0;
            const pct = ((i + 50) / 100) * 100;
            ticks += `<div class="gauge-tick ${isMajor ? 'tick-major' : 'tick-minor'}" style="left: ${pct}%"></div>`;
        }
        return ticks;
    }

    updateStringGuide() {
        const stringData = getStringFrequencies(this.currentKey);
        const container = this.container.querySelector('#string-guide-buttons');
        if (!container) return;

        container.innerHTML = stringData.map((str, i) => {
            const isTarget = this.currentStringTarget === i;
            const isDetected = this.lastPitchData?.note === str.note;
            return `
        <button class="string-guide-btn ${isTarget ? 'guide-target' : ''} ${isDetected ? 'guide-detected' : ''}"
                data-index="${i}" data-frequency="${str.frequency}" data-note="${str.note}">
          <span class="guide-btn-note">${str.note}</span>
          <span class="guide-btn-octave">${str.octave}</span>
          <span class="guide-btn-hz">${Math.round(str.frequency)}</span>
        </button>
      `;
        }).join('');

        // Bind click to play reference tone
        container.querySelectorAll('.string-guide-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                resumeAudio();
                const freq = parseFloat(btn.dataset.frequency);
                const index = parseInt(btn.dataset.index);
                this.currentStringTarget = this.currentStringTarget === index ? null : index;
                pluckString(freq);
                this.updateStringGuide();
            });
        });
    }

    async toggleListening() {
        if (this.isActive) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }

    async startListening() {
        this.pitchDetector = new PitchDetector({
            onPitch: (data) => this._onPitch(data),
            onError: (msg) => this._showStatus(msg, 'error'),
            onStateChange: (state) => this._onStateChange(state),
        });

        await this.pitchDetector.start();
    }

    stopListening() {
        if (this.pitchDetector) {
            this.pitchDetector.stop();
            this.pitchDetector = null;
        }
        this.isActive = false;
        this._updateMicButton(false);
        this._resetDisplay();
    }

    _onPitch(data) {
        this.lastPitchData = data;

        const noteEl = this.container.querySelector('#tuner-note');
        const octaveEl = this.container.querySelector('#tuner-octave');
        const hzEl = this.container.querySelector('#tuner-hz');
        const centsEl = this.container.querySelector('#gauge-cents');
        const needleEl = this.container.querySelector('#gauge-needle');
        const gaugeEl = this.container.querySelector('#tuner-gauge');
        const volumeBar = this.container.querySelector('#volume-bar');

        // Always update volume meter
        if (volumeBar && data.volume !== undefined) {
            const volumePct = Math.min(100, (data.volume / 0.15) * 100);
            volumeBar.style.width = `${volumePct}%`;
            if (volumePct > 60) {
                volumeBar.className = 'volume-bar volume-hot';
            } else if (volumePct > 20) {
                volumeBar.className = 'volume-bar volume-good';
            } else {
                volumeBar.className = 'volume-bar volume-low';
            }
        }

        if (data.note && data.confidence > 0) {
            // Smooth the cents display
            this.smoothedCents = this.smoothedCents * 0.6 + data.cents * 0.4;
            const displayCents = Math.round(this.smoothedCents);

            noteEl.textContent = data.note;
            octaveEl.textContent = data.octave || '';
            hzEl.textContent = data.frequency;

            const sign = displayCents > 0 ? '+' : '';
            centsEl.textContent = `${sign}${displayCents} ¢`;

            // Position needle: center is 50%, range ±50 cents maps to 0-100%
            const clampedCents = Math.max(-50, Math.min(50, this.smoothedCents));
            const needlePos = ((clampedCents + 50) / 100) * 100;
            needleEl.style.left = `${needlePos}%`;

            // Color based on accuracy
            const absCents = Math.abs(displayCents);
            if (absCents <= 5) {
                gaugeEl.className = 'tuner-gauge tuner-in-tune';
                noteEl.className = 'tuner-note note-in-tune';
            } else if (absCents <= 15) {
                gaugeEl.className = 'tuner-gauge tuner-close';
                noteEl.className = 'tuner-note note-close';
            } else {
                gaugeEl.className = 'tuner-gauge tuner-off';
                noteEl.className = 'tuner-note note-off';
            }

            // Update string highlighting
            this._highlightDetectedString(data.note);

        } else {
            // No clear pitch — keep last note but dim it
            if (!data.volume || data.volume < 0.001) {
                noteEl.className = 'tuner-note note-quiet';
                gaugeEl.className = 'tuner-gauge';
            }
        }
    }

    _highlightDetectedString(detectedNote) {
        const buttons = this.container.querySelectorAll('.string-guide-btn');
        buttons.forEach(btn => {
            const isMatch = btn.dataset.note === detectedNote;
            btn.classList.toggle('guide-detected', isMatch);
        });
    }

    _onStateChange(state) {
        switch (state) {
            case 'requesting':
                this._showStatus('Requesting microphone access...', 'info');
                break;
            case 'listening':
                this.isActive = true;
                this._updateMicButton(true);
                this._showStatus('', 'info');
                break;
            case 'stopped':
                this.isActive = false;
                this._updateMicButton(false);
                this._showStatus('Tuner stopped', 'info');
                break;
            case 'error':
                this.isActive = false;
                this._updateMicButton(false);
                break;
        }
    }

    _updateMicButton(isActive) {
        const iconEl = this.container.querySelector('#mic-icon');
        const labelEl = this.container.querySelector('#mic-label');
        const btnEl = this.container.querySelector('#tuner-mic-btn');

        if (isActive) {
            iconEl.textContent = '⏹';
            labelEl.textContent = 'Stop Tuner';
            btnEl.classList.add('mic-active');
        } else {
            iconEl.textContent = '🎤';
            labelEl.textContent = 'Start Tuner';
            btnEl.classList.remove('mic-active');
        }
    }

    _showStatus(message, type = 'info') {
        const el = this.container.querySelector('#tuner-status');
        el.textContent = message;
        el.className = `tuner-status status-${type}`;
    }

    _resetDisplay() {
        const noteEl = this.container.querySelector('#tuner-note');
        const octaveEl = this.container.querySelector('#tuner-octave');
        const hzEl = this.container.querySelector('#tuner-hz');
        const centsEl = this.container.querySelector('#gauge-cents');
        const needleEl = this.container.querySelector('#gauge-needle');
        const gaugeEl = this.container.querySelector('#tuner-gauge');

        noteEl.textContent = '—';
        noteEl.className = 'tuner-note';
        octaveEl.textContent = '';
        hzEl.textContent = '—';
        centsEl.textContent = '0 ¢';
        needleEl.style.left = '50%';
        gaugeEl.className = 'tuner-gauge';
        this.smoothedCents = 0;

        this.container.querySelectorAll('.guide-detected').forEach(el => {
            el.classList.remove('guide-detected');
        });
    }

    setKey(key) {
        this.currentKey = key;
        this.currentStringTarget = null;
        this.updateStringGuide();
    }

    activate() {
        // Called when switching to tuner tab
    }

    deactivate() {
        // Called when switching away from tuner tab
        this.stopListening();
    }

    destroy() {
        this.stopListening();
    }
}
