import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import type { Note as NoteType } from './types';

interface NoteProps {
  note: NoteType;
  isDragging: boolean;
  isResizing: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onUpdate: (updates: Partial<NoteType>) => Promise<void>;
  onLike: () => Promise<void>;
  onAddComment: (content: string) => Promise<void>;
}

export default function Note({
  note,
  isDragging,
  isResizing,
  onDragStart,
  onResizeStart,
  onUpdate,
  onLike,
  onAddComment,
}: NoteProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditContent(note.content);
  }, [note.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleBodyClick = () => {
    if (!isDragging && !isResizing) {
      setIsEditing(true);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.altKey && e.key === 'Enter') {
      e.preventDefault();
      await onUpdate({ content: editContent });
      setIsEditing(false);
    }
  };

  const handleBlur = async () => {
    if (editContent !== note.content) {
      await onUpdate({ content: editContent });
    }
    setIsEditing(false);
  };

  const handleLike = async () => {
    if (!liked) {
      setLiked(true);
      await onLike();
    }
  };

  const handleSubmitComment = async () => {
    if (newComment.trim()) {
      await onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div
      className={`note ${isDragging ? 'dragging' : ''}`}
      style={{
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height + (showComments ? 160 : 0),
        transition: isDragging || isResizing ? 'none' : 'height 0.2s ease',
        zIndex: isDragging || isResizing ? 1000 : 1,
      }}
    >
      <div className="note-header" onMouseDown={onDragStart}>
        <span className="note-time">
          {format(note.createdAt, 'MM/dd HH:mm')}
        </span>
      </div>

      <div className="note-body" onClick={handleBodyClick}>
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="note-textarea"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="输入便签内容... (Alt+Enter保存)"
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="note-text">
            {note.content || <span style={{ opacity: 0.5 }}>点击编辑内容...</span>}
          </div>
        )}
      </div>

      <div className="note-footer">
        <button
          className={`note-btn ${liked ? 'liked' : ''}`}
          onClick={handleLike}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ThumbsUp size={14} />
          <span>{note.likes}</span>
        </button>
        <button
          className="note-btn"
          onClick={() => setShowComments(!showComments)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MessageSquare size={14} />
          <span>{note.comments.length}</span>
        </button>
      </div>

      {showComments && (
        <div className="comments-section" onMouseDown={(e) => e.stopPropagation()}>
          {note.comments.length > 0 && (
            <div className="comment-list">
              {note.comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  {comment.content}
                </div>
              ))}
            </div>
          )}
          <div className="comment-input">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              placeholder="输入评论..."
            />
            <button onClick={handleSubmitComment}>发送</button>
          </div>
        </div>
      )}

      <div className="resize-handle" onMouseDown={onResizeStart} />
    </div>
  );
}
