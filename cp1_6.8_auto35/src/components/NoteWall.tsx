import { useEffect, useRef, useState } from 'react';
import type { Note } from '../types';
import NoteCard from './NoteCard';
import SkeletonCard from './SkeletonCard';

interface NoteWallProps {
  notes: Note[];
  searchTerm: string;
  activeCategory: string;
  loading: boolean;
  hasMore: boolean;
  newNoteId: string | null;
  updatingNoteId: string | null;
  deletingNoteId: string | null;
  onLoadMore: () => void;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onRatingChange: (id: string, rating: number) => void;
}

export default function NoteWall({
  notes,
  searchTerm,
  activeCategory,
  loading,
  hasMore,
  newNoteId,
  updatingNoteId,
  deletingNoteId,
  onLoadMore,
  onEdit,
  onDelete,
  onRatingChange,
}: NoteWallProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 768) {
        setColumns(2);
      } else if (window.innerWidth < 1024) {
        setColumns(2);
      } else {
        setColumns(3);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && hasMore && !loading) {
            onLoadMore();
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  const columnNotes: Note[][] = Array.from({ length: columns }, () => []);
  notes.forEach((note, index) => {
    columnNotes[index % columns].push(note);
  });

  const getNoteIndex = (note: Note, colIndex: number) => {
    return notes.findIndex(n => n.id === note.id);
  };

  const isFiltered = (note: Note) => {
    if (activeCategory === 'all') return false;
    if (!searchTerm.trim()) return note.category !== activeCategory;
    return note.category !== activeCategory;
  };

  return (
    <div className="note-wall-container" style={{ padding: '20px 24px' }}>
      {notes.length === 0 && !loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666',
          }}
        >
          <p style={{ fontSize: '16px' }}>暂无笔记，点击右下角 + 添加你的第一篇书评</p>
        </div>
      ) : (
        <div
          className="masonry-grid"
          style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {columnNotes.map((column, colIndex) => (
            <div
              key={colIndex}
              className="masonry-column"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '280px',
                flexShrink: 0,
              }}
            >
              {column.map((note, noteIndex) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={getNoteIndex(note, colIndex)}
                  searchTerm={searchTerm}
                  isFiltered={activeCategory !== 'all' && isFiltered(note)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onRatingChange={onRatingChange}
                  isNew={note.id === newNoteId}
                  isUpdating={note.id === updatingNoteId}
                  isDeleting={note.id === deletingNoteId}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div
          className="skeleton-grid"
          style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            marginTop: '20px',
          }}
        >
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} style={{ width: '280px' }}>
              <SkeletonCard />
            </div>
          ))}
        </div>
      )}

      <div ref={loadMoreRef} style={{ height: '20px' }} />

      {!hasMore && notes.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '30px 0',
            color: '#555',
            fontSize: '13px',
          }}
        >
          — 已经到底啦 —
        </div>
      )}
    </div>
  );
}
