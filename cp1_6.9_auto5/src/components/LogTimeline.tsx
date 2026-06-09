import { useState } from 'react';
import type { BakeLog } from '../types';
import LogEntry from './LogEntry';
import ImagePreview from './ImagePreview';

interface Props {
  logs: BakeLog[];
  recipeId: string;
}

export default function LogTimeline({ logs }: Props) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const photosWithMeta = logs
    .filter((l) => l.photoUrl)
    .map((l) => ({
      url: l.photoUrl as string,
      date: l.date,
      result: l.result,
    }));

  if (logs.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <p>还没有烘焙记录，开始记录你的第一次烘焙吧！</p>
      </div>
    );
  }

  function handlePhotoClick(log: BakeLog) {
    const index = photosWithMeta.findIndex((p) => p.url === log.photoUrl);
    if (index !== -1) setPreviewIndex(index);
  }

  return (
    <>
      <div className="timeline">
        {logs.map((log) => (
          <LogEntry key={log.id} log={log} onPhotoClick={() => handlePhotoClick(log)} />
        ))}
      </div>

      {previewIndex !== null && (
        <ImagePreview
          images={photosWithMeta}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChange={setPreviewIndex}
        />
      )}
    </>
  );
}
