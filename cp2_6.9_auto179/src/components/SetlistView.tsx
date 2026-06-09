import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Tour, Song } from '../types';
import { useApp } from '../App';

interface SetlistViewProps {
  tour: Tour;
}

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const SetlistView: React.FC<SetlistViewProps> = ({ tour }) => {
  const { updateSongs } = useApp();
  const [songs, setSongs] = useState<Song[]>(
    () => {
      const saved = localStorage.getItem(`songs_${tour.id}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [...tour.songs].sort((a, b) => a.order - b.order);
        }
      }
      return [...tour.songs].sort((a, b) => a.order - b.order);
    }
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(`songs_${tour.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSongs(parsed);
      } catch {
        setSongs([...tour.songs].sort((a, b) => a.order - b.order));
      }
    }
  }, [tour.id, tour.songs]);

  const scheduleSave = useCallback((newSongs: Song[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      const reordered = newSongs.map((s, i) => ({ ...s, order: i }));
      updateSongs(tour.id, reordered);
    }, 300);
  }, [tour.id, updateSongs]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newSongs = [...songs];
    const [draggedSong] = newSongs.splice(draggedIndex, 1);
    newSongs.splice(dropIndex, 0, draggedSong);
    
    setSongs(newSongs.map((s, i) => ({ ...s, order: i })));
    scheduleSave(newSongs);
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSongEdit = (index: number, field: keyof Song, value: string | number) => {
    const newSongs = [...songs];
    newSongs[index] = { ...newSongs[index], [field]: value };
    setSongs(newSongs);
    scheduleSave(newSongs);
  };

  const totalDuration = songs.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="setlist-view">
      <div className="setlist-header">
        <div>
          <h3 className="setlist-title">🎵 歌单编排</h3>
          <p className="setlist-info">
            共 {songs.length} 首歌曲 · 总时长 {formatDuration(totalDuration)}
            <span className="setlist-hint"> · 拖拽行可重新排序</span>
          </p>
        </div>
      </div>

      <div className="setlist-table">
        <div className="setlist-table-header">
          <div className="col-order">#</div>
          <div className="col-name">歌曲名称</div>
          <div className="col-duration">时长</div>
          <div className="col-bpm">BPM</div>
          <div className="col-key">调性</div>
          <div className="col-notes">备注</div>
        </div>

        <div className="setlist-table-body">
          {songs.slice(0, 50).map((song, index) => (
            <div
              key={song.id}
              className={`setlist-row ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{ transition: 'transform 0.2s ease-out, background-color 0.2s ease-out' }}
            >
              <div className="col-order">
                <span className="drag-handle">⋮⋮</span>
                {index + 1}
              </div>
              <div className="col-name">
                <input
                  type="text"
                  value={song.name}
                  maxLength={30}
                  onChange={(e) => handleSongEdit(index, 'name', e.target.value)}
                  className="song-name-input"
                />
              </div>
              <div className="col-duration">{formatDuration(song.duration)}</div>
              <div className="col-bpm">
                <input
                  type="number"
                  value={song.bpm}
                  onChange={(e) => handleSongEdit(index, 'bpm', Number(e.target.value))}
                  className="song-meta-input"
                />
              </div>
              <div className="col-key">
                <input
                  type="text"
                  value={song.key}
                  onChange={(e) => handleSongEdit(index, 'key', e.target.value)}
                  className="song-meta-input short"
                />
              </div>
              <div className="col-notes">
                <input
                  type="text"
                  value={song.notes}
                  onChange={(e) => handleSongEdit(index, 'notes', e.target.value)}
                  placeholder="备注..."
                  className="song-notes-input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SetlistView;
