import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import type { Survey, Vote, QuestionStats, Question } from './types';

interface ResultDashboardProps {
  surveys: Survey[];
  votes: Vote[];
}

const PIE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];

const LazyChartCard: React.FC<{
  title: string;
  totalVotes: number;
  question: Question;
  votes: Vote[];
}> = ({ title, totalVotes, question, votes }) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const stats = useMemo(() => {
    return calculateQuestionStats(question, votes);
  }, [question, votes]);

  return (
    <div className="chart-card" ref={cardRef}>
      <div className="chart-card-title" title={title}>{title || '未命名题目'}</div>
      <div className="chart-container">
        {isVisible ? (
          stats.data.length > 0 ? (
            question.type === 'rating' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} 票 (${props.payload.percentage}%)`,
                      '投票数'
                    ]}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stats.data.map((_, index) => (
                      <defs key={`grad-${index}`}>
                        <linearGradient id={`colorUv-${index}-${question.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2980b9" />
                          <stop offset="100%" stopColor="#3498db" />
                        </linearGradient>
                      </defs>
                    ))}
                    {stats.data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#colorUv-${index}-${question.id})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : question.type === 'single' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={65}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="label"
                    activeShape={(props: any) => {
                      const RADIAN = Math.PI / 180;
                      const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
                      const sin = Math.sin(-RADIAN * midAngle);
                      const cos = Math.cos(-RADIAN * midAngle);
                      const sx = cx + (outerRadius + 10) * cos;
                      const sy = cy + (outerRadius + 10) * sin;
                      const mx = cx + (outerRadius + 30) * cos;
                      const my = cy + (outerRadius + 30) * sin;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={innerRadius} fill="none" />
                          {React.createElement('path', {
                            d: `
                              M ${cx} ${cy}
                              L ${cx + outerRadius * Math.cos(-RADIAN * startAngle)} ${cy + outerRadius * Math.sin(-RADIAN * startAngle)}
                              A ${outerRadius} ${outerRadius} 0 ${endAngle - startAngle > 180 ? 1 : 0} 1 ${cx + outerRadius * Math.cos(-RADIAN * endAngle)} ${cy + outerRadius * Math.sin(-RADIAN * endAngle)}
                              Z
                            `,
                            fill,
                            transform: `translate(${sx - cx}, ${sy - cy}) scale(1.05)`
                          } as any)}
                          <text x={mx} y={my} fontSize={11} fill="#2c3e50" textAnchor="middle">
                            {payload.label}: {(percent * 100).toFixed(1)}%
                          </text>
                        </g>
                      );
                    }}
                  >
                    {stats.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} 票 (${props.payload.percentage}%)`,
                      '投票数'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(value: number, _name: string, props: any) => [
                      `${value} 票 (${props.payload.percentage}%)`,
                      '投票数'
                    ]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {stats.data.map((_, index) => (
                      <defs key={`grad-multi-${index}-${question.id}`}>
                        <linearGradient id={`colorUv-multi-${index}-${question.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2980b9" />
                          <stop offset="100%" stopColor="#3498db" />
                        </linearGradient>
                      </defs>
                    ))}
                    {stats.data.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#colorUv-multi-${index}-${question.id})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#bdc3c7', fontSize: '13px' }}>
              暂无数据
            </div>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#bdc3c7' }}>
            加载中...
          </div>
        )}
      </div>
      <div className="chart-card-total">共 {totalVotes} 人参与投票</div>
    </div>
  );
};

function calculateQuestionStats(question: Question, votes: Vote[]): QuestionStats {
  const relevantVotes = votes.filter((v) => {
    return v.answers.some((a) => a.questionId === question.id);
  });

  const totalVotes = relevantVotes.length;

  if (question.type === 'rating') {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    relevantVotes.forEach((v) => {
      const answer = v.answers.find((a) => a.questionId === question.id);
      if (answer && typeof answer.value === 'number') {
        counts[answer.value] = (counts[answer.value] || 0) + 1;
      }
    });

    const data = Object.entries(counts).map(([label, count]) => ({
      label: `${label}星`,
      count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
    }));

    return {
      questionId: question.id,
      questionTitle: question.title,
      questionType: question.type,
      data,
      totalVotes
    };
  }

  const counts: Record<string, number> = {};
  question.options.forEach((opt) => {
    counts[opt.id] = 0;
  });

  relevantVotes.forEach((v) => {
    const answer = v.answers.find((a) => a.questionId === question.id);
    if (answer) {
      if (question.type === 'single' && typeof answer.value === 'string') {
        counts[answer.value] = (counts[answer.value] || 0) + 1;
      } else if (question.type === 'multiple' && Array.isArray(answer.value)) {
        answer.value.forEach((optId) => {
          counts[optId] = (counts[optId] || 0) + 1;
        });
      }
    }
  });

  const totalForType = question.type === 'multiple'
    ? Object.values(counts).reduce((a, b) => a + b, 0)
    : totalVotes;

  const data = question.options.map((opt) => ({
    label: opt.text || '未命名选项',
    count: counts[opt.id] || 0,
    percentage: totalForType > 0 ? Math.round(((counts[opt.id] || 0) / totalForType) * 100) : 0
  }));

  return {
    questionId: question.id,
    questionTitle: question.title,
    questionType: question.type,
    data,
    totalVotes
  };
}

const ResultDashboard: React.FC<ResultDashboardProps> = ({ surveys, votes }) => {
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(
    surveys.length > 0 ? surveys[0].id : null
  );

  useEffect(() => {
    if (surveys.length > 0 && !selectedSurveyId) {
      setSelectedSurveyId(surveys[0].id);
    }
  }, [surveys, selectedSurveyId]);

  const selectedSurvey = surveys.find((s) => s.id === selectedSurveyId);
  const surveyVotes = votes.filter((v) => v.surveyId === selectedSurveyId);

  if (surveys.length === 0) {
    return (
      <div className="dashboard">
        <div className="empty-dashboard">
          <div className="empty-dashboard-icon">📊</div>
          <div className="empty-dashboard-text">暂无问卷数据</div>
          <div className="empty-dashboard-hint">请先在编辑器中创建问卷</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2 className="dashboard-title">投票结果统计</h2>
        <p className="dashboard-subtitle">实时查看各问卷的投票分布数据</p>
      </div>

      <div className="dashboard-selector">
        {surveys.map((survey) => (
          <button
            key={survey.id}
            className={`dashboard-survey-btn ${survey.id === selectedSurveyId ? 'active' : ''}`}
            onClick={() => setSelectedSurveyId(survey.id)}
          >
            {survey.name || '未命名问卷'}
            <span style={{ opacity: 0.7, marginLeft: '6px' }}>
              ({votes.filter((v) => v.surveyId === survey.id).length} 票)
            </span>
          </button>
        ))}
      </div>

      {selectedSurvey && selectedSurvey.questions.length > 0 ? (
        <div className="charts-grid">
          {selectedSurvey.questions.map((question) => (
            <LazyChartCard
              key={question.id}
              title={question.title}
              totalVotes={surveyVotes.length}
              question={question}
              votes={surveyVotes}
            />
          ))}
        </div>
      ) : (
        <div className="empty-dashboard">
          <div className="empty-dashboard-icon">📝</div>
          <div className="empty-dashboard-text">
            {selectedSurvey ? '该问卷暂无题目' : '请选择一个问卷'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultDashboard;
