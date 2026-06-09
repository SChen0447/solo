import { useState, useEffect, useCallback } from 'react';
import { ColorPanel } from './ColorPanel';
import { PreviewPage } from './PreviewPage';
import {
  ColorVariable,
  getDefaultTheme,
  applyVariablesToRoot,
  isColorsEqual,
  getPresetThemes,
} from './themeEngine';
import './index.css';

function App() {
  const [variables, setVariables] = useState<ColorVariable[]>(getDefaultTheme());
  const [activePresetId, setActivePresetId] = useState<string>('default');
  const [originalVariables, setOriginalVariables] = useState<ColorVariable[]>(getDefaultTheme());

  const isModified = !isColorsEqual(variables, originalVariables);

  useEffect(() => {
    applyVariablesToRoot(variables);
  }, [variables]);

  const handleVariableChange = useCallback((name: string, value: string) => {
    setVariables((prev) =>
      prev.map((v) => (v.name === name ? { ...v, value } : v))
    );
  }, []);

  const handleApplyPreset = useCallback((colors: ColorVariable[]) => {
    setVariables(colors);
    setOriginalVariables(colors);
  }, []);

  const handlePresetChange = useCallback((id: string) => {
    setActivePresetId(id);
    if (id) {
      const preset = getPresetThemes().find((p) => p.id === id);
      if (preset) {
        setOriginalVariables(preset.colors);
      }
    }
  }, []);

  return (
    <div className="app-container">
      <ColorPanel
        variables={variables}
        onVariableChange={handleVariableChange}
        onApplyPreset={handleApplyPreset}
        activePresetId={activePresetId}
        onPresetChange={handlePresetChange}
      />
      <PreviewPage isModified={isModified} />
    </div>
  );
}

export default App;
