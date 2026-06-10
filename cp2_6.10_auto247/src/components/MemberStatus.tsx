import type { Member, MemberStatusType } from '../types';

interface Props {
  members: Member[];
  onToggleStatus: (id: string) => void;
}

const statusLabels: Record<MemberStatusType, string> = {
  idle: '空闲',
  rehearsing: '排练中',
  resting: '休息中',
};

const statusColors: Record<MemberStatusType, string> = {
  idle: 'rgba(255, 255, 255, 0.25)',
  rehearsing: 'rgba(105, 240, 174, 0.35)',
  resting: 'rgba(255, 109, 0, 0.35)',
};

export default function MemberStatus({ members, onToggleStatus }: Props) {
  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>成员状态</h2>
      <div style={styles.container}>
        {members.map((member) => (
          <div
            key={member.id}
            onClick={() => onToggleStatus(member.id)}
            style={styles.memberCard}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleStatus(member.id);
              }
            }}
          >
            <div
              style={{
                ...styles.avatar,
                backgroundColor: member.color,
                boxShadow: `0 0 20px ${member.color}50`,
              }}
            >
              <span style={styles.avatarText}>{member.name[0]}</span>
              <div
                style={{
                  ...styles.statusDot,
                  backgroundColor: statusColors[member.status],
                  transition: 'background-color 0.3s ease',
                  willChange: 'background-color',
                }}
              />
            </div>
            <span style={styles.name}>{member.name}</span>
            <span
              style={{
                ...styles.status,
                transition: 'color 0.3s ease',
                willChange: 'color',
              }}
            >
              {statusLabels[member.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    marginBottom: 32,
    animation: 'fadeIn 0.5s ease',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    color: 'var(--text-primary)',
    letterSpacing: 0.5,
  },
  container: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
    padding: '20px 24px',
    background: 'var(--card-bg)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-sm)',
  },
  memberCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    padding: '8px 12px',
    borderRadius: 10,
    transition: 'transform 0.2s ease, background 0.2s ease',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'transform 0.2s ease',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 700,
    color: '#fff',
    textShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid var(--card-bg)',
  },
  name: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  status: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
};
