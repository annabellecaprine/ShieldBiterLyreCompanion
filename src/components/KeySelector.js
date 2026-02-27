/**
 * KeySelector - Dropdowns for selecting the tuning key and mode.
 */

import { KEY_LIST, MODE_LIST, MODE_LABELS } from '../data/chordData.js';

export class KeySelector {
  constructor(container, options = {}) {
    this.container = container;
    this.currentKey = options.initialKey || 'C';
    this.currentMode = options.initialMode || 'major';
    this.onChange = options.onChange || (() => { });
    this.onModeChange = options.onModeChange || (() => { });
    this.render();
  }

  render() {
    const keyOptionsHtml = KEY_LIST.map(key => {
      const selected = key === this.currentKey ? 'selected' : '';
      return `<option value="${key}" ${selected}>${key}</option>`;
    }).join('');

    const modeOptionsHtml = MODE_LIST.map(mode => {
      const selected = mode === this.currentMode ? 'selected' : '';
      return `<option value="${mode}" ${selected}>${MODE_LABELS[mode]}</option>`;
    }).join('');

    this.container.innerHTML = `
      <div class="key-selector">
        <label class="key-selector-label">
          <span class="label-icon">⟡</span>
          <span>Tuning</span>
        </label>
        <div class="select-group">
          <div class="select-wrapper">
            <select id="key-select" class="key-select">
              ${keyOptionsHtml}
            </select>
            <span class="select-arrow">▾</span>
          </div>
          <div class="select-wrapper">
            <select id="mode-select" class="key-select">
              ${modeOptionsHtml}
            </select>
            <span class="select-arrow">▾</span>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#key-select').addEventListener('change', (e) => {
      this.currentKey = e.target.value;
      this.onChange(this.currentKey);
    });

    this.container.querySelector('#mode-select').addEventListener('change', (e) => {
      this.currentMode = e.target.value;
      this.onModeChange(this.currentMode);
    });
  }

  setKey(key) {
    this.currentKey = key;
    const select = this.container.querySelector('#key-select');
    if (select) select.value = key;
  }

  setMode(mode) {
    this.currentMode = mode;
    const select = this.container.querySelector('#mode-select');
    if (select) select.value = mode;
  }
}
