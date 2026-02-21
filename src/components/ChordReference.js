/**
 * ChordReference - Displays all chords for the current key.
 */

import { TUNINGS } from '../data/chordData.js';

export class ChordReference {
    constructor(container, options = {}) {
        this.container = container;
        this.currentKey = options.initialKey || 'C';
        this.onChordSelect = options.onChordSelect || (() => { });
        this.activeChordName = null;
        this.render();
    }

    render() {
        const tuning = TUNINGS[this.currentKey];
        if (!tuning) return;

        const chordsHtml = tuning.chords.map(chord => {
            const isActive = chord.name === this.activeChordName;
            const patternDots = chord.pattern.map((val, i) => {
                const note = tuning.strings[i];
                return `<span class="dot ${val ? 'dot-open' : 'dot-muted'}" title="${note}: ${val ? 'Open' : 'Muted'}">${val ? 'O' : 'X'}</span>`;
            }).join('');

            return `
        <button class="chord-card ${isActive ? 'chord-active' : ''}" 
                data-chord-name="${chord.name}"
                data-pattern="${chord.pattern.join(',')}"
                title="${chord.type} — ${chord.degree}">
          <span class="chord-card-name">${chord.name}</span>
          <span class="chord-card-degree">${chord.degree}</span>
          <div class="chord-card-pattern">${patternDots}</div>
        </button>
      `;
        }).join('');

        this.container.innerHTML = `
      <div class="chord-reference">
        <h2 class="chord-reference-title">
          <span class="title-decoration">◆</span>
          Chords in ${this.currentKey} Major
          <span class="title-decoration">◆</span>
        </h2>
        <div class="chord-grid">
          ${chordsHtml}
        </div>
      </div>
    `;

        // Bind click handlers
        this.container.querySelectorAll('.chord-card').forEach(card => {
            card.addEventListener('click', () => {
                const pattern = card.dataset.pattern.split(',').map(Number);
                const name = card.dataset.chordName;
                this.setActiveChord(name);
                this.onChordSelect(pattern, name);
            });
        });
    }

    setKey(key) {
        this.currentKey = key;
        this.activeChordName = null;
        this.render();
    }

    setActiveChord(name) {
        this.activeChordName = name;
        // Update active state visually without full re-render
        this.container.querySelectorAll('.chord-card').forEach(card => {
            card.classList.toggle('chord-active', card.dataset.chordName === name);
        });
    }

    clearActive() {
        this.activeChordName = null;
        this.container.querySelectorAll('.chord-card').forEach(card => {
            card.classList.remove('chord-active');
        });
    }
}
