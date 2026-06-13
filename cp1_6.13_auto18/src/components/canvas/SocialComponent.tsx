import type { SocialComponent as SocialComponentType } from '../../types';
import './SocialComponent.css';

interface SocialComponentProps {
  component: SocialComponentType;
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
}

const platformIcons: Record<string, string> = {
  spotify: '🎵',
  instagram: '📷',
  youtube: '▶️',
  twitter: '🐦',
  tiktok: '🎶',
};

const platformNames: Record<string, string> = {
  spotify: 'Spotify',
  instagram: 'Instagram',
  youtube: 'YouTube',
  twitter: 'Twitter',
  tiktok: 'TikTok',
};

const SocialComponent = ({ component, isSelected, onSelect, onDoubleClick }: SocialComponentProps) => {
  return (
    <div
      className={`social-card ${isSelected ? 'selected' : ''} style-${component.iconStyle}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      <h3 className="social-title">{component.title}</h3>
      <div className="social-links">
        {component.links.map((link) => (
          <div
            key={link.id}
            className={`social-link icon-${component.iconStyle}`}
            title={platformNames[link.platform]}
          >
            <span className="social-icon">{platformIcons[link.platform]}</span>
          </div>
        ))}
      </div>
      {isSelected && <div className="component-selected-indicator" />}
    </div>
  );
};

export default SocialComponent;
