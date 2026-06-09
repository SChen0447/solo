import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sample, User } from '../types';
import StarCard from '../components/StarCard';

interface CollectionPageProps {
  user: User | null;
}

type FilterType = 'all' | 'won' | 'selling' | 'bidding';

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'won', label: '已得标' },
  { key: 'selling', label: '已出售' },
  { key: 'bidding', label: '竞拍中' }
];

const CollectionPage: React.FC<CollectionPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ won: Sample[]; selling: Sample[]; bidding: Sample[] }>({
    won: [],
    selling: [],
    bidding: []
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    const fetchCollection = async () => {
      try {
        const res = await axios.get(`/api/collection/${user.id}`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCollection();
  }, [user, navigate]);

  const getFilteredSamples = (): Sample[] => {
    switch (activeFilter) {
      case 'won':
        return data.won;
      case 'selling':
        return data.selling;
      case 'bidding':
        return data.bidding;
      case 'all':
      default:
        return [...data.won, ...data.selling, ...data.bidding];
    }
  };

  const samples = getFilteredSamples();

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: 'radial-gradient(ellipse at center, #1a0f30 0%, #0a0815 60%, #050210 100%)',
        padding: '40px 60px',
        color: '#ddddee'
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '700',
              color: '#fff',
              letterSpacing: '6px',
              marginBottom: '8px',
              textShadow: '0 0 40px #aa88ff88'
            }}
          >
            ✦ 我的星尘收藏墙 ✦
          </h1>
          <div style={{ fontSize: '14px', color: '#aaaacc' }}>
            {user?.username} 的星尘收集站
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '40px' }}>
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <div
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                style={{
                  padding: '10px 28px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: isActive ? '700' : '400',
                  letterSpacing: '2px',
                  background: isActive
                    ? 'linear-gradient(135deg, #aa88ff66, #ff88aa66)'
                    : '#ffffff10',
                  color: isActive ? '#fff' : '#aaaacc',
                  border: isActive ? '1px solid #aa88ff88' : '1px solid transparent',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#ffffff20';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#ffffff10';
                }}
              >
                {filter.label}
              </div>
            );
          })}
        </div>

        {loading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              fontSize: '18px',
              color: '#aa88ff'
            }}
          >
            正在整理星尘收藏...
          </div>
        ) : samples.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#666688'
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌌</div>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>
              这个角落还是空的
            </div>
            <div style={{ fontSize: '14px' }}>
              去星尘大厅探索，或者上传你的第一份星尘吧
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 180px)',
              gap: '24px',
              justifyContent: 'center'
            }}
          >
            {samples.map((sample, i) => (
              <StarCard key={`${sample.id}-${i}`} sample={sample} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollectionPage;
