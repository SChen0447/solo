import { useState, useCallback } from 'react';
import { VideoSegment } from '../types';

interface ExportButtonProps {
  segments: VideoSegment[];
  disabled: boolean;
}

const ExportButton = ({ segments, disabled }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const handleExport = useCallback(async () => {
    if (disabled || segments.length === 0) return;

    setError('');
    setIsExporting(true);

    try {
      const processedSegments = segments.map(seg => ({
        ...seg,
        endTime: Math.min(seg.endTime, seg.startTime + 15)
      }));

      const response = await fetch('/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ segments: processedSegments })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || '导出失败');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'video_segments.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setIsExporting(false);
    }
  }, [segments, disabled]);

  return (
    <div style={styles.container}>
      <button
        style={{
          ...styles.button,
          opacity: disabled || isExporting ? 0.6 : 1,
          cursor: disabled || isExporting ? 'not-allowed' : 'pointer',
          boxShadow: !disabled && !isExporting ? '0 4px 12px rgba(255,111,0,0.3)' : 'none'
        }}
        onClick={handleExport}
        disabled={disabled || isExporting}
        onMouseEnter={(e) => {
          if (!disabled && !isExporting) {
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {isExporting ? (
          <span style={styles.buttonContent}>
            <span style={styles.spinner} />
            <span>处理中...</span>
          </span>
        ) : (
          <span>📦 导出所有片段</span>
        )}
      </button>
      {error && <p style={styles.errorText}>{error}</p>}
      {segments.length > 0 && (
        <p style={styles.hint}>
          共 {segments.length} 个片段，超长部分将自动截断为 15 秒
        </p>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8
  },
  button: {
    width: 160,
    height: 40,
    backgroundColor: '#FF6F00',
    color: '#ffffff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #ffffff',
    borderRadius: '50%',
    animation: 'export-spin 0.8s linear infinite'
  },
  errorText: {
    color: '#ff6666',
    fontSize: 12,
    margin: 0
  },
  hint: {
    color: '#666',
    fontSize: 11,
    margin: 0,
    textAlign: 'center'
  }
};

const styleSheet = `
@keyframes export-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('export-spinner-style')) {
  const style = document.createElement('style');
  style.id = 'export-spinner-style';
  style.textContent = styleSheet;
  document.head.appendChild(style);
}

export default ExportButton;
