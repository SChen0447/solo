import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/createRoom.css';

const AVAILABLE_TAGS = [
  '爱情', '梦想', '自然', '夏天', '励志',
  '宁静', '城市', '夜晚', '童年', '回忆'
];

const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom } = useApp();
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allowHomophone, setAllowHomophone] = useState(true);
  const [requireLastChar, setRequireLastChar] = useState(true);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else if (selectedTags.length < 3) {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedTags.length === 0) return;

    const newRoom = createRoom({
      name: name.trim(),
      tags: selectedTags,
      rules: {
        allowHomophone,
        requireLastChar
      }
    });

    navigate(`/room/${newRoom.id}`);
  };

  return (
    <div className="create-room-page">
      <div className="page-container">
        <div className="page-header animate-fade-in">
          <h1 className="page-title">创建新房间</h1>
          <p className="page-subtitle">设置房间信息，开始你的创作之旅</p>
        </div>

        <form className="create-form card animate-slide-up" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">房间名称</label>
            <input
              type="text"
              className="input"
              placeholder="给你的接龙房间起个名字..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
            />
            <span className="form-hint">{name.length}/20</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              主题标签
              <span className="label-hint">（最多选择3个）</span>
            </label>
            <div className="tags-group">
              {AVAILABLE_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-select ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                  disabled={!selectedTags.includes(tag) && selectedTags.length >= 3}
                >
                  {tag}
                </button>
              ))}
            </div>
            <span className="form-hint">已选 {selectedTags.length}/3 个标签</span>
          </div>

          <div className="form-group">
            <label className="form-label">接龙规则</label>
            <div className="rules-options">
              <label className="rule-option">
                <input
                  type="checkbox"
                  checked={requireLastChar}
                  onChange={(e) => setRequireLastChar(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="rule-text">
                  <strong>末字开头</strong>
                  <small>下一句必须以上一句最后一个字开头</small>
                </span>
              </label>
              <label className="rule-option">
                <input
                  type="checkbox"
                  checked={allowHomophone}
                  onChange={(e) => setAllowHomophone(e.target.checked)}
                  disabled={!requireLastChar}
                />
                <span className="checkmark"></span>
                <span className="rule-text">
                  <strong>允许同音字</strong>
                  <small>读音相同的字也可以接龙</small>
                </span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/')}
            >
              取消
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || selectedTags.length === 0}
            >
              创建房间
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoom;
