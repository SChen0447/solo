import { useState } from 'react';
import type { BakeResult, BakeLog } from '../types';
import { api } from '../api';

interface Props {
  recipeId: string;
  onClose: () => void;
  onSubmit: () => void;
}

export default function NewLogForm({ recipeId, onClose, onSubmit }: Props) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [result, setResult] = useState<BakeResult>('成功');
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('图片大小不能超过 2MB');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('只支持 JPEG 和 PNG 格式');
      return;
    }

    setError('');
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let photoUrl: string | null = null;
      let photoThumb: string | null = null;

      if (photoFile) {
        const uploaded = await api.uploadImage(photoFile);
        photoUrl = uploaded.originalUrl;
        photoThumb = uploaded.thumbnailUrl;
      }

      await api.createLog(recipeId, {
        date: new Date(date).toISOString(),
        result,
        note: note.slice(0, 200),
        photoUrl,
        photoThumb,
      } as Partial<BakeLog>);

      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setLoading(false);
    }
  }

  const resultOptions: BakeResult[] = ['成功', '一般', '失败'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>记录烘焙</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <form className="form-body" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>烘焙日期</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>烘焙结果</label>
              <div className="result-options">
                {resultOptions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`result-option ${result === r ? 'active' : ''}`}
                    onClick={() => setResult(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>备注 ({note.length}/200)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="记录一下这次烘焙的心得..."
              rows={4}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>成品照片 (可选，JPEG/PNG，≤2MB)</label>
            <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={handlePhotoChange} />
            {photoPreview && <img src={photoPreview} alt="预览" className="cover-preview" />}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '保存中...' : '保存记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
