import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { StoryNode, StoryChoice } from '../types';

interface NodeEditorProps {
  node: StoryNode;
  allNodes: StoryNode[];
  onSave: (node: StoryNode) => void;
  onCancel: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  dialog: '对话节点',
  choice: '选择节点',
  event: '事件节点',
};

function NodeEditor({ node, allNodes, onSave, onCancel }: NodeEditorProps) {
  const [title, setTitle] = useState(node.title);
  const [content, setContent] = useState(node.content);
  const [choices, setChoices] = useState<StoryChoice[]>(
    node.choices ? node.choices.map((c) => ({ ...c })) : []
  );
  const [eventData, setEventData] = useState(node.eventData ?? '');

  const handleAddChoice = () => {
    setChoices((prev) => [
      ...prev,
      { id: uuidv4(), label: `选项${prev.length + 1}`, nextNodeId: null },
    ]);
  };

  const handleRemoveChoice = (id: string) => {
    setChoices((prev) => prev.filter((c) => c.id !== id));
  };

  const handleChoiceChange = (id: string, field: 'label' | 'nextNodeId', value: string) => {
    setChoices((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, [field]: field === 'nextNodeId' ? (value || null) : value } : c
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoryNode = {
      ...node,
      title: title.trim() || '未命名节点',
      content: content.slice(0, 150),
    };
    if (node.type === 'choice') {
      updated.choices = choices;
    }
    if (node.type === 'event') {
      updated.eventData = eventData;
    }
    onSave(updated);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">编辑 {TYPE_LABELS[node.type]}</div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>节点标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入节点标题"
              maxLength={30}
            />
          </div>

          <div className="form-group">
            <label>对话/描述内容（最多150字）</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 150))}
              placeholder="输入对话或描述内容..."
              rows={4}
            />
            <div className="char-count">{content.length}/150</div>
          </div>

          {node.type === 'choice' && (
            <div className="form-group">
              <label>选项列表</label>
              {choices.map((choice) => (
                <div key={choice.id} className="choice-editor-item">
                  <div className="choice-inputs">
                    <input
                      type="text"
                      value={choice.label}
                      onChange={(e) => handleChoiceChange(choice.id, 'label', e.target.value)}
                      placeholder="选项按钮文案"
                    />
                    <select
                      value={choice.nextNodeId ?? ''}
                      onChange={(e) => handleChoiceChange(choice.id, 'nextNodeId', e.target.value)}
                    >
                      <option value="">-- 选择下一个节点（可选） --</option>
                      {allNodes
                        .filter((n) => n.id !== node.id)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title} ({TYPE_LABELS[n.type]})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveChoice(choice.id)}
                    title="删除选项"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className="btn-add-choice" onClick={handleAddChoice}>
                + 添加选项
              </button>
            </div>
          )}

          {node.type === 'event' && (
            <div className="form-group">
              <label>事件数据（如：获得物品、触发特效等）</label>
              <input
                type="text"
                value={eventData}
                onChange={(e) => setEventData(e.target.value)}
                placeholder="例如：获得物品：星光碎片"
              />
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="btn-save">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NodeEditor;
