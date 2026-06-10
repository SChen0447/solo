import { ColorScheme, HSLColor, hslToHex, hslToString } from './colorScheme';

export class UIPreview {
  private container: HTMLElement;
  private currentScheme: ColorScheme | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="preview-section">
        <h3 class="preview-title">UI 组件预览</h3>
        
        <div class="preview-bg-block">
          <div class="preview-card">
            <div class="preview-card-header">
              <div class="preview-avatar"></div>
              <div class="preview-card-title">
                <h4>产品设计卡片</h4>
                <p>色彩方案实时预览</p>
              </div>
            </div>
            <div class="preview-card-body">
              <p>这是一段示例文本，用于展示配色方案在正文内容中的阅读体验。好的配色能提升用户的阅读舒适度。</p>
            </div>
            <div class="preview-card-actions">
              <button class="preview-btn preview-btn-primary">主要按钮</button>
              <button class="preview-btn preview-btn-secondary">次要按钮</button>
              <button class="preview-btn preview-btn-outline">轮廓按钮</button>
            </div>
          </div>
        </div>

        <div class="preview-row">
          <div class="preview-form">
            <h4 class="preview-subtitle">表单组件</h4>
            <div class="preview-form-group">
              <label class="preview-label">用户名</label>
              <input type="text" class="preview-input" placeholder="请输入用户名" />
            </div>
            <div class="preview-form-group">
              <label class="preview-label">邮箱地址</label>
              <input type="email" class="preview-input" placeholder="example@email.com" />
            </div>
            <div class="preview-form-group">
              <label class="preview-label">选择框示例</label>
              <select class="preview-select">
                <option>选项一</option>
                <option>选项二</option>
                <option>选项三</option>
              </select>
            </div>
          </div>

          <div class="preview-buttons-group">
            <h4 class="preview-subtitle">按钮样式</h4>
            <div class="preview-btn-stack">
              <button class="preview-btn preview-btn-primary preview-btn-lg">大号主按钮</button>
              <button class="preview-btn preview-btn-primary">默认主按钮</button>
              <button class="preview-btn preview-btn-primary preview-btn-sm">小号主按钮</button>
            </div>
            <div class="preview-btn-stack">
              <button class="preview-btn preview-btn-secondary">次要按钮</button>
              <button class="preview-btn preview-btn-outline">轮廓按钮</button>
              <button class="preview-btn preview-btn-ghost">幽灵按钮</button>
            </div>
            <div class="preview-btn-stack">
              <button class="preview-btn preview-btn-primary" disabled>禁用状态</button>
              <button class="preview-btn preview-btn-icon">+</button>
            </div>
          </div>
        </div>

        <div class="preview-row">
          <div class="preview-tags">
            <h4 class="preview-subtitle">标签与徽章</h4>
            <div class="preview-tag-row">
              <span class="preview-tag">标签一</span>
              <span class="preview-tag preview-tag-outline">标签二</span>
              <span class="preview-tag">标签三</span>
              <span class="preview-badge">99+</span>
              <span class="preview-badge preview-badge-dot"></span>
            </div>
          </div>

          <div class="preview-alerts">
            <h4 class="preview-subtitle">提示信息</h4>
            <div class="preview-alert preview-alert-primary">
              <strong>提示：</strong>这是一条主要提示信息，用于展示重要内容。
            </div>
            <div class="preview-alert preview-alert-secondary">
              <strong>说明：</strong>这是一条次要提示信息，展示辅助内容。
            </div>
          </div>
        </div>
      </div>
    `;
  }

  public update(scheme: ColorScheme): void {
    this.currentScheme = scheme;
    const colors = scheme.colors;

    const primary = colors[2] || colors[0];
    const secondary = colors[1] || colors[0];
    const accent = colors[3] || colors[0];
    const light = colors[0] || colors[0];
    const dark = colors[4] || colors[0];

    const root = document.documentElement;
    root.style.setProperty('--preview-primary', hslToHex(primary));
    root.style.setProperty('--preview-primary-hsl', hslToString(primary));
    root.style.setProperty('--preview-secondary', hslToHex(secondary));
    root.style.setProperty('--preview-secondary-hsl', hslToString(secondary));
    root.style.setProperty('--preview-accent', hslToHex(accent));
    root.style.setProperty('--preview-accent-hsl', hslToString(accent));
    root.style.setProperty('--preview-light', hslToHex(light));
    root.style.setProperty('--preview-light-hsl', hslToString(light));
    root.style.setProperty('--preview-dark', hslToHex(dark));
    root.style.setProperty('--preview-dark-hsl', hslToString(dark));

    const textColor = this.getContrastColor(primary);
    root.style.setProperty('--preview-on-primary', textColor);
  }

  private getContrastColor(color: HSLColor): string {
    return color.l > 60 ? '#1a1a1a' : '#ffffff';
  }

  public getCurrentScheme(): ColorScheme | null {
    return this.currentScheme;
  }

  public destroy(): void {
    this.container.innerHTML = '';
    const root = document.documentElement;
    [
      '--preview-primary',
      '--preview-primary-hsl',
      '--preview-secondary',
      '--preview-secondary-hsl',
      '--preview-accent',
      '--preview-accent-hsl',
      '--preview-light',
      '--preview-light-hsl',
      '--preview-dark',
      '--preview-dark-hsl',
      '--preview-on-primary'
    ].forEach(varName => root.style.removeProperty(varName));
  }
}
