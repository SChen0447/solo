import { useEffect, useRef, useState } from 'react';
import { DeviceType, DEVICE_SIZES } from '../types';
import styles from './PreviewPanel.module.css';

interface PreviewPanelProps {
  htmlCode: string;
  hasError: boolean;
  errorMessage: string;
}

export default function PreviewPanel({ htmlCode, hasError, errorMessage }: PreviewPanelProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [iframeHeight, setIframeHeight] = useState<number>(0);

  const deviceSize = DEVICE_SIZES[device];

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'resize') {
        setIframeHeight(event.data.height);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;

    if (doc && htmlCode) {
      try {
        doc.open();
        doc.write(htmlCode);
        doc.close();

        const resizeScript = `
          <script>
            (function() {
              function sendHeight() {
                window.parent.postMessage({
                  type: 'resize',
                  height: document.body.scrollHeight
                }, '*');
              }
              window.addEventListener('load', sendHeight);
              window.addEventListener('resize', sendHeight);
              setTimeout(sendHeight, 100);
            })();
          <\/script>
        `;

        if (!doc.body.innerHTML.includes('sendHeight')) {
          doc.body.innerHTML += resizeScript;
        }
      } catch (e) {
        console.error('Failed to write to iframe:', e);
      }
    }
  }, [htmlCode]);

  const handleDeviceChange = (newDevice: DeviceType) => {
    setDevice(newDevice);
  };

  const devices: { key: DeviceType; label: string; icon: string }[] = [
    { key: 'mobile', label: '手机', icon: '📱' },
    { key: 'tablet', label: '平板', icon: '📟' },
    { key: 'desktop', label: '桌面', icon: '🖥️' }
  ];

  const displayHeight = device === 'desktop' ? '100%' : `${deviceSize.height}px`;
  const displayWidth = device === 'desktop' ? '100%' : `${deviceSize.width}px`;

  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewHeader}>
        <div className={`${styles.statusBar} ${hasError ? styles.statusError : ''}`}>
          {hasError ? `渲染错误: ${errorMessage}` : '预览就绪'}
        </div>
        <div className={styles.deviceSwitcher}>
          {devices.map((d) => (
            <button
              key={d.key}
              className={`${styles.deviceBtn} ${device === d.key ? styles.active : ''}`}
              onClick={() => handleDeviceChange(d.key)}
              title={d.label}
            >
              <span className={styles.deviceIcon}>{d.icon}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.previewContainer}>
        {htmlCode ? (
          <div
            className={styles.iframeWrapper}
            style={{
              width: displayWidth,
              height: displayHeight,
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          >
            <iframe
              ref={iframeRef}
              className={styles.previewIframe}
              title="preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : (
          <div className={styles.placeholder}>
            // 在左侧编写HTML代码，右侧将自动预览效果
          </div>
        )}
      </div>
    </div>
  );
}
