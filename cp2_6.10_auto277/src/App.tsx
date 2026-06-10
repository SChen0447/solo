import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import RecordCard from './RecordCard';
import { mockRecords } from './data/mockRecords';
import type { Record } from './types';

export default function App() {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(mockRecords[0].id);
  const selectedRecord: Record = mockRecords.find(r => r.id === selectedRecordId) || mockRecords[0];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h1 className="sidebar-title">VINYL DECK</h1>
        <p className="sidebar-subtitle">Curated Collection</p>
        <div className="thumbnail-grid">
          {mockRecords.map((record) => (
            <div
              key={record.id}
              className={`thumbnail-item ${selectedRecordId === record.id ? 'selected' : ''}`}
              onClick={() => setSelectedRecordId(record.id)}
            >
              <img
                src={record.coverImage}
                alt={record.album}
                className="thumbnail-cover"
                loading="lazy"
              />
              <span className="thumbnail-artist">{record.artist}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedRecord.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <RecordCard record={selectedRecord} />
            <p className="footer-hint">Click card to flip · Click track to preview</p>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
