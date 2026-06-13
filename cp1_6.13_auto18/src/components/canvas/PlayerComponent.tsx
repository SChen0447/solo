import type { PlayerComponent as PlayerComponentType } from '../../types';
import './PlayerComponent.css';

interface PlayerComponentProps {
  component: PlayerComponentType;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

const PlayerComponent = ({ component, isSelected, onSelect, onDoubleClick }: PlayerComponentProps) => {
  return (
    <div
      className={`player-card ${isSelected ? 'selected' : ''}`}
      style={{ background: component.backgroundColor }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      <div className="player-content">
        <div className="player-cover">
          <img src={component.coverImage} alt="cover" />
          <div className="player-cover-glow" />
        </div>
        <div className="player-info">
          <h3 className="player-title">{component.title}</h3>
          <p className="player-artist">{component.artist}</p>
        </div>
        <div className="player-progress">
          <div className="player-progress-bar">
            <div className="player-progress-fill" style={{ width: '35%' }} />
          </div>
          <div className="player-time">
            <span>1:23</span>
            <span>3:45</span>
          </div>
        </div>
        <div className="player-controls">
          <button className="player-btn player-btn-sm">⏮</button>
          <button className="player-btn player-btn-play">▶</button>
          <button className="player-btn player-btn-sm">⏭</button>
        </div>
        <div className="player-mode">
          {component.playMode === 'loop' && '🔁 循环播放'}
          {component.playMode === 'single' && '🔂 单曲循环'}
          {component.playMode === 'shuffle' && '🔀 随机播放'}
        </div>
      </div>
      {isSelected && <div className="component-selected-indicator" />}
    </div>
  );
};

export default PlayerComponent;
