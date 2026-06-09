import type { NodeType } from '../types';

interface NodePaletteProps {
  onAddNode: (type: NodeType) => void;
}

const NODE_TYPES: { type: NodeType; label: string; icon: string; desc: string }[] = [
  { type: 'dialog', label: '对话节点', icon: '💬', desc: '角色对话/旁白' },
  { type: 'choice', label: '选择节点', icon: '🔀', desc: '多选项分支' },
  { type: 'event', label: '事件节点', icon: '⚡', desc: '触发特殊事件' },
];

function NodePalette({ onAddNode }: NodePaletteProps) {
  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="node-palette">
      <div className="palette-title">节点类型</div>
      {NODE_TYPES.map((item) => (
        <div
          key={item.type}
          className="palette-item"
          draggable
          onDragStart={(e) => handleDragStart(e, item.type)}
          onDoubleClick={() => onAddNode(item.type)}
          title={`${item.label} - ${item.desc}（拖拽到画布或双击创建）`}
        >
          <span className="palette-icon">{item.icon}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}

export default NodePalette;
