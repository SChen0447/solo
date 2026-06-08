import { useState, useMemo } from 'react';
import ApplicationCard from './ApplicationCard';
import TimelineView from './TimelineView';
import StatsCharts from './StatsCharts';
import EditModal from './EditModal';
import FilterBar from './FilterBar';
import { applicationApi } from '../api';
import { downloadCSV } from '../utils';
import type { Application, FilterType, ViewMode, ApplicationStatus } from '../types';

interface DashboardProps {
  applications: Application[];
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onNotesUpdate: (id: string, notes: string) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  editingApp: Application | null;
  onSave: (data: Omit<Application, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deletingIds: Set<string>;
  loading: boolean;
}

export default function Dashboard({
  applications,
  filter,
  setFilter,
  viewMode,
  setViewMode,
  onEdit,
  onDelete,
  onNotesUpdate,
  isModalOpen,
  setIsModalOpen,
  editingApp,
  onSave,
  deletingIds,
  loading,
}: DashboardProps) {
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const stats = useMemo(() => {
    return {
      total: applications.length,
      applied: applications.filter(a => a.status === 'applied').length,
      interviewing: applications.filter(a => a.status === 'interviewing').length,
      rejected: applications.filter(a => a.status === 'rejected').length,
      offer: applications.filter(a => a.status === 'offer').length,
    };
  }, [applications]);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 50);

    try {
      const blob = await applicationApi.exportCSV();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'applications.csv';
      link.click();
      URL.revokeObjectURL(url);
      setExportProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      clearInterval(interval);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    }
  };

  const handleChartClick = (status: string) => {
    if (status === filter) {
      setFilter('all');
    } else {
      setFilter(status as ApplicationStatus);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'board' ? 'active' : ''}`}
            onClick={() => setViewMode('board')}
          >
            看板视图
          </button>
          <button
            className={`toggle-btn ${viewMode === 'timeline' ? 'active' : ''}`}
            onClick={() => setViewMode('timeline')}
          >
            时间线
          </button>
        </div>
        <button className="btn btn-export" onClick={handleExport} disabled={isExporting}>
          {isExporting ? '导出中...' : '📊 导出CSV'}
        </button>
      </div>

      {isExporting && (
        <div className="export-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${exportProgress}%` }}
            />
          </div>
          <span className="progress-text">{exportProgress}%</span>
        </div>
      )}

      <StatsCharts stats={stats} onChartClick={handleChartClick} activeFilter={filter} />

      <FilterBar filter={filter} setFilter={setFilter} />

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>加载中...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>暂无投递记录</h3>
          <p>点击右上角"添加投递"按钮开始记录你的求职历程</p>
        </div>
      ) : viewMode === 'board' ? (
        <div className="card-grid">
          {applications.map(app => (
            <ApplicationCard
              key={app.id}
              application={app}
              onEdit={onEdit}
              onDelete={onDelete}
              isDeleting={deletingIds.has(app.id)}
            />
          ))}
        </div>
      ) : (
        <TimelineView
          applications={applications}
          onEdit={onEdit}
          onDelete={onDelete}
          onNotesUpdate={onNotesUpdate}
          deletingIds={deletingIds}
        />
      )}

      <EditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={onSave}
        editingApp={editingApp}
      />
    </div>
  );
}
