import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import type { Plant } from '../types';

interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePlants: Plant[];
  onSubmit: (data: {
    plantId: string;
    description: string;
    mood: string;
    photo: string;
  }) => Promise<void>;
}

const MOOD_OPTIONS = [
  { emoji: '😊', label: '开心' },
  { emoji: '🌿', label: '清新' },
  { emoji: '🌸', label: '惊艳' },
  { emoji: '🌧️', label: '宁静' },
  { emoji: '🍂', label: '怀旧' }
];

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_CHAR = 300;

function ObservationModal({
  isOpen,
  onClose,
  availablePlants,
  onSubmit
}: ObservationModalProps) {
  const [plantId, setPlantId] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setErrorMsg('仅支持 JPG / PNG 格式图片');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg('图片大小不能超过 5MB');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!plantId) {
      setErrorMsg('请选择植物');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('请填写观察描述');
      return;
    }
    if (description.length > MAX_CHAR) {
      setErrorMsg(`描述不能超过 ${MAX_CHAR} 字`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await onSubmit({
        plantId,
        description: description.trim(),
        mood: selectedMood,
        photo: photoPreview
      });
      setPlantId('');
      setDescription('');
      setSelectedMood('');
      setPhotoPreview('');
      onClose();
    } catch (err) {
      setErrorMsg('提交失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charClass =
    description.length > MAX_CHAR
      ? 'over'
      : description.length > MAX_CHAR * 0.8
      ? 'warning'
      : '';

  return (
    <div className="observation-modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🌱 添加观察笔记</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>选择植物</label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
            >
              <option value="">-- 请从当前可见区域选择植物 --</option>
              {availablePlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}（{plant.latinName}）
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>上传照片（可选）</label>
            <div
              className={`photo-upload ${photoPreview ? 'has-photo' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <div className="photo-preview">
                  <img src={photoPreview} alt="预览" />
                  <button
                    type="button"
                    className="photo-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto();
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                  <div className="upload-hint">
                    点击上传照片
                    <br />
                    支持 JPG/PNG，最大 5MB
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              观察描述 <span style={{ fontWeight: 400, color: '#95a5a6' }}>（{description.length}/{MAX_CHAR}）</span>
            </label>
            <textarea
              placeholder="记录你对这株植物的观察与感受..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={MAX_CHAR + 10}
            />
            <div className={`char-count ${charClass}`}>
              {description.length} / {MAX_CHAR}
            </div>
          </div>

          <div className="form-group">
            <label>心情标签</label>
            <div className="mood-selector">
              {MOOD_OPTIONS.map(({ emoji, label }) => (
                <button
                  key={label}
                  type="button"
                  className={`mood-btn ${selectedMood === emoji ? 'selected' : ''}`}
                  title={label}
                  onClick={() => setSelectedMood(selectedMood === emoji ? '' : emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div
              style={{
                color: '#e74c3c',
                fontSize: 13,
                marginBottom: 12,
                padding: '8px 12px',
                backgroundColor: '#fdf2f2',
                borderRadius: 8
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? '提交中...' : '✨ 提交观察笔记'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ObservationModal;
