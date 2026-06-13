import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  CanvasComponent,
  ComponentType,
  PlayerComponent,
  PlaylistComponent,
  SocialComponent,
  Theme,
  Song,
  SocialLink,
} from '../types';
import { themes, defaultTheme, gradientColors } from '../utils/themes';

interface AppState {
  components: CanvasComponent[];
  selectedId: string | null;
  theme: Theme;
  customPrimaryColor: string;
  modalComponentId: string | null;
  toast: { message: string; visible: boolean } | null;

  addComponent: (type: ComponentType) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, data: Partial<CanvasComponent>) => void;
  reorderComponents: (startIndex: number, endIndex: number) => void;
  setSelectedId: (id: string | null) => void;
  setTheme: (themeId: string) => void;
  setCustomColor: (color: string) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  showToast: (message: string) => void;
  hideToast: () => void;
  exportJSON: () => string;
  generateHTML: () => string;

  addSong: (playlistId: string) => void;
  removeSong: (playlistId: string, songId: string) => void;
  updateSong: (playlistId: string, songId: string, data: Partial<Song>) => void;

  addSocialLink: (socialId: string) => void;
  removeSocialLink: (socialId: string, linkId: string) => void;
  updateSocialLink: (socialId: string, linkId: string, data: Partial<SocialLink>) => void;
}

const createDefaultPlayer = (): PlayerComponent => ({
  id: uuidv4(),
  type: 'player',
  position: 0,
  coverImage: 'https://picsum.photos/seed/music1/300/300',
  backgroundColor: gradientColors[0].value,
  playMode: 'loop',
  audioUrl: '',
  audioType: 'url',
  title: '我的音乐',
  artist: '独立音乐人',
});

const createDefaultPlaylist = (): PlaylistComponent => ({
  id: uuidv4(),
  type: 'playlist',
  position: 0,
  title: '热门歌单',
  songs: [
    {
      id: uuidv4(),
      title: '第一首歌',
      artist: '音乐人',
      duration: '3:45',
      cover: 'https://picsum.photos/seed/song1/60/60',
      tagColor: '#e94560',
    },
    {
      id: uuidv4(),
      title: '第二首歌',
      artist: '音乐人',
      duration: '4:12',
      cover: 'https://picsum.photos/seed/song2/60/60',
      tagColor: '#0f3460',
    },
    {
      id: uuidv4(),
      title: '第三首歌',
      artist: '音乐人',
      duration: '2:58',
      cover: 'https://picsum.photos/seed/song3/60/60',
      tagColor: '#52b788',
    },
  ],
});

const createDefaultSocial = (): SocialComponent => ({
  id: uuidv4(),
  type: 'social',
  position: 0,
  title: '关注我',
  iconStyle: 'circle',
  links: [
    { id: uuidv4(), platform: 'spotify', url: 'https://spotify.com' },
    { id: uuidv4(), platform: 'instagram', url: 'https://instagram.com' },
    { id: uuidv4(), platform: 'youtube', url: 'https://youtube.com' },
  ],
});

const initialComponents: CanvasComponent[] = [
  createDefaultPlayer(),
  createDefaultPlaylist(),
  createDefaultSocial(),
].map((c, i) => ({ ...c, position: i }));

export const useAppStore = create<AppState>((set, get) => ({
  components: initialComponents,
  selectedId: null,
  theme: defaultTheme,
  customPrimaryColor: defaultTheme.primary,
  modalComponentId: null,
  toast: null,

  addComponent: (type: ComponentType) => {
    const { components } = get();
    let newComponent: CanvasComponent;
    switch (type) {
      case 'player':
        newComponent = createDefaultPlayer();
        break;
      case 'playlist':
        newComponent = createDefaultPlaylist();
        break;
      case 'social':
        newComponent = createDefaultSocial();
        break;
      default:
        return;
    }
    newComponent.position = components.length;
    set({ components: [...components, newComponent], selectedId: newComponent.id });
  },

  removeComponent: (id: string) => {
    const { components, selectedId } = get();
    const filtered = components.filter((c) => c.id !== id);
    const reindexed = filtered.map((c, i) => ({ ...c, position: i }));
    set({
      components: reindexed,
      selectedId: selectedId === id ? null : selectedId,
    });
  },

  updateComponent: (id: string, data: Partial<CanvasComponent>) => {
    set({
      components: get().components.map((c) =>
        c.id === id ? ({ ...c, ...data } as CanvasComponent) : c
      ),
    });
  },

  reorderComponents: (startIndex: number, endIndex: number) => {
    const { components } = get();
    const result = Array.from(components);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    const reindexed = result.map((c, i) => ({ ...c, position: i }));
    set({ components: reindexed });
  },

  setSelectedId: (id: string | null) => set({ selectedId: id }),

  setTheme: (themeId: string) => {
    const theme = themes.find((t) => t.id === themeId);
    if (theme) {
      set({ theme, customPrimaryColor: theme.primary });
    }
  },

  setCustomColor: (color: string) => {
    const { theme } = get();
    set({
      customPrimaryColor: color,
      theme: { ...theme, primary: color },
    });
  },

  openModal: (id: string) => set({ modalComponentId: id }),

  closeModal: () => set({ modalComponentId: null }),

  showToast: (message: string) => {
    set({ toast: { message, visible: true } });
    setTimeout(() => {
      get().hideToast();
    }, 3000);
  },

  hideToast: () => set({ toast: null }),

  exportJSON: () => {
    const { components, theme, customPrimaryColor } = get();
    return JSON.stringify(
      {
        components,
        theme: theme.id,
        customPrimaryColor,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  },

  generateHTML: () => {
    const { components, theme } = get();
    const componentsHTML = components
      .sort((a, b) => a.position - b.position)
      .map((comp) => {
        if (comp.type === 'player') {
          return `
  <div style="background:${comp.backgroundColor};border-radius:16px;padding:24px;color:#fff;margin-bottom:20px;box-shadow:${theme.shadow}">
    <div style="display:flex;gap:20px;align-items:center">
      <img src="${comp.coverImage}" style="width:100px;height:100px;border-radius:12px;object-fit:cover" alt="cover">
      <div>
        <h3 style="margin:0 0 8px 0;font-size:20px">${comp.title}</h3>
        <p style="margin:0;opacity:0.8;font-size:14px">${comp.artist}</p>
      </div>
    </div>
    <div style="margin-top:16px;height:6px;background:rgba(255,255,255,0.2);border-radius:3px">
      <div style="width:40%;height:100%;background:#fff;border-radius:3px"></div>
    </div>
    <div style="display:flex;justify-content:center;gap:20px;margin-top:16px">
      <button style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer">⏮</button>
      <button style="background:#fff;border:none;width:48px;height:48px;border-radius:50%;font-size:20px;cursor:pointer">▶</button>
      <button style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer">⏭</button>
    </div>
  </div>`;
        }
        if (comp.type === 'playlist') {
          const songsHTML = comp.songs
            .map(
              (song, idx) => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;cursor:pointer;transition:background 0.2s" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
      <span style="width:24px;text-align:center;opacity:0.6">${idx + 1}</span>
      <img src="${song.cover}" style="width:44px;height:44px;border-radius:6px;object-fit:cover" alt="">
      <div style="flex:1">
        <div style="font-weight:500;margin-bottom:2px">${song.title}</div>
        <div style="font-size:12px;opacity:0.6">${song.artist}</div>
      </div>
      <span style="font-size:12px;opacity:0.6">${song.duration}</span>
      <span style="width:8px;height:8px;border-radius:50%;background:${song.tagColor}"></span>
    </div>`
            )
            .join('');
          return `
  <div style="background:${theme.cardBg};border:1px solid ${theme.cardBorder};border-radius:16px;padding:20px;color:${theme.text};margin-bottom:20px;backdrop-filter:blur(12px)">
    <h3 style="margin:0 0 16px 0;font-size:18px">${comp.title}</h3>
    <div style="display:flex;flex-direction:column;gap:4px">
      ${songsHTML}
    </div>
  </div>`;
        }
        if (comp.type === 'social') {
          const icons: Record<string, string> = {
            spotify: '🎵',
            instagram: '📷',
            youtube: '▶️',
            twitter: '🐦',
            tiktok: '🎶',
          };
          const linksHTML = comp.links
            .map(
              (link) => `
    <a href="${link.url}" target="_blank" style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:${
                comp.iconStyle === 'circle' ? '50%' : comp.iconStyle === 'rounded' ? '12px' : '0'
              };background:${
                comp.iconStyle === 'borderless' ? 'transparent' : theme.primary
              };color:${comp.iconStyle === 'borderless' ? theme.primary : '#fff'};text-decoration:none;font-size:24px;transition:transform 0.2s" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
      ${icons[link.platform] || '🔗'}
    </a>`
            )
            .join('');
          return `
  <div style="background:${theme.cardBg};border:1px solid ${theme.cardBorder};border-radius:16px;padding:20px;color:${theme.text};margin-bottom:20px;backdrop-filter:blur(12px);text-align:center">
    <h3 style="margin:0 0 16px 0;font-size:18px">${comp.title}</h3>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      ${linksHTML}
    </div>
  </div>`;
        }
        return '';
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>我的音乐主页</title>
  <style>
    body {
      margin: 0;
      padding: 40px 20px;
      min-height: 100vh;
      background: ${theme.background};
      color: ${theme.text};
      font-family: ${theme.fontFamily};
    }
    .container {
      max-width: 500px;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  <div class="container">
${componentsHTML}
  </div>
</body>
</html>`;
  },

  addSong: (playlistId: string) => {
    const { components } = get();
    set({
      components: components.map((c) => {
        if (c.id === playlistId && c.type === 'playlist') {
          const newSong: Song = {
            id: uuidv4(),
            title: '新歌曲',
            artist: '艺术家',
            duration: '0:00',
            cover: `https://picsum.photos/seed/${uuidv4()}/60/60`,
            tagColor: '#e94560',
          };
          return { ...c, songs: [...c.songs, newSong] };
        }
        return c;
      }) as CanvasComponent[],
    });
  },

  removeSong: (playlistId: string, songId: string) => {
    const { components } = get();
    set({
      components: components.map((c) => {
        if (c.id === playlistId && c.type === 'playlist') {
          return { ...c, songs: c.songs.filter((s) => s.id !== songId) };
        }
        return c;
      }) as CanvasComponent[],
    });
  },

  updateSong: (playlistId: string, songId: string, data: Partial<Song>) => {
    const { components } = get();
    set({
      components: components.map((c) => {
        if (c.id === playlistId && c.type === 'playlist') {
          return {
            ...c,
            songs: c.songs.map((s) => (s.id === songId ? { ...s, ...data } : s)),
          };
        }
        return c;
      }) as CanvasComponent[],
    });
  },

  addSocialLink: (socialId: string) => {
    const { components } = get();
    set({
      components: components.map((c) => {
        if (c.id === socialId && c.type === 'social') {
          if (c.links.length >= 5) return c;
          const platforms: Array<SocialLink['platform']> = ['spotify', 'instagram', 'youtube', 'twitter', 'tiktok'];
          const usedPlatforms = c.links.map((l) => l.platform);
          const availablePlatform = platforms.find((p) => !usedPlatforms.includes(p)) || 'spotify';
          const newLink: SocialLink = {
            id: uuidv4(),
            platform: availablePlatform,
            url: 'https://',
          };
          return { ...c, links: [...c.links, newLink] };
        }
        return c;
      }) as CanvasComponent[],
    });
  },

  removeSocialLink: (socialId: string, linkId: string) => {
    const { components } = get();
    set({
      components: components.map((c) => {
        if (c.id === socialId && c.type === 'social') {
          return { ...c, links: c.links.filter((l) => l.id !== linkId) };
        }
        return c;
      }) as CanvasComponent[],
    });
  },

  updateSocialLink: (socialId: string, linkId: string, data: Partial<SocialLink>) => {
    const { components } = get();
    set({
      components: components.map((c) => {
        if (c.id === socialId && c.type === 'social') {
          return {
            ...c,
            links: c.links.map((l) => (l.id === linkId ? { ...l, ...data } : l)),
          };
        }
        return c;
      }) as CanvasComponent[],
    });
  },
}));
