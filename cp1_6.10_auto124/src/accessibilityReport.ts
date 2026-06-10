import { RGB, ColorBlindType, hexToRgb, getContrastRatio, getWCAGLevel, applyColorBlindness, rgbToHex } from './colorUtils';
import { PaletteColor } from './paletteManager';

export class AccessibilityReport {
  private container: HTMLElement;
  private colors: PaletteColor[] = [];
  private colorBlindType: ColorBlindType = 'none';
  private selectEl: HTMLSelectElement | null = null;
  private tableContainer: HTMLElement | null = null;
  public onColorBlindChange: ((type: ColorBlindType) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="report-header" style="margin-bottom: 16px;">
        <div class="module-title" style="margin-bottom: 0;">无障碍对比度报告</div>
        <select class="colorblind-select" id="colorblind-select">
          <option value="none">正常视觉</option>
          <option value="protanopia">红色弱 (Protanopia)</option>
          <option value="deuteranopia">绿色弱 (Deuteranopia)</option>
          <option value="tritanopia">蓝色弱 (Tritanopia)</option>
        </select>
      </div>
      <div class="table-container">
        <table class="a11y-table">
          <thead>
            <tr>
              <th>颜色 A</th>
              <th>颜色 B</th>
              <th>对比度</th>
              <th>等级</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody id="a11y-tbody">
            <tr>
              <td colspan="5" style="text-align: center; color: #888; padding: 24px;">
                请至少保存两种颜色以生成对比度报告
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    this.selectEl = this.container.querySelector('#colorblind-select') as HTMLSelectElement;
    this.tableContainer = this.container.querySelector('#a11y-tbody') as HTMLElement;
    this.selectEl.addEventListener('change', () => {
      this.colorBlindType = this.selectEl!.value as ColorBlindType;
      if (this.onColorBlindChange) {
        this.onColorBlindChange(this.colorBlindType);
      }
      this.updateTable();
    });
  }

  public updateColors(colors: PaletteColor[]): void {
    this.colors = colors;
    this.updateTable();
  }

  private getDisplayColor(hex: string): RGB {
    const rgb = hexToRgb(hex);
    return applyColorBlindness(rgb, this.colorBlindType);
  }

  private updateTable(): void {
    if (!this.tableContainer) return;

    if (this.colors.length < 2) {
      this.tableContainer.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #888; padding: 24px;">
            请至少保存两种颜色以生成对比度报告
          </td>
        </tr>
      `;
      return;
    }

    const pairs: { a: PaletteColor; b: PaletteColor }[] = [];
    for (let i = 0; i < this.colors.length; i++) {
      for (let j = i + 1; j < this.colors.length; j++) {
        pairs.push({ a: this.colors[i], b: this.colors[j] });
        if (pairs.length >= 30) break;
      }
      if (pairs.length >= 30) break;
    }

    let html = '';
    for (const pair of pairs) {
      const rgbA = this.getDisplayColor(pair.a.hex);
      const rgbB = this.getDisplayColor(pair.b.hex);
      const hexA = rgbToHex(rgbA.r, rgbA.g, rgbA.b);
      const hexB = rgbToHex(rgbB.r, rgbB.g, rgbB.b);
      const ratio = getContrastRatio(rgbA, rgbB);
      const { level, pass } = getWCAGLevel(ratio);

      html += `
        <tr>
          <td><span class="color-swatch" style="background-color: ${hexA};"></span></td>
          <td><span class="color-swatch" style="background-color: ${hexB};"></span></td>
          <td>${ratio.toFixed(2)}:1</td>
          <td>${level}</td>
          <td><span class="status-dot ${pass ? 'status-pass' : 'status-fail'}" title="${pass ? '通过' : '失败'}"></span></td>
        </tr>
      `;
    }
    this.tableContainer.innerHTML = html;
  }
}
