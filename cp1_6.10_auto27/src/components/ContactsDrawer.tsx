import { useEffect, useState } from 'react';
import type { UserCard, CheckInRecord } from '@/types';
import BusinessCard from './BusinessCard';

interface ContactsDrawerProps {
  open: boolean;
  onClose: () => void;
  currentUser: UserCard | null;
  checkInRecords: CheckInRecord[];
}

export default function ContactsDrawer({ open, onClose, currentUser, checkInRecords }: ContactsDrawerProps) {
  const [contacts, setContacts] = useState<UserCard[]>([]);

  useEffect(() => {
    if (currentUser) {
      const contactList = checkInRecords
        .filter((r) => currentUser.contacts.includes(r.userId))
        .map((r) => r.userCard);
      setContacts(contactList);
    }
  }, [currentUser, checkInRecords]);

  if (!open) return null;

  return (
    <>
      <div
        className="modal-overlay"
        style={{ background: 'rgba(0, 0, 0, 0.5)', zIndex: 999 }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '100%',
          maxWidth: '420px',
          background: 'linear-gradient(180deg, #1a1a2e, #16213e)',
          borderLeft: '1px solid var(--glass-border)',
          zIndex: 1000,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          overflowY: 'auto',
          padding: '24px'
        }}
      >
        <div className="flex-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700' }}>👥 我的联系人</h2>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">💼</div>
            <div className="empty-state-text">还没有交换的名片</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
              在签到列表中点击用户名片进行交换
            </div>
          </div>
        ) : (
          <div className="grid grid-1" style={{ gap: '16px' }}>
            {contacts.map((contact) => (
              <BusinessCard
                key={contact.id}
                user={contact}
                isContact={true}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
