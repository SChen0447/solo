import React from 'react';
import { User } from '../types';

interface CollaborationBarProps {
  roomName: string;
  users: User[];
  onExport: () => void;
}

export const CollaborationBar: React.FC<CollaborationBarProps> = ({
  roomName,
  users,
  onExport,
}) => {
  return (
    <div className="collaboration-bar">
      <div className="bar-left">
        <div className="room-info">
          <span className="room-icon">📍</span>
          <span className="room-name">{roomName}</span>
        </div>
      </div>

      <div className="bar-center">
        <div className="users-list">
          {users.map((user, index) => (
            <div
              key={user.id}
              className="user-avatar"
              style={{
                backgroundColor: user.color,
                marginLeft: index > 0 ? '-8px' : '0',
                zIndex: users.length - index,
              }}
              title={user.name}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
          ))}
          <span className="user-count">{users.length}/5</span>
        </div>
      </div>

      <div className="bar-right">
        <button className="export-btn" onClick={onExport}>
          <span className="export-icon">📷</span>
          导出为图片
        </button>
      </div>
    </div>
  );
};
