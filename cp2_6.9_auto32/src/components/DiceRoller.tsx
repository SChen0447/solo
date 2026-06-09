import { useState, useEffect } from 'react';
import {
  DiceType,
  DiceRoll,
  RollResult,
  DICE_SIDES,
  DICE_COLORS,
  rollMultiple,
  generateId,
  getDiceSides,
} from '../utils/diceLogic';

interface DiceRollerProps {
  onRollComplete: (result: RollResult) => void;
}

const DICE_TYPES: DiceType[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

export default function DiceRoller({ onRollComplete }: DiceRollerProps) {
  const [selectedType, setSelectedType] = useState<DiceType>('d20');
  const [count, setCount] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [displayRolls, setDisplayRolls] = useState<DiceRoll[]>([]);
  const [animating, setAnimating] = useState(false);

  const handleRoll = () => {
    if (isRolling) return;
    setIsRolling(true);
    setAnimating(true);

    const finalRolls = rollMultiple(selectedType, count);

    let frame = 0;
    const totalFrames = 12;
    const interval = setInterval(() => {
      frame++;
      const tempRolls: DiceRoll[] = [];
      const sides = getDiceSides(selectedType);
      for (let i = 0; i < count; i++) {
        tempRolls.push({
          type: selectedType,
          sides,
          value: Math.floor(Math.random() * sides) + 1,
        });
      }
      setDisplayRolls(tempRolls);

      if (frame >= totalFrames) {
        clearInterval(interval);
        setDisplayRolls(finalRolls);
        setAnimating(false);

        const result: RollResult = {
          id: generateId(),
          timestamp: Date.now(),
          type: selectedType,
          count,
          rolls: finalRolls,
          total: finalRolls.reduce((sum, r) => sum + r.value, 0),
        };
        onRollComplete(result);

        setTimeout(() => {
          setIsRolling(false);
        }, 100);
      }
    }, 40);
  };

  const decreaseCount = () => {
    if (count > 1) setCount(count - 1);
  };

  const increaseCount = () => {
    if (count < 10) setCount(count + 1);
  };

  useEffect(() => {
    if (displayRolls.length === 0) {
      const sides = getDiceSides(selectedType);
      setDisplayRolls([{ type: selectedType, sides, value: sides }]);
    }
  }, []);

  return (
    <div className="dice-roller">
      <h2 className="section-title">🎲 骰子投掷</h2>

      <div className="dice-type-grid">
        {DICE_TYPES.map((type) => (
          <button
            key={type}
            className={`dice-type-btn ${selectedType === type ? 'selected' : ''}`}
            onClick={() => {
              setSelectedType(type);
              if (!isRolling) {
                const sides = getDiceSides(type);
                setDisplayRolls([{ type, sides, value: sides }]);
              }
            }}
            style={{ '--dice-color': DICE_COLORS[type] } as React.CSSProperties}
          >
            <span className="dice-type-label">{type.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="count-selector">
        <span className="count-label">数量:</span>
        <button className="count-btn" onClick={decreaseCount} disabled={count <= 1 || isRolling}>
          −
        </button>
        <span className="count-value">{count}</span>
        <button className="count-btn" onClick={increaseCount} disabled={count >= 10 || isRolling}>
          +
        </button>
      </div>

      <div className={`dice-display ${animating ? 'rolling' : ''}`}>
        <div className="dice-container">
          {displayRolls.slice(0, 6).map((roll, idx) => (
            <div
              key={idx}
              className={`dice-face dice-${roll.type} ${animating ? 'bounce' : ''}`}
              style={{
                '--dice-color': DICE_COLORS[roll.type],
                animationDelay: `${idx * 0.05}s`,
              } as React.CSSProperties}
            >
              <span className="dice-value">{roll.value}</span>
            </div>
          ))}
          {displayRolls.length > 6 && (
            <div className="dice-more">+{displayRolls.length - 6}</div>
          )}
        </div>
        {displayRolls.length > 1 && (
          <div className="dice-total">
            <span className="total-label">总计:</span>
            <span className="total-value">
              {displayRolls.reduce((sum, r) => sum + r.value, 0)}
            </span>
          </div>
        )}
      </div>

      <button
        className={`roll-btn ${isRolling ? 'rolling' : ''}`}
        onClick={handleRoll}
        disabled={isRolling}
      >
        {isRolling ? '投掷中...' : `投掷 ${count}${selectedType.toUpperCase()}`}
      </button>

      {displayRolls.length > 1 && (
        <div className="roll-detail">
          <span className="detail-label">明细:</span>
          <span className="detail-values">
            [{displayRolls.map((r) => r.value).join(', ')}]
          </span>
        </div>
      )}
    </div>
  );
}
