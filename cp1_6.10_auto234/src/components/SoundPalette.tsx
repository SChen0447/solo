import { useState } from 'react';
import type { Sample } from '../types';
import samplesData from '../data/samples.json';
import { audioEngine } from '../utils/audioEngine';

const samples = samplesData as Sample[];

const categoryLabels: Record<string, string> = {
  drum: '🥁 鼓点',
  bass: '🎸 贝斯',
  melody: '🎹 旋律',
};

interface SoundPaletteProps {
  onDragStart?: (e: React.DragEvent, sampleId: string) => void;
}

export function SoundPalette({ onDragStart }: SoundPaletteProps) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const categories = ['drum', 'bass', 'melody'] as const;

  const handlePreview = (sampleId: string) => {
    audioEngine.playPreview(sampleId);
    setHighlightId(sampleId);
    setTimeout(() => setHighlightId(null), 500);
  };

  const handleDragStart = (e: React.DragEvent, sampleId: string) => {
    e.dataTransfer.setData('text/plain', sampleId);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(e, sampleId);
  };

  return (
    <div className="sound-palette">
      <h2 className="palette-title">音色库</h2>
      {categories.map(category => (
        <div key={category} className="category-section">
          <h3 className="category-label">{categoryLabels[category]}</h3>
          <div className="sample-grid">
            {samples
              .filter(s => s.category === category)
              .map(sample => (
                <div
                  key={sample.id}
                  className={`sample-card ${highlightId === sample.id ? 'highlight' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, sample.id)}
                  style={{ borderLeftColor: sample.color }}
                >
                  <div className="sample-name" title={sample.name}>{sample.name}</div>
                  <div className="sample-duration">{sample.duration.toFixed(1)}s</div>
                  <button
                    className="preview-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(sample.id);
                    }}
                  >
                    ▶
                  </button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
