import React, { useState, useEffect, useCallback } from 'react';
import CourseList from './components/CourseList';
import BookingModal from './components/BookingModal';
import ProgressChart from './components/ProgressChart';
import axios from 'axios';

export interface Course {
  id: string;
  name: string;
  coach: string;
  date: string;
  timeSlot: string;
  maxCapacity: number;
  bookedMembers: string[];
}

export interface WorkoutRecord {
  id: string;
  memberId: string;
  date: string;
  courseName: string;
  duration: number;
}

const CURRENT_USER = 'user1';

const globalStyles = document.createElement('style');
globalStyles.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes ripple {
    0% { transform: scale(0); opacity: 0.5; }
    100% { transform: scale(4); opacity: 0; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes skeletonPulse {
    0% { opacity: 0.4; }
    50% { opacity: 1; }
    100% { opacity: 0.4; }
  }
  @keyframes bounceNum {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes checkmark {
    0% { transform: scale(0); }
    50% { transform: scale(1.2); }
    100% { transform: scale(1); }
  }
  .skeleton {
    background: linear-gradient(90deg, #2a2a2a 25%, #3a3a3a 50%, #2a2a2a 75%);
    background-size: 200% 100%;
    animation: skeletonPulse 1.5s ease-in-out infinite;
    border-radius: 8px;
  }
`;
document.head.appendChild(globalStyles);

function App() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [records, setRecords] = useState<WorkoutRecord[]>([]);
  const [page, setPage] = useState<'courses' | 'progress'>('courses');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageTransition, setPageTransition] = useState<'in' | 'out'>('in');

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get('/api/courses');
      setCourses(res.data);
    } catch {
      console.error('Failed to fetch courses');
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await axios.get(`/api/progress/${CURRENT_USER}`);
      setRecords(res.data);
    } catch {
      console.error('Failed to fetch progress');
    }
  }, []);

  const initialFetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCourses(), fetchRecords()]);
    setLoading(false);
  }, [fetchCourses, fetchRecords]);

  useEffect(() => {
    initialFetch();
  }, [initialFetch]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCourses();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchCourses]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCourses();
    setRefreshing(false);
  };

  const handleBook = async (courseId: string) => {
    try {
      await axios.post(`/api/courses/${courseId}/book`, { memberId: CURRENT_USER });
      await fetchCourses();
    } catch (err) {
      console.error('Booking failed', err);
    }
  };

  const handleCancel = async (courseId: string) => {
    try {
      await axios.post(`/api/courses/${courseId}/cancel`, { memberId: CURRENT_USER });
      await fetchCourses();
    } catch (err) {
      console.error('Cancel failed', err);
    }
  };

  const switchPage = (target: 'courses' | 'progress') => {
    if (target === page) return;
    setPageTransition('out');
    setTimeout(() => {
      setPage(target);
      setPageTransition('in');
      if (target === 'progress') fetchRecords();
    }, 150);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#121212' }}>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          background: 'rgba(18, 18, 18, 0.8)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          padding: '0 24px',
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1a73e8, #4fc3f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            FitStudio
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['courses', 'progress'] as const).map((p) => (
            <button
              key={p}
              onClick={() => switchPage(p)}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'all 0.3s ease',
                background: page === p ? 'linear-gradient(135deg, #1a73e8, #4fc3f7)' : 'transparent',
                color: page === p ? '#fff' : '#aaa',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {p === 'courses' ? '课程预约' : '我的进度'}
            </button>
          ))}
        </div>
      </nav>

      <main
        style={{
          paddingTop: 72,
          padding: '72px 24px 24px',
          maxWidth: 1200,
          margin: '0 auto',
          opacity: pageTransition === 'in' ? 1 : 0,
          transform: pageTransition === 'in' ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {page === 'courses' && (
          <CourseList
            courses={courses}
            loading={loading}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onSelectCourse={(c) => setSelectedCourse(c)}
            currentUserId={CURRENT_USER}
          />
        )}
        {page === 'progress' && (
          <ProgressChart records={records} loading={loading} />
        )}
      </main>

      {selectedCourse && (
        <BookingModal
          course={selectedCourse}
          currentUserId={CURRENT_USER}
          onBook={handleBook}
          onCancel={handleCancel}
          onClose={() => setSelectedCourse(null)}
        />
      )}
    </div>
  );
}

export default App;
