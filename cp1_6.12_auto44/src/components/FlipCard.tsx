import React, { useState, useEffect, useRef } from 'react';

export interface Poem {
  content: string;
  author: string;
  title: string;
}

export interface FlipCardProps {
  date: Date;
  poem: Poem;
  direction: 'forward' | 'backward' | null;
  onAnimationComplete: () => void;
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  return { year, month, day, weekday };
};

const getLunarDateText = (date: Date): string => {
  const lunarMonths = [
    '正月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '冬月', '腊月'
  ];
  const lunarDays = [
    '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
  ];
  
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const lunarDayIndex = dayOfYear % 30;
  const lunarMonthIndex = Math.floor(dayOfYear / 30) % 12;
  
  return `${lunarMonths[lunarMonthIndex]}${lunarDays[lunarDayIndex]}`;
};

const FlipCard: React.FC<FlipCardProps> = ({ date, poem, direction, onAnimationComplete }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayDate, setDisplayDate] = useState(date);
  const [displayPoem, setDisplayPoem] = useState(poem);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (direction && !isAnimating) {
      setIsAnimating(true);
      
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      
      animationTimeoutRef.current = setTimeout(() => {
        setDisplayDate(date);
        setDisplayPoem(poem);
      }, 300);
      
      setTimeout(() => {
        setIsAnimating(false);
        onAnimationComplete();
      }, 600);
    }
  }, [direction, date, poem, isAnimating, onAnimationComplete]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const { year, month, day, weekday } = formatDate(displayDate);
  const lunarText = getLunarDateText(displayDate);

  const animationClass = isAnimating
    ? direction === 'forward'
      ? 'flipping-forward'
      : 'flipping-backward'
    : '';

  return (
    <div
      ref={cardRef}
      className={`flip-card ${animationClass}`}
    >
      <div className="flip-card-inner">
        <div className="flip-card-face front">
          <div className="paper-texture"></div>
          <div className="corner-fold"></div>
          
          <div className="date-lunar">{lunarText}</div>
          <div className="date-day">{day}</div>
          <div className="date-weekday">{weekday}</div>
          <div className="date-month-year">{year}年 {month}月</div>
          
          <div className="poem-container">
            <div className="poem-content">{poem.content}</div>
            <div className="poem-author">—— {poem.author}《{poem.title}》</div>
          </div>
        </div>
        
        <div className="flip-card-face back">
          <div className="paper-texture"></div>
          <div className="date-lunar">{lunarText}</div>
          <div className="date-day">{day}</div>
          <div className="date-weekday">{weekday}</div>
          <div className="date-month-year">{year}年 {month}月</div>
          
          <div className="poem-container">
            <div className="poem-content">{poem.content}</div>
            <div className="poem-author">—— {poem.author}《{poem.title}》</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
