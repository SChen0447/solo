import { useState, useCallback } from 'react';
import { VideoSegment } from './types';
import VideoUploader from './components/VideoUploader';
import TimelineEditor from './components/TimelineEditor';
import PreviewPanel from './components/PreviewPanel';
import ExportButton from './components/ExportButton';

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const App = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const handleVideoUpload = useCallback((file: File, duration: number) => {
    setVideoFile(file);
    setVideoDuration(duration);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const initialSegment: VideoSegment = {
      id: generateId(),
      startTime: 0,
      endTime: Math.min(duration, 15),
      title: '片段1',
      filter: 'none'
    };
    setSegments([initialSegment]);
    setSelectedSegmentId(initialSegment.id);
  }, [previewUrl]);

  const handleSegmentsUpdate = useCallback((updatedSegments: VideoSegment[]) => {
    setSegments(updatedSegments);
  }, []);

  const handleSegmentSelect = useCallback((id: string) => {
    setSelectedSegmentId(id);
  }, []);

  const selectedSegment = segments.find(s => s.id === selectedSegmentId) || null;

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.title}>🎬 视频智能拆条与风格化转场</h1>
        {videoFile && (
          <div style={styles.fileInfo}>
            <span>📄 {videoFile.name}</span>
            <span style={{ marginLeft: 16 }}>⏱ {formatTime(videoDuration)}</span>
          </div>
        )}
      </header>

      <div className="main-layout" style={styles.mainLayout}>
        <div className="left-panel" style={styles.leftPanel}>
          <div style={styles.uploaderSection}>
            <VideoUploader onUpload={handleVideoUpload} />
          </div>
          <div className="preview-section" style={styles.previewSection}>
            <PreviewPanel
              videoUrl={previewUrl}
              currentSegment={selectedSegment}
              videoDuration={videoDuration}
            />
          </div>
        </div>

        <div className="right-panel" style={styles.rightPanel}>
          <div style={styles.timelineSection}>
            <TimelineEditor
              segments={segments}
              onUpdate={handleSegmentsUpdate}
              onSelect={handleSegmentSelect}
              selectedId={selectedSegmentId}
              duration={videoDuration}
            />
          </div>
          <div style={styles.exportSection}>
            <ExportButton segments={segments} disabled={!videoFile || segments.length === 0} />
          </div>
        </div>
      </div>
    </div>
  );
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0F0F1F',
    color: '#EAEAEA',
    overflow: 'hidden'
  },
  header: {
    padding: '16px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    color: '#FF6F00'
  },
  fileInfo: {
    fontSize: 14,
    color: '#999'
  },
  mainLayout: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  leftPanel: {
    width: '60%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid rgba(255,255,255,0.1)',
    overflow: 'hidden'
  },
  rightPanel: {
    width: '40%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  },
  uploaderSection: {
    padding: 16,
    flexShrink: 0
  },
  previewSection: {
    flex: 1,
    padding: '0 16px 16px 16px',
    minHeight: 0
  },
  timelineSection: {
    flex: 1,
    padding: 16,
    minHeight: 0,
    overflow: 'auto'
  },
  exportSection: {
    padding: 16,
    borderTop: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0
  }
};

export default App;
