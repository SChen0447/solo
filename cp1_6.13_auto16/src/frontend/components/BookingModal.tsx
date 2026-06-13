import React, { useState, useEffect } from 'react';
import type { Course } from '../App';

interface BookingModalProps {
  course: Course;
  currentUserId: string;
  onBook: (courseId: string) => Promise<void>;
  onCancel: (courseId: string) => Promise<void>;
  onClose: () => void;
}

export default function BookingModal({
  course,
  currentUserId,
  onBook,
  onCancel,
  onClose,
}: BookingModalProps) {
  const [visible, setVisible] = useState(false);
  const [booking, setBooking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const isBooked = course.bookedMembers.includes(currentUserId);
  const remaining = course.maxCapacity - course.bookedMembers.length;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setFadeOut(true);
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const handleBookClick = async () => {
    setBooking(true);
    await onBook(course.id);
    setBooking(false);
  };

  const handleCancelClick = () => {
    setShowConfirm(true);
  };

  const confirmCancel = async () => {
    setBooking(true);
    setShowConfirm(false);
    await onCancel(course.id);
    setBooking(false);
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible && !fadeOut ? 1 : 0,
        transition: 'opacity 0.25s ease',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#1e1e1e',
          borderRadius: 16,
          padding: 28,
          maxWidth: 460,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
          transform: visible && !fadeOut ? 'translateY(0)' : 'translateY(30px)',
          opacity: visible && !fadeOut ? 1 : 0,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          position: 'relative',
        }}
      >
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 8,
            width: 32,
            height: 32,
            color: '#aaa',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        <div
          style={{
            background: 'linear-gradient(135deg, #1a73e8, #4fc3f7)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
          }}
        >
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
            {course.name}
          </h2>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 4 }}>
            🏋️ 教练: {course.coach}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
            📅 时间: {course.date} {course.timeSlot}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginBottom: 20,
          }}
        >
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>已预约</div>
            <div style={{ color: '#4fc3f7', fontSize: 24, fontWeight: 700 }}>
              {course.bookedMembers.length}
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>总名额</div>
            <div style={{ color: '#e0e0e0', fontSize: 24, fontWeight: 700 }}>
              {course.maxCapacity}
            </div>
          </div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>剩余</div>
            <div
              style={{
                color: remaining <= 3 ? '#ffeb3b' : '#4caf50',
                fontSize: 24,
                fontWeight: 700,
                animation: remaining <= 5 ? 'bounceNum 0.5s ease' : 'none',
              }}
            >
              {remaining}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isBooked ? (
            <button
              onClick={handleBookClick}
              disabled={booking || remaining === 0}
              style={{
                background:
                  remaining === 0
                    ? '#444'
                    : 'linear-gradient(135deg, #1a73e8, #4fc3f7)',
                border: 'none',
                borderRadius: 12,
                padding: '14px 0',
                color: remaining === 0 ? '#888' : '#fff',
                fontSize: 16,
                fontWeight: 600,
                cursor: remaining === 0 || booking ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {booking ? '处理中...' : remaining === 0 ? '课程已满' : '立即预约'}
            </button>
          ) : (
            <>
              <button
                style={{
                  background: '#4caf50',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 0',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  animation: 'checkmark 0.4s ease',
                }}
              >
                <span style={{ animation: 'checkmark 0.4s ease' }}>✓</span>
                已预约
              </button>
              <button
                onClick={handleCancelClick}
                style={{
                  background: 'rgba(244, 67, 54, 0.15)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: 12,
                  padding: '12px 0',
                  color: '#f44336',
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                取消预约
              </button>
            </>
          )}
        </div>

        {showConfirm && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div
              style={{
                background: '#2a2a2a',
                borderRadius: 12,
                padding: 24,
                textAlign: 'center',
                maxWidth: 280,
              }}
            >
              <p style={{ color: '#e0e0e0', fontSize: 15, marginBottom: 20 }}>
                确定要取消预约「{course.name}」吗？
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={confirmCancel}
                  style={{
                    background: '#f44336',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 24px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  确认取消
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '10px 24px',
                    color: '#aaa',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  返回
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
