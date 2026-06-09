import { useEffect, useRef, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Vote, BAR_COLORS, submitVote, getSessionId } from '../api';

interface VoteDashboardProps {
  vote: Vote;
  onVoteSuccess?: () => void;
  onVoteError?: (msg: string) => void;
  hasVoted: boolean;
}

export default function VoteDashboard({ vote, onVoteSuccess, onVoteError, hasVoted }: VoteDashboardProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [localHasVoted, setLocalHasVoted] = useState(hasVoted);
  const successTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalHasVoted(hasVoted);
  }, [hasVoted]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleVote = async (optionIndex: number) => {
    if (localHasVoted) {
      onVoteError?.('您已经投过票了');
      return;
    }
    try {
      const sessionId = getSessionId();
      await submitVote(vote.id, sessionId, optionIndex);
      setLocalHasVoted(true);
      const votedSet = JSON.parse(localStorage.getItem('voted_polls') || '[]');
      if (!votedSet.includes(vote.id)) {
        votedSet.push(vote.id);
        localStorage.setItem('voted_polls', JSON.stringify(votedSet));
      }
      setShowSuccess(true);
      onVoteSuccess?.();
      successTimerRef.current = window.setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '投票失败';
      onVoteError?.(msg);
    }
  };

  const total = vote.totalVotes || 1;
  const chartData = vote.options.map((opt, i) => ({
    name: opt.text.length > 12 ? opt.text.slice(0, 12) + '...' : opt.text,
    fullName: opt.text,
    votes: opt.votes,
    color: BAR_COLORS[i % BAR_COLORS.length]
  }));

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{vote.title}</h2>

      {showSuccess && (
        <div style={styles.successToast}>投票成功！感谢您的参与</div>
      )}

      <div style={styles.optionsGrid}>
        {vote.options.map((opt, i) => {
          const pct = total > 0 ? (opt.votes / total * 100).toFixed(1) : '0.0';
          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={localHasVoted}
              style={{
                ...styles.optionBtn,
                borderColor: BAR_COLORS[i % BAR_COLORS.length],
                background: localHasVoted
                  ? 'rgba(255,255,255,0.05)'
                  : `linear-gradient(135deg, ${BAR_COLORS[i % BAR_COLORS.length]}22, ${BAR_COLORS[i % BAR_COLORS.length]}11)`,
                cursor: localHasVoted ? 'not-allowed' : 'pointer'
              }}
            >
              <div style={styles.optionRow}>
                <span style={styles.optionText}>{opt.text}</span>
                <span style={{ ...styles.voteCount, color: BAR_COLORS[i % BAR_COLORS.length] }}>
                  {opt.votes} 票 ({pct}%)
                </span>
              </div>
              <div style={styles.progressBarBg}>
                <div style={{
                  ...styles.progressBar,
                  background: `linear-gradient(90deg, ${BAR_COLORS[i % BAR_COLORS.length]}, ${BAR_COLORS[(i + 1) % BAR_COLORS.length]})`,
                  width: `${pct}%`
                }} />
              </div>
            </button>
          );
        })}
      </div>

      <div style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
            <XAxis type="number" stroke="rgba(255,255,255,0.5)" fontSize={12} />
            <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.5)" width={90} fontSize={12} />
            <Tooltip
              contentStyle={{
                background: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '10px',
                color: '#fff'
              }}
              formatter={(value: number, _name: string, props: any) => [
                `${value} 票`, props.payload.fullName
              ]}
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="votes" animationDuration={500} radius={[0, 8, 8, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={styles.footerStats}>
        总投票数：<strong style={{ color: '#6366F1' }}>{vote.totalVotes}</strong>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '32px',
    background: 'rgba(255,255,255,0.08)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '16px'
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#fff',
    margin: 0,
    textAlign: 'center'
  },
  successToast: {
    alignSelf: 'center',
    padding: '10px 24px',
    background: 'linear-gradient(90deg, #22C55E, #16A34A)',
    color: '#fff',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '14px',
    animation: 'fadeOut 2s ease forwards'
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  optionBtn: {
    border: '2px solid',
    borderRadius: '12px',
    padding: '16px 18px',
    textAlign: 'left',
    transition: 'all 0.25s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  optionRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px'
  },
  optionText: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: 500,
    flex: 1,
    wordBreak: 'break-word'
  },
  voteCount: {
    fontWeight: 700,
    fontSize: '13px',
    whiteSpace: 'nowrap'
  },
  progressBarBg: {
    width: '100%',
    height: '8px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    transition: 'width 0.5s ease',
    borderRadius: '4px'
  },
  chartWrapper: {
    width: '100%',
    padding: '16px 0',
    minHeight: '320px'
  },
  footerStats: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '14px',
    textAlign: 'center'
  }
};
