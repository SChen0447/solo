import React, { useState, useRef, useEffect } from 'react';
import { HistoryEvent, categoryColors } from './eventData';

interface EventCardProps {
  event: HistoryEvent;
  isHighlighted?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, isHighlighted = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState(80);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isExpanded ? contentRef.current.scrollHeight : 80);
    }
  }, [isExpanded]);

  const categoryColor = categoryColors[event.category];

  return (
    <div
      className="event-card"
      style={{
        position: 'relative',
        marginBottom: '12px',
        backgroundColor: 'rgba(30, 30, 50, 0.9)',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.3s ease-out',
        border: isHighlighted ? `1px solid ${categoryColor}` : '1px solid #333',
        boxShadow: isHighlighted ? `0 0 15px ${categoryColor}40` : 'none',
        transform: isHighlighted ? 'translateX(4px)' : 'translateX(0)',
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: categoryColor,
        }}
      />

      <div
        style={{
          height: `${contentHeight}px`,
          transition: 'height 0.4s ease-in-out',
          overflow: 'hidden',
        }}
      >
        <div ref={contentRef} style={{ padding: '12px 16px 16px 20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '56px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '18px' }}>{event.icon}</span>
                <h3
                  style={{
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: 700,
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {event.title}
                </h3>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span
                  style={{
                    color: '#888',
                    fontSize: '12px',
                  }}
                >
                  {event.year}年
                </span>
                <span
                  style={{
                    color: categoryColor,
                    fontSize: '11px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: `${categoryColor}20`,
                  }}
                >
                  {event.category}
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                marginLeft: '8px',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#888"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: 'transform 0.4s ease-in-out',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <p
            style={{
              color: '#aaa',
              fontSize: '14px',
              margin: '12px 0 0 0',
              lineHeight: 1.5,
            }}
          >
            {event.summary}
          </p>

          {isExpanded && (
            <div style={{ marginTop: '16px' }}>
              <p
                style={{
                  color: '#ccc',
                  fontSize: '14px',
                  margin: '0 0 16px 0',
                  lineHeight: 1.8,
                }}
              >
                {event.description}
              </p>
              <div
                style={{
                  width: '100%',
                  height: '180px',
                  borderRadius: '6px',
                  background: `linear-gradient(135deg, ${categoryColor}30 0%, ${categoryColor}10 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '64px',
                  border: `1px dashed ${categoryColor}40`,
                }}
              >
                {event.icon}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
