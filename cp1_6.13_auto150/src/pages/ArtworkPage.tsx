import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CharParticleGroup } from '../utils/textToParticles';
import { THEMES } from '../utils/themeColors';
import {
  CharGroup,
  createCharGroups,
  updateParticlePositions,
  updateColorTransitions,
  applyExplodeDirections,
  renderCanvas,
} from '../utils/particleEngine';

interface ArtworkData {
  id: string;
  name: string;
  author: string;
  chars: CharParticleGroup[];
  theme: string;
  createdAt: string;
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hour = d.getHours().toString().padStart(2, '0');
  const min = d.getMinutes().toString().padStart(2, '0');
  return `${year}年${month}月${day}日 ${hour}:${min}`;
}

function ArtworkPage() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const groupsRef = useRef<CharGroup[]>([]);
  const animFrameRef = useRef<number>(0);
  const mouseXRef = useRef(0);
  const mouseYRef = useRef(0);
  const isMouseOnCanvasRef = useRef(false);
  const colorTransitionStartRef = useRef(0);

  const [artwork, setArtwork] = useState<ArtworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!id) return;

    axios
      .get(`/api/artwork/${id}`)
      .then((res) => {
        setArtwork(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!artwork) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const groups = createCharGroups(artwork.chars, artwork.theme, true);
    groupsRef.current = groups;

    const now = performance.now();
    colorTransitionStartRef.current = now;

    for (const g of groups) {
      for (const p of g.particles) {
        p.colorTransitionStart = now;
      }
    }

    const animate = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const currentTime = performance.now();

      applyExplodeDirections(groupsRef.current, currentTime);

      updateParticlePositions(
        groupsRef.current,
        currentTime,
        mouseXRef.current,
        mouseYRef.current,
        isMouseOnCanvasRef.current
      );

      if (colorTransitionStartRef.current > 0) {
        updateColorTransitions(
          groupsRef.current,
          currentTime,
          colorTransitionStartRef.current
        );
      }

      const scaleFactor = isMobile ? 0.7 : 1;
      renderCanvas(
        ctx,
        groupsRef.current,
        currentTime,
        mouseXRef.current,
        mouseYRef.current,
        isMouseOnCanvasRef.current,
        scaleFactor
      );

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [artwork, isMobile]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseXRef.current = e.clientX - rect.left;
    mouseYRef.current = e.clientY - rect.top;
    isMouseOnCanvasRef.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isMouseOnCanvasRef.current = false;
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: '#fff',
          fontSize: '18px',
        }}
      >
        加载中...
      </div>
    );
  }

  if (notFound) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '20px',
        }}
      >
        <p style={{ color: '#888', fontSize: '24px', textAlign: 'center' }}>
          404 - 此作品已被删除或不存在
        </p>
        <Link
          to="/"
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            background: '#2a2a5acc',
            color: '#fff',
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a7a')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2a2a5acc')}
        >
          返回首页
        </Link>
      </div>
    );
  }

  const canvasWidth = isMobile ? '100%' : '90%';
  const canvasHeight = isMobile ? '50vh' : '70vh';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 0',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: canvasWidth,
          height: canvasHeight,
          border: '1px solid #1a3a5a',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </div>

      <div
        style={{
          marginTop: '20px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {artwork && (
          <>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#fff', margin: 0 }}>
              {artwork.name}
            </h2>
            <p style={{ fontSize: '14px', color: '#aaa', margin: 0 }}>
              作者: {artwork.author} | {formatDate(artwork.createdAt)}
            </p>
          </>
        )}
        <Link
          to="/"
          style={{
            marginTop: '8px',
            padding: '8px 20px',
            borderRadius: '8px',
            background: '#2a2a5acc',
            color: '#fff',
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#4a4a7a')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#2a2a5acc')}
        >
          返回创作
        </Link>
      </div>
    </div>
  );
}

export default ArtworkPage;
