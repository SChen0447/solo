import { parseColor, rgbToHex, type RgbColor } from '../color-utils';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      width: 100%;
    }

    .card {
      background: #16213e;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      position: relative;
      border: 2px solid transparent;
    }

    :host([selected]) .card {
      border-color: #64b5f6;
      box-shadow: 0 0 0 3px rgba(100, 181, 246, 0.25), 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .card:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .swatch {
      width: 100%;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      background: #333;
      transition: transform 0.3s ease;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .card:hover .swatch {
      transform: scale(1.1);
    }

    .swatch-label {
      opacity: 0;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
      background: rgba(0, 0, 0, 0.35);
      padding: 4px 8px;
      border-radius: 4px;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .card:hover .swatch-label {
      opacity: 1;
    }

    .info {
      margin-top: 12px;
      text-align: center;
    }

    .name {
      font-size: 13px;
      font-weight: 600;
      color: #e0e0e0;
      margin-bottom: 4px;
      word-break: break-all;
    }

    .value {
      font-size: 12px;
      color: #90a4ae;
      font-family: 'Courier New', monospace;
    }

    .delta-bar-container {
      margin-top: 10px;
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
      display: none;
    }

    :host([show-delta]) .delta-bar-container {
      display: block;
    }

    .delta-bar {
      height: 100%;
      width: 0%;
      border-radius: 3px;
      transition: width 0.4s ease, background 0.3s ease;
    }

    .delta-value {
      margin-top: 6px;
      font-size: 11px;
      color: #90a4ae;
      text-align: center;
      display: none;
    }

    :host([show-delta]) .delta-value {
      display: block;
    }
  </style>
  <div class="card">
    <div class="swatch">
      <span class="swatch-label"></span>
    </div>
    <div class="info">
      <div class="name"></div>
      <div class="value"></div>
    </div>
    <div class="delta-bar-container">
      <div class="delta-bar"></div>
    </div>
    <div class="delta-value"></div>
  </div>
`;

export class ColorCard extends HTMLElement {
  static get observedAttributes() {
    return ['color', 'name', 'index', 'delta', 'delta-color', 'selected', 'show-delta'];
  }

  private _rgb: RgbColor | null = null;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.shadowRoot?.querySelector('.card')?.addEventListener('click', this._handleClick);
    this._updateAll();
  }

  disconnectedCallback() {
    this.shadowRoot?.querySelector('.card')?.removeEventListener('click', this._handleClick);
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null) {
    if (!this.shadowRoot) return;

    switch (name) {
      case 'color':
        this._updateColor();
        break;
      case 'name':
        this._updateName();
        break;
      case 'index':
        this._updateName();
        break;
      case 'delta':
        this._updateDelta();
        break;
      case 'delta-color':
        this._updateDeltaColor();
        break;
      case 'selected':
      case 'show-delta':
        break;
    }
  }

  private _handleClick = () => {
    this.dispatchEvent(
      new CustomEvent('color-select', {
        bubbles: true,
        composed: true,
        detail: {
          index: this.getAttribute('index'),
          color: this.getAttribute('color'),
          name: this.getAttribute('name')
        }
      })
    );
  };

  private _updateAll() {
    this._updateColor();
    this._updateName();
    this._updateDelta();
    this._updateDeltaColor();
  }

  private _updateColor() {
    if (!this.shadowRoot) return;
    const colorAttr = this.getAttribute('color');
    const swatch = this.shadowRoot.querySelector('.swatch') as HTMLElement;
    const label = this.shadowRoot.querySelector('.swatch-label') as HTMLElement;
    const valueEl = this.shadowRoot.querySelector('.value') as HTMLElement;

    if (!colorAttr) {
      swatch.style.background = '#333';
      label.textContent = '';
      valueEl.textContent = '--';
      return;
    }

    this._rgb = parseColor(colorAttr);
    if (!this._rgb) {
      swatch.style.background = '#333';
      label.textContent = 'Invalid';
      valueEl.textContent = 'Invalid';
      return;
    }

    const hex = rgbToHex(this._rgb.r, this._rgb.g, this._rgb.b);
    swatch.style.background = hex;
    label.textContent = hex;
    valueEl.textContent = hex;
  }

  private _updateName() {
    if (!this.shadowRoot) return;
    const nameEl = this.shadowRoot.querySelector('.name') as HTMLElement;
    const name = this.getAttribute('name');
    const index = this.getAttribute('index');

    if (name) {
      nameEl.textContent = name;
    } else if (index !== null) {
      nameEl.textContent = `Color ${parseInt(index, 10) + 1}`;
    } else {
      nameEl.textContent = '';
    }
  }

  private _updateDelta() {
    if (!this.shadowRoot) return;
    const deltaAttr = this.getAttribute('delta');
    const deltaBar = this.shadowRoot.querySelector('.delta-bar') as HTMLElement;
    const deltaValue = this.shadowRoot.querySelector('.delta-value') as HTMLElement;

    if (!deltaAttr) {
      deltaBar.style.width = '0%';
      deltaValue.textContent = '';
      return;
    }

    const delta = parseInt(deltaAttr, 10);
    deltaBar.style.width = `${Math.max(0, Math.min(100, delta))}%`;
    deltaValue.textContent = `ΔE: ${delta}`;
  }

  private _updateDeltaColor() {
    if (!this.shadowRoot) return;
    const deltaColor = this.getAttribute('delta-color');
    const deltaBar = this.shadowRoot.querySelector('.delta-bar') as HTMLElement;
    if (deltaColor) {
      deltaBar.style.background = deltaColor;
    }
  }
}

customElements.define('color-card', ColorCard);
