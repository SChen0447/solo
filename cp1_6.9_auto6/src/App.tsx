import React, { useState, useCallback, useMemo } from 'react';
import { GradientConfig, defaultGradientConfig, generateGradientCss, ColorStop } from './gradientUtils';
import ControlPanel from './ControlPanel';
import GradientPreview from './GradientPreview';

const App: React.FC = () => {
  const [config, setConfig] = useState<GradientConfig>(defaultGradientConfig);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(
    defaultGradientConfig.colorStops[0]?.id || null
  );

  const cssCode = useMemo(() => {
    const result = `background: ${generateGradientCss(config)};`;
    return result;
  }, [config]);

  const handleColorStopMove = useCallback((id: string, position: number) => {
    setConfig((prev) => ({
      ...prev,
      colorStops: prev.colorStops.map((s: ColorStop) =>
        s.id === id ? { ...s, position } : s
      )
    }));
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#fff',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      <ControlPanel
        config={config}
        onConfigChange={setConfig}
        selectedStopId={selectedStopId}
        onSelectedStopChange={setSelectedStopId}
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: '#fff',
          overflowY: 'auto',
          minWidth: 0
        }}
      >
        <GradientPreview
          config={config}
          cssCode={cssCode}
          onColorStopMove={handleColorStopMove}
          onColorStopSelect={setSelectedStopId}
          selectedStopId={selectedStopId}
        />
      </div>
    </div>
  );
};

export default App;
