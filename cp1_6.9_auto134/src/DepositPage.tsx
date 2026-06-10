import { useState, useMemo, useCallback } from 'react';
import {
  Mood,
  Appearance,
  Texture,
  BOTTLE_COLORS,
  TEXTURE_OPTIONS,
  EMOJI_OPTIONS,
  MOOD_LABELS,
} from './types';

interface DepositPageProps {
  onBack: () => void;
}

interface SplashParticle {
  id: number;
  tx: number;
  ty: number;
  size: number;
  delay: number;
}

function DepositPage({ onBack }: DepositPageProps) {
  const [content, setContent] = useState('');
  const [emoji, setEmoji] = useState('');
  const [mood, setMood] = useState<Mood | ''>('');
  const [appearance, setAppearance] = useState<Appearance>({
    color: BOTTLE_COLORS[0].value,
    texture: 'dots',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showDropAnimation, setShowDropAnimation] = useState(false);

  const splashParticles = useMemo<SplashParticle[]>(() => {
    const particles: SplashParticle[] = [];
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50;
      const distance = 60 + Math.random() * 80;
      particles.push({
        id: i,
        tx: Math.cos(angle) * distance,
        ty: -Math.abs(Math.sin(angle) * distance) - 30,
        size: 4 + Math.random() * 4,
        delay: Math.random() * 0.1,
      });
    }
    return particles;
  }, []);

  const validateForm = useCallback((): string => {
    if (content.length < 10 || content.length > 200) {
      return '内容字数需在10-200字之间';
    }
    if (!emoji) {
      return '请选择一个emoji';
    }
    if (!mood) {
      return '请选择心情标签';
    }
    return '';
  }, [content, emoji, mood]);

  const handleSubmit = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/bottles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          emoji,
          mood,
          appearance,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '投递失败');
      }

      setShowDropAnimation(true);
      setTimeout(() => {
        setShowDropAnimation(false);
        onBack();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '投递失败');
    } finally {
      setSubmitting(false);
    }
  }, [content, emoji, mood, appearance, validateForm, onBack]);

  const handleTextureClick = (texture: Texture) => {
    setAppearance(prev => ({ ...prev, texture }));
  };

  const handleColorClick = (color: string) => {
    setAppearance(prev => ({ ...prev, color }));
  };

  return (
    <div className="deposit-page">
      <h1 className="page-title">投递你的记忆</h1>

      {showDropAnimation && (
        <div className="drop-animation-container">
          <div className="drop-bottle" style={{ '--bottle-color': appearance.color } as React.CSSProperties}>
            <div className="bottle-preview">
              <div className="bottle-cap" />
              <div className="bottle-neck" />
              <div className="bottle-body">
                <div className={`bottle-texture texture-${appearance.texture}`} />
                <div className="bottle-highlight" />
              </div>
            </div>
          </div>
          {splashParticles.map(p => (
            <div
              key={p.id}
              className="splash-particle"
              style={{
                '--tx': `${p.tx}px`,
                '--ty': `${p.ty}px`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                animationDelay: `${p.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <div className="form-section">
        <label className="section-label">
          记忆内容
          <span className="char-count">({content.length}/200)</span>
        </label>
        <textarea
          className={`content-textarea ${error && content.length < 10 ? 'error' : ''}`}
          placeholder="写下你想要封存的记忆（10-200字）..."
          value={content}
          onChange={e => setContent(e.target.value)}
          maxLength={200}
        />
        {error && error.includes('字数') && (
          <div className="error-text">{error}</div>
        )}
      </div>

      <div className="form-section">
        <label className="section-label">选择一个Emoji</label>
        <div className="emoji-grid">
          {EMOJI_OPTIONS.map(e => (
            <div
              key={e}
              className={`emoji-item ${emoji === e ? 'selected' : ''}`}
              onClick={() => setEmoji(e)}
            >
              {e}
            </div>
          ))}
        </div>
        {error && error.includes('emoji') && (
          <div className="error-text">{error}</div>
        )}
      </div>

      <div className="form-section">
        <label className="section-label">心情标签</label>
        <select
          className="mood-select"
          value={mood}
          onChange={e => setMood(e.target.value as Mood)}
        >
          <option value="">请选择心情...</option>
          {(Object.entries(MOOD_LABELS) as [Mood, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        {error && error.includes('心情') && (
          <div className="error-text">{error}</div>
        )}
      </div>

      <div className="form-section">
        <label className="section-label">漂流瓶外观</label>
        <div className="appearance-row">
          <div>
            <div style={{ fontSize: 13, color: '#88bbff', marginBottom: 8 }}>瓶身颜色</div>
            <div className="color-options">
              {BOTTLE_COLORS.map(c => (
                <div
                  key={c.value}
                  className={`color-item ${appearance.color === c.value ? 'selected' : ''}`}
                  style={{ background: c.value }}
                  title={c.name}
                  onClick={() => handleColorClick(c.value)}
                />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: '#88bbff', marginBottom: 8 }}>纹理</div>
            <div className="texture-options">
              {TEXTURE_OPTIONS.map(t => (
                <div
                  key={t.value}
                  className={`texture-item ${appearance.texture === t.value ? 'selected' : ''}`}
                  onClick={() => handleTextureClick(t.value)}
                >
                  {t.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <label className="section-label">预览</label>
        <div className="preview-container">
          <div className="bottle-preview" style={{ '--bottle-color': appearance.color } as React.CSSProperties}>
            <div className="bottle-cap" />
            <div className="bottle-neck" />
            <div className="bottle-body">
              <div className={`bottle-texture texture-${appearance.texture}`} />
              <div className="bottle-highlight" />
            </div>
          </div>
        </div>
      </div>

      {error && !error.includes('字数') && !error.includes('emoji') && !error.includes('心情') && (
        <div className="error-text" style={{ textAlign: 'center' }}>{error}</div>
      )}

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={submitting || showDropAnimation}
      >
        {submitting ? '投递中...' : '投入大海'}
      </button>
    </div>
  );
}

export default DepositPage;
