/**
 * KeySelector - Dropdown for selecting the tuning key.
 */

import { KEY_LIST } from '../data/chordData.js';

export class KeySelector {
    constructor(container, options = {}) {
        this.container = container;
        this.currentKey = options.initialKey || 'C';
        this.onChange = options.onChange || (() => { });
        this.render();
    }

    render() {
        const optionsHtml = KEY_LIST.map(key => {
            const selected = key === this.currentKey ? 'selected' : '';
            return `<option value="${key}" ${selected}>${key} MAJOR</option>`;
        }).join('');

        this.container.innerHTML = `
      <div class="key-selector">
        <label class="key-selector-label" for="key-select">
          <span class="label-icon">⟡</span>
          <span>Tuning</span>
        </label>
        <div class="select-wrapper">
          <select id="key-select" class="key-select">
            ${optionsHtml}
          </select>
          <span class="select-arrow">▾</span>
        </div>
      </div>
    `;

        this.container.querySelector('#key-select').addEventListener('change', (e) => {
            this.currentKey = e.target.value;
            this.onChange(this.currentKey);
        });
    }

    setKey(key) {
        this.currentKey = key;
        const select = this.container.querySelector('#key-select');
        if (select) select.value = key;
    }
}
