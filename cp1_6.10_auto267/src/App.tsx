import React, { useReducer, useEffect, useMemo, useState, useRef } from 'react';
import {
  AppState,
  Action,
  CoffeeBean,
  ExtractionRecord,
  ExtractionParams,
  RadarDimensions,
  RadarVersion,
  RoastLevel,
  ProcessMethod,
  PourMethod,
  FlavorTags,
  DIMENSION_LABELS,
  ACIDITY_LEVELS,
  BITTERNESS_LEVELS,
  SWEETNESS_LEVELS,
  BODY_LEVELS,
  AFTERTASTE_LEVELS
} from './types';
import {
  defaultBeans,
  generateId,
  calculateDimensions,
  createInitialVersion,
  createAdjustedVersion,
  saveState,
  loadState,
  exportJSON,
  parseImportJSON,
  mergeImportData,
  findConflicts
} from './utils/dataManager';
import RadarChart from './components/RadarChart';
import VersionSidebar from './components/VersionSidebar';

const initialState: AppState = {
  beans: defaultBeans,
  records: [],
  currentRecordId: null,
  compareVersionId: null,
  compareMode: false
};

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_BEAN':
      return { ...state, beans: [...state.beans, action.payload] };
    case 'UPDATE_BEAN':
      return {
        ...state,
        beans: state.beans.map(b => b.id === action.payload.id ? action.payload : b)
      };
    case 'ADD_RECORD':
      return {
        ...state,
        records: [...state.records, action.payload],
        currentRecordId: action.payload.id
      };
    case 'UPDATE_RECORD':
      return {
        ...state,
        records: state.records.map(r => r.id === action.payload.id ? action.payload : r)
      };
    case 'SET_CURRENT_RECORD':
      return { ...state, currentRecordId: action.payload, compareVersionId: null, compareMode: false };
    case 'ADD_VERSION': {
      const { recordId, version } = action.payload;
      return {
        ...state,
        records: state.records.map(r => {
          if (r.id !== recordId) return r;
          return {
            ...r,
            versions: [...r.versions, version],
            currentVersionId: version.id
          };
        })
      };
    }
    case 'SET_CURRENT_VERSION': {
      const { recordId, versionId } = action.payload;
      return {
        ...state,
        records: state.records.map(r => {
          if (r.id !== recordId) return r;
          return { ...r, currentVersionId: versionId };
        })
      };
    }
    case 'SET_COMPARE_MODE':
      return { ...state, compareMode: action.payload, compareVersionId: action.payload ? state.compareVersionId : null };
    case 'SET_COMPARE_VERSION':
      return { ...state, compareVersionId: action.payload };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showBeanForm, setShowBeanForm] = useState(false);
  const [editingBean, setEditingBean] = useState<CoffeeBean | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [importConflicts, setImportConflicts] = useState<string[]>([]);

  const [beanForm, setBeanForm] = useState<Partial<CoffeeBean>>({
    name: '',
    origin: '',
    roastLevel: '中',
    processMethod: '水洗',
    flavorDescription: '',
    colorTheme: { start: '#c4a77d', end: '#8b5a2b' }
  });

  const defaultParams: ExtractionParams = useMemo(() => ({
    beanId: defaultBeans[0].id,
    dose: 15,
    waterTemp: 92,
    brewTime: 150,
    pourMethod: '三段式',
    flavorTags: {
      acidity: ACIDITY_LEVELS[2],
      bitterness: BITTERNESS_LEVELS[2],
      sweetness: SWEETNESS_LEVELS[2],
      body: BODY_LEVELS[2],
      aftertaste: AFTERTASTE_LEVELS[2]
    },
    tastingNote: '',
    photoPlaceholder: ''
  }), []);

  const [recordForm, setRecordForm] = useState<ExtractionParams>(defaultParams);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      dispatch({ type: 'LOAD_STATE', payload: saved });
    }
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentRecord = state.records.find(r => r.id === state.currentRecordId) || null;
  const currentVersion: RadarVersion | null = useMemo(() => {
    if (!currentRecord) return null;
    return currentRecord.versions.find(v => v.id === currentRecord.currentVersionId) || null;
  }, [currentRecord]);

  const compareVersion: RadarVersion | null = useMemo(() => {
    if (!currentRecord || !state.compareVersionId) return null;
    return currentRecord.versions.find(v => v.id === state.compareVersionId) || null;
  }, [currentRecord, state.compareVersionId]);

  const currentBean = useMemo(() => {
    const beanId = currentRecord ? currentRecord.params.beanId : recordForm.beanId;
    return state.beans.find(b => b.id === beanId) || state.beans[0];
  }, [state.beans, currentRecord, recordForm.beanId]);

  const displayDimensions: RadarDimensions = useMemo(() => {
    if (currentVersion) return currentVersion.dimensions;
    return calculateDimensions(recordForm);
  }, [currentVersion, recordForm]);

  const handleExport = () => {
    exportJSON(state);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseImportJSON(file);
      const conflicts = findConflicts(state.beans, parsed);
      if (conflicts.length > 0) {
        setPendingImport(parsed);
        setImportConflicts(conflicts);
        setShowImportDialog(true);
      } else {
        const merged = mergeImportData(state.beans, state.records, parsed, 'skip');
        dispatch({
          type: 'LOAD_STATE',
          payload: { beans: merged.beans, records: merged.records }
        });
      }
    } catch (err) {
      alert('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
    e.target.value = '';
  };

  const handleImportResolve = (resolution: 'overwrite' | 'skip' | 'cancel') => {
    if (resolution !== 'cancel' && pendingImport) {
      const merged = mergeImportData(state.beans, state.records, pendingImport, resolution);
      dispatch({
        type: 'LOAD_STATE',
        payload: { beans: merged.beans, records: merged.records }
      });
    }
    setShowImportDialog(false);
    setPendingImport(null);
    setImportConflicts([]);
  };

  const validateBeanForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!beanForm.name?.trim()) errors.name = '请输入豆名';
    if (!beanForm.origin?.trim()) errors.origin = '请输入产地';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBean = () => {
    if (!validateBeanForm()) return;
    if (editingBean) {
      dispatch({
        type: 'UPDATE_BEAN',
        payload: { ...editingBean, ...beanForm } as CoffeeBean
      });
    } else {
      dispatch({
        type: 'ADD_BEAN',
        payload: {
          id: generateId(),
          name: beanForm.name!,
          origin: beanForm.origin!,
          roastLevel: beanForm.roastLevel as RoastLevel,
          processMethod: beanForm.processMethod as ProcessMethod,
          flavorDescription: beanForm.flavorDescription || '',
          colorTheme: beanForm.colorTheme!
        }
      });
    }
    setShowBeanForm(false);
    setEditingBean(null);
    setBeanForm({
      name: '',
      origin: '',
      roastLevel: '中',
      processMethod: '水洗',
      flavorDescription: '',
      colorTheme: { start: '#c4a77d', end: '#8b5a2b' }
    });
    setFormErrors({});
  };

  const handleEditBean = (bean: CoffeeBean) => {
    setEditingBean(bean);
    setBeanForm({ ...bean });
    setShowBeanForm(true);
  };

  const validateRecordForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!recordForm.beanId) errors.beanId = '请选择咖啡豆';
    if (!recordForm.dose || recordForm.dose <= 0) errors.dose = '请输入有效粉量';
    if (!recordForm.waterTemp || recordForm.waterTemp < 80 || recordForm.waterTemp > 100) errors.waterTemp = '水温应在80-100℃之间';
    if (!recordForm.brewTime || recordForm.brewTime <= 0) errors.brewTime = '请输入有效时间';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRecord = () => {
    if (!validateRecordForm()) return;
    const dimensions = calculateDimensions(recordForm);
    const initialVersion = createInitialVersion(dimensions);
    const newRecord: ExtractionRecord = {
      id: generateId(),
      params: { ...recordForm },
      versions: [initialVersion],
      currentVersionId: initialVersion.id
    };
    dispatch({ type: 'ADD_RECORD', payload: newRecord });
    setFormErrors({});
  };

  const handleDimensionsChange = (newDimensions: RadarDimensions) => {
    if (!currentRecord) return;
    const changed = Object.keys(newDimensions).some(
      k => Math.abs((newDimensions as any)[k] - (currentVersion?.dimensions as any)[k]) > 0.1
    );
    if (!changed) return;
    const newVersion = createAdjustedVersion(newDimensions);
    dispatch({
      type: 'ADD_VERSION',
      payload: { recordId: currentRecord.id, version: newVersion }
    });
  };

  const handleVersionSelect = (versionId: string) => {
    if (!currentRecord) return;
    dispatch({
      type: 'SET_CURRENT_VERSION',
      payload: { recordId: currentRecord.id, versionId }
    });
  };

  const handleCompareSelect = (versionId: string | null) => {
    dispatch({ type: 'SET_COMPARE_VERSION', payload: versionId });
  };

  const handleToggleCompare = () => {
    dispatch({ type: 'SET_COMPARE_MODE', payload: !state.compareMode });
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(176, 137, 104, 0.3)',
    background: 'rgba(255, 248, 240, 0.8)',
    fontSize: '13px',
    color: '#5c3a21',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    color: '#7f5539',
    marginBottom: '6px',
    fontWeight: 500
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: '#b08968',
    color: '#fff8f0',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease-out',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  };

  const secondaryBtn: React.CSSProperties = {
    ...buttonStyle,
    background: 'rgba(176, 137, 104, 0.15)',
    color: '#7f5539'
  };

  const addBtnEffect: React.CSSProperties = {
    transition: 'all 0.2s ease-out'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff8f0',
      fontFamily: '"PingFang SC", "Microsoft YaHei", sans-serif',
      color: '#5c3a21'
    }}>
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(255, 248, 240, 0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderBottom: '1px solid rgba(176, 137, 104, 0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            style={{
              display: 'none',
              ...secondaryBtn,
              padding: '8px 14px'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            ☰ 菜单
          </button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#5c3a21' }}>
            ☕ 咖啡萃取记录
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleImportClick}
            style={secondaryBtn}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            onMouseDown={(e) => { e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.1)'; }}
            onMouseUp={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
          >
            📥 导入
          </button>
          <button
            onClick={handleExport}
            style={buttonStyle}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            onMouseDown={(e) => { e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15)'; }}
            onMouseUp={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
          >
            📤 导出
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div style={{
        display: 'flex',
        minHeight: 'calc(100vh - 57px)',
        position: 'relative'
      }}>
        <div style={{
          width: mobileDrawerOpen ? '100%' : '35%',
          minWidth: mobileDrawerOpen ? 'auto' : '320px',
          maxWidth: mobileDrawerOpen ? 'none' : '450px',
          padding: '20px',
          boxSizing: 'border-box',
          display: mobileDrawerOpen ? 'block' : 'flex',
          flexDirection: 'column',
          gap: '20px',
          overflowY: 'auto',
          position: mobileDrawerOpen ? 'absolute' : undefined,
          left: 0,
          top: 0,
          bottom: 0,
          background: '#fff8f0',
          zIndex: 50,
        }}>
          <div
            style={{
              background: 'rgba(245, 240, 232, 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>咖啡豆档案</h3>
              <button
                onClick={() => { setEditingBean(null); setBeanForm({ name: '', origin: '', roastLevel: '中', processMethod: '水洗', flavorDescription: '', colorTheme: { start: '#c4a77d', end: '#8b5a2b' } }); setShowBeanForm(true); }}
                style={{ ...secondaryBtn, padding: '6px 12px', fontSize: '12px', ...addBtnEffect }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                + 添加
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
              {state.beans.map(bean => (
                <div
                  key={bean.id}
                  onClick={() => setRecordForm(prev => ({ ...prev, beanId: bean.id }))}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    background: recordForm.beanId === bean.id ? 'rgba(230, 204, 178, 0.5)' : 'rgba(255, 248, 240, 0.6)',
                    cursor: 'pointer',
                    border: `2px solid ${recordForm.beanId === bean.id ? '#b08968' : 'transparent'}`,
                    transition: 'all 0.2s ease-out',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                        {bean.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#7f5539', marginBottom: '6px' }}>
                        {bean.origin} · {bean.roastLevel}烘焙 · {bean.processMethod}
                      </div>
                      <div style={{ fontSize: '11px', color: '#a0826d', lineHeight: 1.5 }}>
                        {bean.flavorDescription}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditBean(bean); }}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        background: 'transparent',
                        border: '1px solid rgba(176, 137, 104, 0.3)',
                        borderRadius: '6px',
                        color: '#7f5539',
                        cursor: 'pointer'
                      }}
                    >
                      编辑
                    </button>
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginTop: '10px'
                  }}>
                    <div style={{
                      width: '50%',
                      height: '6px',
                      borderRadius: '3px',
                      background: `linear-gradient(to right, ${bean.colorTheme.start}, ${bean.colorTheme.end})`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(245, 240, 232, 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: '16px',
              padding: '20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              萃取参数记录
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>选择咖啡豆</label>
                <select
                  style={inputStyle}
                  value={recordForm.beanId}
                  onChange={e => setRecordForm(prev => ({ ...prev, beanId: e.target.value }))}
                >
                  {state.beans.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>粉量 (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    style={inputStyle}
                    value={recordForm.dose}
                    onChange={e => setRecordForm(prev => ({ ...prev, dose: parseFloat(e.target.value) || 0 }))}
                  />
                  {formErrors.dose && <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{formErrors.dose}</div>}
                </div>
                <div>
                  <label style={labelStyle}>水温 (℃)</label>
                  <input
                    type="number"
                    min="80"
                    max="100"
                    style={inputStyle}
                    value={recordForm.waterTemp}
                    onChange={e => setRecordForm(prev => ({ ...prev, waterTemp: parseInt(e.target.value) || 0 }))}
                  />
                  {formErrors.waterTemp && <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{formErrors.waterTemp}</div>}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>萃取时间 (秒)</label>
                  <input
                    type="number"
                    min="0"
                    style={inputStyle}
                    value={recordForm.brewTime}
                    onChange={e => setRecordForm(prev => ({ ...prev, brewTime: parseInt(e.target.value) || 0 }))}
                  />
                  {formErrors.brewTime && <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{formErrors.brewTime}</div>}
                </div>
                <div>
                  <label style={labelStyle}>注水方式</label>
                  <select
                    style={inputStyle}
                    value={recordForm.pourMethod}
                    onChange={e => setRecordForm(prev => ({ ...prev, pourMethod: e.target.value as PourMethod }))}
                  >
                    <option value="一刀流">一刀流</option>
                    <option value="三段式">三段式</option>
                    <option value="搅拌法">搅拌法</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>风味标签</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  {([
                    { key: 'acidity', label: '酸质', levels: ACIDITY_LEVELS },
                    { key: 'bitterness', label: '苦度', levels: BITTERNESS_LEVELS },
                    { key: 'sweetness', label: '甜感', levels: SWEETNESS_LEVELS },
                    { key: 'body', label: '醇厚', levels: BODY_LEVELS },
                    { key: 'aftertaste', label: '回甘', levels: AFTERTASTE_LEVELS }
                  ] as const).map(({ key, label, levels }) => (
                    <div key={key}>
                      <div style={{ fontSize: '11px', color: '#7f5539', marginBottom: '4px' }}>{label}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {levels.map(lv => (
                          <button
                            key={lv}
                            onClick={() => setRecordForm(prev => ({
                              ...prev,
                              flavorTags: { ...prev.flavorTags, [key]: lv } as FlavorTags
                            }))}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: recordForm.flavorTags[key] === lv ? '#b08968' : 'rgba(176, 137, 104, 0.2)',
                              background: recordForm.flavorTags[key] === lv ? 'rgba(230, 204, 178, 0.5)' : 'rgba(255, 248, 240, 0.6)',
                              color: '#5c3a21',
                              cursor: 'pointer',
                              transition: 'all 0.15s'
                            }}
                          >
                            {lv}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={labelStyle}>品鉴笔记（最多50字）</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                  placeholder="记录这次萃取的口感..."
                  value={recordForm.tastingNote || ''}
                  maxLength={50}
                  onChange={e => setRecordForm(prev => ({ ...prev, tastingNote: e.target.value.slice(0, 50) }))}
                />
                <div style={{ fontSize: '11px', color: '#a0826d', textAlign: 'right', marginTop: '4px' }}>
                  {(recordForm.tastingNote || '').length}/50
                </div>
              </div>

              <div>
                <label style={labelStyle}>照片（占位）</label>
                <div
                  onClick={() => setRecordForm(prev => ({ ...prev, photoPlaceholder: prev.photoPlaceholder ? '' : '📷 已添加' }))}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    borderRadius: '8px',
                    border: '2px dashed rgba(176, 137, 104, 0.3)',
                    background: 'rgba(255, 248, 240, 0.6)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#7f5539',
                    transition: 'border-color 0.2s'
                  }}
                >
                  {recordForm.photoPlaceholder || '📷 点击添加照片（占位）'}
                </div>
              </div>

              <button
                onClick={handleCreateRecord}
                style={{ ...buttonStyle, marginTop: '4px', width: '100%' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                onMouseDown={(e) => { e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15)'; }}
                onMouseUp={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
              >
                创建萃取记录
              </button>
            </div>
          </div>

          {currentRecord && (
            <div
              style={{
                background: 'rgba(245, 240, 232, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#5c3a21', marginBottom: '8px' }}>
                当前记录参数
              </div>
              <div style={{ fontSize: '12px', color: '#7f5539', lineHeight: 1.8 }}>
                <div>豆子：{state.beans.find(b => b.id === currentRecord.params.beanId)?.name}</div>
                <div>粉量：{currentRecord.params.dose}g · 水温：{currentRecord.params.waterTemp}℃</div>
                <div>时间：{currentRecord.params.brewTime}秒 · 方式：{currentRecord.params.pourMethod}</div>
                {currentRecord.params.tastingNote && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(255, 248, 240, 0.8)', borderRadius: '8px' }}>
                    📝 {currentRecord.params.tastingNote}
                  </div>
                )}
              </div>
              <button
                onClick={() => dispatch({ type: 'SET_CURRENT_RECORD', payload: null })}
                style={{ ...secondaryBtn, width: '100%', marginTop: '12px', padding: '8px 12px', fontSize: '12px' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                新建记录
              </button>
            </div>
          )}
        </div>

        <div
          style={{
            flex: 1,
            background: '#f0ece4',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            minWidth: 0
          }}
        >
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', width: '100%', maxWidth: '700px', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#5c3a21' }}>
                {currentVersion ? '萃取风味雷达图' : '预览萃取风味'}
              </div>
              <div style={{ fontSize: '12px', color: '#7f5539', marginTop: '2px' }}>
                {currentRecord ? (currentVersion?.isAdjusted ? '调整版本' : '初始版本') : '调整参数查看效果'}
                {currentVersion && ` · ${new Date(currentVersion.timestamp).toLocaleString()}`}
              </div>
            </div>
            {currentRecord && currentRecord.versions.length >= 2 && (
              <button
                onClick={handleToggleCompare}
                style={{
                  ...state.compareMode ? buttonStyle : secondaryBtn,
                  padding: '8px 16px',
                  fontSize: '12px',
                  background: state.compareMode ? '#c85050' : undefined
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                onMouseDown={(e) => { e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15)'; }}
                onMouseUp={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
              >
                {state.compareMode ? '✓ 对比中（点击另一个版本）' : '📊 对比模式'}
              </button>
            )}
          </div>

          {state.compareMode && (
            <div style={{
              padding: '8px 16px',
              background: 'rgba(200, 80, 80, 0.1)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#c85050'
            }}>
              {compareVersion ? '正在对比两个版本，差异区域已用红色虚线标出' : '请在右侧版本列表点击另一个版本进行对比'}
            </div>
          )}

          <div style={{
            width: '90%',
            maxWidth: '500px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <RadarChart
              dimensions={displayDimensions}
              compareDimensions={compareVersion?.dimensions || null}
              compareMode={state.compareMode}
              colorTheme={currentBean.colorTheme}
              onDimensionsChange={currentRecord ? handleDimensionsChange : undefined}
              size={450}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '500px', width: '100%' }}>
            {Object.entries(displayDimensions).map(([key, value]) => (
              <div key={key} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#7f5539' }}>
                  {DIMENSION_LABELS[key as keyof typeof DIMENSION_LABELS]}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#5c3a21' }}>
                  {value.toFixed(1)}
                </div>
              </div>
            ))}
          </div>

          {currentRecord && (
            <div style={{ width: '100%', maxWidth: '500px' }}>
              <VersionSidebar
                versions={currentRecord.versions}
                currentVersionId={currentRecord.currentVersionId}
                compareMode={state.compareMode}
                compareVersionId={state.compareVersionId}
                onVersionSelect={handleVersionSelect}
                onCompareSelect={handleCompareSelect}
                colorTheme={currentBean.colorTheme}
              />
            </div>
          )}
        </div>
      </div>

      {showBeanForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(92, 58, 33, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }} onClick={() => { setShowBeanForm(false); setEditingBean(null); }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff8f0',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#5c3a21', marginBottom: '20px' }}>
              {editingBean ? '编辑咖啡豆' : '添加咖啡豆'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>豆名</label>
                <input
                  style={inputStyle}
                  value={beanForm.name || ''}
                  placeholder="例如：埃塞俄比亚 耶加雪菲"
                  onChange={e => setBeanForm(prev => ({ ...prev, name: e.target.value }))}
                />
                {formErrors.name && <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{formErrors.name}</div>}
              </div>

              <div>
                <label style={labelStyle}>产地</label>
                <input
                  style={inputStyle}
                  value={beanForm.origin || ''}
                  placeholder="例如：埃塞俄比亚"
                  onChange={e => setBeanForm(prev => ({ ...prev, origin: e.target.value }))}
                />
                {formErrors.origin && <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{formErrors.origin}</div>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>烘焙度</label>
                  <select
                    style={inputStyle}
                    value={beanForm.roastLevel || '中'}
                    onChange={e => setBeanForm(prev => ({ ...prev, roastLevel: e.target.value as RoastLevel }))}
                  >
                    <option value="浅">浅</option>
                    <option value="中">中</option>
                    <option value="深">深</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>处理法</label>
                  <select
                    style={inputStyle}
                    value={beanForm.processMethod || '水洗'}
                    onChange={e => setBeanForm(prev => ({ ...prev, processMethod: e.target.value as ProcessMethod }))}
                  >
                    <option value="水洗">水洗</option>
                    <option value="日晒">日晒</option>
                    <option value="蜜处理">蜜处理</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>风味描述</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }}
                  placeholder="描述这款豆子的风味特点..."
                  value={beanForm.flavorDescription || ''}
                  onChange={e => setBeanForm(prev => ({ ...prev, flavorDescription: e.target.value }))}
                />
              </div>

              <div>
                <label style={labelStyle}>颜色主题（渐变色）</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={beanForm.colorTheme?.start || '#c4a77d'}
                    onChange={e => setBeanForm(prev => ({ ...prev, colorTheme: { ...(prev.colorTheme || { start: '#c4a77d', end: '#8b5a2b' }), start: e.target.value } }))}
                    style={{ width: '40px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  />
                  <div style={{
                    flex: 1,
                    height: '24px',
                    borderRadius: '12px',
                    background: `linear-gradient(to right, ${beanForm.colorTheme?.start}, ${beanForm.colorTheme?.end})`
                  }} />
                  <input
                    type="color"
                    value={beanForm.colorTheme?.end || '#8b5a2b'}
                    onChange={e => setBeanForm(prev => ({ ...prev, colorTheme: { ...(prev.colorTheme || { start: '#c4a77d', end: '#8b5a2b' }), end: e.target.value } }))}
                    style={{ width: '40px', height: '36px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={() => { setShowBeanForm(false); setEditingBean(null); setFormErrors({}); }}
                  style={{ ...secondaryBtn, flex: 1 }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveBean}
                  style={{ ...buttonStyle, flex: 1 }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  onMouseDown={(e) => { e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15)'; }}
                  onMouseUp={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImportDialog && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(92, 58, 33, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '20px'
        }} onClick={() => handleImportResolve('cancel')}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff8f0',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#5c3a21', marginBottom: '12px' }}>
              导入数据冲突
            </h3>
            <div style={{ fontSize: '13px', color: '#7f5539', marginBottom: '16px' }}>
              以下咖啡豆已存在，请选择处理方式：
            </div>
            <div style={{
              padding: '12px',
              background: 'rgba(200, 80, 80, 0.1)',
              borderRadius: '8px',
              marginBottom: '20px',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              {importConflicts.map(name => (
                <div key={name} style={{ fontSize: '13px', color: '#c85050', padding: '4px 0' }}>
                  · {name}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleImportResolve('cancel')}
                style={{ ...secondaryBtn, flex: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                取消
              </button>
              <button
                onClick={() => handleImportResolve('skip')}
                style={{ ...secondaryBtn, flex: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                跳过冲突
              </button>
              <button
                onClick={() => handleImportResolve('overwrite')}
                style={{ ...buttonStyle, flex: 1 }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                onMouseDown={(e) => { e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.15)'; }}
                onMouseUp={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
              >
                覆盖
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          div[style*="minHeight: calc(100vh - 57px)"] > div:first-of-type {
            display: none !important;
          }
          div[style*="minHeight: calc(100vh - 57px)"] > div:first-of-type[style*="position: absolute"] {
            display: block !important;
          }
          button[style*="display: none"] {
            display: block !important;
          }
          canvas {
            max-width: 90vw !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
