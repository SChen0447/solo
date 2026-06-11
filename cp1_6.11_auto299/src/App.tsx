import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, useSpring, useMotionValue, animate } from 'framer-motion';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createClockScene, ClockSceneApi, ClockParams } from './clockScene';

const paramsSchema = z.object({
  gearModule: z.number().min(0.5).max(2.0),
  sunRatio: z.number().min(0.95).max(1.05),
  moonRatio: z.number().min(0.97).max(1.03)
});

type LogType = 'module' | 'ratio' | 'date' | 'reset';

interface LogEntry {
  id: string;
  timestamp: string;
  type: LogType;
  detail: string;
  errorValue: number;
}

interface ErrorData {
  sunArcmin: number;
  moonArcmin: number;
  planetArcmin: number;
  totalArcmin: number;
  dayOfYear: number;
}

const MONTHS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月'
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dayOfYearToDate(dayOfYear: number): string {
  const d = Math.max(1, Math.min(365, Math.floor(dayOfYear)));
  let remaining = d;
  let month = 0;
  for (let i = 0; i < 12; i++) {
    if (remaining <= DAYS_IN_MONTH[i]) {
      month = i;
      break;
    }
    remaining -= DAYS_IN_MONTH[i];
    if (i === 11) month = 11;
  }
  return `${MONTHS[month]} ${remaining}日`;
}

const ROMAN_HOURS = [
  '子初', '丑初', '寅初', '卯初', '辰初', '巳初',
  '午初', '未初', '申初', '酉初', '戌初', '亥初'
];

function getClockHour(dayProgress: number): string {
  const hourIdx = Math.floor(dayProgress * 12) % 12;
  return `${ROMAN_HOURS[hourIdx]}时辰`;
}

function getErrorClass(totalArcmin: number): 'excellent' | 'warning' | 'critical' {
  if (totalArcmin < 1) return 'excellent';
  if (totalArcmin <= 5) return 'warning';
  return 'critical';
}

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const clockApiRef = useRef<ClockSceneApi | null>(null);
  const logContentRef = useRef<HTMLDivElement>(null);

  const [gearModule, setGearModuleState] = useState(1.0);
  const [sunRatio, setSunRatioState] = useState(1.0);
  const [moonRatio, setMoonRatioState] = useState(1.0);
  const [selectedDay, setSelectedDay] = useState(80);
  const [errorData, setErrorData] = useState<ErrorData>({
    sunArcmin: 0,
    moonArcmin: 0,
    planetArcmin: 0,
    totalArcmin: 0,
    dayOfYear: 80
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const errorDisplay = useMotionValue(0);
  const springError = useSpring(errorDisplay, {
    stiffness: 260,
    damping: 22,
    mass: 0.5
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
  const lastChangeRef = useRef<{ type: LogType | null; lastValue: number }>({ type: null, lastValue: 0 });

  const validatedParams = useMemo<ClockParams>(() => {
    const result = paramsSchema.safeParse({ gearModule, sunRatio, moonRatio });
    if (result.success) return result.data;
    return { gearModule: 1.0, sunRatio: 1.0, moonRatio: 1.0 };
  }, [gearModule, sunRatio, moonRatio]);

  const addLog = useCallback((type: LogType, detail: string, errorValue: number) => {
    const now = new Date();
    const dayProgress = (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
    const timestamp = getClockHour(dayProgress);
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp,
      type,
      detail,
      errorValue
    };
    setLogs(prev => [entry, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const api = createClockScene(canvasContainerRef.current);
    clockApiRef.current = api;
    api.setDate(selectedDay);
    let running = true;
    const pollError = () => {
      if (!running) return;
      if (clockApiRef.current) {
        const e = clockApiRef.current.getError();
        setErrorData(e);
        animate(errorDisplay, e.totalArcmin, {
          duration: 0.3,
          ease: [0.25, 0.1, 0.25, 1.0]
        });
      }
      requestAnimationFrame(() => setTimeout(pollError, 80));
    };
    setTimeout(pollError, 100);
    return () => {
      running = false;
      api.dispose();
    };
  }, []);

  useEffect(() => {
    if (clockApiRef.current) {
      clockApiRef.current.updateGearRatio(validatedParams);
    }
  }, [validatedParams]);

  useEffect(() => {
    if (logContentRef.current) {
      logContentRef.current.scrollTop = 0;
    }
  }, [logs]);

  const handleGearModuleChange = useCallback((value: number) => {
    setGearModuleState(value);
    if (lastChangeRef.current.type !== 'module' || Math.abs(lastChangeRef.current.lastValue - value) >= 0.1) {
      lastChangeRef.current = { type: 'module', lastValue: value };
      setTimeout(() => {
        addLog('module', `齿轮模数调整至 ${value.toFixed(1)}`, errorData.totalArcmin);
      }, 50);
    }
  }, [addLog, errorData.totalArcmin]);

  const handleSunRatioChange = useCallback((value: number) => {
    setSunRatioState(value);
    if (lastChangeRef.current.type !== 'ratio' || Math.abs(lastChangeRef.current.lastValue - value) >= 0.005) {
      lastChangeRef.current = { type: 'ratio', lastValue: value };
      setTimeout(() => {
        addLog('ratio', `太阳环速比调整至 ${value.toFixed(3)}`, errorData.totalArcmin);
      }, 50);
    }
  }, [addLog, errorData.totalArcmin]);

  const handleMoonRatioChange = useCallback((value: number) => {
    setMoonRatioState(value);
    if (lastChangeRef.current.type !== 'ratio' || Math.abs(lastChangeRef.current.lastValue - value) >= 0.005) {
      lastChangeRef.current = { type: 'ratio', lastValue: value };
      setTimeout(() => {
        addLog('ratio', `月亮环速比调整至 ${value.toFixed(3)}`, errorData.totalArcmin);
      }, 50);
    }
  }, [addLog, errorData.totalArcmin]);

  const handleReset = useCallback(() => {
    if (clockApiRef.current) {
      clockApiRef.current.reset();
    }
    setGearModuleState(1.0);
    setSunRatioState(1.0);
    setMoonRatioState(1.0);
    setSelectedDay(80);
    lastChangeRef.current = { type: 'reset', lastValue: 0 };
    setTimeout(() => {
      addLog('reset', '所有齿轮与指针已回归初始位置', errorData.totalArcmin);
    }, 100);
  }, [addLog, errorData.totalArcmin]);

  const handleTimelineInteraction = useCallback((clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const day = Math.round(ratio * 364) + 1;
    setSelectedDay(day);
    if (clockApiRef.current) {
      clockApiRef.current.setDate(day);
    }
    if (lastChangeRef.current.type !== 'date' || lastChangeRef.current.lastValue !== day) {
      lastChangeRef.current = { type: 'date', lastValue: day };
      setTimeout(() => {
        addLog('date', `时间跳转至 ${dayOfYearToDate(day)}（第${day}天）`, errorData.totalArcmin);
      }, 50);
    }
  }, [addLog, errorData.totalArcmin]);

  const handleTimelineMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDraggingTimeline(true);
    handleTimelineInteraction(e.clientX);
  }, [handleTimelineInteraction]);

  useEffect(() => {
    if (!isDraggingTimeline) return;
    const handleMove = (e: MouseEvent) => {
      handleTimelineInteraction(e.clientX);
    };
    const handleUp = () => {
      setIsDraggingTimeline(false);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingTimeline, handleTimelineInteraction]);

  const errorClass = getErrorClass(errorData.totalArcmin);

  const springTransform = springError;
  void springTransform;

  const thumbPosition = ((selectedDay - 1) / 364) * 100;

  return (
    <div className="app-container">
      <div className="title-banner">
        <h1>ASTRONOMICVM HOROLOGIVM</h1>
        <p>中世纪天文钟 · 齿轮联动校准工坊</p>
      </div>

      <div ref={canvasContainerRef} className="canvas-container" />

      <motion.div
        className="control-panel"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.1, 0.25, 1.0] }}
      >
        <h2>⚙ 校准控制台 ⚙</h2>

        <div className="slider-group">
          <label>齿轮模数 MODVLVS (0.5 - 2.0)</label>
          <div className="slider-row">
            <motion.input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={gearModule}
              onChange={(e) => handleGearModuleChange(parseFloat(e.target.value))}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
              style={{ flex: 1 }}
            />
            <motion.span
              className="slider-value"
              key={gearModule}
              initial={{ scale: 1.2, color: '#ffd54f' }}
              animate={{ scale: 1, color: '#5d4037' }}
              transition={{ duration: 0.3 }}
            >
              {gearModule.toFixed(1)}
            </motion.span>
          </div>
        </div>

        <div className="slider-group">
          <label>太阳环速比 RATIO SOLARIS (0.950 - 1.050)</label>
          <div className="slider-row">
            <motion.input
              type="range"
              min="0.95"
              max="1.05"
              step="0.001"
              value={sunRatio}
              onChange={(e) => handleSunRatioChange(parseFloat(e.target.value))}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
              style={{ flex: 1 }}
            />
            <motion.span
              className="slider-value"
              key={sunRatio}
              initial={{ scale: 1.15, color: '#e0e0e0' }}
              animate={{ scale: 1, color: '#5d4037' }}
              transition={{ duration: 0.3 }}
            >
              {sunRatio.toFixed(3)}
            </motion.span>
          </div>
        </div>

        <div className="slider-group">
          <label>月亮环速比 RATIO LVNARIS (0.970 - 1.030)</label>
          <div className="slider-row">
            <motion.input
              type="range"
              min="0.97"
              max="1.03"
              step="0.001"
              value={moonRatio}
              onChange={(e) => handleMoonRatioChange(parseFloat(e.target.value))}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
              style={{ flex: 1 }}
            />
            <motion.span
              className="slider-value"
              key={moonRatio}
              initial={{ scale: 1.15, color: '#e0e0e0' }}
              animate={{ scale: 1, color: '#5d4037' }}
              transition={{ duration: 0.3 }}
            >
              {moonRatio.toFixed(3)}
            </motion.span>
          </div>
        </div>

        <motion.button
          className="reset-btn"
          onClick={handleReset}
          whileHover={{
            scale: 1.05,
            boxShadow: '0 6px 18px rgba(62, 39, 35, 0.45)'
          }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
        >
          ✧ RESET 复位 ✧
        </motion.button>

        <div className="error-display">
          <div className="error-label">指针误差 ARCVVM DEVIATIO</div>
          <motion.div
            key={`${errorData.totalArcmin.toFixed(2)}-${errorClass}`}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
          >
            <span className={`error-value ${errorClass}`}>
              {errorData.totalArcmin.toFixed(2)}
            </span>
            <span className="error-unit">弧分</span>
          </motion.div>
          <div style={{
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            opacity: 0.7,
            letterSpacing: '0.5px'
          }}>
            <span>☀ {errorData.sunArcmin.toFixed(1)}'</span>
            <span>☾ {errorData.moonArcmin.toFixed(1)}'</span>
            <span>★ {errorData.planetArcmin.toFixed(1)}'</span>
          </div>
        </div>
      </motion.div>

      <div className="timeline-container">
        <motion.div
          className="timeline-track"
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
          whileHover={{
            boxShadow: 'inset 0 4px 12px rgba(0, 0, 0, 0.4), 0 6px 20px rgba(62, 39, 35, 0.4)',
            scale: 1.005
          }}
          style={{ cursor: isDraggingTimeline ? 'grabbing' : 'pointer' }}
        >
          <motion.div
            className="timeline-thumb"
            style={{ left: `${thumbPosition}%` }}
            drag={false}
          >
            <div className="timeline-triangle" />
            <motion.div
              className="timeline-date"
              key={selectedDay}
              initial={{ y: -5, opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {dayOfYearToDate(selectedDay)}
            </motion.div>
          </motion.div>
        </motion.div>
        <div className="timeline-labels">
          <span className="timeline-label">❄ 冬至</span>
          <span className="timeline-label">❀ 春分</span>
          <span className="timeline-label">☀ 夏至</span>
          <span className="timeline-label">🍂 秋分</span>
          <span className="timeline-label">❄ 冬至</span>
        </div>
      </div>

      <motion.div
        className="log-window"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
        whileHover={{ scale: 1.01 }}
      >
        <div className="log-header">❖ 大师工作日志 ❖</div>
        <div className="log-content" ref={logContentRef}>
          {logs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '24px 12px',
              color: 'rgba(255, 248, 225, 0.6)',
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              转动齿轮或调整滑块...<br />
              每一次操作皆将铭刻于此
            </div>
          ) : (
            logs.map((log, idx) => (
              <motion.div
                key={log.id}
                className={`log-entry ${log.type}`}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: Math.min(idx * 0.02, 0.15), ease: [0.25, 0.1, 0.25, 1.0] }}
              >
                <span className="log-time">⟡ {log.timestamp} ⟡</span>
                <div className="log-detail">
                  {log.detail}
                  <span style={{
                    float: 'right',
                    fontWeight: 700,
                    color: getErrorClass(log.errorValue) === 'excellent' ? '#4caf50'
                      : getErrorClass(log.errorValue) === 'warning' ? '#ff9800' : '#f44336'
                  }}>
                    {log.errorValue.toFixed(2)}'
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
