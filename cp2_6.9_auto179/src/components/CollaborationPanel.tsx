import React, { useState } from 'react';
import { Tour, Collaborator } from '../types';
import { useApp } from '../App';

interface CollaborationPanelProps {
  tour: Tour;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ tour }) => {
  const { sendInvite, currentUser } = useApp();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    if (!email) return;
    try {
      const result = await sendInvite(tour.id, email, nickname);
      setInviteLink(result.inviteLink);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyLink = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const allCollaborators: Collaborator[] = currentUser
    ? [currentUser, ...tour.collaborators.filter(c => c.id !== currentUser.id)]
    : tour.collaborators;

  return (
    <div className="collaboration-panel">
      <div className="collaborators-list">
        {allCollaborators.map(c => (
          <div key={c.id} className="collaborator-item" title={c.nickname}>
            <span
              className="collaborator-dot"
              style={{ backgroundColor: c.color }}
            />
            <span className="collaborator-label">{c.nickname}</span>
            {!c.accepted && <span className="collaborator-pending">待接受</span>}
          </div>
        ))}
      </div>
      <button className="btn-invite" onClick={() => setShowInvite(!showInvite)}>
        + 邀请成员
      </button>

      {showInvite && (
        <div className="invite-dropdown">
          <div className="form-group compact">
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="form-input compact"
            />
          </div>
          <div className="form-group compact">
            <input
              type="text"
              placeholder="昵称（可选）"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              className="form-input compact"
            />
          </div>
          <button className="btn-primary btn-small" onClick={handleInvite}>
            生成邀请链接
          </button>
          {inviteLink && (
            <div className="invite-link-container">
              <div className="invite-link">{inviteLink}</div>
              <button className="btn-secondary btn-small" onClick={handleCopyLink}>
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CollaborationPanel;
