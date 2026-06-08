import { memo, useRef, useEffect, useState } from 'react';
import type { Idea, DimensionKey } from '../types';
import { DIMENSION_LABELS, COLOR_PALETTE } from '../types';

interface ScoringPanelProps {
  ideas: Idea[];
  onScoreChange: (ideaId: string, dimension: DimensionKey, score: number) => void;
  readonly?: boolean;
}

interface ScoreSliderProps {
  ideaId: string;
  dimension: DimensionKey;
  value: number;
  onChange: (ideaId: string, dimension: DimensionKey, score: number) => void;
  readonly?: boolean;
  colorIndex: number;
}

const ScoreSlider = memo(function ScoreSlider({
  ideaId,
  dimension,
  value,
  onChange,
  readonly = false,
  colorIndex,
}: ScoreSliderProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [animating, setAnimating] = useState(false);
  const prevValueRef = useRef(value);
  const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setAnimating(true);
      setDisplayValue(value);
      prevValueRef.current = value;
      const timer = setTimeout(() => setAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const percentage = (value - 1) / 9;

  return (
    <div className="slider-row">
      <span className="slider-label">{DIMENSION_LABELS[dimension]}</span>
      <div className="slider-wrapper">
        <div
          className="slider-track"
          style={{
            background: `linear-gradient(to right, ${color} 0%, ${color} ${
              percentage * 100
            }%, #e2e8f0 ${percentage * 100}%, #e2e8f0 100%)`,
          }}
        >
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={value}
            onChange={(e) =>
              onChange(ideaId, dimension, parseInt(e.target.value, 10))
            }
            disabled={readonly}
            className="range-input"
          />
        </div>
        <div
          className={`score-bubble ${animating ? 'bounce' : ''}`}
          style={{
            left: `calc(${percentage * 100}% - 14px)`,
            backgroundColor: color,
          }}
        >
          {displayValue}
        </div>
      </div>
    </div>
  );
});

interface IdeaScoreCardProps {
  idea: Idea;
  index: number;
  onScoreChange: (ideaId: string, dimension: DimensionKey, score: number) => void;
  readonly?: boolean;
}

const IdeaScoreCard = memo(function IdeaScoreCard({
  idea,
  index,
  onScoreChange,
  readonly = false,
}: IdeaScoreCardProps) {
  const dimensions: DimensionKey[] = ['feasibility', 'innovation', 'marketPotential', 'cost'];

  return (
    <div
      className="score-card"
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="score-card-header">
        <span
          className="score-card-index"
          style={{ backgroundColor: COLOR_PALETTE[index % COLOR_PALETTE.length] }}
        >
          {index + 1}
        </span>
        <div className="score-card-title">
          <h4>{idea.name}</h4>
          <p>{idea.description}</p>
        </div>
      </div>
      <div className="score-card-body">
        {dimensions.map((dim) => (
          <ScoreSlider
            key={dim}
            ideaId={idea.id}
            dimension={dim}
            value={idea.scores[dim]}
            onChange={onScoreChange}
            readonly={readonly}
            colorIndex={index}
          />
        ))}
      </div>
    </div>
  );
});

function ScoringPanel({ ideas, onScoreChange, readonly = false }: ScoringPanelProps) {
  return (
    <div className="scoring-panel">
      {ideas.map((idea, index) => (
        <IdeaScoreCard
          key={idea.id}
          idea={idea}
          index={index}
          onScoreChange={onScoreChange}
          readonly={readonly}
        />
      ))}
    </div>
  );
}

export default memo(ScoringPanel);
