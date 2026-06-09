import React, { useState, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import { MindMapCanvas } from './components/MindMapCanvas';
import { CollaborationBar } from './components/CollaborationBar';
import html2canvas from 'html2canvas';
import './App.css';

function App() {
  const {
    currentUser,
    users,
    nodes,
    roomName,
    joinRoom,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    toggleCollapse,
    changeNodeColor,
    sendCursorPosition,
  } = useSocket();

  const [roomInput, setRoomInput] = useState('');
  const [userNameInput, setUserNameInput] = useState('');
  const [error, setError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleJoinRoom = async () => {
    if (!roomInput.trim()) {
      setError('请输入房间名');
      return;
    }
    if (!userNameInput.trim()) {
      setError('请输入你的昵称');
      return;
    }

    setIsJoining(true);
    setError('');

    const result = await joinRoom(roomInput.trim(), userNameInput.trim());

    if (!result.success) {
      setError(result.error || '加入房间失败');
    }
    setIsJoining(false);
  };

  const handleExport = async () => {
    if (!canvasRef.current) return;

    try {
      const allNodes = Object.values(nodes);
      const originalStates: Record<string, boolean> = {};
      allNodes.forEach((node) => {
        if (node.collapsed) {
          originalStates[node.id] = true;
          toggleCollapse(node.id);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const canvas = await html2canvas(canvasRef.current, {
        backgroundColor: '#f5f7f2',
        scale: 2,
      });

      Object.keys(originalStates).forEach((nodeId) => {
        toggleCollapse(nodeId);
      });

      const link = document.createElement('a');
      link.download = `mindmap-${roomName}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
    }
  };

  if (!currentUser || !roomName) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="app-title">🧠 协作思维导图</h1>
          <p className="app-subtitle">实时协作，创意无限</p>

          <div className="login-form">
            <div className="form-group">
              <label>房间名称</label>
              <input
                type="text"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                placeholder="例如：项目-规划"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
            </div>

            <div className="form-group">
              <label>你的昵称</label>
              <input
                type="text"
                value={userNameInput}
                onChange={(e) => setUserNameInput(e.target.value)}
                placeholder="输入你的名字"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              className="join-btn"
              onClick={handleJoinRoom}
              disabled={isJoining}
            >
              {isJoining ? '加入中...' : '创建 / 加入房间'}
            </button>
          </div>

          <div className="features">
            <div className="feature-item">✨ 实时协作编辑</div>
            <div className="feature-item">🎨 可视化思维导图</div>
            <div className="feature-item">📷 一键导出图片</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <CollaborationBar roomName={roomName} users={users} onExport={handleExport} />

      <div className="canvas-wrapper">
        <MindMapCanvas
          nodes={nodes}
          users={users}
          currentUser={currentUser}
          onAddNode={addNode}
          onUpdateNode={updateNode}
          onDeleteNode={deleteNode}
          onMoveNode={moveNode}
          onToggleCollapse={toggleCollapse}
          onChangeNodeColor={changeNodeColor}
          onSendCursor={sendCursorPosition}
          canvasRef={canvasRef}
        />
      </div>
    </div>
  );
}

export default App;
