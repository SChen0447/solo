interface GameOverOverlayProps {
  gameState: 'victory' | 'defeat' | null;
  onRestart: () => void;
}

export function GameOverOverlay({ gameState, onRestart }: GameOverOverlayProps) {
  if (!gameState) return null;

  const isVictory = gameState === 'victory';

  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h1 className={`game-over-title ${isVictory ? 'victory' : 'defeat'}`}>
          {isVictory ? '🎉 胜利 🎉' : '💀 失败 💀'}
        </h1>
        <p className="game-over-message">
          {isVictory
            ? '恭喜你成功抵御了所有入侵者！'
            : '防线被突破了，再试一次吧！'}
        </p>
        <button className="btn btn-restart" onClick={onRestart}>
          {isVictory ? '再来一局' : '重新挑战'}
        </button>
      </div>
    </div>
  );
}
