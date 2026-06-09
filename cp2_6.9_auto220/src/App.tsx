import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PhotoUploader } from './components/PhotoUploader';
import { EditPanel } from './components/EditPanel';
import { MemoryBoard } from './components/MemoryBoard';
import { PreviewModal } from './components/PreviewModal';
import { LeatherCover } from './components/LeatherCover';
import { HistoryList } from './components/HistoryList';
import { TravelPhoto, MemoryBoard as MemoryBoardType, PanelTheme } from './utils/types';
import { extractDominantColor, getComplementaryColor } from './utils/colorExtractor';
import { exportAsWallpaper, exportAsSquare } from './utils/canvasExporter';
import { ArrowLeft, Eye, Sparkles } from 'lucide-react';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getTodayDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateRange(photos: TravelPhoto[]): string {
  if (photos.length === 0) return '';
  const dates = photos.map(p => p.date).filter(Boolean).sort();
  if (dates.length === 0) return '';
  if (dates.length === 1) return dates[0];
  return `${dates[0]} ~ ${dates[dates.length - 1]}`;
}

const STORAGE_KEY = 'travelogue_boards';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'home' | 'edit'>('home');
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [generatedBoard, setGeneratedBoard] = useState<MemoryBoardType | null>(null);
  const [savedBoards, setSavedBoards] = useState<MemoryBoardType[]>([]);
  const [panelTheme, setPanelTheme] = useState<PanelTheme>({
    bg: '#FFF8E7',
    text: '#2C1810',
    accent: '#D4A574',
    line: '#E0D5C1'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [flipping, setFlipping] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setSavedBoards(JSON.parse(saved));
      } catch {
        console.error('Failed to load saved boards');
      }
    }
  }, []);

  const saveBoards = useCallback((boards: MemoryBoardType[]) => {
    setSavedBoards(boards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  }, []);

  const handleCoverClick = () => {
    setFlipping(true);
    setTimeout(() => {
      setCurrentView('edit');
      setFlipping(false);
    }, 600);
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setPhotos([]);
    setSelectedPhotoId(null);
    setGeneratedBoard(null);
    setPanelTheme({
      bg: '#FFF8E7',
      text: '#2C1810',
      accent: '#D4A574',
      line: '#E0D5C1'
    });
  };

  const handlePhotosAdd = useCallback(async (files: Array<File & { croppedSrc?: string }>) => {
    const newPhotos: TravelPhoto[] = [];

    for (const file of files) {
      const src = file.croppedSrc || await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      let dominantColor = '#8B5E3C';
      try {
        dominantColor = await extractDominantColor(src);
      } catch {
        console.warn('Color extraction failed');
      }

      newPhotos.push({
        id: generateId(),
        src,
        label: '',
        date: getTodayDate(),
        thought: '',
        dominantColor
      });
    }

    setPhotos(prev => {
      const updated = [...prev, ...newPhotos].slice(0, 9);
      if (!selectedPhotoId && updated.length > 0) {
        setSelectedPhotoId(updated[0].id);
        const theme = getComplementaryColor(updated[0].dominantColor);
        setPanelTheme(theme);
      }
      return updated;
    });
  }, [selectedPhotoId]);

  const handlePhotoDelete = useCallback((id: string) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== id);
      if (selectedPhotoId === id) {
        if (updated.length > 0) {
          setSelectedPhotoId(updated[0].id);
          const theme = getComplementaryColor(updated[0].dominantColor);
          setPanelTheme(theme);
        } else {
          setSelectedPhotoId(null);
          setPanelTheme({
            bg: '#FFF8E7',
            text: '#2C1810',
            accent: '#D4A574',
            line: '#E0D5C1'
          });
        }
      }
      return updated;
    });
  }, [selectedPhotoId]);

  const handlePhotoSelect = useCallback((id: string) => {
    setSelectedPhotoId(id);
    const photo = photos.find(p => p.id === id);
    if (photo) {
      const theme = getComplementaryColor(photo.dominantColor);
      setPanelTheme(theme);
    }
  }, [photos]);

  const handleUpdatePhoto = useCallback((id: string, updates: Partial<TravelPhoto>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const handleAutoColor = useCallback(async () => {
    if (!selectedPhotoId) return;
    const photo = photos.find(p => p.id === selectedPhotoId);
    if (!photo) return;

    try {
      const color = await extractDominantColor(photo.src);
      handleUpdatePhoto(selectedPhotoId, { dominantColor: color });
      const theme = getComplementaryColor(color);
      setPanelTheme(theme);
    } catch {
      console.warn('Auto color failed');
    }
  }, [selectedPhotoId, photos, handleUpdatePhoto]);

  const selectedPhoto = photos.find(p => p.id === selectedPhotoId) || null;

  const handleGenerateBoard = useCallback(() => {
    if (photos.length === 0) return;

    let avgR = 0, avgG = 0, avgB = 0;
    photos.forEach(p => {
      avgR += parseInt(p.dominantColor.slice(1, 3), 16);
      avgG += parseInt(p.dominantColor.slice(3, 5), 16);
      avgB += parseInt(p.dominantColor.slice(5, 7), 16);
    });
    avgR = Math.round(avgR / photos.length);
    avgG = Math.round(avgG / photos.length);
    avgB = Math.round(avgB / photos.length);
    const titleColor = '#' + [avgR, avgG, avgB].map(x => x.toString(16).padStart(2, '0')).join('');

    const board: MemoryBoardType = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      photos: [...photos],
      titleColor,
      dateRange: getDateRange(photos),
      photoCount: photos.length
    };

    setGeneratedBoard(board);

    const updatedBoards = [board, ...savedBoards];
    saveBoards(updatedBoards);
  }, [photos, savedBoards, saveBoards]);

  const handleBoardSelect = useCallback((board: MemoryBoardType) => {
    setFlipping(true);
    setTimeout(() => {
      setPhotos(board.photos);
      setGeneratedBoard(board);
      if (board.photos.length > 0) {
        setSelectedPhotoId(board.photos[0].id);
        const theme = getComplementaryColor(board.photos[0].dominantColor);
        setPanelTheme(theme);
      }
      setCurrentView('edit');
      setFlipping(false);
    }, 600);
  }, []);

  const handleBoardDelete = useCallback((id: string) => {
    const updated = savedBoards.filter(b => b.id !== id);
    saveBoards(updated);
  }, [savedBoards, saveBoards]);

  const handleExportAll = useCallback(() => {
    const dataStr = JSON.stringify(savedBoards, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `travelogue-boards-${getTodayDate()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [savedBoards]);

  const handleExportWallpaper = useCallback(async () => {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      await exportAsWallpaper(boardRef.current);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting(false);
  }, []);

  const handleExportSquare = useCallback(async () => {
    if (!boardRef.current) return;
    setExporting(true);
    try {
      await exportAsSquare(boardRef.current);
    } catch (e) {
      console.error('Export failed:', e);
    }
    setExporting(false);
  }, []);

  if (currentView === 'home') {
    return (
      <div className={`app home-view ${flipping ? 'flipping-out' : ''}`}>
        <LeatherCover onClick={handleCoverClick} />
        <div className="home-history">
          <HistoryList
            boards={savedBoards}
            onBoardSelect={handleBoardSelect}
            onBoardDelete={handleBoardDelete}
            onExportAll={handleExportAll}
          />
        </div>
      </div>
    );
  }

  const dateRange = getDateRange(photos);

  return (
    <div className={`app edit-view ${flipping ? 'flipping-in' : ''}`}>
      <div className="edit-header">
        <button className="ripple-btn back-btn" onClick={handleBackToHome}>
          <ArrowLeft size={18} />
          返回封面
        </button>
        <h2 className="edit-title" style={{ fontFamily: '"Crimson Text", serif' }}>
          Travelogue · 编辑旅行记忆
        </h2>
        <div style={{ width: 120 }} />
      </div>

      <div className="edit-main">
        <div className="edit-left">
          <PhotoUploader
            photos={photos}
            selectedPhotoId={selectedPhotoId}
            onPhotosAdd={handlePhotosAdd}
            onPhotoDelete={handlePhotoDelete}
            onPhotoSelect={handlePhotoSelect}
          />

          <div className="generate-section">
            <button
              className={`ripple-btn generate-btn ${photos.length === 0 ? 'disabled' : ''}`}
              onClick={handleGenerateBoard}
              disabled={photos.length === 0}
            >
              <Sparkles size={22} />
              生成记忆画板
            </button>
            <p className="generate-hint">
              {photos.length === 0
                ? '请先上传至少一张照片'
                : `已添加 ${photos.length}/9 张照片`}
            </p>
          </div>
        </div>

        <div className="edit-right">
          <EditPanel
            selectedPhoto={selectedPhoto}
            panelTheme={panelTheme}
            onUpdatePhoto={handleUpdatePhoto}
            onAutoColor={handleAutoColor}
          />

          {generatedBoard && (
            <div className="board-preview-section">
              <div className="preview-header">
                <h4 className="preview-title" style={{ fontFamily: '"Crimson Text", serif' }}>
                  画板预览
                </h4>
                <button
                  className="ripple-btn preview-expand-btn"
                  onClick={() => setShowPreview(true)}
                >
                  <Eye size={16} />
                  全屏查看
                </button>
              </div>
              <div className="board-thumbnail">
                <MemoryBoard
                  ref={boardRef}
                  photos={generatedBoard.photos}
                  dateRange={generatedBoard.dateRange}
                  titleColor={generatedBoard.titleColor}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        boardContent={generatedBoard ? (
          <MemoryBoard
            photos={generatedBoard.photos}
            dateRange={generatedBoard.dateRange}
            titleColor={generatedBoard.titleColor}
          />
        ) : null}
        onExportWallpaper={handleExportWallpaper}
        onExportSquare={handleExportSquare}
        exporting={exporting}
      />
    </div>
  );
};

export default App;
