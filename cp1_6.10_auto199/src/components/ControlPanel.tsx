import { useRef, useState } from 'react';
import type { ArtworkData } from '../types';
import { compressImage, truncateFileName, generateArtworkId } from '../utils/helpers';

interface ControlPanelProps {
  artworks: ArtworkData[];
  onUpload: (artworks: ArtworkData[]) => void;
  onRemove: (id: string) => void;
  onAddWall: () => void;
}

export default function ControlPanel({ artworks, onUpload, onRemove, onAddWall }: ControlPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validFiles = Array.from(files)
      .filter(f => /\.(jpe?g|png)$/i.test(f.name))
      .slice(0, 6);

    if (validFiles.length === 0) {
      alert('请选择 JPG 或 PNG 格式的图片');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const newArtworks: ArtworkData[] = [];
      const currentCount = artworks.length;

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const imageData = await compressImage(file, 1200);
        const position = currentCount + i;
        const spacing = 0.15;
        const startX = spacing + (1 - spacing * 2) * 0.5;
        const step = (1 - spacing * 2) / 5;
        const x = Math.min(startX + position * step, 1 - spacing);
        newArtworks.push({
          id: generateArtworkId(),
          name: truncateFileName(file.name, 20),
          imageData,
          fileName: file.name,
          x,
          y: 0.5,
          wallIndex: 0
        });
      }

      onUpload(newArtworks);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('图片上传失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'rgba(44, 62, 80, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{
          fontSize: 16,
          fontWeight: 500,
          color: '#f5f0e8',
          marginBottom: 16,
          letterSpacing: 1
        }}>
          控制面板
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{ width: '100%' }}
          >
            {isUploading ? '上传中...' : '上传作品'}
          </button>
          <button
            onClick={onAddWall}
            style={{ width: '100%' }}
          >
            添加墙面
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 16px'
      }}>
        <div style={{
          fontSize: 12,
          color: 'rgba(245,240,232,0.5)',
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: 1
        }}>
          展品列表 ({artworks.length})
        </div>

        {artworks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            color: 'rgba(245,240,232,0.4)',
            fontSize: 13
          }}>
            还没有上传作品
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {artworks.map((artwork) => (
              <div
                key={artwork.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.05)'
                }}
              >
                <img
                  src={artwork.imageData}
                  alt={artwork.name}
                  style={{
                    width: 48,
                    height: 48,
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid rgba(200,169,110,0.5)',
                    flexShrink: 0
                  }}
                />
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  <div style={{
                    fontSize: 13,
                    color: '#f5f0e8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {artwork.name}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(artwork.id)}
                  style={{
                    padding: '6px 10px',
                    fontSize: 12,
                    background: 'rgba(231,76,60,0.2)',
                    color: '#e74c3c',
                    boxShadow: 'none',
                    borderRadius: 8
                  }}
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
