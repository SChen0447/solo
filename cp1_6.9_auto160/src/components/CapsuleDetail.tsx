import React from 'react';
import { Capsule } from '../types';
import { useAuth } from '../AuthContext';

interface Props {
  capsule: Capsule;
  onClose: () => void;
  onOpen: () => void;
  onRefresh: () => void;
}

export default function CapsuleDetail({ capsule, onClose, onOpen }: Props) {
  const { user } = useAuth();
  const isSender = user?.id === capsule.senderId;
  const isRecipient = user?.id === capsule.recipientId;
  const canOpen = isRecipient && new Date() >= new Date(capsule.openAt);
  const daysToOpen = Math.ceil((new Date(capsule.openAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content detail-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>

        <div className="detail-header" style={{ background: `linear-gradient(135deg, ${capsule.moodColor}40, transparent)` }}>
          <div className="detail-mood" style={{ background: capsule.moodColor }}>
            {capsule.mood}
          </div>
          <div className="detail-status" style={{ color: capsule.isOpened ? '#88ccff' : '#ffdd88' }}>
            {capsule.reply ? '✓ 已回复' : capsule.isOpened ? '○ 已开启' : '✦ 等待开启'}
          </div>
        </div>

        <div className="detail-meta">
          <div className="detail-meta-row">
            <span className="meta-label">发件人</span>
            <span className="meta-value">{capsule.senderName}</span>
          </div>
          <div className="detail-meta-row">
            <span className="meta-label">收件人</span>
            <span className="meta-value">{capsule.recipientName}</span>
          </div>
          <div className="detail-meta-row">
            <span className="meta-label">埋藏时间</span>
            <span className="meta-value">{new Date(capsule.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          <div className="detail-meta-row">
            <span className="meta-label">开启时间</span>
            <span className="meta-value">
              {new Date(capsule.openAt).toLocaleString('zh-CN')}
              {!capsule.isOpened && daysToOpen > 0 && (
                <span className="countdown">（{daysToOpen}天后）</span>
              )}
            </span>
          </div>
          <div className="detail-meta-row">
            <span className="meta-label">附件照片</span>
            <span className="meta-value">{capsule.photos?.length || 0} 张</span>
          </div>
        </div>

        {capsule.isOpened ? (
          <>
            <div className="detail-content">
              <div className="detail-content-text">{capsule.content}</div>
              {capsule.photos && capsule.photos.length > 0 && (
                <div className="detail-photos">
                  {capsule.photos.map((url, i) => (
                    <img key={i} src={url} alt="" className="detail-photo" />
                  ))}
                </div>
              )}
            </div>

            {capsule.reply && (
              <div className="detail-reply">
                <div className="reply-label">💬 {capsule.recipientName} 的回复</div>
                <div className="reply-content">{capsule.reply.content}</div>
              </div>
            )}
          </>
        ) : (
          <div className="detail-locked">
            <p>✧ 胶囊尚未开启 ✧</p>
            <p className="locked-hint">
              {isSender
                ? '作为发件人，您需要等待收件人开启后才能查看内容'
                : canOpen
                  ? '点击下方按钮开启这枚来自过去的胶囊'
                  : '还需等待一段时间才能开启这枚胶囊'}
            </p>
          </div>
        )}

        <div className="detail-actions">
          {canOpen && !capsule.isOpened && (
            <button className="btn-primary" onClick={onOpen}>
              ✦ 开启胶囊
            </button>
          )}
          {capsule.isOpened && !capsule.reply && isRecipient && (
            <button className="btn-primary" onClick={onOpen}>
              💬 回复胶囊
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
