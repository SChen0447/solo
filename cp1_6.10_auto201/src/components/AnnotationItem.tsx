import React from 'react';
import { Annotation } from '../types';

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);
  if (hours < 1) return '刚刚';
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface Props {
  annotation: Annotation;
  isNew?: boolean;
}

const AnnotationItem = React.memo(function AnnotationItem({ annotation }: Props) {
  return (
    <div className="annotation-item">
      <div className="annotation-header">
        <span className="annotation-user">{annotation.userName}</span>
        <span className="annotation-page">P.{annotation.pageNumber}</span>
      </div>
      <div className="annotation-content">{annotation.content}</div>
      <div className="annotation-time">{formatTime(annotation.createdAt)}</div>
    </div>
  );
});

export default AnnotationItem;
