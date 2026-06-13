import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import MapView from './MapView';
import TimelineView from './TimelineView';
import { Photo, SearchState, UploadFormData } from './types';

const AVAILABLE_TAGS = ['美食', '风景', '人文', '建筑', '艺术', '自然'];

const MAX_PHOTOS_RENDER = 200;

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    dateStart: null,
    dateEnd: null
  });
  const [highlightedPhotoId, setHighlightedPhotoId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState<UploadFormData>({
    file: null,
    lat: null,
    lng: null,
    date: '',
    diary: '',
    tags: []
  });
  const [searchInput, setSearchInput] = useState('');
  const [dateStartInput, setDateStartInput] = useState('');
  const [dateEndInput, setDateEndInput] = useState('');

  const fetchPhotos = useCallback(async () => {
    try {
      const response = await axios.get<Photo[]>('/api/photos');
      setPhotos(response.data);
    } catch (error) {
      console.error('获取照片失败:', error);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const filterPhotos = useCallback((photosToFilter: Photo[], search: SearchState): Photo[] => {
    const startTime = performance.now();
    let result = [...photosToFilter];

    if (search.query) {
      const keyword = search.query.toLowerCase();
      result = result.filter(photo =>
        photo.tags.some(tag => tag.toLowerCase().includes(keyword))
      );
    }

    if (search.dateStart) {
      const start = new Date(search.dateStart).getTime();
      result = result.filter(photo =>
        new Date(photo.date).getTime() >= start
      );
    }

    if (search.dateEnd) {
      const end = new Date(search.dateEnd).getTime();
      result = result.filter(photo =>
        new Date(photo.date).getTime() <= end
      );
    }

    const endTime = performance.now();
    console.log(`搜索耗时: ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }, []);

  const filteredPhotos = useMemo(() => {
    return filterPhotos(photos, searchState);
  }, [photos, searchState, filterPhotos]);

  const filteredPhotoIds = useMemo(() => {
    return new Set(filteredPhotos.map(p => p.id));
  }, [filteredPhotos]);

  const displayPhotos = useMemo(() => {
    return photos.slice(0, MAX_PHOTOS_RENDER);
  }, [photos]);

  const handleSearch = useCallback(() => {
    setSearchState({
      query: searchInput.trim(),
      dateStart: dateStartInput || null,
      dateEnd: dateEndInput || null
    });
  }, [searchInput, dateStartInput, dateEndInput]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, dateStartInput, dateEndInput, handleSearch]);

  const handlePhotoClick = useCallback((photoId: string) => {
    setHighlightedPhotoId(photoId);
    const photo = photos.find(p => p.id === photoId);
    if (photo) {
      console.log('高亮照片:', photo);
    }
  }, [photos]);

  const handleMarkerClick = useCallback((photoId: string) => {
    setHighlightedPhotoId(photoId);
  }, []);

  const handleMapClickForUpload = useCallback((lat: number, lng: number) => {
    if (isUploadModalOpen && uploadForm.file) {
      setUploadForm(prev => ({ ...prev, lat, lng }));
    }
  }, [isUploadModalOpen, uploadForm.file]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('照片大小不能超过5MB');
        return;
      }
      setUploadForm(prev => ({ ...prev, file }));
      setIsUploadModalOpen(true);
    }
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setUploadForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  }, []);

  const handleUpload = useCallback(async () => {
    if (!uploadForm.file || uploadForm.lat === null || uploadForm.lng === null) {
      alert('请选择照片并在地图上标记位置');
      return;
    }
    if (!uploadForm.date) {
      alert('请选择日期');
      return;
    }
    if (uploadForm.diary.length > 200) {
      alert('日记内容不能超过200字');
      return;
    }

    const formData = new FormData();
    formData.append('photo', uploadForm.file);
    formData.append('lat', uploadForm.lat.toString());
    formData.append('lng', uploadForm.lng.toString());
    formData.append('date', uploadForm.date);
    formData.append('diary', uploadForm.diary);
    formData.append('tags', JSON.stringify(uploadForm.tags));

    try {
      await axios.post<Photo>('/api/photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setIsUploadModalOpen(false);
      setUploadForm({
        file: null,
        lat: null,
        lng: null,
        date: '',
        diary: '',
        tags: []
      });
      fetchPhotos();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        alert(error.response.data.error || '上传失败');
      } else {
        alert('上传失败');
      }
    }
  }, [uploadForm, fetchPhotos]);

  const closeModal = useCallback(() => {
    setIsUploadModalOpen(false);
    setUploadForm({
      file: null,
      lat: null,
      lng: null,
      date: '',
      diary: '',
      tags: []
    });
  }, []);

  const previewUrl = useMemo(() => {
    return uploadForm.file ? URL.createObjectURL(uploadForm.file) : '';
  }, [uploadForm.file]);

  const getTagColorClass = (tag: string): string => {
    switch (tag) {
      case '美食': return 'food';
      case '风景': return 'scenery';
      case '人文': return 'culture';
      default: return 'default';
    }
  };

  return (
    <div className="app-container">
      <div className="map-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="搜索标签..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <input
            type="date"
            value={dateStartInput}
            onChange={(e) => setDateStartInput(e.target.value)}
            placeholder="开始日期"
          />
          <input
            type="date"
            value={dateEndInput}
            onChange={(e) => setDateEndInput(e.target.value)}
            placeholder="结束日期"
          />
        </div>

        <label className="upload-btn" htmlFor="photo-upload">
          + 上传照片
        </label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        <MapView
          photos={displayPhotos}
          highlightedPhotoId={highlightedPhotoId}
          filteredPhotoIds={filteredPhotoIds}
          onMarkerClick={handleMarkerClick}
          onMapClick={isUploadModalOpen ? handleMapClickForUpload : undefined}
          getTagColorClass={getTagColorClass}
        />
      </div>

      <div className="divider"></div>

      <div className="timeline-section">
        <TimelineView
          photos={photos}
          filteredPhotoIds={filteredPhotoIds}
          onCardClick={handlePhotoClick}
        />
      </div>

      {isUploadModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>归档旅行记忆</h2>

            {previewUrl && (
              <img src={previewUrl} alt="预览" className="preview-image" />
            )}

            <p className="location-hint">
              {uploadForm.lat && uploadForm.lng
                ? `已选择位置: ${uploadForm.lat.toFixed(4)}, ${uploadForm.lng.toFixed(4)}`
                : '请在地图上点击选择位置'}
            </p>

            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={uploadForm.date}
                onChange={(e) => setUploadForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>旅行日记 (最多200字)</label>
              <textarea
                value={uploadForm.diary}
                onChange={(e) => setUploadForm(prev => ({ ...prev, diary: e.target.value }))}
                placeholder="记录这一刻的感受..."
                maxLength={200}
              />
              <div style={{ fontSize: '12px', color: '#888', textAlign: 'right' }}>
                {uploadForm.diary.length}/200
              </div>
            </div>

            <div className="form-group">
              <label>标签</label>
              <div className="tag-input">
                {AVAILABLE_TAGS.map(tag => (
                  <div
                    key={tag}
                    className={`tag-item ${uploadForm.tags.includes(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button className="btn btn-secondary" onClick={closeModal}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleUpload}>
                归档
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
