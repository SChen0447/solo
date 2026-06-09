import { useState, useRef, useMemo } from 'react';
import {
  ColorVariable,
  ThemePreset,
  getPresetThemes,
  parseCssVariables,
  generateExportCss,
  copyToClipboard,
  downloadCssFile,
  getSampleCss,
} from './themeEngine';
import './ColorPanel.css';

interface ColorPanelProps {
  variables: ColorVariable[];
  onVariableChange: (name: string, value: string) => void;
  onApplyPreset: (colors: ColorVariable[]) => void;
  activePresetId: string;
  onPresetChange: (id: string) => void;
}

export function ColorPanel({
  variables,
  onVariableChange,
  onApplyPreset,
  activePresetId,
  onPresetChange,
}: ColorPanelProps) {
  const presets = useMemo<ThemePreset[]>(() => getPresetThemes(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCssVariables(text);
      if (parsed.length > 0) {
        onApplyPreset(parsed);
        onPresetChange('');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLoadSample = () => {
    const parsed = parseCssVariables(getSampleCss());
    onApplyPreset(parsed);
    onPresetChange('default');
  };

  const handlePresetClick = (preset: ThemePreset) => {
    onApplyPreset(preset.colors);
    onPresetChange(preset.id);
  };

  const handleCopyCss = async () => {
    const css = generateExportCss(variables);
    const success = await copyToClipboard(css);
    if (success) {
      alert('CSS 已复制到剪贴板！');
    } else {
      alert('复制失败，请手动复制');
    }
  };

  const handleDownload = () => {
    downloadCssFile(variables, 'theme.css');
  };

  const handleColorInputChange = (name: string, value: string) => {
    onVariableChange(name, value);
  };

  const toggleMobilePanel = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  const closeMobilePanel = () => {
    setIsMobileOpen(false);
  };

  return (
    <>
      <button className="mobile-toggle" onClick={toggleMobilePanel} aria-label="切换调色板">
        ☰
      </button>
      <div
        className={`panel-overlay ${isMobileOpen ? 'visible' : ''}`}
        onClick={closeMobilePanel}
      />
      <aside className={`color-panel ${isMobileOpen ? 'open' : ''}`}>
        <div className="color-panel-header">
          <h1 className="color-panel-title">ColorTheme Studio</h1>
          <p className="color-panel-subtitle">实时颜色主题切换与预览</p>
        </div>

        <div className="theme-presets">
          {presets.map((preset) => (
            <button
              key={preset.id}
              className={`theme-preset-btn ${activePresetId === preset.id ? 'active' : ''}`}
              onClick={() => handlePresetClick(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <div className="variables-list">
          {variables.map((v) => (
            <div key={v.name} className="color-card">
              <div className="color-card-header">
                <span className="color-var-name">{v.name}</span>
                <span
                  className="color-dot"
                  style={{ backgroundColor: v.value }}
                />
              </div>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  className="color-picker"
                  value={v.value.startsWith('#') ? v.value : '#000000'}
                  onChange={(e) => handleColorInputChange(v.name, e.target.value)}
                />
                <input
                  type="text"
                  className="color-value-input"
                  value={v.value}
                  onChange={(e) => handleColorInputChange(v.name, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="panel-actions">
          <input
            type="file"
            ref={fileInputRef}
            accept=".css"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            上传 CSS 文件
          </button>
          <button className="upload-btn" onClick={handleLoadSample}>
            加载样例 CSS
          </button>
          <div className="export-options">
            <button className="export-btn" onClick={handleCopyCss}>
              复制 CSS
            </button>
            <button className="export-btn" onClick={handleDownload}>
              下载文件
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
