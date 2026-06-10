import { useState, useRef, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Activity, UserCard, CheckInRecord, Toast } from '@/types';
import { generateId, formatDate, formatDateTime, createToast, getDefaultAvatar, randomGender, playDingSound } from '@/utils';
import { ToastContainer } from '@/components/Toast';
import HeatMap from '@/components/HeatMap';
import BusinessCard from '@/components/BusinessCard';
import ContactsDrawer from '@/components/ContactsDrawer';

interface CheckInProps {
  activity: Activity;
  currentUser: UserCard | null;
  setCurrentUser: (user: UserCard) => void;
  checkInRecords: CheckInRecord[];
  onAddCheckIn: (record: CheckInRecord) => void;
  onGoToExchange: () => void;
  onGoBack: () => void;
}

export default function CheckIn({
  activity,
  currentUser,
  setCurrentUser,
  checkInRecords,
  onAddCheckIn,
  onGoToExchange,
  onGoBack
}: CheckInProps) {
  const [showProfileForm, setShowProfileForm] = useState(!currentUser);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [newlyCheckedIn, setNewlyCheckedIn] = useState<UserCard | null>(null);
  const [showContacts, setShowContacts] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    position: currentUser?.position || '',
    company: currentUser?.company || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    avatar: currentUser?.avatar || ''
  });

  useEffect(() => {
    if (!currentUser) {
      setShowProfileForm(true);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (showScanner && videoRef.current) {
      startCamera();
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }, [showScanner]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setToast(createToast('无法访问摄像头，请手动输入签到', 'error'));
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.name || !profileForm.email || !profileForm.phone) {
      setToast(createToast('请填写必填信息', 'error'));
      return;
    }

    const user: UserCard = {
      id: currentUser?.id || generateId(),
      name: profileForm.name,
      position: profileForm.position,
      company: profileForm.company,
      email: profileForm.email,
      phone: profileForm.phone,
      avatar: profileForm.avatar || getDefaultAvatar(profileForm.name),
      gender: currentUser?.gender || randomGender(),
      contacts: currentUser?.contacts || []
    };

    setCurrentUser(user);
    setShowProfileForm(false);
    setToast(createToast('名片创建成功！'));

    const selfCheckIn: CheckInRecord = {
      id: generateId(),
      activityId: activity.id,
      userId: user.id,
      userCard: user,
      checkedAt: Date.now()
    };
    onAddCheckIn(selfCheckIn);
  };

  const handleSimulateScan = () => {
    const mockNames = [
      { name: '张伟', position: '产品经理', company: '科技有限公司', email: 'zhangwei@tech.com', phone: '13800138001' },
      { name: '李娜', position: '设计师', company: '创意工作室', email: 'lina@design.com', phone: '13800138002' },
      { name: '王磊', position: '工程师', company: '创新科技', email: 'wanglei@innov.com', phone: '13800138003' },
      { name: '刘芳', position: '市场总监', company: '品牌集团', email: 'liufang@brand.com', phone: '13800138004' }
    ];
    const mock = mockNames[Math.floor(Math.random() * mockNames.length)];

    const mockUser: UserCard = {
      id: generateId(),
      name: mock.name,
      position: mock.position,
      company: mock.company,
      email: mock.email,
      phone: mock.phone,
      avatar: getDefaultAvatar(mock.name),
      gender: randomGender(),
      contacts: []
    };

    playDingSound();

    const record: CheckInRecord = {
      id: generateId(),
      activityId: activity.id,
      userId: mockUser.id,
      userCard: mockUser,
      checkedAt: Date.now()
    };
    onAddCheckIn(record);
    setNewlyCheckedIn(mockUser);
    setShowScanner(false);

    setToast(createToast(`${mockUser.name} 签到成功！`));

    setTimeout(() => setNewlyCheckedIn(null), 4000);
  };

  const qrContent = currentUser ? `${activity.id}|${currentUser.id}|${currentUser.name}` : '';

  return (
    <div className="container">
      <div className="page-header">
        <div className="flex gap-sm" style={{ alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={onGoBack}>
            ← 返回
          </button>
          <h1 className="page-title" style={{ margin: 0 }}>
            {activity.name}
          </h1>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={() => setShowContacts(true)}>
            👥 联系人 ({currentUser?.contacts.length || 0})
          </button>
          <button className="btn btn-secondary" onClick={() => setShowProfileForm(true)}>
            ✏️ 编辑名片
          </button>
          <button className="btn btn-primary" onClick={onGoToExchange}>
            💼 名片交换
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="flex-between flex-wrap" style={{ gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              📍 {activity.location}
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              📅 {formatDate(activity.date)}
            </div>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              fontSize: '12px',
              fontFamily: 'monospace',
              letterSpacing: '1px',
              marginTop: '4px'
            }}>
              活动码: {activity.code}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', fontWeight: '700', color: 'var(--accent-blue)' }}>
              {checkInRecords.length}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>已签到</div>
          </div>
        </div>
      </div>

      <HeatMap records={checkInRecords} />

      {currentUser && (
        <div className="grid grid-1 grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>📱 我的签到二维码</h3>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '16px',
              display: 'inline-block',
              marginBottom: '12px'
            }}>
              <QRCodeCanvas
                value={qrContent}
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              让他人扫描此二维码完成签到
            </p>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>🔍 扫描签到</h3>
            {!showScanner ? (
              <div>
                <div style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto 16px',
                  background: 'var(--glass-bg)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '64px',
                  border: '2px dashed var(--glass-border)'
                }}>
                  📷
                </div>
                <button className="btn btn-primary" onClick={() => setShowScanner(true)}>
                  📸 打开摄像头扫描
                </button>
                <div style={{ marginTop: '12px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleSimulateScan}>
                    🔧 模拟扫描签到（演示）
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '280px',
                  margin: '0 auto 16px',
                  borderRadius: '16px',
                  overflow: 'hidden'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: '100%',
                      height: '200px',
                      objectFit: 'cover',
                      background: '#000',
                      display: 'block'
                    }}
                  />
                  <div style={{
                    position: 'absolute',
                    inset: '20px',
                    border: '3px solid var(--accent-blue)',
                    borderRadius: '8px',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)'
                  }} />
                </div>
                <div className="flex gap-sm" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setShowScanner(false)}>
                    取消
                  </button>
                  <button className="btn btn-primary" onClick={handleSimulateScan}>
                    🎯 模拟识别
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>
          👥 最近签到 ({checkInRecords.length})
        </h3>
        {checkInRecords.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px' }}>
            <div className="empty-state-icon" style={{ fontSize: '48px' }}>⏳</div>
            <div className="empty-state-text">等待第一位签到者...</div>
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {checkInRecords.slice(0, 10).map((record, idx) => (
              <div
                key={record.id}
                className="flex-between"
                style={{
                  padding: '12px 0',
                  borderBottom: idx < checkInRecords.length - 1 ? '1px solid var(--glass-border)' : 'none',
                  gap: '12px'
                }}
              >
                <div className="flex gap-sm" style={{ alignItems: 'center' }}>
                  <img
                    src={record.userCard.avatar}
                    alt={record.userCard.name}
                    style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>
                      {record.userCard.name}
                      <span style={{ marginLeft: '6px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {record.userCard.gender === 'male' ? '♂' : '♀'}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {record.userCard.position} · {record.userCard.company}
                    </div>
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  {formatDateTime(record.checkedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {newlyCheckedIn && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            width: '320px',
            zIndex: 1500,
            animation: 'slideInRight 0.4s ease'
          }}
        >
          <BusinessCard user={newlyCheckedIn} compact />
        </div>
      )}

      {showProfileForm && (
        <div className="modal-overlay" onClick={() => currentUser && setShowProfileForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {currentUser ? '✏️ 编辑我的名片' : '👋 填写个人名片'}
              </h2>
              {currentUser && (
                <button className="modal-close" onClick={() => setShowProfileForm(false)}>✕</button>
              )}
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label className="form-label">姓名 *</label>
                <input
                  className="input"
                  placeholder="请输入姓名"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-2" style={{ gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">职位</label>
                  <input
                    className="input"
                    placeholder="如：产品经理"
                    value={profileForm.position}
                    onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">公司</label>
                  <input
                    className="input"
                    placeholder="请输入公司名称"
                    value={profileForm.company}
                    onChange={(e) => setProfileForm({ ...profileForm, company: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">邮箱 *</label>
                <input
                  type="email"
                  className="input"
                  placeholder="请输入邮箱"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">手机号 *</label>
                <input
                  className="input"
                  placeholder="请输入手机号"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">头像链接（可选）</label>
                <input
                  className="input"
                  placeholder="头像图片URL，留空使用默认头像"
                  value={profileForm.avatar}
                  onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                {currentUser ? '💾 保存修改' : '✨ 创建名片并签到'}
              </button>
            </form>
          </div>
        </div>
      )}

      <ContactsDrawer
        open={showContacts}
        onClose={() => setShowContacts(false)}
        currentUser={currentUser}
        checkInRecords={checkInRecords}
      />

      <ToastContainer toast={toast} />
    </div>
  );
}
