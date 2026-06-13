import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { profileApi, worksApi, eventsApi, statsApi } from '../api';
import type { Profile, Work, Event, DailyStats, StatsSummary } from '../types';
import './Admin.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AdminProps {
  isLoggedIn: boolean;
}

export default function Admin({ isLoggedIn }: AdminProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'works' | 'events' | 'profile'>('overview');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const [editProfile, setEditProfile] = useState({ name: '', bio: '', signature: '' });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverPreviewRef = useRef<string | null>(null);

  const [newWork, setNewWork] = useState({
    title: '',
    description: '',
    tags: '',
    duration: 0
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [workCoverFile, setWorkCoverFile] = useState<File | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '',
    venue: '',
    venueUrl: '',
    price: '',
    ticketUrl: '',
    description: ''
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    Promise.all([
      profileApi.getProfile(),
      worksApi.getWorks(),
      eventsApi.getEvents(),
      statsApi.getDailyStats(),
      statsApi.getSummary()
    ]).then(([profileData, worksData, eventsData, statsData, summaryData]) => {
      setProfile(profileData);
      setWorks(worksData);
      setEvents(eventsData);
      setDailyStats(statsData);
      setSummary(summaryData);
      setEditProfile({
        name: profileData.name,
        bio: profileData.bio,
        signature: profileData.signature
      });
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load admin data:', err);
      setLoading(false);
    });
  }, [isLoggedIn]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (coverFile) {
        await profileApi.uploadCover(coverFile);
      }
      const updated = await profileApi.updateProfile(editProfile);
      setProfile(updated);
      showMessage('success', '个人资料更新成功');
    } catch (err) {
      showMessage('error', '更新失败，请重试');
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 500 * 1024) {
        showMessage('error', '图片大小不能超过500KB');
        return;
      }
      setCoverFile(file);
      if (coverPreviewRef.current) {
        URL.revokeObjectURL(coverPreviewRef.current);
      }
      coverPreviewRef.current = URL.createObjectURL(file);
    }
  };

  const handleWorkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWork.title || !newWork.title.trim()) {
      showMessage('error', '请输入作品名称');
      return;
    }
    if (!audioFile) {
      showMessage('error', '请选择音频文件');
      return;
    }
    if (audioFile.size > 15 * 1024 * 1024) {
      showMessage('error', '音频文件不能超过15MB');
      return;
    }

    try {
      const created = await worksApi.uploadWork({
        title: newWork.title,
        description: newWork.description,
        tags: newWork.tags.split(',').map(t => t.trim()).filter(Boolean),
        duration: newWork.duration,
        audioFile: audioFile,
        coverFile: workCoverFile || undefined
      });
      setWorks([created, ...works]);
      setNewWork({ title: '', description: '', tags: '', duration: 0 });
      setAudioFile(null);
      setWorkCoverFile(null);
      showMessage('success', '作品上传成功');
    } catch (err) {
      showMessage('error', '上传失败，请重试');
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (!confirm('确定要删除这个作品吗？')) return;
    try {
      await worksApi.deleteWork(id);
      setWorks(works.filter(w => w.id !== id));
      showMessage('success', '作品已删除');
    } catch (err) {
      showMessage('error', '删除失败');
    }
  };

  const handleEventCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) {
      showMessage('error', '请填写演出名称和日期');
      return;
    }
    try {
      const created = await eventsApi.createEvent(newEvent);
      setEvents([...events, created]);
      setNewEvent({
        title: '', date: '', time: '', venue: '',
        venueUrl: '', price: '', ticketUrl: '', description: ''
      });
      showMessage('success', '演出创建成功');
    } catch (err) {
      showMessage('error', '创建失败');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('确定要删除这个演出吗？')) return;
    try {
      await eventsApi.deleteEvent(id);
      setEvents(events.filter(ev => ev.id !== id));
      showMessage('success', '演出已删除');
    } catch (err) {
      showMessage('error', '删除失败');
    }
  };

  const chartData = {
    labels: dailyStats.map(s => s.date.slice(5)),
    datasets: [
      {
        label: '播放量',
        data: dailyStats.map(s => s.plays),
        fill: true,
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
          gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
          return gradient;
        },
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
        pointBackgroundColor: '#8b5cf6',
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#e0e0e0',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#a0a0b0'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)'
        },
        ticks: {
          color: '#a0a0b0'
        }
      }
    }
  };

  if (!isLoggedIn) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return (
      <div className="admin-page page-transition">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="admin-page page-transition">
      {message && (
        <div className={`admin-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="admin-container">
        <div className="admin-sidebar glass-card">
          <div className="admin-sidebar-header">
            <h2>管理后台</h2>
          </div>
          <nav className="admin-nav">
            {[
              { id: 'overview', label: '数据概览', icon: '📊' },
              { id: 'works', label: '作品管理', icon: '🎵' },
              { id: 'events', label: '演出管理', icon: '📅' },
              { id: 'profile', label: '个人资料', icon: '👤' }
            ].map(item => (
              <button
                key={item.id}
                className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id as any)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="admin-content">
          {activeTab === 'overview' && (
            <div className="admin-tab-content">
              <h1 className="admin-page-title">数据概览</h1>
              
              <div className="stats-cards">
                <div className="stat-card glass-card">
                  <div className="stat-icon">▶</div>
                  <div className="stat-info">
                    <div className="stat-value">{summary?.totalPlays || 0}</div>
                    <div className="stat-label">总播放量</div>
                  </div>
                </div>
                <div className="stat-card glass-card">
                  <div className="stat-icon">🎵</div>
                  <div className="stat-info">
                    <div className="stat-value">{summary?.totalWorks || 0}</div>
                    <div className="stat-label">作品数量</div>
                  </div>
                </div>
                <div className="stat-card glass-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-info">
                    <div className="stat-value">{summary?.totalEvents || 0}</div>
                    <div className="stat-label">演出场次</div>
                  </div>
                </div>
              </div>

              <div className="chart-section glass-card">
                <h3>近30天播放量</h3>
                <div className="chart-container">
                  <Line data={chartData} options={chartOptions as any} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'works' && (
            <div className="admin-tab-content">
              <h1 className="admin-page-title">作品管理</h1>
              
              <div className="upload-section glass-card">
                <h3>上传新作品</h3>
                <form onSubmit={handleWorkUpload}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>作品名称 *</label>
                      <input
                        type="text"
                        value={newWork.title}
                        onChange={e => setNewWork({...newWork, title: e.target.value})}
                        placeholder="输入作品名称"
                      />
                    </div>
                    <div className="form-group">
                      <label>时长（秒）</label>
                      <input
                        type="number"
                        value={newWork.duration}
                        onChange={e => setNewWork({...newWork, duration: parseInt(e.target.value) || 0})}
                        placeholder="245"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>作品描述</label>
                    <textarea
                      value={newWork.description}
                      onChange={e => setNewWork({...newWork, description: e.target.value})}
                      placeholder="描述一下这首作品"
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>标签（逗号分隔）</label>
                    <input
                      type="text"
                      value={newWork.tags}
                      onChange={e => setNewWork({...newWork, tags: e.target.value})}
                      placeholder="流行, 电子, 治愈"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>音频文件 * (MP3/WAV, 最大15MB)</label>
                      <input
                        type="file"
                        accept=".mp3,.wav"
                        onChange={e => setAudioFile(e.target.files?.[0] || null)}
                      />
                      {audioFile && <span className="file-name">{audioFile.name}</span>}
                    </div>
                    <div className="form-group">
                      <label>封面图片</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => setWorkCoverFile(e.target.files?.[0] || null)}
                      />
                      {workCoverFile && <span className="file-name">{workCoverFile.name}</span>}
                    </div>
                  </div>
                  <button type="submit" className="btn-primary upload-btn">
                    上传作品
                  </button>
                </form>
              </div>

              <div className="works-list-section">
                <h3>作品列表</h3>
                <div className="works-admin-list">
                  {works.map(work => (
                    <div key={work.id} className="work-admin-item glass-card">
                      <div className="work-admin-cover">
                        {work.coverImage ? (
                          <img src={work.coverImage} alt={work.title} />
                        ) : (
                          <div className="work-cover-placeholder"><span>🎧</span></div>
                        )}
                      </div>
                      <div className="work-admin-info">
                        <h4>{work.title}</h4>
                        <p>{work.description}</p>
                        <div className="work-admin-meta">
                          <span>▶ {work.plays} 次播放</span>
                          <span>⏱ {Math.floor(work.duration / 60)}:{(work.duration % 60).toString().padStart(2, '0')}</span>
                        </div>
                      </div>
                      <button
                        className="btn-danger"
                        onClick={() => handleDeleteWork(work.id)}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="admin-tab-content">
              <h1 className="admin-page-title">演出管理</h1>
              
              <div className="upload-section glass-card">
                <h3>创建新演出</h3>
                <form onSubmit={handleEventCreate}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>演出名称 *</label>
                      <input
                        type="text"
                        value={newEvent.title}
                        onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                        placeholder="演出名称"
                      />
                    </div>
                    <div className="form-group">
                      <label>日期 *</label>
                      <input
                        type="date"
                        value={newEvent.date}
                        onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>时间</label>
                      <input
                        type="time"
                        value={newEvent.time}
                        onChange={e => setNewEvent({...newEvent, time: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>票价</label>
                      <input
                        type="text"
                        value={newEvent.price}
                        onChange={e => setNewEvent({...newEvent, price: e.target.value})}
                        placeholder="￥180起"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>场馆</label>
                      <input
                        type="text"
                        value={newEvent.venue}
                        onChange={e => setNewEvent({...newEvent, venue: e.target.value})}
                        placeholder="场馆名称"
                      />
                    </div>
                    <div className="form-group">
                      <label>场馆链接</label>
                      <input
                        type="url"
                        value={newEvent.venueUrl}
                        onChange={e => setNewEvent({...newEvent, venueUrl: e.target.value})}
                        placeholder="https://"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>购票链接</label>
                    <input
                      type="url"
                      value={newEvent.ticketUrl}
                      onChange={e => setNewEvent({...newEvent, ticketUrl: e.target.value})}
                      placeholder="https://"
                    />
                  </div>
                  <div className="form-group">
                    <label>演出介绍</label>
                    <textarea
                      value={newEvent.description}
                      onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                      placeholder="演出详情介绍"
                      rows={3}
                    />
                  </div>
                  <button type="submit" className="btn-primary upload-btn">
                    创建演出
                  </button>
                </form>
              </div>

              <div className="events-admin-list">
                <h3>演出列表</h3>
                {events.map(event => (
                  <div key={event.id} className="event-admin-item glass-card">
                    <div className="event-admin-date">
                      <div className="event-admin-day">{new Date(event.date).getDate()}</div>
                      <div className="event-admin-month">
                        {new Date(event.date).toLocaleDateString('zh-CN', { month: 'short' })}
                      </div>
                    </div>
                    <div className="event-admin-info">
                      <h4>{event.title}</h4>
                      <p>📍 {event.venue}</p>
                      <p>🕐 {event.time} | {event.price}</p>
                    </div>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteEvent(event.id)}
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="admin-tab-content">
              <h1 className="admin-page-title">个人资料</h1>
              
              <div className="profile-edit-section glass-card">
                <form onSubmit={handleProfileUpdate}>
                  <div className="form-group">
                    <label>音乐人名称</label>
                    <input
                      type="text"
                      value={editProfile.name}
                      onChange={e => setEditProfile({...editProfile, name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>个性签名（140字以内）</label>
                    <input
                      type="text"
                      value={editProfile.signature}
                      onChange={e => {
                        if (e.target.value.length <= 140) {
                          setEditProfile({...editProfile, signature: e.target.value});
                        }
                      }}
                      maxLength={140}
                    />
                    <span className="char-count">{editProfile.signature.length}/140</span>
                  </div>
                  <div className="form-group">
                    <label>个人简介</label>
                    <textarea
                      value={editProfile.bio}
                      onChange={e => setEditProfile({...editProfile, bio: e.target.value})}
                      rows={5}
                    />
                  </div>
                  <div className="form-group">
                    <label>封面图片（500KB以内）</label>
                    <div className="cover-upload-area">
                      {(coverPreviewRef.current || profile?.coverImage) && (
                        <div className="cover-preview">
                          <img src={coverPreviewRef.current || profile?.coverImage} alt="封面预览" />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverChange}
                        id="cover-upload"
                      />
                      <label htmlFor="cover-upload" className="btn-secondary">
                        选择图片
                      </label>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary">
                    保存修改
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
