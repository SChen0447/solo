import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, getAuthHeaders } from '../context/AuthContext';
import { useAppToast } from '../App';
import { getAvatarColor } from '../utils/helpers';

const UserMenu: React.FC = () => {
  const { user, logout, changePassword } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [open, setOpen] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdError, setPwdError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    showToast('已注销');
    navigate('/login');
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/journal/export', {
        headers: getAuthHeaders(user)
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `journals-${user.username}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('导出成功！');
      } else {
        showToast('导出失败', 'error');
      }
    } catch {
      showToast('导出失败', 'error');
    }
    setOpen(false);
  };

  const handleChangePwd = async () => {
    setPwdError('');
    if (!oldPwd || !newPwd) {
      setPwdError('请填写完整');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError('两次新密码不一致');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('新密码至少6位');
      return;
    }
    const ok = await changePassword(oldPwd, newPwd);
    if (ok) {
      showToast('密码修改成功！');
      setShowPwdModal(false);
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } else {
      setPwdError('原密码错误');
    }
  };

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <>
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <div
          className="avatar"
          style={{ backgroundColor: getAvatarColor(user.username) }}
          onClick={() => setOpen(!open)}
        >
          {initial}
        </div>
        {open && (
          <div className="dropdown">
            <div className="dropdown-item" onClick={() => { setShowPwdModal(true); setOpen(false); }}>
              🔑 修改密码
            </div>
            <div className="dropdown-item" onClick={handleExport}>
              📦 导出所有手账
            </div>
            <div className="dropdown-item" onClick={handleLogout}>
              🚪 注销
            </div>
          </div>
        )}
      </div>

      {showPwdModal && (
        <div className="modal-overlay" onClick={() => setShowPwdModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">修改密码</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">原密码</label>
                <input type="password" className="input" value={oldPwd} onChange={e => setOldPwd(e.target.value)} />
              </div>
              <div>
                <label className="label">新密码</label>
                <input type="password" className="input" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              </div>
              <div>
                <label className="label">确认新密码</label>
                <input type="password" className="input" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              </div>
              {pwdError && <div style={{ color: '#c0392b', fontSize: 13 }}>{pwdError}</div>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowPwdModal(false)}>取消</button>
              <button className="btn" onClick={handleChangePwd}>确认修改</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserMenu;
