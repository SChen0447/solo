import type { PlaylistComponent as PlaylistComponentType } from '../../types';
import './PlaylistComponent.css';

interface PlaylistComponentProps {
  component: PlaylistComponentType;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

const PlaylistComponent = ({ component, isSelected, onSelect, onDoubleClick }: PlaylistComponentProps) => {
  return (
    <div
      className={`playlist-card ${isSelected ? 'selected' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      <div className="playlist-header">
        <h3 className="playlist-title">{component.title}</h3>
        <span className="playlist-count">{component.songs.length} 首歌</span>
      </div>
      <div className="playlist-songs">
        {component.songs.map((song, index) => (
          <div key={song.id} className="song-item">
            <span className="song-index">{index + 1}</span>
            <img src={song.cover} alt="" className="song-cover" />
            <div className="song-info">
              <div className="song-title">{song.title}</div>
              <div className="song-artist">{song.artist}</div>
            </div>
            <span className="song-duration">{song.duration}</span>
            <span
              className="song-tag"
              style={{ backgroundColor: song.tagColor }}
            />
          </div>
        ))}
      </div>
      {isSelected && <div className="component-selected-indicator" />}
    </div>
  );
};

export default PlaylistComponent;
