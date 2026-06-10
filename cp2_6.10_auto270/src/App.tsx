import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import PostcardCanvas from './components/PostcardCanvas';
import ExportDialog from './components/ExportDialog';
import {
  vintagePalette,
  fontFamilies,
  CanvasElement,
  PostcardState,
  encodeState,
  decodeState,
  VintageColor,
} from './utils/colorPalette';
import { stampBorders, decorations } from './utils/assets';

const App: React.FC = () => {
  const [selectedSide, setSelectedSide] = useState<'front' | 'back'>('front');
  const [frontElements, setFrontElements] = useState<CanvasElement[]>([]);
  const [backElements, setBackElements] = useState<CanvasElement[]>([]);
  const [currentFont, setCurrentFont] = useState(fontFamilies[0].value);
  const [currentFontSize, setCurrentFontSize] = useState(24);
  const [currentColor, setCurrentColor] = useState(vintagePalette[4].value);
  const [currentAlign, setCurrentAlign] = useState<'left' | 'center' | 'right'>('left');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);
  const [mobileNav, setMobileNav] = useState<'none' | 'left' | 'right'>('none');

  const frontCanvasRef = useRef<HTMLDivElement>(null);
  const backCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const state = decodeState(hash);
      if (state) {
        setFrontElements(state.frontElements);
        setBackElements(state.backElements);
        setSelectedSide(state.selectedSide);
      }
    }
  }, []);

  const currentElements = selectedSide === 'front' ? frontElements : backElements;
  const setCurrentElements = selectedSide === 'front' ? setFrontElements : setBackElements;

  const handleFlip = () => {
    setIsFlipping(true);
    setTimeout(() => {
      setSelectedSide(selectedSide === 'front' ? 'back' : 'front');
      setSelectedId(null);
      setTimeout(() => setIsFlipping(false), 100);
    }, 300);
  };

  const addStamp = (stamp: { id: string; label: string; svg: string }) => {
    const newElement: CanvasElement = {
      id: uuidv4(),
      type: 'stamp',
      x: 100,
      y: 100,
      width: 120,
      height: 120,
      rotation: 0,
      opacity: 1,
      zIndex: currentElements.length + 1,
      src: stamp.svg,
      label: stamp.label,
    };
    setCurrentElements([...currentElements, newElement]);
    setSelectedId(newElement.id);
  };

  const addDecoration = (deco: { id: string; label: string; svg: string }) => {
    const newElement: CanvasElement = {
      id: uuidv4(),
      type: 'decoration',
      x: 150,
      y: 150,
      width: 100,
      height: 80,
      rotation: 0,
      opacity: 0.7,
      zIndex: currentElements.length + 1,
      src: deco.svg,
      label: deco.label,
    };
    setCurrentElements([...currentElements, newElement]);
    setSelectedId(newElement.id);
  };

  const generateShareLink = () => {
    const state: PostcardState = {
      frontElements,
      backElements,
      selectedSide,
    };
    const encoded = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    });
  };

  const toolbarContent = (
    <div style={{ padding: 16 }}>
      <h2 style={panelTitleStyle}>文字工具</h2>

      <div style={fieldContainer}>
        <label style={fieldLabel}>字体</label>
        <select
          value={currentFont}
          onChange={(e) => setCurrentFont(e.target.value)}
          style={selectStyle}
        >
          {fontFamilies.map((f: { name: string; value: string }) => (
            <option key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div style={fieldContainer}>
        <label style={fieldLabel}>字号: {currentFontSize}pt</label>
        <input
          type="range"
          min="8"
          max="48"
          value={currentFontSize}
          onChange={(e) => setCurrentFontSize(parseInt(e.target.value))}
          style={sliderStyle}
        />
      </div>

      <div style={fieldContainer}>
        <label style={fieldLabel}>颜色</label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 6,
            marginBottom: 8,
          }}
        >
          {vintagePalette.map((c: VintageColor) => (
            <button
              key={c.value}
              onClick={() => setCurrentColor(c.value)}
              title={c.name}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: c.value,
                border: currentColor === c.value ? '3px solid #7ab4d4' : '2px solid #fdf6e3',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
                boxSizing: 'border-box',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            style={{ width: 40, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer' }}
          />
          <span style={{ color: '#fdf6e3', fontSize: 12, fontFamily: "'Courier Prime', monospace" }}>
            {currentColor}
          </span>
        </div>
      </div>

      <div style={fieldContainer}>
        <label style={fieldLabel}>对齐</label>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => setCurrentAlign(align)}
              style={{
                flex: 1,
                padding: '8px 0',
                background: currentAlign === align ? '#3d5a3a' : '#6b4a35',
                color: '#fdf6e3',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'background 0.2s ease-out',
                fontSize: 14,
              }}
            >
              {align === 'left' ? '左' : align === 'center' ? '中' : '右'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, borderTop: '1px solid #6b4a35', paddingTop: 16 }}>
        <h2 style={panelTitleStyle}>操作</h2>
        <button onClick={handleFlip} style={actionButtonStyle}>
          🔄 翻 转 卡 片
        </button>
        <button onClick={() => setExportOpen(true)} style={{ ...actionButtonStyle, background: '#b23a2a' }}>
          📤 导 出
        </button>
        <button onClick={generateShareLink} style={{ ...actionButtonStyle, background: '#1e3a5f' }}>
          🔗 分享链接
        </button>
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#6b4a35', borderRadius: 6 }}>
        <p style={{ color: '#fdf6e3', fontSize: 11, lineHeight: 1.6 }}>
          💡 点击画布插入文字<br />
          🖱️ 滚轮缩放 (50%-200%)<br />
          ⇧+滚轮 旋转 (15°)<br />
          双击元素 打开属性菜单
        </p>
      </div>
    </div>
  );

  const decorationContent = (
    <div style={{ padding: 16 }}>
      <h2 style={panelTitleStyle}>邮票边框</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
        {stampBorders.map((stamp: { id: string; label: string; svg: string }) => (
          <button
            key={stamp.id}
            onClick={() => addStamp(stamp)}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3d5a3a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#6b4a35')}
            style={{
              padding: 8,
              background: '#6b4a35',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'background 0.2s ease-out',
              color: '#fdf6e3',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: stamp.svg }} style={{ width: 48, height: 48 }} />
            <span>{stamp.label}</span>
          </button>
        ))}
      </div>

      <h2 style={{ ...panelTitleStyle, marginTop: 0 }}>复古印章</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {decorations.map((deco: { id: string; label: string; svg: string }) => (
          <button
            key={deco.id}
            onClick={() => addDecoration(deco)}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#3d5a3a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#6b4a35')}
            style={{
              padding: 6,
              background: '#6b4a35',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'background 0.2s ease-out',
              color: '#fdf6e3',
              fontSize: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: deco.svg }} style={{ width: 40, height: 32 }} />
            <span style={{ whiteSpace: 'nowrap' }}>{deco.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#faf0e0',
      }}
    >
      <div
        style={{
          height: 52,
          background: '#4a3525',
          color: '#fdf6e3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderBottom: '3px solid #6b4a35',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>✉️</span>
          <h1
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            复 古 明 信 片 工 坊
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              fontSize: 12,
              padding: '4px 12px',
              background: selectedSide === 'front' ? '#3d5a3a' : '#6b4a35',
              borderRadius: 20,
              transition: 'background 0.2s ease-out',
            }}
          >
            {selectedSide === 'front' ? '✦ 正面' : '✦ 背面'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleFlip} style={headerButtonStyle} title="翻转">
              🔄
            </button>
            <button onClick={() => setExportOpen(true)} style={headerButtonStyle} title="导出">
              📤
            </button>
            <button onClick={generateShareLink} style={headerButtonStyle} title="分享">
              🔗
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div
          className="left-panel"
          style={{
            width: 260,
            background: '#4a3525',
            color: '#fdf6e3',
            overflowY: 'auto',
            borderRight: '1px solid #6b4a35',
            display: window.innerWidth >= 768 ? 'block' : mobileNav === 'left' ? 'block' : 'none',
            position: window.innerWidth < 768 ? 'absolute' : 'relative',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            maxHeight: '100%',
          }}
        >
          {toolbarContent}
        </div>

        <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          <motion.div
            animate={{ rotateY: isFlipping ? 90 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedSide}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ width: '100%', height: '100%' }}
              >
                <PostcardCanvas
                  mode={selectedSide}
                  elements={currentElements}
                  setElements={setCurrentElements}
                  currentFont={currentFont}
                  currentFontSize={currentFontSize}
                  currentColor={currentColor}
                  currentAlign={currentAlign}
                  selectedId={selectedId}
                  setSelectedId={setSelectedId}
                  canvasRef={selectedSide === 'front' ? frontCanvasRef : backCanvasRef}
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 8,
              background: 'rgba(74, 53, 37, 0.9)',
              padding: '6px 12px',
              borderRadius: 20,
            }}
          >
            <span style={{ color: '#fdf6e3', fontSize: 12 }}>
              A6 · 105×148mm · {selectedSide === 'front' ? '正面编辑中' : '背面编辑中'}
            </span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              display: window.innerWidth < 768 ? 'flex' : 'none',
              gap: 8,
            }}
          >
            <button onClick={() => setMobileNav(mobileNav === 'left' ? 'none' : 'left')} style={headerButtonStyle}>
              🛠
            </button>
            <button onClick={() => setMobileNav(mobileNav === 'right' ? 'none' : 'right')} style={headerButtonStyle}>
              🎨
            </button>
          </div>
        </div>

        <div
          className="right-panel"
          style={{
            width: 260,
            background: '#4a3525',
            color: '#fdf6e3',
            overflowY: 'auto',
            borderLeft: '1px solid #6b4a35',
            display: window.innerWidth >= 768 ? (rightPanelOpen ? 'block' : 'none') : mobileNav === 'right' ? 'block' : 'none',
            position: window.innerWidth < 768 ? 'absolute' : 'relative',
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            maxHeight: '100%',
          }}
        >
          {decorationContent}
        </div>
      </div>

      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#3d5a3a',
              color: '#fdf6e3',
              padding: '12px 24px',
              borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              zIndex: 10001,
              fontSize: 14,
            }}
          >
            ✅ 分享链接已复制到剪贴板
          </motion.div>
        )}
      </AnimatePresence>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        frontCanvasRef={frontCanvasRef}
        backCanvasRef={backCanvasRef}
      />
    </div>
  );
};

const panelTitleStyle: React.CSSProperties = {
  fontFamily: "'Playfair Display', serif",
  fontSize: 16,
  color: '#fdf6e3',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: '1px solid #6b4a35',
  letterSpacing: 1,
  marginTop: 0,
};

const fieldContainer: React.CSSProperties = {
  marginBottom: 16,
};

const fieldLabel: React.CSSProperties = {
  display: 'block',
  color: '#fdf6e3',
  fontSize: 12,
  marginBottom: 6,
  opacity: 0.9,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  background: '#6b4a35',
  color: '#fdf6e3',
  border: 'none',
  borderRadius: 4,
  fontSize: 13,
  cursor: 'pointer',
  outline: 'none',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#3d5a3a',
};

const actionButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  background: '#3d5a3a',
  color: '#fdf6e3',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  marginBottom: 8,
  transition: 'background 0.2s ease-out',
  letterSpacing: 1,
};

const headerButtonStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  background: '#6b4a35',
  color: '#fdf6e3',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 16,
  transition: 'background 0.2s ease-out',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default App;
