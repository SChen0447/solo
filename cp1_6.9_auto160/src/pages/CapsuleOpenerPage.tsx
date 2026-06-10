import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Capsule } from '../types';
import { capsuleApi } from '../api';
import CapsuleOpener from '../components/CapsuleOpener';

interface Props {
  capsule: Capsule | null;
  onOpened: () => void;
  onBack: () => void;
}

export default function CapsuleOpenerPage({ capsule: initialCapsule, onOpened, onBack }: Props) {
  const { id } = useParams<{ id: string }>();
  const [capsule, setCapsule] = useState<Capsule | null>(initialCapsule);
  const [loading, setLoading] = useState(!initialCapsule);

  useEffect(() => {
    if (!initialCapsule && id) {
      capsuleApi.get(id).then(c => {
        setCapsule(c);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [id, initialCapsule]);

  if (loading) {
    return (
      <div className="opener-page">
        <div className="loading-state">
          <div className="loader"></div>
          <p>正在连接时空通道...</p>
        </div>
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="opener-page">
        <div className="error-state">
          <p>胶囊不存在</p>
          <button className="btn-primary" onClick={onBack}>返回星图</button>
        </div>
      </div>
    );
  }

  return (
    <div className="opener-page">
      <CapsuleOpener
        capsule={capsule}
        onOpened={() => {
          setCapsule(c => c ? { ...c, isOpened: true } : c);
          onOpened();
        }}
        onBack={onBack}
        onReplied={(updated) => {
          setCapsule(updated);
          onOpened();
        }}
      />
    </div>
  );
}
