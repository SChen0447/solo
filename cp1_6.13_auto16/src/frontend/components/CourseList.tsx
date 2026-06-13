import React, { useState } from 'react';
import type { Course } from '../App';

interface CourseListProps {
  courses: Course[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectCourse: (course: Course) => void;
  currentUserId: string;
}

function CourseCard({
  course,
  index,
  currentUserId,
  onSelect,
}: {
  course: Course;
  index: number;
  currentUserId: string;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isBooked = course.bookedMembers.includes(currentUserId);
  const remaining = course.maxCapacity - course.bookedMembers.length;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'linear-gradient(135deg, #1a73e8, #4fc3f7)',
        borderRadius: 12,
        padding: 20,
        cursor: 'pointer',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 12px 32px rgba(26, 115, 232, 0.4)'
          : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        animation: `fadeIn 0.4s ease ${index * 0.08}s both`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isBooked && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#4caf50',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'checkmark 0.4s ease',
          }}
        >
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>✓</span>
        </div>
      )}
      <h3
        style={{
          color: '#fff',
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 8,
          paddingRight: isBooked ? 32 : 0,
        }}
      >
        {course.name}
      </h3>
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 4 }}>
        🏋️ {course.coach}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, marginBottom: 4 }}>
        📅 {course.date} {course.timeSlot}
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: remaining <= 3 ? '#ffeb3b' : 'rgba(255,255,255,0.9)',
            fontWeight: 600,
            animation: remaining <= 5 ? 'bounceNum 0.5s ease' : 'none',
          }}
        >
          剩余 {remaining} 个名额
        </span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
          {course.bookedMembers.length}/{course.maxCapacity}
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2a2a2a, #3a3a3a)',
        borderRadius: 12,
        padding: 20,
        height: 160,
      }}
    >
      <div className="skeleton" style={{ width: '60%', height: 20, marginBottom: 12 }} />
      <div className="skeleton" style={{ width: '40%', height: 14, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '50%', height: 14, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: '30%', height: 14, marginTop: 16 }} />
    </div>
  );
}

export default function CourseList({
  courses,
  loading,
  refreshing,
  onRefresh,
  onSelectCourse,
  currentUserId,
}: CourseListProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    name: '',
    coach: '',
    date: '',
    timeSlot: '',
    maxCapacity: 10,
  });

  const handleAddCourse = async () => {
    if (!newCourse.name || !newCourse.coach || !newCourse.date || !newCourse.timeSlot) return;
    try {
      const axios = (await import('axios')).default;
      await axios.post('/api/courses', newCourse);
      setNewCourse({ name: '', coach: '', date: '', timeSlot: '', maxCapacity: 10 });
      setShowAddForm(false);
      onRefresh();
    } catch (err) {
      console.error('Add course failed', err);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h2 style={{ color: '#e0e0e0', fontSize: 22, fontWeight: 700 }}>团体课程</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onRefresh}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 12,
              padding: '8px 16px',
              color: '#e0e0e0',
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                animation: refreshing ? 'spin 1s linear infinite' : 'none',
                fontSize: 16,
              }}
            >
              ↻
            </span>
            刷新
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              background: 'linear-gradient(135deg, #1a73e8, #4fc3f7)',
              border: 'none',
              borderRadius: 12,
              padding: '8px 16px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            + 发布课程
          </button>
        </div>
      </div>

      {showAddForm && (
        <div
          style={{
            background: '#1e1e1e',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            animation: 'slideUp 0.3s ease',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3 style={{ color: '#e0e0e0', marginBottom: 16, fontSize: 16 }}>发布新课程</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <input
              placeholder="课程名称"
              value={newCourse.name}
              onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="教练名"
              value={newCourse.coach}
              onChange={(e) => setNewCourse({ ...newCourse, coach: e.target.value })}
              style={inputStyle}
            />
            <input
              type="date"
              value={newCourse.date}
              onChange={(e) => setNewCourse({ ...newCourse, date: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="时段 (如 09:00-10:00)"
              value={newCourse.timeSlot}
              onChange={(e) => setNewCourse({ ...newCourse, timeSlot: e.target.value })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder="最大人数 (5-20)"
              min={5}
              max={20}
              value={newCourse.maxCapacity}
              onChange={(e) => setNewCourse({ ...newCourse, maxCapacity: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button onClick={handleAddCourse} style={primaryBtnStyle}>
              确认发布
            </button>
            <button onClick={() => setShowAddForm(false)} style={cancelBtnStyle}>
              取消
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="course-grid" style={gridStyle}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="course-grid" style={gridStyle}>
          {courses.map((course, i) => (
            <CourseCard
              key={course.id}
              course={course}
              index={i}
              currentUserId={currentUserId}
              onSelect={() => onSelectCourse(course)}
            />
          ))}
        </div>
      )}

      {!loading && courses.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666',
            fontSize: 16,
          }}
        >
          暂无课程，点击"发布课程"添加
        </div>
      )}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16,
};

const inputStyle: React.CSSProperties = {
  background: '#2a2a2a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '10px 14px',
  color: '#e0e0e0',
  fontSize: 14,
  outline: 'none',
};

const primaryBtnStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #1a73e8, #4fc3f7)',
  border: 'none',
  borderRadius: 12,
  padding: '10px 24px',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};

const cancelBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  border: 'none',
  borderRadius: 12,
  padding: '10px 24px',
  color: '#aaa',
  cursor: 'pointer',
  fontSize: 14,
};
