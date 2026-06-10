import React, { useState } from 'react';
import type {
  ExchangeRequest,
  Sticker,
  User,
  LogisticsStage
} from './types';
import {
  EXCHANGE_STATUS_COLORS,
  EXCHANGE_STATUS_LABELS,
  LOGISTICS_STAGE_LABELS
} from './types';
import { v4 as uuidv4 } from 'uuid';

interface ExchangeManagerProps {
  requests: ExchangeRequest[];
  stickers: Sticker[];
  users: User[];
  currentUserId: string;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onUpdateLogistics: (requestId: string) => void;
  onCreateRequest: (request: ExchangeRequest) => void;
}

const LOGISTICS_ORDER: LogisticsStage[] = ['sent', 'in_transit', 'delivered'];

const ExchangeManager: React.FC<ExchangeManagerProps> = ({
  requests,
  stickers,
  users,
  currentUserId,
  onAccept,
  onReject,
  onUpdateLogistics,
  onCreateRequest
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedOfferedId, setSelectedOfferedId] = useState('');
  const [selectedRequestedId, setSelectedRequestedId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');

  const getStickerById = (id: string) => stickers.find(s => s.id === id);
  const getUserById = (id: string) => users.find(u => u.id === id);

  const userRequests = requests.filter(
    r => r.fromUserId === currentUserId || r.toUserId === currentUserId
  );

  const otherUsers = users.filter(u => u.id !== currentUserId);

  const handleCreateRequest = () => {
    if (!selectedOfferedId || !selectedRequestedId || !selectedUserId) return;
    const newRequest: ExchangeRequest = {
      id: uuidv4(),
      fromUserId: currentUserId,
      toUserId: selectedUserId,
      offeredStickerId: selectedOfferedId,
      requestedStickerId: selectedRequestedId,
      status: 'pending',
      logistics: [],
      createdAt: new Date().toISOString()
    };
    onCreateRequest(newRequest);
    setShowModal(false);
    setSelectedOfferedId('');
    setSelectedRequestedId('');
    setSelectedUserId('');
  };

  const getNextStage = (current: LogisticsStage | undefined): LogisticsStage => {
    if (!current) return LOGISTICS_ORDER[0];
    const idx = LOGISTICS_ORDER.indexOf(current);
    return idx < LOGISTICS_ORDER.length - 1
      ? LOGISTICS_ORDER[idx + 1]
      : LOGISTICS_ORDER[LOGISTICS_ORDER.length - 1];
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>交换请求</span>
        <span style={styles.count}>{userRequests.length}</span>
      </div>

      <div style={styles.requestList}>
        {userRequests.length === 0 ? (
          <div style={styles.emptyState}>暂无交换请求</div>
        ) : (
          userRequests.map(req => {
            const otherUser =
              req.fromUserId === currentUserId
                ? getUserById(req.toUserId)
                : getUserById(req.fromUserId);
            const isReceived = req.toUserId === currentUserId;
            const offered = getStickerById(req.offeredStickerId);
            const requested = getStickerById(req.requestedStickerId);
            const isExpanded = expandedId === req.id;
            const lastStage =
              req.logistics.length > 0
                ? req.logistics[req.logistics.length - 1].stage
                : undefined;
            const canUpdate =
              req.status === 'shipping' &&
              (!lastStage || lastStage !== 'delivered');

            return (
              <div key={req.id} style={styles.requestItem}>
                <div
                  style={styles.requestHeader}
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div style={styles.userInfo}>
                    <span style={styles.avatar}>{otherUser?.avatar || '👤'}</span>
                    <span style={styles.userName}>{otherUser?.name || '未知用户'}</span>
                  </div>
                  <div
                    style={{
                      ...styles.statusTag,
                      backgroundColor: EXCHANGE_STATUS_COLORS[req.status]
                    }}
                  >
                    {EXCHANGE_STATUS_LABELS[req.status]}
                  </div>
                </div>

                <div style={styles.stickerInfo}>
                  {isReceived ? (
                    <>
                      <span style={styles.stickerLabel}>对方提供：</span>
                      <span style={styles.stickerName}>{offered?.name}</span>
                    </>
                  ) : (
                    <>
                      <span style={styles.stickerLabel}>想要：</span>
                      <span style={styles.stickerName}>{requested?.name}</span>
                    </>
                  )}
                </div>

                {req.status === 'pending' && isReceived && (
                  <div style={styles.actionRow}>
                    <button
                      onClick={() => onAccept(req.id)}
                      style={{ ...styles.actionBtn, backgroundColor: '#66bb6a' }}
                      className="btn-press"
                    >
                      接受
                    </button>
                    <button
                      onClick={() => onReject(req.id)}
                      style={{ ...styles.actionBtn, backgroundColor: '#ef5350' }}
                      className="btn-press"
                    >
                      拒绝
                    </button>
                  </div>
                )}

                {isExpanded && req.logistics.length > 0 && (
                  <div style={styles.timeline}>
                    {LOGISTICS_ORDER.map((stage, idx) => {
                      const record = req.logistics.find(l => l.stage === stage);
                      const isDone = !!record;
                      return (
                        <div key={stage} style={styles.timelineItem}>
                          <div style={styles.timelineDotWrapper}>
                            <div
                              style={{
                                ...styles.timelineDot,
                                backgroundColor: isDone ? '#42a5f5' : '#e0e0e0'
                              }}
                            />
                            {idx < LOGISTICS_ORDER.length - 1 && (
                              <div
                                style={{
                                  ...styles.timelineLine,
                                  backgroundColor: isDone ? '#42a5f5' : '#e0e0e0'
                                }}
                              />
                            )}
                          </div>
                          <div style={styles.timelineContent}>
                            <div style={styles.timelineLabel}>
                              {LOGISTICS_STAGE_LABELS[stage]}
                            </div>
                            {record && (
                              <>
                                <div style={styles.timelineTime}>
                                  {formatTime(record.time)}
                                </div>
                                <div style={styles.timelineNote}>{record.note}</div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {canUpdate && (
                  <div style={styles.updateRow}>
                    <button
                      onClick={() => onUpdateLogistics(req.id)}
                      style={styles.updateBtn}
                      className="btn-press"
                    >
                      更新状态 → {LOGISTICS_STAGE_LABELS[getNextStage(lastStage)]}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={() => setShowModal(true)}
        style={styles.createBtn}
        className="btn-press"
      >
        + 发起交换
      </button>

      {showModal && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>发起交换请求</div>
            <div style={styles.modalBody}>
              <label style={styles.label}>选择交换对象：</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                style={styles.select}
              >
                <option value="">请选择用户</option>
                {otherUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.avatar} {u.name}
                  </option>
                ))}
              </select>

              <label style={styles.label}>我提供的贴纸：</label>
              <select
                value={selectedOfferedId}
                onChange={e => setSelectedOfferedId(e.target.value)}
                style={styles.select}
              >
                <option value="">请选择贴纸</option>
                {stickers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <label style={styles.label}>我想要的贴纸：</label>
              <select
                value={selectedRequestedId}
                onChange={e => setSelectedRequestedId(e.target.value)}
                style={styles.select}
              >
                <option value="">请选择贴纸</option>
                {stickers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.modalFooter}>
              <button
                onClick={() => setShowModal(false)}
                style={{ ...styles.modalBtn, backgroundColor: '#bdbdbd' }}
                className="btn-press"
              >
                取消
              </button>
              <button
                onClick={handleCreateRequest}
                disabled={!selectedOfferedId || !selectedRequestedId || !selectedUserId}
                style={{
                  ...styles.modalBtn,
                  backgroundColor: '#ff7043',
                  opacity:
                    !selectedOfferedId || !selectedRequestedId || !selectedUserId
                      ? 0.5
                      : 1
                }}
                className="btn-press"
              >
                确认发起
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 280,
    backgroundColor: '#f0e6d2',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    height: 'fit-content',
    position: 'sticky',
    top: 20
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: '#5d4037'
  },
  count: {
    backgroundColor: '#5c6bc0',
    color: '#fff',
    borderRadius: 10,
    padding: '2px 8px',
    fontSize: 12,
    minWidth: 20,
    textAlign: 'center'
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxHeight: 500,
    overflowY: 'auto'
  },
  emptyState: {
    textAlign: 'center',
    padding: 20,
    color: '#a1887f',
    fontSize: 13
  },
  requestItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxShadow: '0 1px 4px rgba(93, 64, 55, 0.06)'
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6
  },
  avatar: {
    fontSize: 20
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#5d4037'
  },
  statusTag: {
    padding: '3px 8px',
    borderRadius: 10,
    fontSize: 11,
    color: '#fff',
    fontWeight: 500
  },
  stickerInfo: {
    fontSize: 12,
    color: '#795548',
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap'
  },
  stickerLabel: {
    color: '#a1887f'
  },
  stickerName: {
    fontWeight: 500,
    color: '#5d4037'
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    marginTop: 4
  },
  actionBtn: {
    flex: 1,
    padding: '6px 0',
    borderRadius: 6,
    border: 'none',
    color: '#fff',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 0.15s ease'
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #f0e6d2'
  },
  timelineItem: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start'
  },
  timelineDotWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 16
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    flexShrink: 0
  },
  timelineLine: {
    width: 2,
    height: 24,
    marginTop: 2
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#5d4037'
  },
  timelineTime: {
    fontSize: 11,
    color: '#a1887f',
    marginTop: 2
  },
  timelineNote: {
    fontSize: 11,
    color: '#795548',
    marginTop: 2
  },
  updateRow: {
    marginTop: 4
  },
  updateBtn: {
    backgroundColor: '#78909c',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 11,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 0.15s ease'
  },
  createBtn: {
    backgroundColor: '#ff7043',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 0.15s ease, background-color 0.3s ease'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modal: {
    backgroundColor: '#fef9f0',
    borderRadius: 14,
    width: 400,
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
  },
  modalHeader: {
    padding: '16px 20px',
    fontSize: 16,
    fontWeight: 600,
    color: '#5d4037',
    borderBottom: '1px solid #e0c9a6'
  },
  modalBody: {
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  label: {
    fontSize: 13,
    fontWeight: 500,
    color: '#5d4037'
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d7ccc8',
    backgroundColor: '#fff',
    fontSize: 13,
    color: '#5d4037',
    fontFamily: 'inherit',
    outline: 'none',
    cursor: 'pointer'
  },
  modalFooter: {
    display: 'flex',
    gap: 10,
    padding: '12px 20px',
    borderTop: '1px solid #e0c9a6'
  },
  modalBtn: {
    flex: 1,
    padding: '10px 0',
    borderRadius: 8,
    border: 'none',
    color: '#fff',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'transform 0.15s ease, opacity 0.3s ease'
  }
};

export default ExchangeManager;
