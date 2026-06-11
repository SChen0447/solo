import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bottle, OceanState, SoundWave, Ripple, Spark } from './types';
import BottleComponent from './Bottle';

interface WaveLayer {
  y: number;
  wavelength: number;
  amplitude: number;
  speed: number;
  phase: number;
  color: string;
  opacity: number;
}

let socket: Socket | null = null;

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [oceanState, setOceanState] = useState<OceanState>({
    currentStrength: 0.5,
    windDirection: 45,
    windStrength: 0.3
  });
  const [topBottles, setTopBottles] = useState<Bottle[]>([]);
  const [clientId, setClientId] = useState<string>('');
  
  const [showRecordPanel, setShowRecordPanel] = useState(false);
  const [recordPosition, setRecordPosition] = useState({ x: 0, y: 0 });
  const [recordText, setRecordText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordType, setRecordType] = useState<'audio' | 'text'>('text');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const [selectedBottle, setSelectedBottle] = useState<Bottle | null>(null);
  const [showPlayPanel, setShowPlayPanel] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [showGlobalView, setShowGlobalView] = useState(false);
  const [globalSpectrum, setGlobalSpectrum] = useState<number[]>(Array(8).fill(0.5));
  
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [sparks, setSparks] = useState<Spark[]>([]);
  
  const [throwAnimation, setThrowAnimation] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    progress: number;
    content: string;
    type: 'audio' | 'text';
    color: string;
  } | null>(null);
  
  const waveLayersRef = useRef<WaveLayer[]>([]);
  const bottlesRef = useRef<Bottle[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    bottlesRef.current = bottles;
  }, [bottles]);

  useEffect(() => {
    ripplesRef.current = ripples;
  }, [ripples]);

  useEffect(() => {
    sparksRef.current = sparks;
  }, [sparks]);

  useEffect(() => {
    socket = io('http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    socket.on('initialState', (data: {
      bottles: Bottle[];
      oceanState: OceanState;
      topBottles: Bottle[];
      clientId: string;
    }) => {
      setBottles(data.bottles);
      setOceanState(data.oceanState);
      setTopBottles(data.topBottles);
      setClientId(data.clientId);
    });

    socket.on('oceanState', (data: {
      bottles: Bottle[];
      oceanState: OceanState;
      topBottles: Bottle[];
    }) => {
      setBottles(data.bottles);
      setTopBottles(data.topBottles);
    });

    socket.on('newBottle', (bottle: Bottle) => {
      setBottles(prev => {
        const newBottles = [...prev, bottle];
        return newBottles.slice(-20);
      });
    });

    socket.on('bottleUpdated', (bottle: Bottle) => {
      setBottles(prev => prev.map(b => b.id === bottle.id ? bottle : b));
      setSelectedBottle(prev => prev?.id === bottle.id ? bottle : prev);
    });

    socket.on('bottlePlayed', (data: { bottleId: string; playCount: number }) => {
      setBottles(prev => prev.map(b => 
        b.id === data.bottleId ? { ...b, playCount: data.playCount } : b
      ));
    });

    socket.on('oceanStateUpdated', (state: OceanState) => {
      setOceanState(state);
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  useEffect(() => {
    const layers: WaveLayer[] = [];
    const numLayers = 100;
    
    for (let i = 0; i < numLayers; i++) {
      const depth = i / numLayers;
      const wavelength = 50 + (120 - 50) * Math.random();
      const amplitude = 8 + (16 - 8) * Math.random();
      const hue = 200 + depth * 40;
      const lightness = 20 + depth * 50;
      
      layers.push({
        y: 50 + (i / numLayers) * (window.innerHeight - 100),
        wavelength,
        amplitude,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        color: `hsl(${hue}, 70%, ${lightness}%)`,
        opacity: 0.3 + depth * 0.4
      });
    }
    
    waveLayersRef.current = layers;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalSpectrum(prev => prev.map(() => 0.2 + Math.random() * 0.8));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const drawWaves = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#0b3d60');
    gradient.addColorStop(1, '#c8e6c9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    waveLayersRef.current.forEach((layer, index) => {
      ctx.beginPath();
      ctx.moveTo(0, layer.y);
      
      for (let x = 0; x <= width; x += 5) {
        const y = layer.y + 
          Math.sin(x / layer.wavelength + time * layer.speed + layer.phase) * layer.amplitude +
          Math.sin(x / (layer.wavelength * 0.6) + time * layer.speed * 0.7 + layer.phase * 1.3) * layer.amplitude * 0.4;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      
      ctx.fillStyle = layer.color;
      ctx.globalAlpha = layer.opacity * 0.4;
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 20; i++) {
      const foamX = (i * width / 20 + time * 20) % width;
      const foamY = height * 0.3 + Math.sin(time + i) * 20;
      const foamRadius = 30 + Math.sin(time * 2 + i) * 10;
      
      const foamGrad = ctx.createRadialGradient(foamX, foamY, 0, foamX, foamY, foamRadius);
      foamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      foamGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = foamGrad;
      ctx.beginPath();
      ctx.arc(foamX, foamY, foamRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  const drawRipples = useCallback((ctx: CanvasRenderingContext2D) => {
    ripplesRef.current.forEach(ripple => {
      const progress = ripple.radius / ripple.maxRadius;
      const alpha = ripple.opacity * (1 - progress);
      
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3 * (1 - progress * 0.5);
      ctx.stroke();
      ctx.globalAlpha = 1;
      
      const innerGrad = ctx.createRadialGradient(
        ripple.x, ripple.y, ripple.radius * 0.8,
        ripple.x, ripple.y, ripple.radius
      );
      innerGrad.addColorStop(0, 'transparent');
      innerGrad.addColorStop(1, ripple.color);
      ctx.fillStyle = innerGrad;
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }, []);

  const drawSparks = useCallback((ctx: CanvasRenderingContext2D) => {
    sparksRef.current.forEach(spark => {
      const alpha = spark.life / spark.maxLife;
      ctx.fillStyle = spark.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 3 * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      timeRef.current += deltaTime;
      
      drawWaves(ctx, canvas.width, canvas.height, timeRef.current);
      drawRipples(ctx);
      drawSparks(ctx);
      
      setRipples(prev => prev
        .map(r => ({
          ...r,
          radius: r.radius + deltaTime * 80
        }))
        .filter(r => r.radius < r.maxRadius)
      );
      
      setSparks(prev => prev
        .map(s => ({
          ...s,
          x: s.x + s.vx * deltaTime,
          y: s.y + s.vy * deltaTime,
          vy: s.vy + 200 * deltaTime,
          life: s.life - deltaTime
        }))
        .filter(s => s.life > 0)
      );
      
      checkCollisions();
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [drawWaves, drawRipples, drawSparks]);

  const checkCollisions = useCallback(() => {
    const currentBottles = bottlesRef.current;
    const newSparks: Spark[] = [];
    
    for (let i = 0; i < currentBottles.length; i++) {
      for (let j = i + 1; j < currentBottles.length; j++) {
        const b1 = currentBottles[i];
        const b2 = currentBottles[j];
        const dist = Math.sqrt((b1.x - b2.x) ** 2 + (b1.y - b2.y) ** 2);
        
        if (dist < 50 && Math.random() < 0.1) {
          const midX = (b1.x + b2.x) / 2;
          const midY = (b1.y + b2.y) / 2;
          
          for (let k = 0; k < 8; k++) {
            const angle = (k / 8) * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            newSparks.push({
              id: `spark-${Date.now()}-${i}-${j}-${k}`,
              x: midX,
              y: midY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 50,
              color: b1.color,
              life: 0.5 + Math.random() * 0.5,
              maxLife: 1
            });
          }
        }
      }
    }
    
    if (newSparks.length > 0) {
      setSparks(prev => [...prev, ...newSparks].slice(-100));
    }
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (showRecordPanel || showPlayPanel || showGlobalView) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    for (const bottle of bottles) {
      const dist = Math.sqrt((bottle.x - x) ** 2 + (bottle.y - y) ** 2);
      if (dist < 40) {
        handleBottleClick(bottle);
        return;
      }
    }
    
    setRecordPosition({ x, y });
    setShowRecordPanel(true);
    setRecordText('');
    setRecordType('text');
    setAudioBlob(null);
  };

  const handleBottleClick = (bottle: Bottle) => {
    setSelectedBottle(bottle);
    setShowPlayPanel(true);
    
    const newRipples: Ripple[] = [];
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        setRipples(prev => [...prev, {
          id: `ripple-${Date.now()}-${i}`,
          x: bottle.x,
          y: bottle.y,
          radius: 0,
          maxRadius: 150,
          color: bottle.color,
          opacity: 0.8,
          createdAt: Date.now()
        }]);
      }, i * 100);
    }
    
    socket?.emit('playBottle', { bottleId: bottle.id });
  };

  const handleThrowBottle = () => {
    const content = recordType === 'text' ? recordText : 'audio_message';
    if (!content.trim()) return;
    
    const hue = Math.floor(Math.random() * 360);
    const color = `hsl(${hue}, 80%, 60%)`;
    
    setThrowAnimation({
      startX: recordPosition.x,
      startY: recordPosition.y,
      endX: recordPosition.x + (Math.random() - 0.5) * 200,
      endY: recordPosition.y + 50 + Math.random() * 100,
      progress: 0,
      content,
      type: recordType,
      color
    });
    
    setShowRecordPanel(false);
    
    setTimeout(() => {
      socket?.emit('throwBottle', {
        x: recordPosition.x,
        y: recordPosition.y,
        content,
        type: recordType
      });
      
      setRipples(prev => [...prev, {
        id: `ripple-drop-${Date.now()}`,
        x: recordPosition.x,
        y: recordPosition.y,
        radius: 0,
        maxRadius: 100,
        color: color,
        opacity: 0.6,
        createdAt: Date.now()
      }]);
      
      setThrowAnimation(null);
    }, 1000);
  };

  const handleReply = () => {
    setShowPlayPanel(false);
    setShowRecordPanel(true);
    setRecordPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setRecordText('');
    setRecordType('text');
  };

  const handleSubmitReply = () => {
    if (!selectedBottle || !recordText.trim()) return;
    
    socket?.emit('replyBottle', {
      bottleId: selectedBottle.id,
      content: recordText,
      type: recordType
    });
    
    setShowRecordPanel(false);
    setShowPlayPanel(true);
    setRecordText('');
  };

  const handleCurrentStrengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const strength = parseFloat(e.target.value);
    setOceanState(prev => ({ ...prev, currentStrength: strength }));
    socket?.emit('updateOcean', { currentStrength: strength });
  };

  const handleWindDirectionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const direction = parseFloat(e.target.value);
    setOceanState(prev => ({ ...prev, windDirection: direction }));
    socket?.emit('updateOcean', { windDirection: direction });
  };

  const startRecording = () => {
    setIsRecording(true);
  };

  const stopRecording = () => {
    setIsRecording(false);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  const spectrumColors = [
    '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1',
    '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3'
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: showGlobalView ? 'default' : 'pointer'
        }}
      />
      
      {bottles.map(bottle => (
        <BottleComponent
          key={bottle.id}
          bottle={bottle}
          onClick={() => handleBottleClick(bottle)}
        />
      ))}
      
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setShowGlobalView(true)}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          padding: '12px 24px',
          background: 'rgba(11, 61, 96, 0.9)',
          color: '#fff',
          border: '2px solid rgba(200, 230, 201, 0.5)',
          borderRadius: '25px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          backdropFilter: 'blur(10px)',
          zIndex: 100
        }}
      >
        🌊 全球听海
      </motion.button>
      
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: '200px',
          padding: '16px',
          background: 'rgba(11, 61, 96, 0.85)',
          borderRadius: '12px',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(200, 230, 201, 0.3)',
          zIndex: 100
        }}
      >
        <h3 style={{ fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>
          🏆 声波链排行榜
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {topBottles.map((bottle, index) => (
            <div key={bottle.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '20px', fontSize: '12px' }}>{index + 1}.</span>
              <div
                style={{
                  width: '20px',
                  height: `${Math.min(bottle.soundWaves.length * 15, 60)}px`,
                  background: `linear-gradient(to top, ${bottle.color}, ${bottle.color}88)`,
                  borderRadius: '3px',
                  minHeight: '10px',
                  transition: 'height 0.3s ease'
                }}
              />
              <span style={{ fontSize: '11px', opacity: 0.8 }}>
                {bottle.soundWaves.length} 条回复
              </span>
            </div>
          ))}
          {topBottles.length === 0 && (
            <span style={{ fontSize: '12px', opacity: 0.6, textAlign: 'center' }}>
              暂无数据
            </span>
          )}
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          padding: '16px',
          background: 'rgba(11, 61, 96, 0.85)',
          borderRadius: '12px',
          color: '#fff',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(200, 230, 201, 0.3)',
          zIndex: 100,
          width: '220px'
        }}
      >
        <h4 style={{ fontSize: '13px', marginBottom: '12px' }}>🌊 洋流控制</h4>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '11px', opacity: 0.8, display: 'block', marginBottom: '4px' }}>
            洋流强度: {Math.round(oceanState.currentStrength * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={oceanState.currentStrength}
            onChange={handleCurrentStrengthChange}
            style={{ width: '100%' }}
          />
        </div>
        
        <div>
          <label style={{ fontSize: '11px', opacity: 0.8, display: 'block', marginBottom: '4px' }}>
            风向: {Math.round(oceanState.windDirection)}°
          </label>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              border: '2px solid rgba(200, 230, 201, 0.5)',
              position: 'relative'
            }}>
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '20px',
                  height: '2px',
                  background: '#c8e6c9',
                  transformOrigin: 'left center',
                  transform: `translateY(-50%) rotate(${oceanState.windDirection}deg)`,
                  borderRadius: '1px'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid #c8e6c9',
                  borderTop: '4px solid transparent',
                  borderBottom: '4px solid transparent',
                  transformOrigin: 'left center',
                  transform: `translate(-2px, -50%) rotate(${oceanState.windDirection}deg)`,
                }}
              />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={oceanState.windDirection}
            onChange={handleWindDirectionChange}
            style={{ width: '100%', marginTop: '4px' }}
          />
        </div>
      </motion.div>
      
      <AnimatePresence>
        {showRecordPanel && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '400px',
              padding: '30px',
              background: '#f5f0e0',
              borderRadius: '8px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              border: '8px solid #8B4513',
              borderImage: 'linear-gradient(135deg, #a0522d, #8b4513, #654321, #8b4513) 1',
              zIndex: 200
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-4px',
              left: '-4px',
              right: '-4px',
              bottom: '-4px',
              border: '2px solid #654321',
              borderRadius: '10px',
              pointerEvents: 'none',
              opacity: 0.5
            }} />
            
            <h2 style={{
              textAlign: 'center',
              color: '#5a3d2b',
              fontSize: '20px',
              marginBottom: '20px',
              fontFamily: 'serif'
            }}>
              {selectedBottle ? '回复漂流瓶' : '投放漂流瓶'}
            </h2>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setRecordType('text')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  background: recordType === 'text' ? '#8B4513' : '#d4c4a8',
                  color: recordType === 'text' ? '#fff' : '#5a3d2b',
                  fontSize: '13px'
                }}
              >
                ✏️ 文字
              </button>
              <button
                onClick={() => setRecordType('audio')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  background: recordType === 'audio' ? '#8B4513' : '#d4c4a8',
                  color: recordType === 'audio' ? '#fff' : '#5a3d2b',
                  fontSize: '13px'
                }}
              >
                🎤 语音
              </button>
            </div>
            
            {recordType === 'text' ? (
              <textarea
                value={recordText}
                onChange={(e) => setRecordText(e.target.value)}
                placeholder="写下你想传递的话..."
                style={{
                  width: '100%',
                  height: '120px',
                  padding: '12px',
                  border: '2px solid #d4c4a8',
                  borderRadius: '6px',
                  resize: 'none',
                  fontFamily: 'serif',
                  fontSize: '14px',
                  background: '#faf6eb',
                  color: '#5a3d2b',
                  outline: 'none'
                }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <motion.button
                  onClick={isRecording ? stopRecording : startRecording}
                  animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ repeat: isRecording ? Infinity : 0, duration: 1 }}
                  style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isRecording ? '#e74c3c' : '#8B4513',
                    color: '#fff',
                    fontSize: '20px',
                    cursor: 'pointer',
                    boxShadow: isRecording ? '0 0 20px rgba(231, 76, 60, 0.5)' : 'none'
                  }}
                >
                  {isRecording ? '⏹' : '🎤'}
                </motion.button>
                <p style={{ marginTop: '10px', color: '#5a3d2b', fontSize: '13px' }}>
                  {isRecording ? '正在录制...' : '点击开始录制'}
                </p>
                {isRecording && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', marginTop: '10px' }}>
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [10, 30, 10] }}
                        transition={{
                          repeat: Infinity,
                          duration: 0.5,
                          delay: i * 0.1,
                          ease: 'easeInOut'
                        }}
                        style={{
                          width: '4px',
                          background: '#8B4513',
                          borderRadius: '2px'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={() => {
                  setShowRecordPanel(false);
                  setSelectedBottle(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '2px solid #d4c4a8',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: '#5a3d2b',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                取消
              </button>
              <button
                onClick={selectedBottle ? handleSubmitReply : handleThrowBottle}
                disabled={recordType === 'text' && !recordText.trim()}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#8B4513',
                  color: '#fff',
                  cursor: recordType === 'text' && !recordText.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: recordType === 'text' && !recordText.trim() ? 0.5 : 1
                }}
              >
                {selectedBottle ? '发送回复' : '投放瓶子'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showPlayPanel && selectedBottle && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '380px',
              padding: '25px',
              background: 'rgba(11, 61, 96, 0.95)',
              borderRadius: '16px',
              color: '#fff',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(200, 230, 201, 0.3)',
              zIndex: 200
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>🌊 漂流瓶信息</h3>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>
                投放位置: ({Math.round(selectedBottle.launchPosition.x)}, {Math.round(selectedBottle.launchPosition.y)})
              </p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>
                投放时间: {formatTime(selectedBottle.createdAt)}
              </p>
              <p style={{ fontSize: '12px', opacity: 0.7 }}>
                播放次数: {selectedBottle.playCount}
              </p>
            </div>
            
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '15px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(200, 230, 201, 0.3), transparent)',
                animation: 'pulse 2s infinite'
              }} />
              
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', height: '60px' }}>
                {selectedBottle.soundWaves[0]?.frequencies.map((freq, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: isPlaying ? [20, freq * 50 + 10, 20] : 20 }}
                    transition={{
                      repeat: isPlaying ? Infinity : 0,
                      duration: 0.5,
                      delay: i * 0.05,
                      ease: 'easeInOut'
                    }}
                    style={{
                      width: '8px',
                      background: spectrumColors[i % spectrumColors.length],
                      borderRadius: '4px',
                      minHeight: '20px'
                    }}
                  />
                ))}
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '13px' }}>
                {selectedBottle.soundWaves[0]?.type === 'text' ? (
                  <p style={{ fontStyle: 'italic', opacity: 0.9 }}>
                    "{selectedBottle.soundWaves[0]?.content}"
                  </p>
                ) : (
                  <p style={{ opacity: 0.7 }}>🔊 语音消息</p>
                )}
              </div>
            </div>
            
            {selectedBottle.soundWaves.length > 1 && (
              <div style={{ marginBottom: '15px' }}>
                <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>
                  🔗 声波链 ({selectedBottle.soundWaves.length} 条)
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedBottle.soundWaves.slice(1).map((wave, i) => (
                    <div
                      key={wave.id}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(200, 230, 201, 0.2)',
                        borderRadius: '10px',
                        fontSize: '11px'
                      }}
                    >
                      回复 #{i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowPlayPanel(false);
                  setSelectedBottle(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid rgba(200, 230, 201, 0.5)',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                关闭
              </button>
              <button
                onClick={handleReply}
                style={{
                  flex: 1,
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #48dbfb, #0abde3)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold'
                }}
              >
                💬 回复
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showGlobalView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, #0b3d60 0%, #1a5276 50%, #0b3d60 100%)',
              zIndex: 300,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <motion.h1
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{
                color: '#c8e6c9',
                fontSize: '36px',
                marginBottom: '20px',
                textShadow: '0 0 30px rgba(200, 230, 201, 0.5)'
              }}
            >
              🌊 全球听海
            </motion.h1>
            
            <motion.p
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={{
                color: '#c8e6c9',
                opacity: 0.7,
                marginBottom: '40px',
                fontSize: '14px'
              }}
            >
              所有漂流瓶声波的平均能量频谱
            </motion.p>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '20px',
                height: '300px',
                padding: '40px',
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '20px',
                border: '1px solid rgba(200, 230, 201, 0.2)'
              }}
            >
              {globalSpectrum.map((value, i) => {
                const freqLabel = Math.round((i + 1) * 22 / 8 * 10) / 10;
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <motion.div
                      animate={{ height: value * 250 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      style={{
                        width: '40px',
                        background: `linear-gradient(to top, ${spectrumColors[i]}, ${spectrumColors[i]}88)`,
                        borderRadius: '8px 8px 0 0',
                        boxShadow: `0 0 20px ${spectrumColors[i]}66`
                      }}
                    />
                    <span style={{ color: '#c8e6c9', fontSize: '11px', opacity: 0.7 }}>
                      {freqLabel}kHz
                    </span>
                  </div>
                );
              })}
            </motion.div>
            
            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setShowGlobalView(false)}
              style={{
                marginTop: '50px',
                padding: '15px 40px',
                background: 'linear-gradient(135deg, #48dbfb, #0abde3)',
                color: '#fff',
                border: 'none',
                borderRadius: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                boxShadow: '0 5px 20px rgba(72, 219, 251, 0.4)'
              }}
            >
              🌊 录制你的海
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {throwAnimation && (
        <motion.div
          initial={{ scale: 1 }}
          animate={{
            x: [0, throwAnimation.endX - throwAnimation.startX],
            y: [0, throwAnimation.endY - throwAnimation.startY - 100, throwAnimation.endY - throwAnimation.startY],
            rotate: [0, 360],
            scale: [1, 1.2, 0.8]
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            left: throwAnimation.startX,
            top: throwAnimation.startY,
            zIndex: 150,
            pointerEvents: 'none'
          }}
        >
          <svg width="60" height="30" viewBox="0 0 60 30">
            <defs>
              <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="50%" stopColor="rgba(200,230,201,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.4)" />
              </linearGradient>
            </defs>
            <ellipse cx="30" cy="15" rx="28" ry="12" fill="url(#bottleGrad)" stroke={throwAnimation.color} strokeWidth="2" />
            <rect x="25" y="2" width="10" height="6" rx="2" fill={throwAnimation.color} opacity="0.8" />
            <path
              d="M 10 15 Q 20 5, 30 15 T 50 15"
              stroke={throwAnimation.color}
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </motion.div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default App;
