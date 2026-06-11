import { useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import BookViewer from './BookViewer';
import AnnotationTool from './AnnotationTool';
import { Annotation, PageAnnotations, BrushColor, BrushThickness, AnnotationPoint } from './types';
import './App.css';

const TOTAL_PAGES = 10;
const MAX_HISTORY = 20;

function generateDemoAnnotations(): PageAnnotations {
  const page1Annotations: Annotation[] = [
    {
      id: 'demo-1',
      color: '#c0392b',
      thickness: 2,
      opacity: 0.7,
      points: [
        { x: 180, y: 200 }, { x: 200, y: 205 }, { x: 230, y: 195 },
        { x: 260, y: 200 }, { x: 290, y: 198 }, { x: 320, y: 202 },
        { x: 350, y: 197 }, { x: 380, y: 200 }, { x: 400, y: 198 },
      ],
    },
    {
      id: 'demo-2',
      color: '#2980b9',
      thickness: 1,
      opacity: 0.7,
      points: [
        { x: 150, y: 350 }, { x: 170, y: 348 }, { x: 190, y: 352 },
        { x: 210, y: 350 }, { x: 230, y: 351 }, { x: 250, y: 349 },
        { x: 270, y: 350 }, { x: 290, y: 348 }, { x: 310, y: 352 },
        { x: 330, y: 350 }, { x: 350, y: 349 }, { x: 370, y: 351 },
        { x: 390, y: 350 }, { x: 410, y: 348 },
      ],
    },
    {
      id: 'demo-3',
      color: '#f39c12',
      thickness: 4,
      opacity: 0.7,
      points: [
        { x: 300, y: 450 }, { x: 310, y: 470 }, { x: 325, y: 485 },
        { x: 340, y: 475 }, { x: 355, y: 460 }, { x: 370, y: 445 },
        { x: 380, y: 465 }, { x: 390, y: 480 },
      ],
    },
  ];
  
  return { 1: page1Annotations };
}

function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [annotations, setAnnotations] = useState<PageAnnotations>(generateDemoAnnotations());
  const [brushColor, setBrushColor] = useState<BrushColor>('#1a1a1a');
  const [brushThickness, setBrushThickness] = useState<BrushThickness>(2);
  const [history, setHistory] = useState<{ page: number; annotation: Annotation }[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);

  const currentAnnotations = annotations[currentPage] || [];

  const goToPage = useCallback((page: number) => {
    if (isFlipping || page < 1 || page > TOTAL_PAGES || page === currentPage) return;
    setFlipDirection(page > currentPage ? 'next' : 'prev');
    setIsFlipping(true);
    setSelectedAnnotationId(null);
    setTimeout(() => {
      setCurrentPage(page);
      setIsFlipping(false);
    }, 300);
  }, [currentPage, isFlipping]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        prevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextPage, prevPage]);

  const addAnnotation = useCallback((points: AnnotationPoint[]) => {
    if (points.length < 2) return;
    
    const newAnnotation: Annotation = {
      id: uuidv4(),
      color: brushColor,
      thickness: brushThickness,
      opacity: 0.7,
      points,
    };

    setAnnotations(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage] || []), newAnnotation],
    }));

    setHistory(prev => {
      const newHistory = [...prev, { page: currentPage, annotation: newAnnotation }];
      return newHistory.slice(-MAX_HISTORY);
    });
  }, [brushColor, brushThickness, currentPage]);

  const deleteAnnotation = useCallback((annotationId: string) => {
    setAnnotations(prev => ({
      ...prev,
      [currentPage]: (prev[currentPage] || []).filter(a => a.id !== annotationId),
    }));
    if (selectedAnnotationId === annotationId) {
      setSelectedAnnotationId(null);
    }
  }, [currentPage, selectedAnnotationId]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    
    const lastAction = history[history.length - 1];
    setHistory(prev => prev.slice(0, -1));
    
    setAnnotations(prev => ({
      ...prev,
      [lastAction.page]: (prev[lastAction.page] || []).filter(a => a.id !== lastAction.annotation.id),
    }));
  }, [history]);

  const exportPage = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createRadialGradient(600, 800, 100, 600, 800, 800);
    gradient.addColorStop(0, '#f5e6c8');
    gradient.addColorStop(1, '#e8d5a8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 1600);

    const pageAnnotations = annotations[currentPage] || [];
    const scale = 1200 / 600;
    
    pageAnnotations.forEach(annotation => {
      if (annotation.points.length < 2) return;
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.thickness * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = annotation.opacity;
      ctx.shadowColor = annotation.color;
      ctx.shadowBlur = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(annotation.points[0].x * scale, annotation.points[0].y * scale);
      for (let i = 1; i < annotation.points.length; i++) {
        ctx.lineTo(annotation.points[i].x * scale, annotation.points[i].y * scale);
      }
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.font = '24px serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${currentPage} 页`, 600, 1550);

    canvas.toBlob(blob => {
      if (blob) {
        saveAs(blob, `古籍批注_第${currentPage}页.png`);
      }
    }, 'image/png');
  }, [annotations, currentPage]);

  return (
    <div className="app-container">
      <div className="wooden-beam" />
      
      <div className="main-content">
        <div className="left-space" onClick={prevPage}>
          {currentPage > 1 && <div className="page-hint prev-hint">← 上一页</div>}
        </div>
        
        <div className="book-area" ref={bookRef}>
          <BookViewer
            currentPage={currentPage}
            totalPages={TOTAL_PAGES}
            annotations={currentAnnotations}
            isFlipping={isFlipping}
            flipDirection={flipDirection}
            brushColor={brushColor}
            brushThickness={brushThickness}
            onAddAnnotation={addAnnotation}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={setSelectedAnnotationId}
          />
        </div>
        
        <div className="right-space" onClick={nextPage}>
          {currentPage < TOTAL_PAGES && <div className="page-hint next-hint">下一页 →</div>}
        </div>
      </div>

      <AnnotationTool
        brushColor={brushColor}
        brushThickness={brushThickness}
        onColorChange={setBrushColor}
        onThicknessChange={setBrushThickness}
        annotations={currentAnnotations}
        onDeleteAnnotation={deleteAnnotation}
        onUndo={undo}
        canUndo={history.length > 0}
        onExport={exportPage}
        currentPage={currentPage}
        selectedAnnotationId={selectedAnnotationId}
        onSelectAnnotation={setSelectedAnnotationId}
      />
    </div>
  );
}

export default App;
