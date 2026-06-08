import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2, X } from 'lucide-react';
import type { Note } from '../types';
import { getCategoryInfo } from '../types';
import StarRating from './StarRating';
import { highlightText } from '../utils/markdown';

interface NoteCardProps {
  note: Note;
  index: number;
  searchTerm: string;
  isFiltered: boolean;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onRatingChange: (id: string, rating: number) => void;
  isNew?: boolean;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export default function NoteCard({
  note,
  index,
  searchTerm,
  isFiltered,
  onEdit,
  onDelete,
  onRatingChange,
  isNew = false,
  isUpdating = false,
  isDeleting = false,
}: NoteCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [cardHeight] = useState(() => 200 + Math.random() * 120);
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryInfo = getCategoryInfo(note.category);
  const randomDelay = (index % 10) * 0.05 + Math.random() * 0.03;

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
    setShowDeleteConfirm(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(note);
    setShowMenu(false);
  };

  return (
    <>
      <div
        ref={cardRef}
        className={`note-card ${isNew ? 'card-new' : ''} ${isUpdating ? 'card-updating' : ''} ${isDeleting ? 'card-deleting' : ''}`}
        onClick={() => setShowDetail(true)}
        style={{
          width: '280px',
          borderRadius: '16px',
          backgroundColor: '#16213e',
          overflow: 'hidden',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease, opacity 0.5s ease',
          opacity: isVisible ? (isFiltered ? 0.2 : 1) : 0,
          transform: isVisible
            ? `translateY(0) ${isNew ? 'scale(1)' : ''} ${isUpdating ? 'scale(1.05)' : ''} ${isDeleting ? 'rotateY(90deg) scale(0.5)' : ''}`
            : 'translateY(40px)',
          willChange: 'transform, opacity',
          animationDelay: `${randomDelay}s`,
          position: 'relative',
          height: `${cardHeight}px`,
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={e => {
          if (!isDeleting) {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.4)';
          }
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
        }}
      >
        <div
          style={{
            height: '60px',
            background: categoryInfo.gradient,
            position: 'relative',
          }}
        />

        <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '8px',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 600,
                color: '#fff',
                lineHeight: 1.3,
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
              }}
              dangerouslySetInnerHTML={{
                __html: searchTerm ? highlightText(note.title, searchTerm) : note.title,
              }}
            />
            <div
              ref={menuRef}
              style={{ position: 'relative', flexShrink: 0, marginLeft: '8px' }}
            >
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  color: '#888',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#888';
                }}
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '28px',
                    backgroundColor: '#1e2a4a',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
                    padding: '4px',
                    minWidth: '100px',
                    zIndex: 10,
                    animation: 'fadeIn 0.2s ease',
                  }}
                >
                  <button
                    onClick={handleEditClick}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: 'none',
                      color: '#fff',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Edit2 size={14} />
                    编辑
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: 'none',
                      color: '#ff6b6b',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'background-color 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(255,107,107,0.1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
              )}
            </div>
          </div>

          <p
            style={{
              margin: '0 0 10px 0',
              fontSize: '12px',
              color: '#888',
            }}
            dangerouslySetInnerHTML={{
              __html: searchTerm ? highlightText(note.author, searchTerm) : note.author,
            }}
          />

          <StarRating
            rating={note.rating}
            onRatingChange={rating => {
              onRatingChange(note.id, rating);
            }}
            size={14}
          />

          <p
            style={{
              margin: '12px 0 0 0',
              fontSize: '13px',
              color: '#bbb',
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              flex: 1,
            }}
          >
            {note.excerpt}
          </p>
        </div>

        {showDeleteConfirm && (
          <div
            className="delete-confirm-bubble"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#2a1a2e',
              border: '1px solid #e94560',
              borderRadius: '10px',
              padding: '10px 14px',
              boxShadow: '0 4px 15px rgba(233,69,96,0.3)',
              zIndex: 20,
              animation: 'bounceIn 0.3s ease',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#fff', whiteSpace: 'nowrap' }}>
              确定删除？
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={e => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#aaa',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.color = '#aaa';
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#e94560',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = '#ff6b9d';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = '#e94560';
                }}
              >
                确定
              </button>
            </div>
          </div>
        )}
      </div>

      {showDetail && (
        <div
          className="detail-modal-overlay"
          onClick={() => setShowDetail(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.3s ease',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="detail-modal"
            onClick={e => e.stopPropagation()}
            style={{
              backgroundColor: '#16213e',
              borderRadius: '20px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              animation: 'scaleIn 0.3s ease',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                height: '100px',
                background: categoryInfo.gradient,
                position: 'relative',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
              }}
            >
              <button
                onClick={() => setShowDetail(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)';
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <h2
                style={{
                  margin: '0 0 8px 0',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {note.title}
              </h2>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#888' }}>
                {note.author}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <StarRating rating={note.rating} readonly size={18} />
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: `${categoryInfo.color}22`,
                    color: categoryInfo.color,
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  {categoryInfo.label}
                </span>
              </div>

              <div
                className="note-content"
                style={{
                  color: '#ddd',
                  lineHeight: 1.7,
                  fontSize: '14px',
                }}
                dangerouslySetInnerHTML={{
                  __html: note.content.replace(/\n/g, '<br/>'),
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
