import React, { useState, useRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { v4 as uuidv4 } from 'uuid';
import { ArticleData, ContentBlock, TextBlock, ImageBlock, CaptionBlock, BlockType } from '../types';

interface EditorProps {
  data: ArticleData;
  onChange: (data: ArticleData) => void;
}

const DragHandle: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <circle cx="5" cy="3" r="1.2" />
    <circle cx="11" cy="3" r="1.2" />
    <circle cx="5" cy="8" r="1.2" />
    <circle cx="11" cy="8" r="1.2" />
    <circle cx="5" cy="13" r="1.2" />
    <circle cx="11" cy="13" r="1.2" />
  </svg>
);

const Editor: React.FC<EditorProps> = ({ data, onChange }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, title: e.target.value });
  };

  const addBlock = (type: BlockType) => {
    let newBlock: ContentBlock;
    const id = uuidv4();
    switch (type) {
      case 'text':
        newBlock = { id, type: 'text', content: '双击此处编辑文字...', isChapter: false } as TextBlock;
        break;
      case 'image':
        newBlock = { id, type: 'image', src: '', alt: '' } as ImageBlock;
        break;
      case 'caption':
        newBlock = { id, type: 'caption', content: '在此输入图注...' } as CaptionBlock;
        break;
    }
    onChange({ ...data, blocks: [...data.blocks, newBlock] });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const blocks = Array.from(data.blocks);
    const [reorderedItem] = blocks.splice(result.source.index, 1);
    blocks.splice(result.destination.index, 0, reorderedItem);
    onChange({ ...data, blocks });
  };

  const startEditing = (block: ContentBlock) => {
    if (block.type === 'text' || block.type === 'caption') {
      setEditingId(block.id);
      setEditValue(block.content);
    }
  };

  const finishEditing = (blockId: string) => {
    const blocks = data.blocks.map((b) => {
      if (b.id === blockId && (b.type === 'text' || b.type === 'caption')) {
        return { ...b, content: editValue };
      }
      return b;
    });
    onChange({ ...data, blocks });
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, blockId: string) => {
    if (e.key === 'Escape') {
      setEditingId(null);
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      finishEditing(blockId);
    }
  };

  const toggleChapter = (blockId: string) => {
    const blocks = data.blocks.map((b) => {
      if (b.id === blockId && b.type === 'text') {
        return { ...b, isChapter: !b.isChapter };
      }
      return b;
    });
    onChange({ ...data, blocks });
  };

  const changeBlockType = (blockId: string, newType: BlockType) => {
    const blocks = data.blocks.map((b) => {
      if (b.id === blockId) {
        if (newType === 'text') {
          return { id: b.id, type: 'text', content: (b as any).content || '', isChapter: false } as TextBlock;
        } else if (newType === 'image') {
          return { id: b.id, type: 'image', src: (b as any).src || '', alt: '' } as ImageBlock;
        } else if (newType === 'caption') {
          return { id: b.id, type: 'caption', content: (b as any).content || '' } as CaptionBlock;
        }
      }
      return b;
    });
    onChange({ ...data, blocks });
  };

  const handleImageUpload = (blockId: string, file: File) => {
    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      alert('仅支持 JPG、PNG、WEBP 格式图片');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('图片大小不能超过 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const blocks = data.blocks.map((b) => {
        if (b.id === blockId && b.type === 'image') {
          return { ...b, src };
        }
        return b;
      });
      onChange({ ...data, blocks });
    };
    reader.readAsDataURL(file);
  };

  const handleImageClick = (blockId: string) => {
    const input = fileInputRefs.current[blockId];
    if (input) input.click();
  };

  const handleImageFileChange = (blockId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(blockId, file);
    e.target.value = '';
  };

  const handleImageDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    setDragOverImageId(blockId);
  };

  const handleImageDragLeave = () => {
    setDragOverImageId(null);
  };

  const handleImageDrop = (e: React.DragEvent, blockId: string) => {
    e.preventDefault();
    setDragOverImageId(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(blockId, file);
  };

  const removeImage = (blockId: string) => {
    const blocks = data.blocks.map((b) => {
      if (b.id === blockId && b.type === 'image') {
        return { ...b, src: '' };
      }
      return b;
    });
    onChange({ ...data, blocks });
  };

  const deleteBlock = (blockId: string) => {
    const blocks = data.blocks.filter((b) => b.id !== blockId);
    onChange({ ...data, blocks });
  };

  const renderBlock = (block: ContentBlock, index: number) => {
    const isEditing = editingId === block.id;

    return (
      <Draggable key={block.id} draggableId={block.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`block-item ${snapshot.isDragging ? 'dragging' : ''}`}
          >
            <div className="block-handle" {...provided.dragHandleProps}>
              <DragHandle />
            </div>

            <div className="block-controls">
              <select
                className="block-type-select"
                value={block.type}
                onChange={(e) => changeBlockType(block.id, e.target.value as BlockType)}
              >
                <option value="text">文字</option>
                <option value="image">图片</option>
                <option value="caption">图注</option>
              </select>
              {block.type === 'text' && (
                <button
                  className={`chapter-toggle ${(block as TextBlock).isChapter ? 'active' : ''}`}
                  onClick={() => toggleChapter(block.id)}
                >
                  {(block as TextBlock).isChapter ? '✓ 章节' : '章节'}
                </button>
              )}
              <button
                className="chapter-toggle"
                onClick={() => deleteBlock(block.id)}
                style={{ color: '#e74c3c' }}
              >
                删除
              </button>
            </div>

            <div className="block-content">
              {block.type === 'text' && (
                isEditing ? (
                  <textarea
                    className="block-textarea"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => finishEditing(block.id)}
                    onKeyDown={(e) => handleKeyDown(e, block.id)}
                    autoFocus
                  />
                ) : (
                  <div
                    className={`block-text ${(block as TextBlock).isChapter ? 'chapter' : ''}`}
                    onDoubleClick={() => startEditing(block)}
                  >
                    {(block as TextBlock).content || '双击此处编辑...'}
                  </div>
                )
              )}

              {block.type === 'caption' && (
                isEditing ? (
                  <textarea
                    className="block-textarea"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => finishEditing(block.id)}
                    onKeyDown={(e) => handleKeyDown(e, block.id)}
                    autoFocus
                  />
                ) : (
                  <div
                    className="block-caption"
                    onDoubleClick={() => startEditing(block)}
                  >
                    {(block as CaptionBlock).content || '双击此处编辑图注...'}
                  </div>
                )
              )}

              {block.type === 'image' && (
                <div className="image-block-wrapper">
                  {(block as ImageBlock).src ? (
                    <>
                      <img
                        src={(block as ImageBlock).src}
                        alt={(block as ImageBlock).alt}
                        className="block-image"
                      />
                      <button
                        className="delete-image-btn"
                        onClick={() => removeImage(block.id)}
                        title="删除图片"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div
                      className={`image-upload-area ${dragOverImageId === block.id ? 'dragover' : ''}`}
                      onClick={() => handleImageClick(block.id)}
                      onDragOver={(e) => handleImageDragOver(e, block.id)}
                      onDragLeave={handleImageDragLeave}
                      onDrop={(e) => handleImageDrop(e, block.id)}
                    >
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🖼️</div>
                      <div>点击或拖拽上传图片</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>支持 JPG/PNG/WEBP，最大 10MB</div>
                    </div>
                  )}
                  <input
                    ref={(el) => { fileInputRefs.current[block.id] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageFileChange(block.id, e)}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  return (
    <div className="editor-panel">
      <input
        type="text"
        className="editor-title-input"
        placeholder="请输入文章标题..."
        value={data.title}
        onChange={handleTitleChange}
      />
      <div className="editor-actions">
        <button className="add-btn" onClick={() => addBlock('text')}>+ 添加文字块</button>
        <button className="add-btn" onClick={() => addBlock('image')}>+ 添加图片块</button>
        <button className="add-btn" onClick={() => addBlock('caption')}>+ 添加图注块</button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div
              className="blocks-list"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {data.blocks.map((block, index) => renderBlock(block, index))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default Editor;
