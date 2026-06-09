import React, { useState } from 'react';
import ColorPicker, { ColorHsl } from './components/ColorPicker';
import MoodPreview from './components/MoodPreview';
import MoodWall from './components/MoodWall';

interface TodayRecord {
  id: string;
  colorHsl: ColorHsl;
  note: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function hslToString(h: number, s: number, l: number): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

const App: React.FC = () => {
  const [currentColor, setCurrentColor] = useState<ColorHsl>({
    h: 50,
    s: 80,
    l: 65,
  });
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const addColor = () => {
    if (todayRecords.length >= 3) {
      setMessage('今日最多记录3个色块哦');
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    const id = generateId();
    setTodayRecords([...todayRecords, { id, colorHsl: { ...currentColor }, note: '' }]);
  };

  const updateNote = (id: string, note: string) => {
    setNotes({ ...notes, [id]: note });
  };

  const removeRecord = (id: string) => {
    setTodayRecords(todayRecords.filter((r) => r.id !== id));
    const newNotes = { ...notes };
    delete newNotes[id];
    setNotes(newNotes);
  };

  const saveToday = async () => {
    if (todayRecords.length === 0) {
      setMessage('请先添加至少一个色块');
      setTimeout(() => setMessage(null), 2000);
      return;
    }
    setSaving(true);
    try {
      for (const rec of todayRecords) {
        await fetch('/api/mood', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: today,
            colorHsl: rec.colorHsl,
            note: notes[rec.id] || '',
          }),
        });
      }
      setTodayRecords([]);
      setNotes({});
      setRefreshTrigger((t) => t + 1);
      setMessage('保存成功 ✨');
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setMessage('保存失败，请重试');
      setTimeout(() => setMessage(null), 2000);
    }
    setSaving(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #FAFAFA, #F0F0F0)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        padding: '32px 24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#222',
              margin: 0,
              letterSpacing: -0.5,
            }}
          >
            色彩心情日记
          </h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 6 }}>
            用颜色记录每一刻的情绪 · {today}
          </p>
        </header>

        <div className="picker-section" style={{ display: 'flex', gap: 48, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <ColorPicker color={currentColor} onColorChange={setCurrentColor} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <MoodPreview color={currentColor} />
            <button
              onClick={addColor}
              disabled={todayRecords.length >= 3}
              style={{
                padding: '10px 28px',
                borderRadius: 24,
                background: '#6C63FF',
                color: '#fff',
                border: 'none',
                fontSize: 14,
                fontWeight: 500,
                cursor: todayRecords.length >= 3 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: todayRecords.length >= 3 ? 0.5 : 1,
                boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
              }}
              onMouseEnter={(e) => {
                if (todayRecords.length < 3) {
                  e.currentTarget.style.filter = 'brightness(1.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'brightness(1)';
              }}
              onMouseDown={(e) => {
                if (todayRecords.length < 3) {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              + 添加到今日
            </button>
          </div>
        </div>

        {todayRecords.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: '#333',
                marginBottom: 16,
              }}
            >
              今日记录 ({todayRecords.length}/3)
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {todayRecords.map((rec) => (
                <div
                  key={rec.id}
                  style={{
                    width: 180,
                    background: '#fff',
                    borderRadius: 16,
                    padding: 16,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    position: 'relative',
                  }}
                >
                  <button
                    onClick={() => removeRecord(rec.id)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.05)',
                      border: 'none',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: 12,
                      color: '#999',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.1)';
                      e.currentTarget.style.color = '#666';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                      e.currentTarget.style.color = '#999';
                    }}
                  >
                    ✕
                  </button>
                  <div
                    style={{
                      width: '100%',
                      height: 100,
                      borderRadius: 12,
                      background: hslToString(
                        rec.colorHsl.h,
                        rec.colorHsl.s,
                        rec.colorHsl.l
                      ),
                      marginBottom: 12,
                      transition: 'background 0.3s ease',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="写一句备注..."
                    value={notes[rec.id] || ''}
                    onChange={(e) => updateNote(rec.id, e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid #D0D0D0',
                      borderRadius: 8,
                      padding: '8px 10px',
                      fontSize: 13,
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#6C63FF')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#D0D0D0')}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <button
                onClick={saveToday}
                disabled={saving}
                style={{
                  padding: '12px 36px',
                  borderRadius: 24,
                  background: '#6C63FF',
                  color: '#fff',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 6px 16px rgba(108, 99, 255, 0.35)',
                  opacity: saving ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!saving) e.currentTarget.style.filter = 'brightness(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
                onMouseDown={(e) => {
                  if (!saving) e.currentTarget.style.transform = 'scale(0.95)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {saving ? '保存中...' : '保存今日'}
              </button>
              {message && (
                <span style={{ fontSize: 14, color: '#666' }}>{message}</span>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 48,
            marginBottom: 24,
            borderTop: '1px solid #E8E8E8',
            paddingTop: 32,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#222',
              marginBottom: 20,
              letterSpacing: -0.3,
            }}
          >
            情绪墙
          </div>
          <MoodWall refreshTrigger={refreshTrigger} />
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .picker-section {
            flex-direction: column !important;
            align-items: center !important;
          }
        }
        @media (max-width: 640px) {
          .color-picker .color-wheel {
            transform: scale(0.8) !important;
          }
          header h1 {
            font-size: 24px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
