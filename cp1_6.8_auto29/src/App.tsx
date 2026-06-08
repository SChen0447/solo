import React, { useState, useCallback, useEffect, useMemo } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import ImageUploader from './components/ImageUploader';
import StyleGallery from './components/StyleGallery';
import FavoritesSidebar from './components/FavoritesSidebar';
import PopularBanner from './components/PopularBanner';
import ResultPreview from './components/ResultPreview';
import { applyStyleFilter } from './utils/imageFilters';
import { StyleInfo, StyleId, LikeStats, FavoriteItem, ProgressEvent } from './types';

const STYLES: StyleInfo[] = [
  {
    id: 'watercolor',
    name: '水彩',
    color: '#ff9a56',
    gradient: 'linear-gradient(135deg, #ff9a56, #ff6b9d)',
  },
  {
    id: 'sketch',
    name: '素描',
    color: '#7c9db6',
    gradient: 'linear-gradient(135deg, #a8c0d6, #5c7a94)',
  },
  {
    id: 'pixel',
    name: '像素风',
    color: '#9b59b6',
    gradient: 'linear-gradient(135deg, #c39bd3, #6c3483)',
  },
  {
    id: 'oil',
    name: '油画',
    color: '#d4a574',
    gradient: 'linear-gradient(135deg, #e8c89e, #b8864b)',
  },
];

const FAVORITES_KEY = 'avatar_favorites';
const MAX_FAVORITES_PER_STYLE = 3;

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleId | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [likeStats, setLikeStats] = useState<LikeStats[]>([]);
  const [hasLiked, setHasLiked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(FAVORITES_KEY);
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    const fetchLikes = async () => {
      try {
        const res = await axios.get('/api/likes');
        setLikeStats(res.data.stats);
      } catch (err) {
        const mockStats: LikeStats[] = STYLES.map((s, i) => ({
          style: s.id,
          likes: 100 + i * 30,
        }));
        setLikeStats(mockStats.sort((a, b) => b.likes - a.likes));
      }
    };
    fetchLikes();
  }, []);

  const handleImageSelect = useCallback(async (file: File, imageUrl: string) => {
    setOriginalImage(imageUrl);
    setOriginalFile(file);
    setResultImage(null);
    setSelectedStyle(null);
    setHasLiked(false);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSessionId(res.data.sessionId);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }, []);

  const handleStyleSelect = useCallback(
    (styleId: StyleId) => {
      if (!originalImage || isProcessing) return;

      setSelectedStyle(styleId);
      setIsProcessing(true);
      setProgress(0);
      setResultImage(null);
      setHasLiked(false);

      if (sessionId) {
        const eventSource = new EventSource(
          `/stream/process/${sessionId}/${styleId}`
        );

        eventSource.onmessage = async (event) => {
          const data: ProgressEvent = JSON.parse(event.data);
          if (data.type === 'progress' && data.progress !== undefined) {
            setProgress(data.progress);
          } else if (data.type === 'complete' && data.result) {
            eventSource.close();
            try {
              const filteredImage = await applyStyleFilter(
                originalImage,
                styleId
              );
              setResultImage(filteredImage);
            } catch (err) {
              setResultImage(data.result.imageUrl);
            }
            setIsProcessing(false);
            setProgress(100);
          }
        };

        eventSource.onerror = async () => {
          eventSource.close();
          const filteredImage = await applyStyleFilter(originalImage, styleId);
          setResultImage(filteredImage);
          setIsProcessing(false);
          setProgress(100);
        };
      } else {
        (async () => {
          let currentProgress = 0;
          const interval = setInterval(() => {
            currentProgress += 5;
            setProgress(Math.min(currentProgress, 95));
            if (currentProgress >= 95) {
              clearInterval(interval);
            }
          }, 100);

          const filteredImage = await applyStyleFilter(originalImage, styleId);

          clearInterval(interval);
          setResultImage(filteredImage);
          setIsProcessing(false);
          setProgress(100);
        })();
      }
    },
    [originalImage, isProcessing, sessionId]
  );

  const handleDownload = useCallback(() => {
    if (!resultImage || !selectedStyle) return;

    const link = document.createElement('a');
    link.download = `avatar-${selectedStyle}-${Date.now()}.png`;
    link.href = resultImage;
    link.click();
  }, [resultImage, selectedStyle]);

  const handleFavorite = useCallback(() => {
    if (!resultImage || !selectedStyle || !originalImage) return;

    const styleFavorites = favorites.filter(
      (f) => f.styleId === selectedStyle
    );

    if (styleFavorites.length >= MAX_FAVORITES_PER_STYLE) {
      alert(`每个风格最多收藏 ${MAX_FAVORITES_PER_STYLE} 个头像`);
      return;
    }

    const newFavorite: FavoriteItem = {
      id: uuidv4(),
      styleId: selectedStyle,
      imageUrl: resultImage,
      originalImageUrl: originalImage,
      timestamp: Date.now(),
    };

    setFavorites((prev) => [newFavorite, ...prev]);
  }, [resultImage, selectedStyle, originalImage, favorites]);

  const isFavorited = useMemo(() => {
    if (!resultImage || !selectedStyle) return false;
    return favorites.some(
      (f) => f.styleId === selectedStyle && f.imageUrl === resultImage
    );
  }, [resultImage, selectedStyle, favorites]);

  const handleRemoveFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSelectFavorite = useCallback(
    (item: FavoriteItem) => {
      setOriginalImage(item.originalImageUrl);
      setResultImage(item.imageUrl);
      setSelectedStyle(item.styleId);
      setHasLiked(false);
      setFavoritesOpen(false);
    },
    []
  );

  const handleLike = useCallback(async () => {
    if (!selectedStyle || hasLiked) return;

    setHasLiked(true);
    setLikeStats((prev) =>
      prev.map((s) =>
        s.style === selectedStyle ? { ...s, likes: s.likes + 1 } : s
      )
    );

    try {
      await axios.post(`/api/like/${selectedStyle}`);
    } catch (err) {
      console.error('Like failed:', err);
    }
  }, [selectedStyle, hasLiked]);

  const currentLikes = useMemo(() => {
    if (!selectedStyle) return 0;
    const stat = likeStats.find((s) => s.style === selectedStyle);
    return stat?.likes || 0;
  }, [selectedStyle, likeStats]);

  const selectedStyleInfo = useMemo(() => {
    return STYLES.find((s) => s.id === selectedStyle);
  }, [selectedStyle]);

  return (
    <div className="app">
      <PopularBanner stats={likeStats} styles={STYLES} />

      <div className="main-content">
        <div className="left-panel">
          <ImageUploader
            imageUrl={originalImage}
            onImageSelect={handleImageSelect}
          />
        </div>

        <div className="center-panel">
          <StyleGallery
            styles={STYLES}
            selectedStyle={selectedStyle}
            isProcessing={isProcessing}
            progress={progress}
            onStyleSelect={handleStyleSelect}
            disabled={!originalImage}
          />

          <ResultPreview
            resultImage={resultImage}
            styleId={selectedStyle}
            styleColor={selectedStyleInfo?.color || '#666'}
            likes={currentLikes}
            isFavorited={isFavorited}
            isProcessing={isProcessing}
            onDownload={handleDownload}
            onFavorite={handleFavorite}
            onLike={handleLike}
          />
        </div>

        <div className="right-panel">
          <FavoritesSidebar
            favorites={favorites}
            styles={STYLES}
            isOpen={favoritesOpen}
            onToggle={() => setFavoritesOpen(!favoritesOpen)}
            onRemove={handleRemoveFavorite}
            onSelect={handleSelectFavorite}
          />
        </div>
      </div>

      <div className="mobile-bottom-nav">
        <button
          className={`nav-btn ${favoritesOpen ? 'active' : ''}`}
          onClick={() => setFavoritesOpen(!favoritesOpen)}
        >
          <span>❤️</span>
          <span>收藏</span>
          {favorites.length > 0 && (
            <span className="nav-badge">{favorites.length}</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default App;
