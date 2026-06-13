import { Droppable, Draggable, DragDropContext, DropResult } from 'react-beautiful-dnd';
import { useAppStore } from '../store/useAppStore';
import PlayerComponent from './canvas/PlayerComponent';
import PlaylistComponent from './canvas/PlaylistComponent';
import SocialComponent from './canvas/SocialComponent';
import type { CanvasComponent as CanvasComponentType } from '../types';
import './Canvas.css';

const Canvas = () => {
  const components = useAppStore((state) => state.components);
  const selectedId = useAppStore((state) => state.selectedId);
  const setSelectedId = useAppStore((state) => state.setSelectedId);
  const reorderComponents = useAppStore((state) => state.reorderComponents);
  const openModal = useAppStore((state) => state.openModal);
  const addComponent = useAppStore((state) => state.addComponent);

  const sortedComponents = [...components].sort((a, b) => a.position - b.position);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    if (result.source.droppableId === 'toolbar' && result.destination.droppableId === 'canvas') {
      const typeMap: Record<string, 'player' | 'playlist' | 'social'> = {
        'toolbar-player': 'player',
        'toolbar-playlist': 'playlist',
        'toolbar-social': 'social',
      };
      const type = typeMap[result.draggableId];
      if (type) {
        addComponent(type);
      }
      return;
    }

    if (result.source.droppableId === 'canvas' && result.destination.droppableId === 'canvas') {
      reorderComponents(result.source.index, result.destination.index);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedId(null);
    }
  };

  const renderComponent = (comp: CanvasComponentType, isSelected: boolean) => {
    const commonProps = {
      component: comp,
      isSelected,
      onSelect: () => setSelectedId(comp.id),
      onDoubleClick: () => openModal(comp.id),
    };

    switch (comp.type) {
      case 'player':
        return <PlayerComponent {...commonProps} />;
      case 'playlist':
        return <PlaylistComponent {...commonProps} />;
      case 'social':
        return <SocialComponent {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="canvas-wrapper" onClick={handleCanvasClick}>
        <Droppable droppableId="canvas">
          {(provided, snapshot) => (
            <div
              className={`canvas-container ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {sortedComponents.length === 0 && (
                <div className="canvas-empty">
                  <div className="empty-icon">🎨</div>
                  <h3>开始创建你的音乐主页</h3>
                  <p>从左侧工具栏拖拽组件到这里</p>
                </div>
              )}
              {sortedComponents.map((comp, index) => (
                <Draggable key={comp.id} draggableId={comp.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`canvas-item-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
                      style={{
                        ...provided.draggableProps.style,
                      }}
                    >
                      {renderComponent(comp, selectedId === comp.id)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </DragDropContext>
  );
};

export default Canvas;
