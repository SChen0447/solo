import { useRef, useEffect, useState, useCallback } from 'react';
import { Annotation, AnnotationPoint } from './types';
import './BookViewer.css';

interface BookViewerProps {
  currentPage: number;
  totalPages: number;
  annotations: Annotation[];
  isFlipping: boolean;
  flipDirection: 'next' | 'prev';
  brushColor: string;
  brushThickness: number;
  onAddAnnotation: (points: AnnotationPoint[]) => void;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
}

function BookViewer({
  currentPage,
  totalPages,
  annotations,
  isFlipping,
  flipDirection,
  brushColor,
  brushThickness,
  onAddAnnotation,
  selectedAnnotationId,
  onSelectAnnotation,
}: BookViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<AnnotationPoint[]>([]);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 800 });

  const drawAnnotation = useCallback((ctx: CanvasRenderingContext2D, annotation: Annotation, isSelected: boolean) => {
    if (annotation.points.length < 2) return;
    
    ctx.save();
    ctx.strokeStyle = annotation.color;
    ctx.lineWidth = annotation.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = annotation.opacity;
    ctx.shadowColor = annotation.color;
    ctx.shadowBlur = annotation.thickness * 0.5;
    
    ctx.beginPath();
    ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
    for (let i = 1; i < annotation.points.length; i++) {
      ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
    }
    ctx.stroke();
    
    if (isSelected) {
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      
      const xs = annotation.points.map(p => p.x);
      const ys = annotation.points.map(p => p.y);
      const minX = Math.min(...xs) - 10;
      const maxX = Math.max(...xs) + 10;
      const minY = Math.min(...ys) - 10;
      const maxY = Math.max(...ys) + 10;
      
      ctx.rect(minX, minY, maxX - minX, maxY - minY);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    ctx.restore();
  }, []);

  const drawAllAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    annotations.forEach(annotation => {
      drawAnnotation(ctx, annotation, annotation.id === selectedAnnotationId);
    });
    
    if (currentPoints.length >= 2) {
      const tempAnnotation: Annotation = {
        id: 'temp',
        color: brushColor,
        thickness: brushThickness,
        opacity: 0.7,
        points: currentPoints,
      };
      drawAnnotation(ctx, tempAnnotation, false);
    }
  }, [annotations, currentPoints, selectedAnnotationId, brushColor, brushThickness, drawAnnotation]);

  useEffect(() => {
    drawAllAnnotations();
  }, [drawAllAnnotations]);

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const aspectRatio = 4 / 5;
      
      let width = containerWidth;
      let height = width / aspectRatio;
      
      if (height > containerHeight) {
        height = containerHeight;
        width = height * aspectRatio;
      }
      
      setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): AnnotationPoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const jitterX = (Math.random() - 0.5) * 0.5;
    const jitterY = (Math.random() - 0.5) * 0.5;
    
    return {
      x: (e.clientX - rect.left) * scaleX + jitterX,
      y: (e.clientY - rect.top) * scaleY + jitterY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isFlipping) return;
    
    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setCurrentPoints([point]);
    onSelectAnnotation(null);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || isFlipping) return;
    
    const point = getCanvasPoint(e);
    setCurrentPoints(prev => [...prev, point]);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    if (currentPoints.length >= 2) {
      onAddAnnotation(currentPoints);
    }
    setCurrentPoints([]);
  };

  const handleMouseLeave = () => {
    if (isDrawing) {
      handleMouseUp();
    }
  };

  const flipClass = isFlipping
    ? flipDirection === 'next'
      ? 'flipping-next'
      : 'flipping-prev'
    : '';

  const pageContent = generatePageContent(currentPage);

  return (
    <div className={`book-container ${flipClass}`} ref={containerRef}>
      <div className="book-page">
        <div className="page-content">
          <div className="page-header">
            <span className="page-title">古籍善本</span>
            <span className="page-number">卷 {Math.ceil(currentPage / 2)}</span>
          </div>
          
          <div className="page-text">
            {pageContent.map((line, index) => (
              <div key={index} className="text-line">
                {line.split('').map((char, charIndex) => (
                  <span key={charIndex} className="char">{char}</span>
                ))}
              </div>
            ))}
          </div>
          
          <div className="page-footer">
            <span className="footer-number">{currentPage} / {totalPages}</span>
          </div>
        </div>
        
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="annotation-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        
        <div className="spine-shadow" />
        <div className="page-curl" />
      </div>
    </div>
  );
}

function generatePageContent(page: number): string[] {
  const loremIpsum = [
    '天地玄黄宇宙洪荒',
    '日月盈昃辰宿列张',
    '寒来暑往秋收冬藏',
    '闰余成岁律吕调阳',
    '云腾致雨露结为霜',
    '金生丽水玉出昆冈',
    '剑号巨阙珠称夜光',
    '果珍李柰菜重芥姜',
    '海咸河淡鳞潜羽翔',
    '龙师火帝鸟官人皇',
    '始制文字乃服衣裳',
    '推位让国有虞陶唐',
    '吊民伐罪周发殷汤',
    '坐朝问道垂拱平章',
    '爱育黎首臣伏戎羌',
    '遐迩壹体率宾归王',
    '鸣凤在竹白驹食场',
    '化被草木赖及万方',
  ];
  
  const startIndex = ((page - 1) * 8) % loremIpsum.length;
  const content: string[] = [];
  
  for (let i = 0; i < 8; i++) {
    content.push(loremIpsum[(startIndex + i) % loremIpsum.length]);
  }
  
  return content;
}

export default BookViewer;
