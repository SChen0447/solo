import React, { useState } from 'react';

interface RoomProps {
  onJoin: (nickname: string, roomId: string) => void;
}

const Room: React.FC<RoomProps> = ({ onJoin }) => {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim() && roomId.trim()) {
      onJoin(nickname.trim(), roomId.trim());
    }
  };

  return (
    <div className="join-room">
      <h2>🎵 加入音乐房间</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>昵称</label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="请输入你的昵称"
            maxLength={20}
          />
        </div>
        <div className="form-group">
          <label>房间号</label>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="请输入房间号"
            maxLength={30}
          />
        </div>
        <button type="submit" className="btn-primary">
          加入房间
        </button>
      </form>
    </div>
  );
};

export default Room;
