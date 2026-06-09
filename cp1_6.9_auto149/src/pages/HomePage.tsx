import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Sample, User } from '../types';
import StarCard from '../components/StarCard';

interface HomePageProps {
  user: User | null;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [samples, setSamples] = useState<Sample[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchSamples = async () => {
      try {
        const res = await axios.get('/api/samples');
        if (Array.isArray(res.data)) {
          setSamples(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch samples:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSamples();
  }, [user]);

  const stars = useMemo<Star[]>(() => {
    const arr: Star[] = [];
    for (let i = 0; i < 200; i++) {
      arr.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 1 + Math.random(),
        opacity: 0.3 + Math.random() * 0.6,
        duration: 1 + Math.random() * 3,
        delay: Math.random() * 4
      });
    }
    return arr;
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: 'radial-gradient(ellipse at center, #1a0f30 0%, #0a0815 60%, #050210 100%)',
        position: 'relative',
        padding: '40px 60px',
        overflow: 'hidden'
      }}
    >
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: '#ddddee',
            borderRadius: '50%',
            opacity: star.opacity,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`
          }}
        />
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: '700',
              color: '#fff',
              letterSpacing: '6px',
              marginBottom: '12px',
              textShadow: '0 0 40px #aa88ff88'
            }}
          >
            ✦ 星尘拍卖大厅 ✦
          </h1>
          <p style={{ fontSize: '16px', color: '#aaaacc', letterSpacing: '3px' }}>
            探索宇宙间独一无二的星尘样本
          </p>
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
            正在召唤星尘样本...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, 280px)',
              gap: '32px',
              justifyContent: 'center'
            }}
          >
            {samples.map((sample) => (
              <StarCard key={sample.id} sample={sample} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
