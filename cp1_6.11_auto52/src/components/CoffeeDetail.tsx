import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import type { Coffee, RoastingRecord, TastingNote } from '../types';

interface CoffeeDetailProps {
  coffees: Coffee[];
  onAddNote: (note: TastingNote) => void;
}

const AROMA_OPTIONS = [
  '坚果', '可可', '柑橘', '花香', '焦糖', '蜂蜜',
  '浆果', '巧克力', '茶感', '甜感', '草本', '果酸',
  '佛手柑', '茉莉', '蜜桃', '柠檬', '橙花', '水蜜桃',
  '蓝莓', '草莓', '杏仁', '红糖', '雪松', '泥土',
];

const getRatingColor = (rating: number): 'low' | 'mid' | 'high' => {
  if (rating <= 3) return 'low';
  if (rating <= 6) return 'mid';
  return 'high';
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const CoffeeDetail: React.FC<CoffeeDetailProps> = ({ coffees, onAddNote }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'notes'>('info');
  const [coffee, setCoffee] = useState<Coffee | null>(null);
  const [roastingRecord, setRoastingRecord] = useState<RoastingRecord | null>(null);
  const [notes, setNotes] = useState<TastingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formRating, setFormRating] = useState(7);
  const [formDryAroma, setFormDryAroma] = useState<string[]>([]);
  const [formWetAroma, setFormWetAroma] = useState<string[]>([]);
  const [formTaste, setFormTaste] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const coffeeId = Number(id);
    const foundCoffee = coffees.find((c) => c.id === coffeeId);
    if (foundCoffee) {
      setCoffee(foundCoffee);
    }

    const fetchData = async () => {
      try {
        const [recordRes, notesRes] = await Promise.all([
          axios.get(`/api/roastingRecords?coffeeId=${coffeeId}`),
          axios.get(`/api/tastingNotes?coffeeId=${coffeeId}&_sort=createdAt&_order=desc`),
        ]);
        setRoastingRecord(recordRes.data[0] || null);
        setNotes(notesRes.data);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, coffees]);

  useEffect(() => {
    if (!roastingRecord || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const curve = roastingRecord.temperatureCurve;
    const maxTime = Math.max(...curve.map((p) => p.time));
    const minTemp = Math.min(...curve.map((p) => p.time)) - 5;
    const maxTemp = Math.max(...curve.map((p) => p.temp)) + 10;

    const getX = (time: number) => padding.left + (time / maxTime) * chartWidth;
    const getY = (temp: number) => padding.top + chartHeight - ((temp - minTemp) / (maxTemp - minTemp)) * chartHeight;

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, '#ffcc80');
    gradient.addColorStop(0.3, '#ff8a65');
    gradient.addColorStop(0.6, '#e57373');
    gradient.addColorStop(1, '#6d4c41');

    ctx.beginPath();
    ctx.moveTo(getX(curve[0].time), getY(curve[0].temp));
    for (let i = 1; i < curve.length; i++) {
      const xc = (getX(curve[i - 1].time) + getX(curve[i].time)) / 2;
      const yc = (getY(curve[i - 1].temp) + getY(curve[i].temp)) / 2;
      ctx.quadraticCurveTo(getX(curve[i - 1].time), getY(curve[i - 1].temp), xc, yc);
    }
    ctx.lineTo(getX(curve[curve.length - 1].time), getY(curve[curve.length - 1].temp));
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.lineTo(getX(curve[curve.length - 1].time), height - padding.bottom);
    ctx.lineTo(getX(curve[0].time), height - padding.bottom);
    ctx.closePath();
    const fillGradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    fillGradient.addColorStop(0, 'rgba(255, 138, 101, 0.35)');
    fillGradient.addColorStop(0.5, 'rgba(229, 115, 115, 0.25)');
    fillGradient.addColorStop(1, 'rgba(109, 76, 65, 0.1)');
    ctx.fillStyle = fillGradient;
    ctx.fill();

    ctx.fillStyle = '#757575';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let t = 0; t <= maxTime; t += 120) {
      ctx.fillText(`${t}s`, getX(t), height - padding.bottom + 18);
    }

    ctx.textAlign = 'right';
    const tempStep = 20;
    for (let temp = Math.ceil(minTemp / tempStep) * tempStep; temp <= maxTemp; temp += tempStep) {
      ctx.fillText(`${temp}°`, padding.left - 6, getY(temp) + 4);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, getY(temp));
      ctx.lineTo(width - padding.right, getY(temp));
      ctx.stroke();
    }

    curve.forEach((point) => {
      ctx.beginPath();
      ctx.arc(getX(point.time), getY(point.temp), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#6d4c41';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [roastingRecord]);

  const toggleAroma = (type: 'dry' | 'wet', value: string) => {
    if (type === 'dry') {
      setFormDryAroma((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    } else {
      setFormWetAroma((prev) =>
        prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coffee || !formTaste.trim() || !formAuthor.trim()) return;

    setSubmitting(true);
    const newNote: Omit<TastingNote, 'id'> = {
      coffeeId: coffee.id,
      rating: formRating,
      dryAroma: formDryAroma,
      wetAroma: formWetAroma,
      taste: formTaste.trim(),
      author: formAuthor.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await axios.post('/api/tastingNotes', newNote);
      const createdNote: TastingNote = res.data;
      setNotes((prev) => [createdNote, ...prev]);
      onAddNote(createdNote);
      setShowModal(false);
      setFormRating(7);
      setFormDryAroma([]);
      setFormWetAroma([]);
      setFormTaste('');
      setFormAuthor('');
    } catch (error) {
      console.error('提交笔记失败:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner" />
        <div className="loading-text">正在加载详情...</div>
      </div>
    );
  }

  if (!coffee) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <div className="empty-state-text">未找到该咖啡豆</div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <span>←</span>
          <span>返回列表</span>
        </button>
        <h1 className="detail-title">{coffee.name}</h1>
      </div>

      <div className="detail-tabs">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          基本信息
        </button>
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          品鉴笔记 ({notes.length})
        </button>
      </div>

      {activeTab === 'info' && (
        <div className="tab-content">
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">产区</div>
              <div className="info-value">{coffee.region}</div>
            </div>
            <div className="info-item">
              <div className="info-label">海拔高度</div>
              <div className="info-value">{coffee.altitude} 米</div>
            </div>
            <div className="info-item">
              <div className="info-label">处理方式</div>
              <div className="info-value">{coffee.process}</div>
            </div>
            <div className="info-item">
              <div className="info-label">品种</div>
              <div className="info-value">{coffee.variety}</div>
            </div>
            <div className="info-item">
              <div className="info-label">烘焙度</div>
              <div className="info-value">{coffee.roastLevel}</div>
            </div>
            <div className="info-item">
              <div className="info-label">平均评分</div>
              <div className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`rating-dot ${getRatingColor(coffee.avgRating)}`} />
                {coffee.avgRating.toFixed(1)} / 10
              </div>
            </div>
          </div>

          <div className="description-text">{coffee.description}</div>

          <div className="map-container">
            <h4 style={{ color: 'var(--color-title)', marginBottom: '16px', fontSize: '16px' }}>
              🗺️ 产区位置
            </h4>
            <svg viewBox="0 0 100 60" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e3f2fd" />
                  <stop offset="100%" stopColor="#bbdefb" />
                </linearGradient>
                <linearGradient id="landGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#c8e6c9" />
                  <stop offset="100%" stopColor="#a5d6a7" />
                </linearGradient>
              </defs>
              <rect width="100" height="60" fill="url(#oceanGrad)" rx="2" />
              <path
                d="M 18 22 Q 16 28 18 34 Q 22 42 28 46 Q 30 52 35 55 Q 38 54 40 50 Q 44 52 48 50 Q 50 46 48 42 Q 52 38 50 34 Q 52 30 48 28 Q 45 26 42 28 Q 38 24 34 22 Q 28 20 24 22 Q 20 21 18 22 Z"
                fill="url(#landGrad)"
                stroke="#81c784"
                strokeWidth="0.3"
              />
              <path
                d="M 55 18 Q 60 16 65 18 Q 72 20 74 26 Q 78 32 75 38 Q 78 46 74 50 Q 70 52 68 48 Q 64 50 62 46 Q 58 48 56 44 Q 54 40 56 36 Q 53 32 55 28 Q 53 22 55 18 Z"
                fill="url(#landGrad)"
                stroke="#81c784"
                strokeWidth="0.3"
              />
              <path
                d="M 78 20 Q 85 22 88 28 Q 92 34 90 40 Q 92 46 88 50 Q 84 52 80 50 Q 78 46 78 42 Q 76 36 78 30 Q 77 24 78 20 Z"
                fill="url(#landGrad)"
                stroke="#81c784"
                strokeWidth="0.3"
              />
              <g className="map-marker" transform={`translate(${coffee.mapPosition.x}, ${coffee.mapPosition.y})`}>
                <circle r="3" fill="#e53935" opacity="0.3">
                  <animate attributeName="r" values="3;5;3" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.5;0;0.5" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle r="1.8" fill="#e53935" stroke="white" strokeWidth="0.4" />
              </g>
            </svg>
          </div>

          {roastingRecord && (
            <div className="roast-chart-container">
              <h4>🔥 烘焙曲线</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <div className="info-item" style={{ padding: '12px' }}>
                  <div className="info-label">烘焙日期</div>
                  <div className="info-value" style={{ fontSize: '14px' }}>{roastingRecord.date}</div>
                </div>
                <div className="info-item" style={{ padding: '12px' }}>
                  <div className="info-label">烘焙师</div>
                  <div className="info-value" style={{ fontSize: '14px' }}>{roastingRecord.roaster}</div>
                </div>
                <div className="info-item" style={{ padding: '12px' }}>
                  <div className="info-label">总时长</div>
                  <div className="info-value" style={{ fontSize: '14px' }}>{roastingRecord.totalTime}</div>
                </div>
                <div className="info-item" style={{ padding: '12px' }}>
                  <div className="info-label">一爆时间</div>
                  <div className="info-value" style={{ fontSize: '14px' }}>{roastingRecord.firstCrack}</div>
                </div>
              </div>
              <canvas ref={canvasRef} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="tab-content">
          <div className="notes-header">
            <h3>用户品鉴笔记</h3>
            <button className="add-note-btn" onClick={() => setShowModal(true)}>
              + 添加品鉴笔记
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-text">暂无品鉴笔记，快来分享你的感受吧！</div>
            </div>
          ) : (
            <div className="notes-list">
              {notes.map((note) => (
                <div key={note.id} className="note-card">
                  <div className="note-header">
                    <div className="note-rating">
                      <span className={`rating-dot ${getRatingColor(note.rating)}`} />
                      <span>{note.rating.toFixed(1)}</span>
                    </div>
                    <div className="note-meta">
                      <div className="note-author">{note.author}</div>
                      <div className="note-date">{formatDate(note.createdAt)}</div>
                    </div>
                  </div>

                  <div className="note-aromas">
                    {note.dryAroma.length > 0 && (
                      <div className="note-aroma-group">
                        <span className="note-aroma-label">干香</span>
                        <div className="note-tags">
                          {note.dryAroma.map((a) => (
                            <span key={a} className="flavor-tag">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {note.wetAroma.length > 0 && (
                      <div className="note-aroma-group">
                        <span className="note-aroma-label">湿香</span>
                        <div className="note-tags">
                          {note.wetAroma.map((a) => (
                            <span key={a} className="flavor-tag">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="note-taste">{note.taste}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>添加品鉴笔记</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  评分：
                  <span className="rating-value" style={{ marginLeft: '8px' }}>
                    <span className={`rating-dot ${getRatingColor(formRating)}`} />
                    {formRating}
                  </span>
                </label>
                <input
                  type="range"
                  className="rating-slider"
                  min={1}
                  max={10}
                  step={0.5}
                  value={formRating}
                  onChange={(e) => setFormRating(Number(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">你的昵称</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="请输入昵称"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">干香描述（可多选）</label>
                <div className="tag-options">
                  {AROMA_OPTIONS.map((opt) => (
                    <span
                      key={`dry-${opt}`}
                      className={`tag-option ${formDryAroma.includes(opt) ? 'selected' : ''}`}
                      onClick={() => toggleAroma('dry', opt)}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">湿香描述（可多选）</label>
                <div className="tag-options">
                  {AROMA_OPTIONS.map((opt) => (
                    <span
                      key={`wet-${opt}`}
                      className={`tag-option ${formWetAroma.includes(opt) ? 'selected' : ''}`}
                      onClick={() => toggleAroma('wet', opt)}
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">口感描述</label>
                <textarea
                  className="textarea-input"
                  placeholder="请描述这款咖啡的口感、风味层次、余韵等（限200字）"
                  value={formTaste}
                  onChange={(e) => setFormTaste(e.target.value.slice(0, 200))}
                  maxLength={200}
                  required
                />
                <div className="char-count">{formTaste.length} / 200</div>
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={submitting || !formTaste.trim() || !formAuthor.trim()}
              >
                {submitting ? '提交中...' : '提交笔记'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoffeeDetail;
