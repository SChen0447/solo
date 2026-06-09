import { useState, useRef, useCallback, useEffect } from 'react';
import { VideoSegment, FILTER_OPTIONS, FilterType } from '../types';

interface TimelineEditorProps {
  segments: VideoSegment[];
  onUpdate: (segments: VideoSegment[]) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  duration: number;
}

const MAX_SEGMENTS = 20;
const MAX_SEGMENT_DURATION = 15;

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const TimelineEditor = ({ segments, onUpdate, onSelect, selectedId, duration }: TimelineEditorProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ segmentId: string; type: 'start' | 'end' } | null>(null);
  const [openFilterMenu, setOpenFilterMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenFilterMenu(null);
    if (openFilterMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openFilterMenu]);

  const formatTime = (s: number): string => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const snapToSecond = (v: number): number => Math.round(v);

  const getTimeFromX = useCallback((clientX: number): number => {
    if (!timelineRef.current || duration === 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snapToSecond(ratio * duration);
  }, [duration]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;

    const newTime = getTimeFromX(e.clientX);
    const updated = segments.map(seg => {
      if (seg.id !== dragging.segmentId) return seg;

      if (dragging.type === 'start') {
        const newStart = Math.max(0, Math.min(seg.endTime - 1, newTime));
        return { ...seg, startTime: newStart };
      } else {
        const clampedEnd = Math.min(duration, Math.min(seg.startTime + MAX_SEGMENT_DURATION, newTime));
        const newEnd = Math.max(seg.startTime + 1, clampedEnd);
        return { ...seg, endTime: newEnd };
      }
    });

    const sorted = [...updated].sort((a, b) => a.startTime - b.startTime);
    const nonOverlapping = sorted.map((seg, idx) => {
      if (idx === 0) return seg;
      const prev = sorted[idx - 1];
      if (seg.startTime < prev.endTime) {
        const newStart = prev.endTime;
        const newEnd = Math.max(newStart + 1, Math.min(seg.endTime, newStart + MAX_SEGMENT_DURATION));
        return { ...seg, startTime: newStart, endTime: Math.min(newEnd, duration) };
      }
      return seg;
    });

    onUpdate(nonOverlapping);
  }, [dragging, segments, duration, getTimeFromX, onUpdate]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (dragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const addSegment = useCallback(() => {
    if (segments.length >= MAX_SEGMENTS || duration === 0) return;

    const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
    let gapStart = 0;
    let foundGap = false;

    for (const seg of sorted) {
      if (seg.startTime - gapStart >= 2) {
        foundGap = true;
        break;
      }
      gapStart = seg.endTime;
    }

    if (!foundGap && duration - gapStart < 2) return;

    const gapEnd = foundGap
      ? sorted.find(s => s.startTime > gapStart)!.startTime
      : duration;

    const newStart = gapStart;
    const newEnd = Math.min(gapStart + Math.min(MAX_SEGMENT_DURATION, 15), Math.min(gapEnd, gapStart + MAX_SEGMENT_DURATION));

    if (newEnd - newStart < 1) return;

    const newSeg: VideoSegment = {
      id: generateId(),
      startTime: newStart,
      endTime: newEnd,
      title: `片段${segments.length + 1}`,
      filter: 'none'
    };

    onUpdate([...segments, newSeg].sort((a, b) => a.startTime - b.startTime));
    onSelect(newSeg.id);
  }, [segments, duration, onUpdate, onSelect]);

  const deleteSegment = useCallback((id: string) => {
    if (segments.length <= 1) return;
    const remaining = segments.filter(s => s.id !== id);
    onUpdate(remaining);
    if (selectedId === id && remaining.length > 0) {
      onSelect(remaining[0].id);
    }
  }, [segments, selectedId, onUpdate, onSelect]);

  const updateTitle = useCallback((id: string, title: string) => {
    const truncated = title.slice(0, 20);
    onUpdate(segments.map(s => s.id === id ? { ...s, title: truncated } : s));
  }, [segments, onUpdate]);

  const updateFilter = useCallback((id: string, filter: string) => {
    onUpdate(segments.map(s => s.id === id ? { ...s, filter } : s));
    setOpenFilterMenu(null);
  }, [segments, onUpdate]);

  const getFilterLabel = (value: string): string => {
    return FILTER_OPTIONS.find(f => f.value === value)?.label || '无';
  };

  const renderTimeMarkers = () => {
    if (duration === 0) return null;
    const markers = [];
    const step = duration <= 30 ? 1 : duration <= 60 ? 5 : 10;

    for (let t = 0; t <= duration; t += step) {
      const left = (t / duration) * 100;
      markers.push(
        <div key={t} style={{ ...styles.marker, left: `${left}%` }}>
          <div style={styles.markerLine} />
          <span style={styles.markerLabel}>{formatTime(t)}</span>
        </div>
      );
    }
    return markers;
  };

  if (duration === 0) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyIcon}>📊</div>
        <p style={styles.emptyText}>上传视频后编辑时间线</p>
      </div>
    );
  }

  const sortedSegments = [...segments].sort((a, b) => a.startTime - b.startTime);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.durationLabel}>视频时长: {formatTime(duration)}</div>
        <button
          style={{
            ...styles.addButton,
            opacity: segments.length >= MAX_SEGMENTS ? 0.5 : 1,
            cursor: segments.length >= MAX_SEGMENTS ? 'not-allowed' : 'pointer'
          }}
          onClick={addSegment}
          disabled={segments.length >= MAX_SEGMENTS}
        >
          + 添加片段 ({segments.length}/{MAX_SEGMENTS})
        </button>
      </div>

      <div
        ref={timelineRef}
        style={styles.timeline}
      >
        {renderTimeMarkers()}

        {sortedSegments.map((seg) => {
          const left = (seg.startTime / duration) * 100;
          const width = ((seg.endTime - seg.startTime) / duration) * 100;
          const isSelected = seg.id === selectedId;
          const segDuration = seg.endTime - seg.startTime;
          const isOverLimit = segDuration > MAX_SEGMENT_DURATION;

          return (
            <div
              key={seg.id}
              style={{
                ...styles.segment,
                left: `${left}%`,
                width: `${width}%`,
                backgroundColor: isSelected ? '#2A2A4E' : 'rgba(255,255,255,0.05)',
                border: isSelected ? '2px solid #FF4500' : '2px solid transparent'
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(seg.id);
              }}
            >
              <div
                style={{
                  ...styles.handle,
                  ...styles.handleLeft,
                  cursor: dragging?.segmentId === seg.id && dragging.type === 'start' ? 'ew-resize' : 'ew-resize'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragging({ segmentId: seg.id, type: 'start' });
                }}
              />

              <div style={styles.segmentContent}>
                <div style={styles.segmentTime}>
                  {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                  {isOverLimit && <span style={styles.overLimit}> ⚠</span>}
                </div>
              </div>

              <div
                style={{
                  ...styles.handle,
                  ...styles.handleRight,
                  cursor: dragging?.segmentId === seg.id && dragging.type === 'end' ? 'ew-resize' : 'ew-resize'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDragging({ segmentId: seg.id, type: 'end' });
                }}
              />
            </div>
          );
        })}
      </div>

      <div style={styles.segmentDetails}>
        {sortedSegments.map((seg) => {
          const isSelected = seg.id === selectedId;
          return (
            <div
              key={seg.id}
              style={{
                ...styles.detailItem,
                borderColor: isSelected ? '#FF4500' : 'rgba(255,255,255,0.1)'
              }}
              onClick={() => onSelect(seg.id)}
            >
              <div style={styles.detailRow}>
                <div style={styles.detailIndex}>{sortedSegments.indexOf(seg) + 1}</div>
                <input
                  style={{
                    ...styles.titleInput,
                    width: `calc(100% - 260px)`,
                    minWidth: 80,
                    borderColor: isSelected ? '#FF6F00' : 'rgba(255,255,255,0.15)'
                  }}
                  value={seg.title}
                  onChange={(e) => updateTitle(seg.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="片段标题"
                  maxLength={20}
                />
                <div style={styles.filterWrapper} onClick={(e) => e.stopPropagation()}>
                  <button
                    style={styles.filterButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFilterMenu(openFilterMenu === seg.id ? null : seg.id);
                    }}
                  >
                    🎨 {getFilterLabel(seg.filter)}
                  </button>
                  {openFilterMenu === seg.id && (
                    <div style={styles.filterDropdown}>
                      {FILTER_OPTIONS.map(opt => (
                        <div
                          key={opt.value}
                          style={{
                            ...styles.filterOption,
                            backgroundColor: seg.filter === opt.value ? 'rgba(255,111,0,0.2)' : 'transparent'
                          }}
                          onClick={() => updateFilter(seg.id, opt.value)}
                        >
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {segments.length > 1 && (
                  <button
                    style={styles.deleteButton}
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSegment(seg.id);
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={styles.detailTime}>
                {formatTime(seg.startTime)} ~ {formatTime(seg.endTime)} ({seg.endTime - seg.startTime}秒)
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexShrink: 0
  },
  durationLabel: {
    fontSize: 13,
    color: '#888'
  },
  addButton: {
    padding: '6px 14px',
    backgroundColor: '#1A1A2E',
    color: '#FF6F00',
    border: '1px solid rgba(255,111,0,0.3)',
    borderRadius: 6,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  timeline: {
    position: 'relative',
    width: '100%',
    height: 80,
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
    userSelect: 'none'
  },
  marker: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    pointerEvents: 'none'
  },
  markerLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  markerLabel: {
    position: 'absolute',
    bottom: 2,
    left: 4,
    fontSize: 10,
    color: '#666',
    whiteSpace: 'nowrap'
  },
  segment: {
    position: 'absolute',
    top: 8,
    height: 52,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, border-color 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden'
  },
  segmentContent: {
    flex: 1,
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  segmentTime: {
    fontSize: 11,
    color: '#CCC',
    whiteSpace: 'nowrap',
    fontVariantNumeric: 'tabular-nums'
  },
  overLimit: {
    color: '#FF6F00'
  },
  handle: {
    width: 6,
    height: '100%',
    backgroundColor: '#FFD700',
    flexShrink: 0,
    cursor: 'ew-resize',
    transition: 'background-color 0.2s ease'
  },
  handleLeft: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4
  },
  handleRight: {
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4
  },
  segmentDetails: {
    flex: 1,
    marginTop: 16,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    paddingRight: 4
  },
  detailItem: {
    padding: 12,
    backgroundColor: '#1A1A2E',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10
  },
  detailIndex: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    backgroundColor: '#FF6F00',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  titleInput: {
    flex: 1,
    padding: '6px 10px',
    backgroundColor: '#0F0F1F',
    color: '#EAEAEA',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  filterWrapper: {
    position: 'relative',
    flexShrink: 0
  },
  filterButton: {
    padding: '6px 10px',
    backgroundColor: '#0F0F1F',
    color: '#EAEAEA',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  filterDropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    backgroundColor: 'rgba(26,26,46,0.95)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
    zIndex: 100,
    minWidth: 100,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
  },
  filterOption: {
    padding: '8px 14px',
    fontSize: 13,
    color: '#EAEAEA',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease'
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: 'transparent',
    color: '#ff6666',
    border: '1px solid rgba(255,102,102,0.3)',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  detailTime: {
    marginTop: 8,
    fontSize: 11,
    color: '#666',
    fontVariantNumeric: 'tabular-nums'
  },
  emptyContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666'
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 14
  }
};

export default TimelineEditor;
