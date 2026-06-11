import React from 'react';
import { User } from '../types';

interface UserListProps {
  users: User[];
  currentUser: User | null;
}

const UserList: React.FC<UserListProps> = ({ users, currentUser }) => {
  const getInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="user-list">
      <div className="user-list-title">
        <span className="online-dot" />
        在线用户 ({users.length})
      </div>
      <div className="user-avatars">
        {users.slice(0, 8).map((user) => (
          <div
            key={user.id}
            className={`user-avatar ${user.id === currentUser?.id ? 'current' : ''}`}
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {getInitial(user.name)}
            {user.id === currentUser?.id && (
              <span className="status-dot online" />
            )}
          </div>
        ))}
        {users.length > 8 && (
          <div className="user-avatar more">
            +{users.length - 8}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserList;
