import { useState, useCallback, useRef } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
  color: string;
  disabled?: boolean;
}

export default function DropZone({ onFile, color, disabled }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    },
    [onFile, disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setDragging(true);
    },
    [disabled]
  );

  const handleDragLeave = useCallback(() => {
    setDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
      e.target.value = '';
    },
    [onFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className="relative flex items-center justify-center cursor-pointer rounded-md transition-all duration-200"
      style={{
        height: 40,
        border: dragging
          ? `2px dashed ${color}`
          : '1px dashed rgba(255,255,255,0.15)',
        background: dragging ? `${color}10` : 'rgba(255,255,255,0.02)',
        animation: dragging ? `borderPulse 0.8s ease-in-out infinite` : 'none',
      }}
      title="拖拽音频文件到此处或点击选择"
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={handleChange}
        className="hidden"
      />
      <span
        style={{
          fontSize: 10,
          color: dragging ? color : 'rgba(255,255,255,0.3)',
          fontFamily: 'Rajdhani, sans-serif',
          letterSpacing: 1,
        }}
      >
        {dragging ? '释放以加载' : '+ 拖拽音频文件'}
      </span>
    </div>
  );
}
