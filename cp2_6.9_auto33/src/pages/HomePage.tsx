import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const HomePage = () => {
  const [nickname, setNickname] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    const finalRoomId = roomId.trim() || uuidv4().slice(0, 8);
    localStorage.setItem('codesync_nickname', nickname.trim());
    navigate(`/room/${finalRoomId}`);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoSection}>
          <div style={styles.logoIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <h1 style={styles.title}>CodeSync</h1>
          <p style={styles.subtitle}>实时多用户代码协作编辑器</p>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>昵称</label>
            <input
              type="text"
              style={styles.input}
              placeholder="输入你的昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>房间号</label>
            <input
              type="text"
              style={styles.input}
              placeholder="留空则自动创建新房间"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
          </div>

          <button type="submit" style={styles.button}>
            {roomId.trim() ? '加入房间' : '创建房间'}
          </button>
        </form>

        <div style={styles.features}>
          <div style={styles.featureItem}>
            <span style={styles.featureDot}></span>
            <span>实时同步编辑</span>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureDot}></span>
            <span>即时预览渲染</span>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureDot}></span>
            <span>版本历史管理</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1E1E2E 0%, #2A2A3E 100%)',
    padding: '20px',
  },
  card: {
    background: '#2A2A3E',
    borderRadius: '16px',
    padding: '48px 40px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logoIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '64px',
    height: '64px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    color: 'white',
    marginBottom: '16px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#FFFFFF',
    marginBottom: '8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#9CA3AF',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#D1D5DB',
  },
  input: {
    padding: '12px 16px',
    background: '#1E1E2E',
    border: '2px solid #3F3F5A',
    borderRadius: '10px',
    color: '#FFFFFF',
    fontSize: '15px',
    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
  },
  button: {
    marginTop: '8px',
    padding: '14px 24px',
    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
    color: 'white',
    fontSize: '15px',
    fontWeight: 600,
    borderRadius: '10px',
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
  },
  features: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    color: '#9CA3AF',
  },
  featureDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#6366F1',
  },
};

export default HomePage;
