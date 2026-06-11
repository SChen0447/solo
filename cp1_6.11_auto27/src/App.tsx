import { useState, useCallback, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { TeamMember, Evaluation, TabType, MemberStats, DailyStats } from './types';
import EvaluationPanel from './components/EvaluationPanel';
import Dashboard from './components/Dashboard';
import Animation from './components/Animation';
import './App.css';

const INITIAL_MEMBERS: TeamMember[] = [
  { id: '1', name: '张明辉', anonymousName: '成员A' },
  { id: '2', name: '李思琪', anonymousName: '成员B' },
  { id: '3', name: '王浩然', anonymousName: '成员C' },
  { id: '4', name: '刘雨萱', anonymousName: '成员D' },
  { id: '5', name: '陈子轩', anonymousName: '成员E' },
];

function App() {
  const [members] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showEvaluationPanel, setShowEvaluationPanel] = useState(false);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const [lastEvaluation, setLastEvaluation] = useState<Evaluation | null>(null);
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const [tabAnimationKey, setTabAnimationKey] = useState(0);

  const shuffleMembers = useCallback((arr: TeamMember[]) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const [shuffledMembers, setShuffledMembers] = useState<TeamMember[]>(
    () => shuffleMembers(INITIAL_MEMBERS)
  );

  const memberStats = useMemo<MemberStats[]>(() => {
    return members.map((member) => {
      const memberEvals = evaluations.filter((e) => e.targetId === member.id);
      const ratings = memberEvals.map((e) => e.rating);
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;
      return {
        memberId: member.id,
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalEvaluations: ratings.length,
        ratings,
      };
    });
  }, [members, evaluations]);

  const dailyStats = useMemo<DailyStats[]>(() => {
    const days: DailyStats[] = [];
    for (let day = 1; day <= currentDay; day++) {
      const dayEvals = evaluations.filter((e) => {
        const evalDay = Math.ceil((e.timestamp - 0) / 86400000) || 1;
        return evalDay === day;
      });
      const uniqueParticipants = new Set(dayEvals.map((e) => e.id)).size;
      const avgRating = dayEvals.length > 0
        ? dayEvals.reduce((sum, e) => sum + e.rating, 0) / dayEvals.length
        : 0;
      days.push({
        day,
        participantCount: dayEvals.length > 0 ? Math.min(5, uniqueParticipants + Math.floor(Math.random() * 3)) : 0,
        averageRating: parseFloat(avgRating.toFixed(2)),
      });
    }
    return days;
  }, [evaluations, currentDay]);

  const ratingDistribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    evaluations.forEach((e) => {
      if (e.rating >= 1 && e.rating <= 5) {
        dist[e.rating]++;
      }
    });
    return Object.entries(dist).map(([rating, count]) => ({
      rating: `${rating}星`,
      value: count,
    }));
  }, [evaluations]);

  const handleSubmitEvaluation = useCallback((targetId: string, rating: number, comment: string) => {
    const newEvaluation: Evaluation = {
      id: uuidv4(),
      targetId,
      rating,
      comment,
      timestamp: Date.now(),
      round: currentRound,
    };

    setEvaluations((prev) => [...prev, newEvaluation]);
    setLastEvaluation(newEvaluation);
    setAnimationTrigger((prev) => prev + 1);

    setTimeout(() => {
      setShowEvaluationPanel(false);
      setActiveTab('dashboard');
    }, 2500);
  }, [currentRound]);

  const handleStartEvaluation = useCallback(() => {
    setShuffledMembers(shuffleMembers(members));
    setShowEvaluationPanel(true);
    setActiveTab('evaluate');
  }, [members, shuffleMembers]);

  const handleAdminToggle = useCallback(() => {
    setAdminClickCount((prev) => {
      const newCount = prev + 1;
      if (newCount >= 2) {
        setIsAdminMode((prev) => !prev);
        return 0;
      }
      return newCount;
    });
  }, []);

  const handleReset = useCallback(() => {
    setIsResetting(true);
    setTimeout(() => {
      setEvaluations([]);
      setCurrentRound((prev) => prev + 1);
      setCurrentDay((prev) => prev + 1);
      setShowResetDialog(false);
      setActiveTab('home');
      setLastEvaluation(null);
      setTimeout(() => {
        setIsResetting(false);
      }, 500);
    }, 800);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setTabAnimationKey((prev) => prev + 1);
    if (tab === 'evaluate') {
      setShuffledMembers(shuffleMembers(members));
      setShowEvaluationPanel(true);
    } else {
      setShowEvaluationPanel(false);
    }
  }, [activeTab, members, shuffleMembers]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (adminClickCount > 0) {
      timer = setTimeout(() => setAdminClickCount(0), 1000);
    }
    return () => clearTimeout(timer);
  }, [adminClickCount]);

  const getMemberName = useCallback((memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return '';
    return isAdminMode ? member.name : member.anonymousName;
  }, [members, isAdminMode]);

  return (
    <div className="app-container">
      <Animation
        trigger={animationTrigger}
        lastEvaluation={lastEvaluation}
        targetName={lastEvaluation ? getMemberName(lastEvaluation.targetId) : ''}
        isResetting={isResetting}
      />

      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">匿名团队互评看板</h1>
          <div className="round-info">
            <span className="round-label">第 {currentRound} 轮</span>
            <span className="day-label">第 {currentDay} 天</span>
          </div>
        </div>

        <nav className="tab-nav">
          <button
            className={`tab-btn ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => handleTabChange('home')}
          >
            首页
          </button>
          <button
            className={`tab-btn ${activeTab === 'evaluate' ? 'active' : ''}`}
            onClick={() => handleTabChange('evaluate')}
          >
            评价
          </button>
          <button
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleTabChange('dashboard')}
          >
            看板
          </button>
        </nav>
      </header>

      <main className="app-main">
        <div key={tabAnimationKey} className="tab-content">
          {activeTab === 'home' && (
            <div className="home-section">
              <div className="hero-card glass-card">
                <div className="hero-content">
                  <h2>欢迎使用匿名互评系统</h2>
                  <p className="hero-subtitle">
                    当前是第 <strong>{currentRound}</strong> 轮评价，第 <strong>{currentDay}</strong> 天
                  </p>
                  <p className="hero-desc">
                    所有评价均为匿名提交，请真实表达您的想法
                  </p>
                  <button
                    className="start-btn btn-primary pulse-glow"
                    onClick={handleStartEvaluation}
                  >
                    开始匿名互评
                  </button>
                </div>
                <div className="hero-stats">
                  <div className="stat-item">
                    <span className="stat-value">{evaluations.length}</span>
                    <span className="stat-label">已提交评价</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{members.length}</span>
                    <span className="stat-label">团队成员</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evaluate' && showEvaluationPanel && (
            <EvaluationPanel
              members={shuffledMembers}
              onSubmit={handleSubmitEvaluation}
              getMemberName={getMemberName}
            />
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              memberStats={memberStats}
              dailyStats={dailyStats}
              ratingDistribution={ratingDistribution}
              getMemberName={getMemberName}
              isResetting={isResetting}
              animationTrigger={animationTrigger}
            />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <button
            className="admin-hidden-btn"
            onClick={handleAdminToggle}
            onDoubleClick={handleAdminToggle}
          >
            {isAdminMode ? '管理员模式' : '匿名模式'}
          </button>
          <button
            className="reset-btn btn-secondary"
            onClick={() => setShowResetDialog(true)}
          >
            结束本轮
          </button>
        </div>
      </footer>

      {showResetDialog && (
        <div className="modal-overlay" onClick={() => setShowResetDialog(false)}>
          <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <h3>确认结束本轮？</h3>
            <p>结束后将清空所有评分数据并开始下一轮评价。</p>
            <div className="modal-actions">
              <button
                className="btn-secondary"
                onClick={() => setShowResetDialog(false)}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleReset}>
                确认结束
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
