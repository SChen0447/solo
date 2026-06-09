import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import PlantCard from './components/PlantCard';
import GrowthAnimation from './components/GrowthAnimation';
import {
  Plant,
  PlantListResponse,
  GrowthData,
  PlantType,
  InitialSize,
  ActionType,
  CareAction,
} from './types';

const PLANT_TYPES: PlantType[] = ['多肉', '绿萝', '虎皮兰', '龟背竹', '其他'];
const INITIAL_SIZES: InitialSize[] = ['种子', '幼苗', '成株'];
const ACTION_TYPES: ActionType[] = ['浇水', '施肥', '修剪'];

const App: React.FC = () => {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const [showFormModal, setShowFormModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<PlantType>('多肉');
  const [formSize, setFormSize] = useState<InitialSize>('种子');
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [growthData, setGrowthData] = useState<GrowthData | null>(null);
  const [showActionOptions, setShowActionOptions] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadingRef = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const fetchPlants = useCallback(async (pageNum: number, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    try {
      const res = await fetch(`/api/plants?page=${pageNum}&pageSize=20`);
      const data: PlantListResponse = await res.json();

      if (reset) {
        setPlants(data.plants);
      } else {
        setPlants((prev) => [...prev, ...data.plants]);
      }
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(data.page);
    } catch (err) {
      console.error('获取植物列表失败:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchPlants(1, true);
  }, [fetchPlants]);

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loadingRef.current) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      const fullHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= fullHeight - 200) {
        fetchPlants(page + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, page, fetchPlants]);

  const handleOpenDetail = async (plant: Plant) => {
    setSelectedPlant(plant);
    setShowDetailModal(true);
    setGrowthData(null);
    setShowActionOptions(false);

    try {
      const res = await fetch(`/api/plants/${plant.id}/growth`);
      const data: GrowthData = await res.json();
      setGrowthData(data);
    } catch (err) {
      console.error('获取生长数据失败:', err);
    }
  };

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedPlant(null);
    setGrowthData(null);
    setShowActionOptions(false);
  };

  const handleRecordAction = async (actionType: ActionType) => {
    if (!selectedPlant || actionLoading) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/plants/${selectedPlant.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: actionType }),
      });

      if (res.ok) {
        const updatedPlant: Plant = await res.json();
        setPlants((prev) =>
          prev.map((p) => (p.id === updatedPlant.id ? updatedPlant : p))
        );
        handleCloseDetail();
      }
    } catch (err) {
      console.error('记录养护动作失败:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenForm = () => {
    setFormName('');
    setFormType('多肉');
    setFormSize('种子');
    setFormError('');
    setShowFormModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError('请输入植物名称');
      return;
    }
    if (trimmedName.length > 10) {
      setFormError('植物名称不能超过10个字符');
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          type: formType,
          initialSize: formSize,
        }),
      });

      if (res.ok) {
        await fetchPlants(1, true);
        setShowFormModal(false);
      } else {
        const data = await res.json();
        setFormError(data.error || '创建失败');
      }
    } catch (err) {
      setFormError('网络错误，请重试');
    } finally {
      setFormSubmitting(false);
    }
  };

  const formatCareDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd', { locale: zhCN });
    } catch {
      return dateStr;
    }
  };

  const sortedCareActions = growthData?.careActions || [];

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🌿 植物日记</h1>
        <p>记录你与植物的每一天</p>
        {total > 0 && <p style={{ marginTop: 8, color: '#888' }}>共 {total} 株植物</p>}
      </header>

      <div ref={gridRef} className="plants-grid">
        {plants.length === 0 && !loading && (
          <div className="empty-state">
            <p>🌱 还没有植物哦～</p>
            <p>点击右下角的按钮添加你的第一株植物吧！</p>
          </div>
        )}

        {plants.map((plant) => (
          <PlantCard
            key={plant.id}
            plant={plant}
            onClick={() => handleOpenDetail(plant)}
          />
        ))}
      </div>

      {loading && plants.length > 0 && (
        <div className="loading-indicator">加载中...</div>
      )}

      {!hasMore && plants.length > 0 && (
        <div className="loading-indicator" style={{ color: '#aaa' }}>
          — 已经到底啦 —
        </div>
      )}

      <button className="fab" onClick={handleOpenForm} title="添加植物">
        <span>+</span>
      </button>

      {showFormModal && (
        <div className="modal-overlay" onClick={() => !formSubmitting && setShowFormModal(false)}>
          <div className="modal form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="title-section">
                <h2>添加植物</h2>
              </div>
              <button
                className="close-btn"
                onClick={() => !formSubmitting && setShowFormModal(false)}
                disabled={formSubmitting}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitForm}>
              <div className="form-body">
                <div className="form-group">
                  <label>植物名称（1-10字）</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="给它起个名字吧"
                    maxLength={10}
                    disabled={formSubmitting}
                  />
                  {formError && <div className="error-msg">{formError}</div>}
                </div>

                <div className="form-group">
                  <label>品种</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as PlantType)}
                    disabled={formSubmitting}
                  >
                    {PLANT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>初始大小</label>
                  <select
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value as InitialSize)}
                    disabled={formSubmitting}
                  >
                    {INITIAL_SIZES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="submit-btn" disabled={formSubmitting}>
                  {formSubmitting ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedPlant && (
        <div className="modal-overlay" onClick={() => handleCloseDetail()}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="title-section">
                <h2>{selectedPlant.name}</h2>
                <span className="plant-type-tag">{selectedPlant.type}</span>
              </div>
              <button className="close-btn" onClick={handleCloseDetail}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="growth-section">
                {growthData ? (
                  <GrowthAnimation growthProgress={growthData.growthProgress} />
                ) : (
                  <div className="loading-indicator">加载生长动画中...</div>
                )}
              </div>

              <div className="timeline-section">
                <h3>养护记录</h3>
                {sortedCareActions.length === 0 ? (
                  <div className="timeline-empty">还没有养护记录哦～</div>
                ) : (
                  <div className="timeline">
                    {sortedCareActions.map((action: CareAction, idx: number) => (
                      <div key={action.id} className="timeline-item">
                        <span className="timeline-date">{formatCareDate(action.date)}</span>
                        <span className="timeline-dot"></span>
                        <span className="timeline-action">{action.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="action-section">
              <button
                className="record-btn"
                onClick={() => setShowActionOptions((v) => !v)}
                disabled={actionLoading}
              >
                {showActionOptions ? '取消' : '📝 记录活动'}
              </button>
              {showActionOptions && (
                <div className="action-options">
                  {ACTION_TYPES.map((action) => (
                    <button
                      key={action}
                      className="action-option-btn"
                      onClick={() => handleRecordAction(action)}
                      disabled={actionLoading}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
