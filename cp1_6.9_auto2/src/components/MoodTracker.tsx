import { MOODS } from '../types';
import type { MoodType } from '../types';
import './MoodTracker.css';

interface MoodTrackerProps {
  currentMood: MoodType;
  onSelectMood: (mood: MoodType) => void;
}

export default function MoodTracker({ currentMood, onSelectMood }: MoodTrackerProps) {
  return (
    <div className="mood-tracker">
      {!currentMood && (
        <div className="mood-placeholder">今天心情如何？</div>
      )}
      <div className="mood-list">
        {MOODS.map((mood) => (
          <button
            key={mood}
            className={`mood-btn ${currentMood === mood ? 'active' : ''}`}
            onClick={() => onSelectMood(mood)}
            aria-label={`选择心情 ${mood}`}
          >
            <span className="mood-emoji">{mood}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
