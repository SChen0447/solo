import { useState } from 'react';
import type { ArtworkData } from '../types';

interface ArtworkModalProps {
  artwork: ArtworkData;
  onClose: () => void;
  onUpdateName: (id: string, name: string) => void;
}

export default function ArtworkModal({ artwork, onClose, onUpdateName }: ArtworkModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(artwork.name);

  const handleSave = () => {
    if (editName.trim()) {
      onUpdateName(artwork.id, editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}
      >
        <img
          src={artwork.imageData}
          alt={artwork.name}
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '2px solid #c8a96e'
          }}
        />
        <div style={{
          background: 'rgba(44,62,80,0.9)',
          backdropFilter: 'blur(10px)',
          padding: '16px 24px',
          borderRadius: 12,
          minWidth: 280,
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                style={{ flex: 1 }}
              />
              <button onClick={handleSave} style={{ padding: '8px 16px' }}>保存</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '6px 16px',
                  fontSize: 12,
                  marginBottom: 10
                }}
              >
                编辑名称
              </button>
              <div style={{
                fontSize: 18,
                fontWeight: 500,
                color: '#f5f0e8',
                marginTop: 6
              }}>
                {artwork.name}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
