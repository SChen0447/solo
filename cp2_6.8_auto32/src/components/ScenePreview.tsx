import React, { useState, useCallback } from 'react';
import { ComponentType, ThemeColors, COMPONENT_LABELS } from '../utils/constants';

interface ScenePreviewProps {
  colors: ThemeColors;
  onColorChange: (component: ComponentType, color: string) => void;
  panelBg: string;
  panelText: string;
  isTransitioning: boolean;
}

interface DropZoneState {
  isOver: boolean;
  isBouncing: boolean;
}

export const ScenePreview: React.FC<ScenePreviewProps> = ({
  colors,
  onColorChange,
  panelBg,
  panelText,
  isTransitioning,
}) => {
  const [dropStates, setDropStates] = useState<Record<string, DropZoneState>>({});

  const handleDragOver = useCallback((e: React.DragEvent, componentId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropStates(prev => ({
      ...prev,
      [componentId]: { ...prev[componentId], isOver: true }
    }));
  }, []);

  const handleDragLeave = useCallback((componentId: string) => {
    setDropStates(prev => ({
      ...prev,
      [componentId]: { ...prev[componentId], isOver: false }
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, component: ComponentType) => {
    e.preventDefault();
    const color = e.dataTransfer.getData('text/plain');
    if (color) {
      onColorChange(component, color);
      
      setDropStates(prev => ({
        ...prev,
        [component]: { ...prev[component], isOver: false, isBouncing: true }
      }));
      
      setTimeout(() => {
        setDropStates(prev => ({
          ...prev,
          [component]: { ...prev[component], isBouncing: false }
        }));
      }, 300);
    }
  }, [onColorChange]);

  const transitionDuration = isTransitioning ? 0.5 : 0.3;

  const renderButtonNormal = () => (
    <button
      onDragOver={(e) => handleDragOver(e, 'buttonNormal')}
      onDragLeave={() => handleDragLeave('buttonNormal')}
      onDrop={(e) => handleDrop(e, 'buttonNormal')}
      style={{
        padding: '10px 24px',
        backgroundColor: colors.buttonNormal,
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: 'pointer',
        transform: dropStates.buttonNormal?.isBouncing ? 'scale(1.05)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color ${transitionDuration}s ease`,
        boxShadow: dropStates.buttonNormal?.isOver ? '0 0 0 3px rgba(0,122,255,0.3)' : 'none',
      }}
    >
      默认按钮
    </button>
  );

  const renderButtonHover = () => (
    <button
      onDragOver={(e) => handleDragOver(e, 'buttonHover')}
      onDragLeave={() => handleDragLeave('buttonHover')}
      onDrop={(e) => handleDrop(e, 'buttonHover')}
      style={{
        padding: '10px 24px',
        backgroundColor: colors.buttonHover,
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: 'pointer',
        transform: dropStates.buttonHover?.isBouncing ? 'scale(1.05)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color ${transitionDuration}s ease`,
        boxShadow: dropStates.buttonHover?.isOver ? '0 0 0 3px rgba(0,122,255,0.3)' : 'none',
      }}
    >
      悬停按钮
    </button>
  );

  const renderButtonDisabled = () => (
    <button
      disabled
      onDragOver={(e) => handleDragOver(e, 'buttonDisabled')}
      onDragLeave={() => handleDragLeave('buttonDisabled')}
      onDrop={(e) => handleDrop(e, 'buttonDisabled')}
      style={{
        padding: '10px 24px',
        backgroundColor: colors.buttonDisabled,
        color: '#fff',
        border: 'none',
        borderRadius: '6px',
        fontSize: '14px',
        cursor: 'not-allowed',
        opacity: 0.8,
        transform: dropStates.buttonDisabled?.isBouncing ? 'scale(1.05)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color ${transitionDuration}s ease`,
        boxShadow: dropStates.buttonDisabled?.isOver ? '0 0 0 3px rgba(0,122,255,0.3)' : 'none',
      }}
    >
      禁用按钮
    </button>
  );

  const renderCardBackground = () => (
    <div
      onDragOver={(e) => handleDragOver(e, 'cardBackground')}
      onDragLeave={() => handleDragLeave('cardBackground')}
      onDrop={(e) => handleDrop(e, 'cardBackground')}
      style={{
        width: '100%',
        height: '100px',
        backgroundColor: colors.cardBackground,
        borderRadius: '8px',
        padding: '16px',
        boxSizing: 'border-box',
        boxShadow: `0 2px 8px ${colors.shadowEffect}`,
        transform: dropStates.cardBackground?.isBouncing ? 'scale(1.05)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background-color ${transitionDuration}s ease, box-shadow ${transitionDuration}s ease`,
        outline: dropStates.cardBackground?.isOver ? '2px dashed #007AFF' : 'none',
        outlineOffset: '2px',
      }}
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: colors.textTitle, marginBottom: '8px' }}>
        卡片标题
      </div>
      <div style={{ fontSize: '12px', color: panelText, opacity: 0.6 }}>
        这是卡片内容区域
      </div>
    </div>
  );

  const renderInputBorder = () => (
    <input
      type="text"
      placeholder="输入框示例"
      onDragOver={(e) => handleDragOver(e, 'inputBorder')}
      onDragLeave={() => handleDragLeave('inputBorder')}
      onDrop={(e) => handleDrop(e, 'inputBorder')}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: `2px solid ${colors.inputBorder}`,
        borderRadius: '6px',
        fontSize: '14px',
        boxSizing: 'border-box',
        backgroundColor: panelBg,
        color: panelText,
        transform: dropStates.inputBorder?.isBouncing ? 'scale(1.05)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color ${transitionDuration}s ease`,
        outline: 'none',
        boxShadow: dropStates.inputBorder?.isOver ? '0 0 0 3px rgba(0,122,255,0.3)' : 'none',
      }}
    />
  );

  const renderTextTitle = () => (
    <h3
      onDragOver={(e) => handleDragOver(e, 'textTitle')}
      onDragLeave={() => handleDragLeave('textTitle')}
      onDrop={(e) => handleDrop(e, 'textTitle')}
      style={{
        fontSize: '24px',
        fontWeight: 700,
        color: colors.textTitle,
        margin: 0,
        padding: '8px 0',
        transform: dropStates.textTitle?.isBouncing ? 'scale(1.05)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), color ${transitionDuration}s ease`,
        textShadow: dropStates.textTitle?.isOver ? '0 0 10px rgba(0,122,255,0.3)' : 'none',
        display: 'inline-block',
      }}
    >
      标题文字示例
    </h3>
  );

  const renderProgressFill = () => (
    <div
      onDragOver={(e) => handleDragOver(e, 'progressFill')}
      onDragLeave={() => handleDragLeave('progressFill')}
      onDrop={(e) => handleDrop(e, 'progressFill')}
      style={{
        width: '100%',
        height: '12px',
        backgroundColor: '#e0e0e0',
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative',
        transform: dropStates.progressFill?.isBouncing ? 'scaleY(1.3)' : 'scaleY(1)',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        outline: dropStates.progressFill?.isOver ? '2px dashed #007AFF' : 'none',
        outlineOffset: '2px',
      }}
    >
      <div
        style={{
          width: '65%',
          height: '100%',
          backgroundColor: colors.progressFill,
          borderRadius: '6px',
          transition: `background-color ${transitionDuration}s ease`,
        }}
      />
    </div>
  );

  const renderShadowEffect = () => (
    <div
      onDragOver={(e) => handleDragOver(e, 'shadowEffect')}
      onDragLeave={() => handleDragLeave('shadowEffect')}
      onDrop={(e) => handleDrop(e, 'shadowEffect')}
      style={{
        width: '120px',
        height: '60px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: `0 4px 16px ${colors.shadowEffect}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        color: '#999',
        transform: dropStates.shadowEffect?.isBouncing ? 'scale(1.05)' : 'scale(1)',
        transition: `transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow ${transitionDuration}s ease`,
        outline: dropStates.shadowEffect?.isOver ? '2px dashed #007AFF' : 'none',
        outlineOffset: '2px',
      }}
    >
      阴影效果
    </div>
  );

  const components: { id: ComponentType; label: string; render: () => React.ReactNode }[] = [
    { id: 'buttonNormal', label: COMPONENT_LABELS.buttonNormal, render: renderButtonNormal },
    { id: 'buttonHover', label: COMPONENT_LABELS.buttonHover, render: renderButtonHover },
    { id: 'buttonDisabled', label: COMPONENT_LABELS.buttonDisabled, render: renderButtonDisabled },
    { id: 'cardBackground', label: COMPONENT_LABELS.cardBackground, render: renderCardBackground },
    { id: 'inputBorder', label: COMPONENT_LABELS.inputBorder, render: renderInputBorder },
    { id: 'textTitle', label: COMPONENT_LABELS.textTitle, render: renderTextTitle },
    { id: 'progressFill', label: COMPONENT_LABELS.progressFill, render: renderProgressFill },
    { id: 'shadowEffect', label: COMPONENT_LABELS.shadowEffect, render: renderShadowEffect },
  ];

  return (
    <div
      style={{
        backgroundColor: panelBg,
        color: panelText,
        padding: '20px',
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        backgroundImage: `
          linear-gradient(${panelText}08 1px, transparent 1px),
          linear-gradient(90deg, ${panelText}08 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
        组件预览区
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {components.map(comp => (
          <div key={comp.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span style={{ fontSize: '12px', opacity: 0.6 }}>{comp.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', minHeight: '60px' }}>
              {comp.render()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
