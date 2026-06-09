import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CityScene } from './CityScene';
import { ControlPanel } from './ControlPanel';
import { WebSocketManager } from './WebSocketManager';
import { User, Building, BuildingType, LightingState, BUILDING_CONFIG } from './types';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const wsRef = useRef<WebSocketManager | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [currentHour, setCurrentHour] = useState<number>(12);
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [popup, setPopup] = useState<{
    visible: boolean;
    x: number;
    y: number;
    gridX: number;
    gridZ: number;
  } | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<boolean>(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new CityScene(canvasRef.current);
    sceneRef.current = scene;
    scene.setLighting(12, '#ffffff');

    scene.setOnClickCell((gridX, gridZ, screenX, screenY) => {
      setPopup({ visible: true, x: screenX, y: screenY, gridX, gridZ });
    });

    const ws = new WebSocketManager();
    wsRef.current = ws;

    ws.connect()
      .then((state) => {
        setConnecting(false);
        setUsers(state.users);
        setCurrentUserId(state.currentUser?.id);
        setCurrentHour(state.lighting.hour);
        setSelectedColor(state.lighting.color);

        scene.addBuildings(state.buildings);
        scene.setLighting(state.lighting.hour, state.lighting.color);

        ws.on<User[]>('user_list', (userList) => {
          setUsers(userList);
        });

        ws.on<User>('user_joined', () => {});

        ws.on<Building>('building_added', (building) => {
          scene.addBuilding(building.gridX, building.gridZ, building.type);
        });

        ws.on<LightingState & { userId: string }>('lighting_updated', (data) => {
          scene.setLighting(data.hour, data.color);
          setCurrentHour(data.hour);
          setSelectedColor(data.color);
        });
      })
      .catch((err) => {
        setConnecting(false);
        setConnectionError(err.message || '连接服务器失败');
        scene.setLighting(12, '#ffffff');
      });

    return () => {
      scene.dispose();
      ws.disconnect();
    };
  }, []);

  const handleHourChange = useCallback((hour: number) => {
    setCurrentHour(hour);
    sceneRef.current?.setLighting(hour, selectedColor);
    wsRef.current?.sendUpdateLighting(hour, selectedColor);
  }, [selectedColor]);

  const handleColorChange = useCallback((color: string) => {
    setSelectedColor(color);
    sceneRef.current?.setLighting(currentHour, color);
    wsRef.current?.sendUpdateLighting(currentHour, color);
  }, [currentHour]);

  const handleBuildingSelect = useCallback((type: BuildingType) => {
    if (!popup) return;
    sceneRef.current?.addBuilding(popup.gridX, popup.gridZ, type);
    wsRef.current?.sendAddBuilding(popup.gridX, popup.gridZ, type);
    setPopup(null);
  }, [popup]);

  const toggleHeatmap = useCallback(() => {
    const next = !showHeatmap;
    setShowHeatmap(next);
    sceneRef.current?.setShowHeatmap(next);
  }, [showHeatmap]);

  const closePopup = useCallback(() => setPopup(null), []);

  useEffect(() => {
    const handler = () => setPopup(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, []);

  return (
    <div className="app-container">
      <div className="canvas-wrapper" ref={canvasRef} />

      <div className="user-list">
        <div className="user-list-title">在线用户 ({users.length}/4)</div>
        {users.map((user) => (
          <div key={user.id} className="user-item">
            <span
              className="user-dot"
              style={{ background: user.color, color: user.color }}
            />
            <span>
              用户 {user.id.slice(-4)}
              {user.id === currentUserId && ' (你)'}
            </span>
          </div>
        ))}
        {connecting && <div style={{ fontSize: '12px', color: '#f1c40f' }}>连接中...</div>}
        {connectionError && <div style={{ fontSize: '12px', color: '#e74c3c' }}>{connectionError}</div>}
      </div>

      <button
        className={`heatmap-btn ${showHeatmap ? 'active' : ''}`}
        onClick={toggleHeatmap}
      >
        {showHeatmap ? '隐藏热力图' : '显示热力图'}
      </button>

      <ControlPanel
        currentHour={currentHour}
        onHourChange={handleHourChange}
        selectedColor={selectedColor}
        onColorChange={handleColorChange}
        users={users}
        currentUserId={currentUserId}
      />

      {popup?.visible && (
        <div
          className="building-popup"
          style={{ left: popup.x + 10, top: popup.y + 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          {(Object.entries(BUILDING_CONFIG) as [BuildingType, typeof BUILDING_CONFIG[BuildingType]][]).map(
            ([type, config]) => (
              <button
                key={type}
                className="building-btn"
                onClick={() => handleBuildingSelect(type)}
              >
                <span className="color-swatch" style={{ background: config.color }} />
                {config.label}
              </button>
            )
          )}
          <button
            className="building-btn"
            style={{ background: '#2c3e50' }}
            onClick={closePopup}
          >
            取消
          </button>
        </div>
      )}

      <div className="footer">
        CityFlow Sandbox © 2026 — 城市光影与交通流协作沙盘
      </div>
    </div>
  );
};

export default App;
