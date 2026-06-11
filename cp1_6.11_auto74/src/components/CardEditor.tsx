import { useState, useEffect, useRef } from 'react';
import { X, Tag, Link, Image } from 'lucide-react';
import { useBoardStore } from '../store/useBoardStore';
import { PRESET_COLORS, getDarkerColor } from '../utils/colors';
import './CardEditor.css';

export default function CardEditor() {
  const {
    isEditorOpen,
    editingCard,
    currentBoardId,
    closeEditor,
    addCard,
    updateCard,
    deleteCard,
    getAllTags,
  } = useBoardStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const tagInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const allTags = getAllTags();
  const availableTags = allTags.filter(
    t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t)
  );

  useEffect(() => {
    if (isEditorOpen) {
      if (editingCard) {
        setTitle(editingCard.title);
        setDescription(editingCard.description);
        setColor(editingCard.color);
        setTags(editingCard.tags);
        setImageUrl(editingCard.imageUrl);
        setLinkUrl(editingCard.linkUrl);
      } else {
        setTitle('');
        setDescription('');
        setColor(PRESET_COLORS[0]);
        setTags([]);
        setImageUrl('');
        setLinkUrl('');
      }
    }
  }, [isEditorOpen, editingCard]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        tagInputRef.current &&
        !tagInputRef.current.contains(e.target as Node)
      ) {
        setShowTagSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = (tag: string) => {
    if (tags.length < 3 && tag.trim() && !tags.includes(tag.trim())) {
      setTags([...tags, tag.trim()]);
    }
    setTagInput('');
    setShowTagSuggestions(false);
    tagInputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag(tagInput.trim());
      }
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !currentBoardId) return;

    const cardData = {
      title: title.trim(),
      description: description.trim(),
      color,
      tags,
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl.trim(),
    };

    if (editingCard) {
      await updateCard(editingCard.id, cardData);
    } else {
      await addCard({ ...cardData, boardId: currentBoardId });
    }

    closeEditor();
  };

  const handleDelete = async () => {
    if (editingCard) {
      await deleteCard(editingCard.id);
      closeEditor();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeEditor();
    }
  };

  if (!isEditorOpen) return null;

  return (
    <div className="editor-overlay" onClick={handleOverlayClick}>
      <div className="editor-modal animate-scale-in">
        <div className="editor-header">
          <h2>{editingCard ? '编辑卡片' : '新建卡片'}</h2>
          <button className="editor-close" onClick={closeEditor}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-group">
            <label>颜色</label>
            <div className="color-picker">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-option ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="title">标题</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入卡片标题"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">描述</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="添加描述..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>
              <Tag size={14} />
              标签（最多3个）
            </label>
            <div className="tag-input-container">
              <div className="tag-input-tags">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="tag-chip"
                    style={{
                      backgroundColor: color + '80',
                      color: getDarkerColor(color),
                    }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {tags.length < 3 && (
                  <input
                    ref={tagInputRef}
                    type="text"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value);
                      setShowTagSuggestions(true);
                    }}
                    onFocus={() => setShowTagSuggestions(true)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? '输入标签...' : ''}
                    className="tag-input-field"
                  />
                )}
              </div>
              
              {showTagSuggestions && availableTags.length > 0 && (
                <div ref={suggestionsRef} className="tag-suggestions">
                  {availableTags.slice(0, 5).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleAddTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="imageUrl">
              <Image size={14} />
              图片 URL
            </label>
            <input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="form-group">
            <label htmlFor="linkUrl">
              <Link size={14} />
              链接
            </label>
            <input
              id="linkUrl"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>

          <div className="editor-actions">
            {editingCard && (
              <button
                type="button"
                className="delete-btn"
                onClick={handleDelete}
              >
                删除
              </button>
            )}
            <div className="action-buttons">
              <button
                type="button"
                className="cancel-btn"
                onClick={closeEditor}
              >
                取消
              </button>
              <button type="submit" className="save-btn">
                {editingCard ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
