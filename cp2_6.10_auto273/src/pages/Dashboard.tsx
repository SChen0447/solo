import { useState, useEffect, useMemo } from 'react';
import { motion, useSpring, AnimatePresence } from 'framer-motion';
import { format, parse } from 'date-fns';
import { Book, Reader, BorrowRecord, ExchangeRequest, Activity } from '../types';
import './Dashboard.css';

interface DashboardProps {
  bookList: Book[];
  readerList: Reader[];
  borrowRecords: BorrowRecord[];
  exchangeRequests: ExchangeRequest[];
}

function AnimatedCount({ target }: { target: number }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });

  useEffect(() => {
    spring.set(target);
  }, [target, spring]);

  return (
    <motion.span>
      {Math.round(Number(spring.get()))}
    </motion.span>
  );
}

export default function Dashboard({ bookList, readerList, borrowRecords, exchangeRequests }: DashboardProps) {
  const totalBooks = bookList.length;
  const borrowedBooks = borrowRecords.filter((r) => r.status === 'borrowed').length;
  const totalReaders = readerList.length;

  const activities = useMemo<Activity[]>(() => {
    const result: Activity[] = [];

    borrowRecords.forEach((r) => {
      result.push({
        id: `borrow-${r.id}`,
        type: 'borrow',
        bookTitle: r.bookTitle || '未知书籍',
        readerName: r.readerName,
        timestamp: r.borrowDate,
      });
      if (r.returnDate) {
        result.push({
          id: `return-${r.id}`,
          type: 'return',
          bookTitle: r.bookTitle || '未知书籍',
          readerName: r.readerName,
          timestamp: r.returnDate,
        });
      }
    });

    exchangeRequests.forEach((e) => {
      result.push({
        id: `exchange-${e.id}`,
        type: 'exchange',
        bookTitle: e.bookTitle,
        readerName: e.readerName,
        timestamp: e.requestDate,
      });
    });

    return result
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);
  }, [borrowRecords, exchangeRequests]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (activities.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activities.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [activities.length]);

  const formatFullDate = (dateStr: string) => {
    try {
      const date = parse(dateStr, 'yyyy-MM-dd HH:mm', new Date());
      return format(date, 'yyyy年MM月dd日 HH:mm');
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    return dateStr;
  };

  const getActivityLabel = (type: Activity['type']) => {
    switch (type) {
      case 'borrow':
        return '已借出';
      case 'return':
        return '已归还';
      case 'exchange':
        return '换书入库';
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'borrow':
        return '#f39c12';
      case 'return':
        return '#27ae60';
      case 'exchange':
        return '#8d6e63';
    }
  };

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">数据看板</h1>

      <div className="stats-grid">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="stat-icon">📚</div>
          <div className="stat-number">
            <AnimatedCount target={totalBooks} />
          </div>
          <div className="stat-label">总藏书数</div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="stat-icon">📖</div>
          <div className="stat-number">
            <AnimatedCount target={borrowedBooks} />
          </div>
          <div className="stat-label">当前借出</div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="stat-icon">👥</div>
          <div className="stat-number">
            <AnimatedCount target={totalReaders} />
          </div>
          <div className="stat-label">总读者数</div>
        </motion.div>
      </div>

      <h2 className="section-title">最近活动</h2>

      <div className="timeline-container">
        {activities.length === 0 ? (
          <div className="empty-state">暂无活动记录</div>
        ) : (
          activities.map((activity, index) => {
            const depth = (activities.length - index) / activities.length;
            const isHighlighted = index === currentIndex;
            return (
              <AnimatePresence mode="wait" key={activity.id}>
                <motion.div
                  className="timeline-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{
                    opacity: isHighlighted ? 1 : 0.4 + depth * 0.5,
                    x: 0,
                    scale: isHighlighted ? 1.02 : 1,
                  }}
                  transition={{ duration: 0.5 }}
                  style={{
                    background: `linear-gradient(135deg, rgba(255,255,255,${0.85 + depth * 0.15}) 0%, rgba(245,240,232,${0.9 + depth * 0.1}) 100%)`,
                  }}
                  title={formatFullDate(activity.timestamp)}
                >
                  <div className="timeline-dot" style={{ backgroundColor: getActivityColor(activity.type) }} />
                  <div className="timeline-content">
                    <span className="timeline-book">《{activity.bookTitle}》</span>
                    <span className="timeline-separator">-</span>
                    <span className="timeline-type" style={{ color: getActivityColor(activity.type) }}>
                      {getActivityLabel(activity.type)}
                    </span>
                    <span className="timeline-separator">-</span>
                    <span className="timeline-time">{formatShortDate(activity.timestamp)}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
            );
          })
        )}
      </div>
    </div>
  );
}
