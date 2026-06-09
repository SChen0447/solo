import React, { useState } from 'react';
import { useApp } from '../App';

interface CreateTourModalProps {
  onClose: () => void;
}

const CreateTourModal: React.FC<CreateTourModalProps> = ({ onClose }) => {
  const { createTour, setSelectedTourId, setExpandedTourId } = useApp();
  const [name, setName] = useState('');
  const [bandSize, setBandSize] = useState(4);
  const [startCity, setStartCity] = useState('北京');
  const [endCity, setEndCity] = useState('上海');
  const [totalDays, setTotalDays] = useState(14);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || name.length > 20) {
      setError('巡演名称不能为空且最多20字');
      return;
    }
    if (bandSize < 1 || bandSize > 10) {
      setError('乐队人数必须在1-10之间');
      return;
    }
    if (totalDays < 1 || totalDays > 60) {
      setError('总天数必须在1-60之间');
      return;
    }

    try {
      const tour = await createTour({
        name: name.trim(),
        bandSize,
        startCity: startCity.trim(),
        endCity: endCity.trim(),
        totalDays
      });
      setSelectedTourId(tour.id);
      setExpandedTourId(tour.id);
      onClose();
    } catch (err) {
      setError('创建巡演失败，请重试');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新建巡演</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>巡演名称（最多20字）</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={20}
              placeholder="如：2024夏日巡演"
              className="form-input"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>乐队人数（1-10）</label>
              <input
                type="number"
                min={1}
                max={10}
                value={bandSize}
                onChange={e => setBandSize(Number(e.target.value))}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>总天数（1-60）</label>
              <input
                type="number"
                min={1}
                max={60}
                value={totalDays}
                onChange={e => setTotalDays(Number(e.target.value))}
                className="form-input"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>起始城市</label>
              <input
                type="text"
                value={startCity}
                onChange={e => setStartCity(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>结束城市</label>
              <input
                type="text"
                value={endCity}
                onChange={e => setEndCity(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">创建巡演</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTourModal;
