import { useState, useCallback } from 'react';
import { Comment, CommentReply, generateId, generateTimestamp } from '@/utils/docUtils';

interface CommentPanelProps {
  comments: Comment[];
  onAddComment: (comment: Comment) => void;
  onAddReply: (commentId: string, reply: CommentReply) => void;
  isOpen: boolean;
  onToggle: () => void;
  selectedAnchor: string | null;
  onAnchorClick: (anchorText: string) => void;
}

export default function CommentPanel({
  comments,
  onAddComment,
  onAddReply,
  isOpen,
  onToggle,
  selectedAnchor,
  onAnchorClick,
}: CommentPanelProps) {
  const [nickname, setNickname] = useState('访客');
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const handleSubmitComment = useCallback(() => {
    if (!newCommentText.trim() || !selectedAnchor) return;
    const comment: Comment = {
      id: generateId(),
      anchorText: selectedAnchor,
      author: nickname.trim() || '访客',
      content: newCommentText.trim(),
      timestamp: generateTimestamp(),
      replies: [],
    };
    onAddComment(comment);
    setNewCommentText('');
  }, [newCommentText, selectedAnchor, nickname, onAddComment]);

  const handleSubmitReply = useCallback(
    (commentId: string) => {
      if (!replyText.trim()) return;
      const reply: CommentReply = {
        id: generateId(),
        author: nickname.trim() || '访客',
        content: replyText.trim(),
        timestamp: generateTimestamp(),
      };
      onAddReply(commentId, reply);
      setReplyText('');
      setReplyingToId(null);
    },
    [replyText, nickname, onAddReply]
  );

  return (
    <>
      {!isOpen && (
        <button
          onClick={onToggle}
          style={{
            position: 'fixed',
            right: '16px',
            bottom: '16px',
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: '#7c3aed',
            color: '#fff',
            fontSize: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(124, 58, 237, 0.5)',
            zIndex: 100,
          }}
          title="评论"
        >
          💬
        </button>
      )}
      <aside
        style={{
          width: isOpen ? '250px' : '0px',
          minWidth: isOpen ? '250px' : '0px',
          backgroundColor: '#1a1a2e',
          borderLeft: isOpen ? '1px solid #4a4a6a' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease-out, min-width 0.25s ease-out',
          overflow: 'hidden',
          height: '100%',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #4a4a6a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
            评论讨论 <span style={{ color: '#7c3aed' }}>({comments.length})</span>
          </h3>
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              color: '#9ca3af',
              fontSize: '20px',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a4a' }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>
              昵称
            </label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="输入昵称"
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: '#252a34',
                border: '1px solid #4a4a6a',
                borderRadius: '6px',
                color: '#eaeaea',
                fontSize: '13px',
              }}
            />
          </div>
          {selectedAnchor ? (
            <>
              <div style={{ fontSize: '12px', color: '#7c3aed', marginBottom: '6px' }}>
                锚点: "{selectedAnchor.length > 30 ? selectedAnchor.slice(0, 30) + '...' : selectedAnchor}"
              </div>
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="写下你的评论..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#252a34',
                  border: '1px solid #4a4a6a',
                  borderRadius: '6px',
                  color: '#eaeaea',
                  fontSize: '13px',
                  resize: 'vertical',
                  marginBottom: '8px',
                }}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!newCommentText.trim()}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  opacity: newCommentText.trim() ? 1 : 0.5,
                  cursor: newCommentText.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                发表评论
              </button>
            </>
          ) : (
            <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
              选中预览区文字后可添加评论
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#6b7280', fontSize: '13px' }}>
              暂无评论
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="comment-item-enter"
                style={{
                  padding: '10px 12px',
                  marginBottom: '10px',
                  backgroundColor: '#222240',
                  borderRadius: '8px',
                  borderLeft:
                    selectedAnchor === c.anchorText ? '3px solid #7c3aed' : '3px solid transparent',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#eaeaea' }}>
                    {c.author}
                  </span>
                  <span style={{ fontSize: '11px', color: '#9ca3af' }}>{c.timestamp}</span>
                </div>
                <div
                  onClick={() => onAnchorClick(c.anchorText)}
                  style={{
                    fontSize: '11px',
                    color: '#7c3aed',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    wordBreak: 'break-all',
                  }}
                  title="定位锚点"
                >
                  📍 {c.anchorText.length > 40 ? c.anchorText.slice(0, 40) + '...' : c.anchorText}
                </div>
                <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>{c.content}</div>

                {c.replies.length > 0 && (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #4a4a6a' }}>
                    {c.replies.map((r) => (
                      <div key={r.id} style={{ padding: '6px 0', fontSize: '12px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '3px',
                          }}
                        >
                          <span style={{ color: '#a78bfa', fontWeight: 500 }}>{r.author}</span>
                          <span style={{ color: '#6b7280', fontSize: '10px' }}>{r.timestamp}</span>
                        </div>
                        <div style={{ color: '#d1d5db' }}>{r.content}</div>
                      </div>
                    ))}
                  </div>
                )}

                {replyingToId === c.id ? (
                  <div style={{ marginTop: '10px' }}>
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="回复..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        backgroundColor: '#252a34',
                        border: '1px solid #4a4a6a',
                        borderRadius: '6px',
                        color: '#eaeaea',
                        fontSize: '12px',
                        resize: 'none',
                        marginBottom: '6px',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handleSubmitReply(c.id)}
                        disabled={!replyText.trim()}
                        style={{
                          flex: 1,
                          padding: '5px',
                          backgroundColor: '#7c3aed',
                          color: '#fff',
                          borderRadius: '5px',
                          fontSize: '12px',
                          opacity: replyText.trim() ? 1 : 0.5,
                        }}
                      >
                        发送
                      </button>
                      <button
                        onClick={() => {
                          setReplyingToId(null);
                          setReplyText('');
                        }}
                        style={{
                          padding: '5px 10px',
                          backgroundColor: '#374151',
                          color: '#eaeaea',
                          borderRadius: '5px',
                          fontSize: '12px',
                        }}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingToId(c.id)}
                    style={{
                      marginTop: '8px',
                      fontSize: '11px',
                      color: '#a78bfa',
                      background: 'transparent',
                      padding: 0,
                    }}
                  >
                    ↩ 回复
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
