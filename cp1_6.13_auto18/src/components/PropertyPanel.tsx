import { useAppStore } from '../store/useAppStore';
import { gradientColors } from '../utils/themes';
import type { SocialPlatform, IconStyle, PlayMode } from '../types';
import './PropertyPanel.css';

const PropertyPanel = () => {
  const components = useAppStore((state) => state.components);
  const selectedId = useAppStore((state) => state.selectedId);
  const updateComponent = useAppStore((state) => state.updateComponent);
  const removeComponent = useAppStore((state) => state.removeComponent);
  const addSong = useAppStore((state) => state.addSong);
  const removeSong = useAppStore((state) => state.removeSong);
  const updateSong = useAppStore((state) => state.updateSong);
  const addSocialLink = useAppStore((state) => state.addSocialLink);
  const removeSocialLink = useAppStore((state) => state.removeSocialLink);
  const updateSocialLink = useAppStore((state) => state.updateSocialLink);

  const selectedComponent = components.find((c) => c.id === selectedId);

  if (!selectedComponent) {
    return (
      <div className="property-panel">
        <div className="property-panel-empty">
          <div className="empty-icon">👆</div>
          <h3>选择一个组件</h3>
          <p>点击画布中的组件以编辑属性</p>
        </div>
      </div>
    );
  }

  const renderPlayerProperties = () => {
    if (selectedComponent.type !== 'player') return null;
    const comp = selectedComponent;

    return (
      <div className="property-section">
        <h4 className="property-section-title">播放器设置</h4>

        <div className="property-item">
          <label>标题</label>
          <input
            type="text"
            value={comp.title}
            onChange={(e) => updateComponent(comp.id, { title: e.target.value })}
            className="property-input"
          />
        </div>

        <div className="property-item">
          <label>艺术家</label>
          <input
            type="text"
            value={comp.artist}
            onChange={(e) => updateComponent(comp.id, { artist: e.target.value })}
            className="property-input"
          />
        </div>

        <div className="property-item">
          <label>封面图片URL</label>
          <input
            type="text"
            value={comp.coverImage}
            onChange={(e) => updateComponent(comp.id, { coverImage: e.target.value })}
            className="property-input"
          />
        </div>

        <div className="property-item">
          <label>背景渐变色</label>
          <div className="gradient-grid">
            {gradientColors.map((g) => (
              <div
                key={g.id}
                className={`gradient-option ${comp.backgroundColor === g.value ? 'active' : ''}`}
                style={{ background: g.value }}
                onClick={() => updateComponent(comp.id, { backgroundColor: g.value })}
                title={g.name}
              />
            ))}
          </div>
        </div>

        <div className="property-item">
          <label>播放模式</label>
          <div className="mode-buttons">
            {(['loop', 'single', 'shuffle'] as PlayMode[]).map((mode) => (
              <button
                key={mode}
                className={`mode-btn ${comp.playMode === mode ? 'active' : ''}`}
                onClick={() => updateComponent(comp.id, { playMode: mode })}
              >
                {mode === 'loop' && '🔁 循环'}
                {mode === 'single' && '🔂 单曲'}
                {mode === 'shuffle' && '🔀 随机'}
              </button>
            ))}
          </div>
        </div>

        <div className="property-item">
          <label>音频来源</label>
          <div className="mode-buttons">
            {(['url', 'upload'] as const).map((type) => (
              <button
                key={type}
                className={`mode-btn ${comp.audioType === type ? 'active' : ''}`}
                onClick={() => updateComponent(comp.id, { audioType: type })}
              >
                {type === 'url' ? '🔗 在线URL' : '📁 上传MP3'}
              </button>
            ))}
          </div>
        </div>

        {comp.audioType === 'url' && (
          <div className="property-item">
            <label>音频URL</label>
            <input
              type="text"
              value={comp.audioUrl}
              placeholder="输入音频文件地址"
              onChange={(e) => updateComponent(comp.id, { audioUrl: e.target.value })}
              className="property-input"
            />
          </div>
        )}

        {comp.audioType === 'upload' && (
          <div className="property-item">
            <label>上传MP3</label>
            <input
              type="file"
              accept="audio/mp3"
              className="file-input"
            />
          </div>
        )}
      </div>
    );
  };

  const renderPlaylistProperties = () => {
    if (selectedComponent.type !== 'playlist') return null;
    const comp = selectedComponent;

    return (
      <div className="property-section">
        <div className="property-section-header">
          <h4 className="property-section-title">歌单设置</h4>
          <button
            className="add-btn"
            onClick={() => addSong(comp.id)}
          >
            + 添加歌曲
          </button>
        </div>

        <div className="property-item">
          <label>歌单标题</label>
          <input
            type="text"
            value={comp.title}
            onChange={(e) => updateComponent(comp.id, { title: e.target.value })}
            className="property-input"
          />
        </div>

        <div className="song-list">
          {comp.songs.map((song, index) => (
            <div key={song.id} className="song-edit-item">
              <div className="song-edit-header">
                <span className="song-edit-index">{index + 1}</span>
                <button
                  className="delete-song-btn"
                  onClick={() => removeSong(comp.id, song.id)}
                >
                  ✕
                </button>
              </div>
              <div className="song-edit-fields">
                <input
                  type="text"
                  value={song.title}
                  placeholder="歌曲名"
                  onChange={(e) => updateSong(comp.id, song.id, { title: e.target.value })}
                  className="property-input-sm"
                />
                <input
                  type="text"
                  value={song.artist}
                  placeholder="艺术家"
                  onChange={(e) => updateSong(comp.id, song.id, { artist: e.target.value })}
                  className="property-input-sm"
                />
                <div className="song-edit-row">
                  <input
                    type="text"
                    value={song.duration}
                    placeholder="时长"
                    onChange={(e) => updateSong(comp.id, song.id, { duration: e.target.value })}
                    className="property-input-sm"
                    style={{ flex: 1 }}
                  />
                  <div className="color-picker-wrapper">
                    <input
                      type="color"
                      value={song.tagColor}
                      onChange={(e) => updateSong(comp.id, song.id, { tagColor: e.target.value })}
                      className="color-input"
                    />
                    <span className="color-value">{song.tagColor}</span>
                  </div>
                </div>
                <input
                  type="text"
                  value={song.cover}
                  placeholder="封面URL"
                  onChange={(e) => updateSong(comp.id, song.id, { cover: e.target.value })}
                  className="property-input-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSocialProperties = () => {
    if (selectedComponent.type !== 'social') return null;
    const comp = selectedComponent;

    const platforms: SocialPlatform[] = ['spotify', 'instagram', 'youtube', 'twitter', 'tiktok'];
    const platformNames: Record<SocialPlatform, string> = {
      spotify: 'Spotify',
      instagram: 'Instagram',
      youtube: 'YouTube',
      twitter: 'Twitter',
      tiktok: 'TikTok',
    };
    const platformIcons: Record<SocialPlatform, string> = {
      spotify: '🎵',
      instagram: '📷',
      youtube: '▶️',
      twitter: '🐦',
      tiktok: '🎶',
    };

    return (
      <div className="property-section">
        <div className="property-section-header">
          <h4 className="property-section-title">社交链接设置</h4>
          {comp.links.length < 5 && (
            <button
              className="add-btn"
              onClick={() => addSocialLink(comp.id)}
            >
              + 添加链接
            </button>
          )}
        </div>

        <div className="property-item">
          <label>标题</label>
          <input
            type="text"
            value={comp.title}
            onChange={(e) => updateComponent(comp.id, { title: e.target.value })}
            className="property-input"
          />
        </div>

        <div className="property-item">
          <label>图标样式</label>
          <div className="mode-buttons">
            {(['rounded', 'circle', 'borderless'] as IconStyle[]).map((style) => (
              <button
                key={style}
                className={`mode-btn ${comp.iconStyle === style ? 'active' : ''}`}
                onClick={() => updateComponent(comp.id, { iconStyle: style })}
              >
                {style === 'rounded' && '⬜ 圆角'}
                {style === 'circle' && '⚪ 圆形'}
                {style === 'borderless' && '🔲 无边框'}
              </button>
            ))}
          </div>
        </div>

        <div className="social-links-list">
          {comp.links.map((link) => (
            <div key={link.id} className="social-link-edit">
              <div className="social-link-header">
                <div className="social-link-platform">
                  <span className="platform-icon">{platformIcons[link.platform]}</span>
                  <select
                    value={link.platform}
                    onChange={(e) => updateSocialLink(comp.id, link.id, { platform: e.target.value as SocialPlatform })}
                    className="platform-select"
                  >
                    {platforms.map((p) => (
                      <option key={p} value={p}>{platformNames[p]}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="delete-link-btn"
                  onClick={() => removeSocialLink(comp.id, link.id)}
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                value={link.url}
                placeholder="输入链接地址"
                onChange={(e) => updateSocialLink(comp.id, link.id, { url: e.target.value })}
                className="property-input"
              />
            </div>
          ))}
        </div>

        {comp.links.length >= 5 && (
          <p className="limit-tip">最多可添加5个链接</p>
        )}
      </div>
    );
  };

  return (
    <div className="property-panel">
      <div className="property-panel-header">
        <h3 className="property-panel-title">属性面板</h3>
        {selectedComponent && (
          <button
            className="delete-component-btn"
            onClick={() => {
              removeComponent(selectedComponent.id);
            }}
          >
            🗑️ 删除
          </button>
        )}
      </div>

      <div className="property-panel-content">
        {renderPlayerProperties()}
        {renderPlaylistProperties()}
        {renderSocialProperties()}
      </div>
    </div>
  );
};

export default PropertyPanel;
