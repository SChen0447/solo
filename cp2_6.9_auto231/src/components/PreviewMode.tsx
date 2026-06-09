import { useState, useMemo } from 'react';
import type { StoryGraph, StoryNode } from '../types';

interface PreviewModeProps {
  graph: StoryGraph;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  dialog: '对话',
  choice: '选择',
  event: '事件',
};

function PreviewMode({ graph, onClose }: PreviewModeProps) {
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(graph.rootNodeId);
  const [pathStack, setPathStack] = useState<string[]>(
    graph.rootNodeId ? [graph.rootNodeId] : []
  );

  const currentNode = useMemo<StoryNode | null>(
    () => graph.nodes.find((n) => n.id === currentNodeId) ?? null,
    [graph.nodes, currentNodeId]
  );

  const handleChoiceSelect = (nextNodeId: string | null, label: string) => {
    if (!nextNodeId) return;
    setCurrentNodeId(nextNodeId);
    setPathStack((prev) => [...prev, nextNodeId]);
  };

  const handleContinue = () => {
    if (!currentNode) return;
    const nextConn = graph.connections.find(
      (c) => c.fromNodeId === currentNode.id && !c.fromChoiceId
    );
    if (nextConn) {
      setCurrentNodeId(nextConn.toNodeId);
      setPathStack((prev) => [...prev, nextConn.toNodeId]);
    }
  };

  const handleBack = () => {
    if (pathStack.length <= 1) return;
    const newStack = pathStack.slice(0, -1);
    setPathStack(newStack);
    setCurrentNodeId(newStack[newStack.length - 1]);
  };

  const handleRestart = () => {
    if (graph.rootNodeId) {
      setCurrentNodeId(graph.rootNodeId);
      setPathStack([graph.rootNodeId]);
    }
  };

  const pathTitles = pathStack
    .map((id) => graph.nodes.find((n) => n.id === id)?.title ?? '?')
    .join(' → ');

  const canContinue =
    currentNode &&
    (currentNode.type !== 'choice') &&
    graph.connections.some((c) => c.fromNodeId === currentNode.id && !c.fromChoiceId);

  return (
    <div className="preview-overlay">
      <div className="preview-header">
        <h2>📖 剧情预览</h2>
        <div>
          {pathStack.length > 1 && (
            <button className="preview-back" onClick={handleBack}>
              ← 返回
            </button>
          )}
          <button className="preview-back" onClick={handleRestart}>
            ↺ 重新开始
          </button>
          <button className="preview-close" onClick={onClose}>
            ✕ 关闭预览
          </button>
        </div>
      </div>

      <div className="preview-content">
        {!currentNode ? (
          <div className="preview-empty">
            <p>没有可预览的剧情节点。</p>
            <p style={{ marginTop: 12 }}>请先设置根节点并创建剧情分支。</p>
          </div>
        ) : (
          <div className="preview-dialog" key={currentNode.id}>
            <div className="preview-dialog-title">
              [{TYPE_LABELS[currentNode.type]}] {currentNode.title}
            </div>

            <div className="preview-dialog-text">{currentNode.content}</div>

            {currentNode.type === 'event' && currentNode.eventData && (
              <div className="preview-event-data">⚡ {currentNode.eventData}</div>
            )}

            {currentNode.type === 'choice' && currentNode.choices ? (
              <div className="preview-choices">
                {currentNode.choices.map((choice, idx) => {
                  const conn = graph.connections.find(
                    (c) =>
                      c.fromNodeId === currentNode.id && c.fromChoiceId === choice.id
                  );
                  const targetId = choice.nextNodeId || conn?.toNodeId;
                  return (
                    <button
                      key={choice.id}
                      className="preview-choice-btn"
                      onClick={() => handleChoiceSelect(targetId ?? null, choice.label)}
                      disabled={!targetId}
                      title={!targetId ? '此选项尚未连接到任何节点' : ''}
                    >
                      {idx + 1}. {choice.label}
                      {!targetId && '（未连接）'}
                    </button>
                  );
                })}
              </div>
            ) : canContinue ? (
              <div className="preview-choices">
                <button className="preview-choice-btn" onClick={handleContinue}>
                  ▶ 继续
                </button>
              </div>
            ) : (
              <div className="preview-empty" style={{ padding: '24px 0' }}>
                — 剧情分支在此结束 —
              </div>
            )}
          </div>
        )}
      </div>

      <div className="preview-path">
        路径记录: <span>{pathTitles || '无'}</span>
        <span style={{ marginLeft: 24, opacity: 0.6 }}>
          步数: {pathStack.length}
        </span>
      </div>
    </div>
  );
}

export default PreviewMode;
