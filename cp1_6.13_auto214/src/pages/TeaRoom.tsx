import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine, SpiceConfig } from '../utils/audioEngine';
import {
  createAromaParticles,
  updateAromaParticles,
  drawAromaParticles,
  AromaSystem,
  createRipple,
  updateRipple,
  drawRipple,
  Ripple,
  drawInkPainting,
  PaintingStyle,
  PAINTING_STYLES,
  PAINTING_POEMS,
  SPICE_COLORS,
  TEA_COLORS,
} from '../utils/canvasEffects';

interface User {
  id: string;
  username: string;
}

interface Friend {
  id: string;
  username: string;
  color: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  selectedTeapot: number | null;
}

interface Teapot {
  id: number;
  color: string;
  size: number;
  angle: number;
}

interface TeaState {
  teaType: 'green' | 'black' | 'flower';
  temperature: number;
  steepTime: number;
  spices: SpiceConfig;
}

const TEAPOT_COLORS = [
  '#c9a96e', '#d4a373', '#b5838d', '#e5989b',
  '#ffb4a2', '#cd8d7b', '#a5a58d', '#6b705c',
];

const TEA_INFO = {
  green: { name: '绿茶', color: '#8bc34a', desc: '清新淡雅，回味悠长' },
  black: { name: '红茶', color: '#d84315', desc: '醇厚浓郁，温暖人心' },
  flower: { name: '花茶', color: '#e91e63', desc: '花香馥郁，沁人心脾' },
};

const SPICE_INFO = {
  mint: { name: '薄荷', color: '#4caf50' },
  cinnamon: { name: '肉桂', color: '#ff8f00' },
  rose: { name: '玫瑰', color: '#f48fb1' },
  ginger: { name: '姜', color: '#ff6f00' },
  lemon: { name: '柠檬', color: '#ffee58' },
  honey: { name: '蜂蜜', color: '#ffd54f' },
};

function generateTeapots(): Teapot[] {
  const teapots: Teapot[] = [];
  for (let i = 0; i < 6; i++) {
    teapots.push({
      id: i,
      color: TEAPOT_COLORS[Math.floor(Math.random() * TEAPOT_COLORS.length)],
      size: 30 + Math.random() * 15,
      angle: (i / 6) * Math.PI * 2,
    });
  }
  return teapots;
}

function TeaRoom() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showRoomPanel, setShowRoomPanel] = useState(false);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [teapots] = useState<Teapot[]>(generateTeapots);

  const [selectedTeapot, setSelectedTeapot] = useState<number | null>(null);
  const [showBrewPanel, setShowBrewPanel] = useState(false);

  const [teaState, setTeaState] = useState<TeaState>({
    teaType: 'green',
    temperature: 85,
    steepTime: 60,
    spices: { mint: 0, cinnamon: 0, rose: 0, ginger: 0, lemon: 0, honey: 0 },
  });

  const [brewingTeapot, setBrewingTeapot] = useState<number | null>(null);
  const [teaFilled, setTeaFilled] = useState<Map<number, boolean>>(new Map());
  const [selectedPainting, setSelectedPainting] = useState<number | null>(null);
  const [paintingStyles, setPaintingStyles] = useState<PaintingStyle[]>(
    () => PAINTING_STYLES.sort(() => Math.random() - 0.5).slice(0, 6)
  );

  const aromaCanvasRef = useRef<HTMLCanvasElement>(null);
  const cupCanvasRef = useRef<HTMLCanvasElement>(null);
  const paintingCanvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);
  const aromaSystemsRef = useRef<Map<number, AromaSystem>>(new Map());
  const ripplesRef = useRef<Map<number, Ripple>>(new Map());
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const rippleTimerRef = useRef<Map<number, number>>(new Map());

  const [hoveredFriend, setHoveredFriend] = useState<string | null>(null);
  const [activeSpiceButton, setActiveSpiceButton] = useState<string | null>(null);
  const [paintingTransition, setPaintingTransition] = useState<Map<number, number>>(new Map());
  const [nextPaintingStyles, setNextPaintingStyles] = useState<PaintingStyle[]>([]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleRegister = async () => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data);
      setAuthError('');
      audioEngine.init();
      audioEngine.startBGM();
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUser(data);
      setAuthError('');
      audioEngine.init();
      audioEngine.startBGM();
    } catch (e: any) {
      setAuthError(e.message);
    }
  };

  const createRoom = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, username: user.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoomCode(data.code);
      setFriends([data.user]);
    } catch (e: any) {
      console.error(e);
    }
  };

  const joinRoom = async () => {
    if (!user || !joinCode) return;
    try {
      const res = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode, userId: user.id, username: user.username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoomCode(data.code);
      setFriends(data.users);
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!roomCode) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/users`);
        const data = await res.json();
        if (res.ok) {
          setFriends(data.users);
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    const moveFriends = () => {
      setFriends(prev => prev.map(f => {
        let newAngle = f.angle + f.speed * 0.01;
        const tableRadius = 120;
        const x = Math.cos(newAngle) * tableRadius;
        const y = Math.sin(newAngle) * tableRadius;
        return { ...f, angle: newAngle, x, y };
      }));
    };
    const interval = setInterval(moveFriends, 50);
    return () => clearInterval(interval);
  }, [roomCode]);

  const handleTeapotClick = (index: number) => {
    setSelectedTeapot(index);
    setShowBrewPanel(true);
    setTeaState({
      teaType: 'green',
      temperature: 85,
      steepTime: 60,
      spices: { mint: 0, cinnamon: 0, rose: 0, ginger: 0, lemon: 0, honey: 0 },
    });
    audioEngine.resume();
  };

  const addSpice = (spice: keyof SpiceConfig) => {
    setTeaState(prev => {
      const current = prev.spices[spice];
      if (current >= 3) return prev;
      setActiveSpiceButton(spice);
      setTimeout(() => setActiveSpiceButton(null), 500);
      return {
        ...prev,
        spices: { ...prev.spices, [spice]: current + 1 },
      };
    });
  };

  const removeSpice = (spice: keyof SpiceConfig) => {
    setTeaState(prev => {
      const current = prev.spices[spice];
      if (current <= 0) return prev;
      return {
        ...prev,
        spices: { ...prev.spices, [spice]: current - 1 },
      };
    });
  };

  const handleBrew = () => {
    if (selectedTeapot === null) return;
    setShowBrewPanel(false);
    setBrewingTeapot(selectedTeapot);

    const teaColor = TEA_COLORS[teaState.teaType];
    const spiceColors: string[] = [];
    (Object.keys(teaState.spices) as (keyof SpiceConfig)[]).forEach(spice => {
      for (let i = 0; i < teaState.spices[spice]; i++) {
        spiceColors.push(SPICE_COLORS[spice]);
      }
    });

    const canvas = aromaCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const tableRadius = 100;
      const x = centerX + Math.cos(teapots[selectedTeapot].angle) * tableRadius;
      const y = centerY + Math.sin(teapots[selectedTeapot].angle) * tableRadius - 20;

      const system = createAromaParticles(x, y, teaColor, spiceColors);
      aromaSystemsRef.current.set(selectedTeapot, system);
    }

    audioEngine.playBrewSound();
    audioEngine.playTeaMelody(teaColor, teaState.spices);

    (Object.keys(teaState.spices) as (keyof SpiceConfig)[]).forEach(spice => {
      if (teaState.spices[spice] > 0) {
        audioEngine.addSpiceChord(spice, teaState.spices[spice]);
      }
    });

    setTimeout(() => {
      setTeaFilled(prev => {
        const next = new Map(prev);
        next.set(selectedTeapot!, true);
        return next;
      });
      setBrewingTeapot(null);

      if (!rippleTimerRef.current.has(selectedTeapot!)) {
        rippleTimerRef.current.set(selectedTeapot!, window.setInterval(() => {
          const canvas = cupCanvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tableRadius = 100;
            const x = centerX + Math.cos(teapots[selectedTeapot!].angle) * tableRadius;
            const y = centerY + Math.sin(teapots[selectedTeapot!].angle) * tableRadius + 5;
            ripplesRef.current.set(selectedTeapot!, createRipple(x, y, 25));
          }
        }, 3000));
      }
    }, 2000);
  };

  useEffect(() => {
    const canvas = aromaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (time: number) => {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      aromaSystemsRef.current.forEach((system, id) => {
        if (system.active) {
          updateAromaParticles(system, deltaTime);
          drawAromaParticles(ctx, system);
        }
      });

      ripplesRef.current.forEach((ripple, id) => {
        const teaColor = TEA_COLORS[teaState.teaType];
        const active = updateRipple(ripple, deltaTime);
        if (active) {
          drawRipple(ctx, ripple, teaColor);
        } else {
          ripplesRef.current.delete(id);
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [teaState.teaType]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNextPaintingStyles(
        PAINTING_STYLES.sort(() => Math.random() - 0.5).slice(0, 6)
      );
      const transitions = new Map<number, number>();
      for (let i = 0; i < 6; i++) {
        transitions.set(i, 0);
      }
      setPaintingTransition(transitions);
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const canvases = paintingCanvasesRef.current;
    let startTime = 0;
    let rafId: number;

    const paint = (time: number) => {
      if (!startTime) startTime = time;
      const elapsed = time - startTime;

      canvases.forEach((canvas, idx) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const currentStyle = paintingStyles[idx];
        const nextStyle = nextPaintingStyles[idx] || currentStyle;
        const transitionProgress = paintingTransition.get(idx) || 0;

        if (transitionProgress > 0 && transitionProgress < 1) {
          ctx.globalAlpha = 1 - transitionProgress;
          drawInkPainting(ctx, canvas.width, canvas.height, currentStyle, time);
          ctx.globalAlpha = transitionProgress;
          drawInkPainting(ctx, canvas.width, canvas.height, nextStyle, time);
          ctx.globalAlpha = 1;
        } else {
          drawInkPainting(ctx, canvas.width, canvas.height, currentStyle, time);
        }
      });

      rafId = requestAnimationFrame(paint);
    };

    rafId = requestAnimationFrame(paint);

    return () => cancelAnimationFrame(rafId);
  }, [paintingStyles, nextPaintingStyles, paintingTransition]);

  useEffect(() => {
    if (paintingTransition.size === 0) return;

    const duration = 1500;
    const startTime = Date.now();

    const animateTransition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const newTransitions = new Map<number, number>();
      for (let i = 0; i < 6; i++) {
        newTransitions.set(i, progress);
      }
      setPaintingTransition(newTransitions);

      if (progress < 1) {
        requestAnimationFrame(animateTransition);
      } else {
        setPaintingStyles(nextPaintingStyles.length > 0 ? nextPaintingStyles : paintingStyles);
        setPaintingTransition(new Map());
      }
    };

    requestAnimationFrame(animateTransition);
  }, [nextPaintingStyles]);

  const getTeaLiquidColor = () => {
    const baseColor = TEA_COLORS[teaState.teaType];
    return baseColor;
  };

  if (!user) {
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <h1 style={styles.authTitle}>星雾·记忆茶屋</h1>
          <p style={styles.authSubtitle}>一杯清茶，一段记忆</p>
          <div style={styles.authTabs}>
            <button
              style={{ ...styles.authTab, ...(authMode === 'login' ? styles.authTabActive : {}) }}
              onClick={() => setAuthMode('login')}
            >
              登录
            </button>
            <button
              style={{ ...styles.authTab, ...(authMode === 'register' ? styles.authTabActive : {}) }}
              onClick={() => setAuthMode('register')}
            >
              注册
            </button>
          </div>
          <div style={styles.authForm}>
            <input
              style={styles.authInput}
              type="text"
              placeholder="用户名"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
            <input
              style={styles.authInput}
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {authError && <p style={styles.authError}>{authError}</p>}
            <button
              style={styles.authButton}
              onClick={authMode === 'login' ? handleLogin : handleRegister}
            >
              {authMode === 'login' ? '进入茶屋' : '注册账户'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.username}>欢迎，{user.username}</span>
        </div>
        <div style={styles.headerRight}>
          {roomCode ? (
            <span style={styles.roomCode}>房间号：{roomCode}</span>
          ) : (
            <button style={styles.roomButton} onClick={() => setShowRoomPanel(true)}>
              邀请好友
            </button>
          )}
        </div>
      </div>

      <div style={styles.teaRoomWrapper}>
        <div style={{ ...styles.teaRoom, ...(isMobile ? styles.teaRoomMobile : {}) }}>
          <canvas
            ref={aromaCanvasRef}
            width={600}
            height={600}
            style={styles.aromaCanvas}
          />
          <canvas
            ref={cupCanvasRef}
            width={600}
            height={600}
            style={styles.cupCanvas}
          />

          <div style={styles.table}>
            <div style={styles.tableSurface}>
              <div style={styles.tableWoodGrain}></div>
            </div>
          </div>

          {teapots.map((teapot, idx) => (
            <div
              key={teapot.id}
              style={{
                ...styles.teapot,
                width: teapot.size,
                height: 40,
                left: `calc(50% + ${Math.cos(teapot.angle) * 100}px - ${teapot.size / 2}px)`,
                top: `calc(50% + ${Math.sin(teapot.angle) * 100}px - 20px)`,
                backgroundColor: teapot.color,
                boxShadow: `0 4px 8px rgba(0,0,0,0.3), inset 0 -5px 10px rgba(0,0,0,0.2)`,
              }}
              onClick={() => handleTeapotClick(idx)}
              className="teapot"
            >
              <div style={{ ...styles.teapotLid, backgroundColor: teapot.color }}></div>
              <div style={{ ...styles.teapotSpout, borderLeftColor: teapot.color }}></div>
              <div style={{ ...styles.teapotHandle, borderColor: teapot.color }}></div>
              {teaFilled.get(idx) && (
                <div
                  style={{
                    ...styles.teaCup,
                    backgroundColor: getTeaLiquidColor(),
                    opacity: 0.8,
                  }}
                ></div>
              )}
            </div>
          ))}

          {friends.map(friend => (
            <div
              key={friend.id}
              style={{
                ...styles.friendPoint,
                backgroundColor: friend.color,
                left: `calc(50% + ${friend.x}px - 6px)`,
                top: `calc(50% + ${friend.y}px - 6px)`,
                boxShadow: `0 0 10px ${friend.color}`,
              }}
              onMouseEnter={() => setHoveredFriend(friend.id)}
              onMouseLeave={() => setHoveredFriend(null)}
            >
              {hoveredFriend === friend.id && (
                <div style={styles.friendTooltip}>{friend.username}</div>
              )}
            </div>
          ))}

          {[0, 1, 2, 3, 4, 5].map(idx => {
            const angle = (idx / 6) * Math.PI * 2 - Math.PI / 2;
            const radius = isMobile ? 180 : 220;
            return (
              <div
                key={`painting-${idx}`}
                style={{
                  ...styles.painting,
                  left: `calc(50% + ${Math.cos(angle) * radius}px - 60px)`,
                  top: `calc(50% + ${Math.sin(angle) * radius}px - 80px)`,
                }}
                onClick={() => setSelectedPainting(idx)}
              >
                <canvas
                  ref={el => paintingCanvasesRef.current[idx] = el}
                  width={120}
                  height={160}
                  style={styles.paintingCanvas}
                />
                <div style={styles.paintingFrame}></div>
              </div>
            );
          })}
        </div>
      </div>

      {showBrewPanel && selectedTeapot !== null && (
        <div style={{ ...styles.brewPanelOverlay, ...(isMobile ? styles.brewPanelMobile : {}) }}>
          <div style={styles.brewPanel}>
            <h2 style={styles.brewTitle}>调制茶饮</h2>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>选择茶叶</h3>
              <div style={styles.teaOptions}>
                {(['green', 'black', 'flower'] as const).map(type => (
                  <div
                    key={type}
                    style={{
                      ...styles.teaOption,
                      ...(teaState.teaType === type ? styles.teaOptionActive : {}),
                      borderColor: TEA_INFO[type].color,
                    }}
                    onClick={() => setTeaState(prev => ({ ...prev, teaType: type }))}
                  >
                    <div style={{ ...styles.teaColorDot, backgroundColor: TEA_INFO[type].color }}></div>
                    <span style={styles.teaName}>{TEA_INFO[type].name}</span>
                    <span style={styles.teaDesc}>{TEA_INFO[type].desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>水温：{teaState.temperature}℃</h3>
              <input
                type="range"
                min="60"
                max="100"
                value={teaState.temperature}
                onChange={e => setTeaState(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span>60℃</span>
                <span>100℃</span>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>浸泡时间：{teaState.steepTime}秒</h3>
              <input
                type="range"
                min="30"
                max="120"
                step="5"
                value={teaState.steepTime}
                onChange={e => setTeaState(prev => ({ ...prev, steepTime: Number(e.target.value) }))}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span>30秒</span>
                <span>120秒</span>
              </div>
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>添加香料</h3>
              <div style={styles.spiceGrid}>
                {(Object.keys(SPICE_INFO) as (keyof typeof SPICE_INFO)[]).map(spice => (
                  <div
                    key={spice}
                    style={{
                      ...styles.spiceButton,
                      backgroundColor: SPICE_INFO[spice].color + '40',
                      borderColor: SPICE_INFO[spice].color,
                      ...(activeSpiceButton === spice ? styles.spiceButtonActive : {}),
                      boxShadow: activeSpiceButton === spice
                        ? `0 0 20px ${SPICE_INFO[spice].color}, 0 0 40px ${SPICE_INFO[spice].color}40`
                        : '0 4px 8px rgba(0,0,0,0.2)',
                    }}
                    onClick={() => addSpice(spice)}
                    onContextMenu={e => { e.preventDefault(); removeSpice(spice); }}
                  >
                    <span style={styles.spiceName}>{SPICE_INFO[spice].name}</span>
                    <span style={styles.spiceCount}>×{teaState.spices[spice]}</span>
                  </div>
                ))}
              </div>
              <p style={styles.spiceHint}>点击添加，右键减少（每种最多3份）</p>
            </div>

            <div style={styles.brewActions}>
              <button
                style={styles.cancelButton}
                onClick={() => setShowBrewPanel(false)}
              >
                取消
              </button>
              <button style={styles.brewButton} onClick={handleBrew}>
                冲泡
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPainting !== null && (
        <div
          style={styles.paintingModal}
          onClick={() => setSelectedPainting(null)}
        >
          <div
            style={styles.enlargedPainting}
            onClick={e => e.stopPropagation()}
          >
            <canvas
              width={360}
              height={480}
              ref={el => {
                if (el) {
                  const ctx = el.getContext('2d');
                  if (ctx) {
                    drawInkPainting(ctx, 360, 480, paintingStyles[selectedPainting], Date.now());
                  }
                }
              }}
              style={styles.enlargedCanvas}
            />
            <div style={styles.poemText}>
              {PAINTING_POEMS[paintingStyles[selectedPainting]]}
            </div>
          </div>
        </div>
      )}

      {showRoomPanel && (
        <div style={styles.roomModal} onClick={() => setShowRoomPanel(false)}>
          <div style={styles.roomPanel} onClick={e => e.stopPropagation()}>
            <h2 style={styles.roomPanelTitle}>邀请好友</h2>
            {!roomCode ? (
              <>
                <button style={styles.roomButton} onClick={createRoom}>
                  创建房间
                </button>
                <div style={styles.roomDivider}>或</div>
                <input
                  style={styles.roomInput}
                  type="text"
                  placeholder="输入房间号"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <button style={styles.roomButton} onClick={joinRoom}>
                  加入房间
                </button>
              </>
            ) : (
              <div style={styles.roomCodeDisplay}>
                <p>房间号：</p>
                <div style={styles.roomCodeBig}>{roomCode}</div>
                <p style={styles.roomHint}>将此房间号分享给好友，最多可邀请3位好友</p>
              </div>
            )}
            <button style={styles.closeButton} onClick={() => setShowRoomPanel(false)}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100vh',
    background: 'radial-gradient(ellipse at center, #4a2c1a 0%, #1a0e08 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    overflow: 'hidden',
  },
  header: {
    width: '100%',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxSizing: 'border-box',
  },
  headerLeft: {},
  username: {
    color: '#d4a373',
    fontSize: '18px',
  },
  headerRight: {},
  roomCode: {
    color: '#d4a373',
    fontSize: '16px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: '8px 16px',
    borderRadius: '4px',
  },
  roomButton: {
    backgroundColor: '#a67c52',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
  },
  teaRoomWrapper: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  teaRoom: {
    position: 'relative',
    width: '70%',
    minWidth: '600px',
    height: '90%',
    minHeight: '700px',
    borderRadius: '50%',
    background: 'radial-gradient(ellipse at center, #3b2a1a 0%, #2d1b0e 70%, #1a0e08 100%)',
    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5), 0 0 50px rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teaRoomMobile: {
    width: '85%',
    minWidth: 'auto',
    height: '85%',
    minHeight: 'auto',
    aspectRatio: '1',
  },
  table: {
    position: 'absolute',
    width: '200px',
    height: '30px',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 1,
  },
  tableSurface: {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    background: 'linear-gradient(145deg, #8b6f47 0%, #6b4423 50%, #5d3a1a 100%)',
    boxShadow: '0 8px 16px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
    position: 'relative',
    overflow: 'hidden',
  },
  tableWoodGrain: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 20px)',
    borderRadius: '50%',
  },
  teapot: {
    position: 'absolute',
    borderRadius: '50% 50% 45% 45%',
    cursor: 'pointer',
    zIndex: 2,
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  },
  teapotLid: {
    position: 'absolute',
    top: '-8px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '60%',
    height: '12px',
    borderRadius: '50% 50% 0 0',
    filter: 'brightness(1.1)',
  },
  teapotSpout: {
    position: 'absolute',
    right: '-12px',
    top: '35%',
    width: 0,
    height: 0,
    borderTop: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderLeft: '14px solid',
    transform: 'rotate(-10deg)',
  },
  teapotHandle: {
    position: 'absolute',
    left: '-10px',
    top: '25%',
    width: '12px',
    height: '20px',
    border: '3px solid',
    borderRadius: '50%',
    borderRight: 'none',
  },
  teaCup: {
    position: 'absolute',
    bottom: '-15px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '70%',
    height: '10px',
    borderRadius: '0 0 50% 50%',
    transition: 'all 2s ease',
  },
  aromaCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 3,
  },
  cupCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 2,
  },
  friendPoint: {
    position: 'absolute',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    zIndex: 4,
    cursor: 'pointer',
    transition: 'box-shadow 0.3s ease',
  },
  friendTooltip: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  painting: {
    position: 'absolute',
    width: '120px',
    height: '160px',
    cursor: 'pointer',
    zIndex: 1,
    transition: 'transform 0.3s ease',
  },
  paintingCanvas: {
    width: '100%',
    height: '100%',
    borderRadius: '2px',
  },
  paintingFrame: {
    position: 'absolute',
    top: '-2px',
    left: '-2px',
    right: '-2px',
    bottom: '-2px',
    border: '2px solid #d4a373',
    borderRadius: '4px',
    pointerEvents: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
  },
  brewPanelOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  brewPanelMobile: {
    alignItems: 'flex-end',
  },
  brewPanel: {
    backgroundColor: '#2d1b0e',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '85vh',
    overflowY: 'auto',
    border: '2px solid #a67c52',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  },
  brewTitle: {
    color: '#d4a373',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: '24px',
    fontSize: '28px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    color: '#cd8d7b',
    fontSize: '18px',
    marginBottom: '12px',
  },
  teaOptions: {
    display: 'flex',
    gap: '12px',
  },
  teaOption: {
    flex: 1,
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  teaOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
  },
  teaColorDot: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    margin: '0 auto 8px',
  },
  teaName: {
    display: 'block',
    color: '#fff',
    fontSize: '16px',
    marginBottom: '4px',
  },
  teaDesc: {
    display: 'block',
    color: '#a67c52',
    fontSize: '12px',
  },
  slider: {
    width: '100%',
    height: '8px',
    borderRadius: '4px',
    background: 'linear-gradient(to right, #2196f3, #f44336)',
    appearance: 'none',
    outline: 'none',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#a67c52',
    fontSize: '12px',
    marginTop: '4px',
  },
  spiceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  spiceButton: {
    padding: '14px 8px',
    borderRadius: '8px',
    border: '2px solid',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    userSelect: 'none',
  },
  spiceButtonActive: {
    transform: 'scale(1.05)',
  },
  spiceName: {
    display: 'block',
    color: '#fff',
    fontSize: '14px',
    marginBottom: '4px',
  },
  spiceCount: {
    color: '#fff',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  spiceHint: {
    color: '#a67c52',
    fontSize: '12px',
    textAlign: 'center',
    marginTop: '8px',
  },
  brewActions: {
    display: 'flex',
    gap: '16px',
    marginTop: '32px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    borderRadius: '6px',
    border: '2px solid #a67c52',
    backgroundColor: 'transparent',
    color: '#a67c52',
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    transition: 'all 0.3s ease',
  },
  brewButton: {
    flex: 2,
    padding: '14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#d4a373',
    color: '#2d1b0e',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
  },
  paintingModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    cursor: 'pointer',
  },
  enlargedPainting: {
    position: 'relative',
    cursor: 'default',
    animation: 'zoomIn 0.6s ease-out',
  },
  enlargedCanvas: {
    borderRadius: '4px',
    boxShadow: '0 0 50px rgba(212, 163, 115, 0.3)',
  },
  poemText: {
    marginTop: '24px',
    color: '#fff',
    fontSize: '20px',
    textAlign: 'center',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: '12px 24px',
    borderRadius: '8px',
  },
  authContainer: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #4a2c1a 0%, #1a0e08 100%)',
    fontFamily: "'KaiTi', 'STKaiti', serif",
  },
  authCard: {
    backgroundColor: '#2d1b0e',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    border: '2px solid #a67c52',
    textAlign: 'center',
    minWidth: '350px',
  },
  authTitle: {
    color: '#d4a373',
    fontSize: '36px',
    margin: '0 0 8px',
  },
  authSubtitle: {
    color: '#a67c52',
    fontSize: '16px',
    margin: '0 0 32px',
  },
  authTabs: {
    display: 'flex',
    marginBottom: '24px',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  authTab: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#a67c52',
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    transition: 'all 0.3s ease',
  },
  authTabActive: {
    backgroundColor: '#d4a373',
    color: '#2d1b0e',
  },
  authForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  authInput: {
    padding: '14px 16px',
    borderRadius: '6px',
    border: '2px solid #a67c52',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '16px',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    outline: 'none',
  },
  authError: {
    color: '#e5989b',
    fontSize: '14px',
    margin: '0',
  },
  authButton: {
    padding: '14px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#d4a373',
    color: '#2d1b0e',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    marginTop: '8px',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
  },
  roomModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150,
  },
  roomPanel: {
    backgroundColor: '#2d1b0e',
    borderRadius: '12px',
    padding: '32px',
    minWidth: '300px',
    textAlign: 'center',
    border: '2px solid #a67c52',
  },
  roomPanelTitle: {
    color: '#d4a373',
    marginTop: 0,
    marginBottom: '24px',
  },
  roomInput: {
    width: '100%',
    padding: '12px',
    marginBottom: '16px',
    borderRadius: '6px',
    border: '2px solid #a67c52',
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#fff',
    fontSize: '18px',
    textAlign: 'center',
    letterSpacing: '4px',
    fontFamily: "'KaiTi', 'STKaiti', serif",
    outline: 'none',
    boxSizing: 'border-box',
  },
  roomDivider: {
    color: '#a67c52',
    margin: '16px 0',
  },
  closeButton: {
    width: '100%',
    padding: '12px',
    marginTop: '24px',
    borderRadius: '6px',
    border: '2px solid #a67c52',
    backgroundColor: 'transparent',
    color: '#a67c52',
    fontSize: '16px',
    cursor: 'pointer',
    fontFamily: "'KaiTi', 'STKaiti', serif",
  },
  roomCodeDisplay: {
    textAlign: 'center',
  },
  roomCodeBig: {
    fontSize: '48px',
    color: '#d4a373',
    letterSpacing: '8px',
    margin: '16px 0',
    fontWeight: 'bold',
  },
  roomHint: {
    color: '#a67c52',
    fontSize: '14px',
  },
};

export default TeaRoom;
