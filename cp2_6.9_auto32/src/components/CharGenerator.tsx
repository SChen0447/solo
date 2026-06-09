import { useState } from 'react';
import {
  AbilityScores,
  ABILITY_NAMES,
  generateAbilityScores,
  getModifier,
  formatModifier,
  getAbilityScoreColor,
} from '../utils/diceLogic';

export default function CharGenerator() {
  const [scores, setScores] = useState<AbilityScores | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleGenerate = () => {
    setAnimating(true);
    let frame = 0;
    const totalFrames = 10;
    const interval = setInterval(() => {
      frame++;
      setScores({
        strength: Math.floor(Math.random() * 16) + 3,
        dexterity: Math.floor(Math.random() * 16) + 3,
        constitution: Math.floor(Math.random() * 16) + 3,
        intelligence: Math.floor(Math.random() * 16) + 3,
        wisdom: Math.floor(Math.random() * 16) + 3,
        charisma: Math.floor(Math.random() * 16) + 3,
      });
      if (frame >= totalFrames) {
        clearInterval(interval);
        setScores(generateAbilityScores());
        setAnimating(false);
      }
    }, 50);
  };

  const abilities: (keyof AbilityScores)[] = [
    'strength',
    'dexterity',
    'constitution',
    'intelligence',
    'wisdom',
    'charisma',
  ];

  const maxScore = 20;

  return (
    <div className="char-generator">
      <h2 className="section-title">⚔️ 角色属性生成</h2>

      <button
        className={`generate-btn ${animating ? 'generating' : ''}`}
        onClick={handleGenerate}
        disabled={animating}
      >
        {animating ? '生成中...' : scores ? '重新生成角色' : '生成角色 (4d6取最高3)'}
      </button>

      {scores && (
        <div className="ability-grid">
          {abilities.map((key) => {
            const score = scores[key];
            const modifier = getModifier(score);
            const colors = getAbilityScoreColor(score);
            const percentage = (score / maxScore) * 100;
            return (
              <div key={key} className={`ability-card ${animating ? 'shimmer' : ''}`}>
                <div className="ability-name">{ABILITY_NAMES[key]}</div>
                <div
                  className="ability-score"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  <span className="score-value">{score}</span>
                </div>
                <div className="ability-modifier">
                  修饰值: <span className={modifier >= 0 ? 'mod-positive' : 'mod-negative'}>
                    {formatModifier(modifier)}
                  </span>
                </div>
                <div className="ability-bar-container">
                  <div
                    className="ability-bar-fill"
                    style={{
                      width: `${percentage}%`,
                      background: colors.bg,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {scores && (
        <div className="ability-summary">
          <div className="summary-title">属性分布</div>
          <div className="summary-chart">
            {abilities.map((key) => {
              const score = scores[key];
              const colors = getAbilityScoreColor(score);
              return (
                <div key={key} className="chart-bar-wrapper">
                  <div
                    className="chart-bar"
                    style={{
                      height: `${(score / maxScore) * 100}%`,
                      background: colors.bg,
                    }}
                  />
                  <div className="chart-label">{ABILITY_NAMES[key].charAt(0)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
