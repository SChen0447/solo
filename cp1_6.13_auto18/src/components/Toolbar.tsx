import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useAppStore } from '../store/useAppStore';
import type { ComponentType } from '../types';
import './Toolbar.css';

interface ToolbarItem {
  type: ComponentType;
  label: string;
  icon: string;
  description: string;
}

const toolbarItems: ToolbarItem[] = [
  { type: 'player', label: '音乐播放器', icon: '🎵', description: '支持MP3上传和URL' },
  { type: 'playlist', label: '歌单列表', icon: '📋', description: '封面+标题+时长' },
  { type: 'social', label: '社交链接', icon: '🔗', description: 'Spotify/Instagram/YouTube' },
];

const Toolbar = () => {
  const addComponent = useAppStore((state) => state.addComponent);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.droppableId === 'toolbar' && result.destination.droppableId === 'canvas') {
      const itemType = toolbarItems[result.source.index].type;
      addComponent(itemType);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="toolbar-container">
        <h3 className="toolbar-title">组件面板</h3>
        <Droppable droppableId="toolbar" isDropDisabled={true}>
          {(provided) => (
            <div
              className="toolbar-list"
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {toolbarItems.map((item, index) => (
                <Draggable
                  key={item.type}
                  draggableId={`toolbar-${item.type}`}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      className={`toolbar-item ${snapshot.isDragging ? 'dragging' : ''}`}
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      onClick={() => addComponent(item.type)}
                    >
                      <div className="toolbar-item-icon">{item.icon}</div>
                      <div className="toolbar-item-info">
                        <div className="toolbar-item-label">{item.label}</div>
                        <div className="toolbar-item-desc">{item.description}</div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
        <div className="toolbar-tip">
          <span>💡</span>
          <p>拖拽或点击组件添加到画布</p>
        </div>
      </div>
    </DragDropContext>
  );
};

export default Toolbar;
