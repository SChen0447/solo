import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sample, User } from '../types';
import ParticlePreview from '../components/ParticlePreview';

interface DetailPageProps {
  user: User | null;
}

const DetailPage: React.FC<DetailPageProps> = ({ user }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sample, setSample] = useState<Sample | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidPrice, setBidPrice] = useState<number>(0);
  const [storyExpanded, setStoryExpanded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    const fetchSample = async () => {
      try {
        const res = await axios.get(`/api/sample/${id}`);
        setSample(res.data);
        setBidPrice(res.data.currentPrice + 10);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSample();
  }, [id]);

  const handleBid = async () => {
    if (!user || !sample) return;
    setError('');
    try {
      const res = await axios.post(`/api/sample/${id}/bid`, {
        userId: user.id,
        username: user.username,
        avatar: user.avatar,
        price: bidPrice
      });
      if (res.data.success) {
        setSample(res.data.sample);
        setBidPrice(res.data.sample.currentPrice + 10);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '出价失败');
    }
  };

  if (loading || !sample) {
    return (
      <div
        style={{
          minHeight: 'calc(100vh - 80px)',
          background: 'radial-gradient(ellipse at center, #1a0f30 0%, #0a0815 60%, #050210 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: '#aa88ff'
        }}
      >
        正在加载星尘样本...
      </div>
    );
  }

  const storyText = sample.story;
  const isStoryLong = storyText.length > 300;

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: 'radial-gradient(ellipse at center, #1a0f30 0%, #0a0815 60%, #050210 100%)',
        padding: '40px 60px',
        color: '#ddddee'
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '48px'
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              borderRadius: '50%',
              padding: '4px',
              background: 'linear-gradient(135deg, #aa88ff44, #ff88aa44)',
              boxShadow: '0 0 60px #aa88ff33'
            }}
          >
            <ParticlePreview colors={sample.colors} size={380} particleCount={500} interactive />
          </div>
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {sample.colors.map((color, i) => (
              <div
                key={i}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: color,
                  border: '2px solid #ffffff33',
                  boxShadow: `0 0 15px ${color}88`
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '28px' }}>
            <h1
              style={{
                fontSize: '36px',
                fontWeight: '700',
                color: '#fff',
                marginBottom: '12px',
                letterSpacing: '3px',
                textShadow: '0 0 30px #aa88ff66'
              }}
            >
              {sample.name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div style={{ fontSize: '28px', color: '#ffaa44', fontWeight: '700' }}>
                ◈ {sample.currentPrice} 星币
              </div>
              <div style={{ fontSize: '14px', color: '#ff4466' }}>
                起拍价: {sample.startPrice} 星币
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '16px', color: '#aa88ff', marginBottom: '12px', letterSpacing: '2px' }}>
              ◇ 星尘故事
            </h3>
            <div style={{ fontSize: '16px', color: '#ccccee', lineHeight: '1.8' }}>
              {isStoryLong && !storyExpanded ? storyText.substring(0, 300) + '...' : storyText}
              {isStoryLong && (
                <span
                  style={{
                    color: '#ff88aa',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    fontSize: '14px'
                  }}
                  onClick={() => setStoryExpanded(!storyExpanded)}
                >
                  {storyExpanded ? '收起' : '展开'}
                </span>
              )}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', color: '#aa88ff', marginBottom: '12px', letterSpacing: '2px' }}>
              ◇ 参与竞拍
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="number"
                value={bidPrice}
                onChange={(e) => setBidPrice(parseInt(e.target.value) || 0)}
                min={sample.currentPrice + 1}
                style={{
                  padding: '12px 20px',
                  background: '#ffffff08',
                  border: '1px solid #aa88ff66',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '18px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  width: '140px',
                  fontWeight: '700'
                }}
              />
              <button
                onClick={handleBid}
                style={{
                  padding: '12px 36px',
                  background: 'linear-gradient(135deg, #aa88ff, #ff88aa)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: '700',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  letterSpacing: '3px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 0 30px #aa88ff88';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                立即出价
              </button>
            </div>
            {error && <div style={{ color: '#ff4466', fontSize: '13px', marginTop: '8px' }}>{error}</div>}
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <h3 style={{ fontSize: '16px', color: '#aa88ff', marginBottom: '12px', letterSpacing: '2px' }}>
              ◇ 竞拍历史
            </h3>
            <div
              style={{
                background: '#ffffff05',
                borderRadius: '12px',
                border: '1px solid #ffffff15',
                maxHeight: '240px',
                overflowY: 'auto'
              }}
            >
              {sample.bidHistory.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#666688' }}>
                  暂无竞拍记录
                </div>
              ) : (
                sample.bidHistory.map((bid, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: i % 2 === 0 ? '#ffffff08' : '#ffffff03',
                      gap: '16px'
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #aa88ff44, #ff88aa44)',
                        border: '1px solid #aa88ff66',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '700',
                        flexShrink: 0
                      }}
                    >
                      {bid.avatar}
                    </div>
                    <div style={{ flex: 1, fontSize: '13px', color: '#ccccee' }}>
                      {bid.username}
                    </div>
                    <div style={{ fontSize: '15px', color: '#ffaa44', fontWeight: '700', marginRight: '16px' }}>
                      ◈ {bid.price}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666688' }}>
                      {new Date(bid.time).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
