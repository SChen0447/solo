import React, { useState, useEffect } from 'react';
import { Activity } from '../../shared/types';
import { api } from '../api';
import { useSocketEvent } from '../SocketContext';

export default function ActivityWall() {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    api.getActivities().then(setActivities).catch(() => {});
  }, []);

  useSocketEvent('activity:new', (e: any) => {
    setActivities(prev => [e, ...prev].slice(0, 100));
  });

  const actionText = (a: Activity) => {
    switch (a.actionType) {
      case 'borrowed': return `借走了《${a.bookTitle}》`;
      case 'returned': return `归还了《${a.bookTitle}》`;
      case 'note_added': return `在《${a.bookTitle}》写下笔记`;
      case 'book_added': return `将《${a.bookTitle}》放上了漂流书架`;
      default: return a.actionType;
    }
  };

  return (
    <div className="activity-wall">
      <h2 className="section-title">📖 漂流动态</h2>
      {activities.length === 0 ? (
        <p className="empty-wall">暂无动态，成为第一位漂流者吧！</p>
      ) : (
        <ul className="activity-list">
          {activities.map(a => (
            <li key={a.id} className="activity-item">
              <span
                className="activity-avatar"
                style={{ background: a.avatarColor }}
              >
                {a.userNickname.charAt(0)}
              </span>
              <div className="activity-content">
                <div className="activity-text">
                  <strong>{a.userNickname}</strong> {actionText(a)}
                </div>
                {a.note && <p className="activity-note">"{a.note}"</p>}
                <span className="activity-time">
                  {new Date(a.createdAt).toLocaleString('zh-CN')}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
