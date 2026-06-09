import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { TravelPhoto } from '../utils/types';
import { X, Upload } from 'lucide-react';

interface PhotoUploaderProps {
  photos: TravelPhoto[];
  selectedPhotoId: string | null;
  onPhotosAdd: (files: File[]) => void;
  onPhotoDelete: (id: string) => void;
  onPhotoSelect: (id: string) => void;
}

function cropTo43(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }

      const targetRatio = 4 / 3;
      const imgRatio = img.width / img.height;

      let sw = img.width;
      let sh = img.height;
      let sx = 0;
      let sy = 0;

      if (imgRatio > targetRatio) {
        sw = img.height * targetRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetRatio;
        sy = (img.height - sh) / 2;
      }

      canvas.width = 800;
      canvas.height = 600;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 800, 600);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.src = src;
  });
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  selectedPhotoId,
  onPhotosAdd,
  onPhotoDelete,
  onPhotoSelect
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const remainingSlots = 9 - photos.length;
    if (remainingSlots <= 0) return;
    const filesToProcess = acceptedFiles.slice(0, remainingSlots);
    Promise.all(
      filesToProcess.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result as string;
            cropTo43(result).then(resolve);
          };
          reader.readAsDataURL(file);
        });
      })
    ).then((croppedSources) => {
      const newFiles = filesToProcess.map((file, i) => {
        const dt = new DataTransfer();
        dt.items.add(new File([file], file.name, { type: file.type }));
        const croppedFile = dt.files[0];
        Object.defineProperty(croppedFile, 'croppedSrc', { value: croppedSources[i] });
        return croppedFile as File & { croppedSrc: string };
      });
      onPhotosAdd(newFiles);
    });
  }, [photos.length, onPhotosAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 9,
    disabled: photos.length >= 9
  });

  return (
    <div className="photo-uploader">
      <div className="upload-area">
        <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''} ${photos.length >= 9 ? 'disabled' : ''}`}>
          <input {...getInputProps()} />
          <div className="dropzone-content">
            <Upload className="upload-icon" size={32} />
            <p className="dropzone-text">
              {photos.length >= 9
                ? '已达到9张照片上限'
                : isDragActive
                  ? '松开鼠标上传照片'
                  : '拖拽照片到此处，或点击选择文件'}
            </p>
            <p className="dropzone-hint">最多上传9张，自动裁剪为4:3比例</p>
          </div>
        </div>

        <div className="photo-grid">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={`photo-item ${selectedPhotoId === photo.id ? 'selected' : ''}`}
              onClick={() => onPhotoSelect(photo.id)}
            >
              <img src={photo.src} alt={photo.label || '旅行照片'} className="photo-img" />
              <button
                className="photo-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onPhotoDelete(photo.id);
                }}
              >
                <X size={14} />
              </button>
              {photo.label && (
                <div className="photo-label">{photo.label}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
