import React, { useState } from 'react';
import { Venue, VenueStatus } from '../types';
import { useApp } from '../App';

interface VenueEditModalProps {
  tourId: string;
  venue: Venue;
  onClose: () => void;
}

const VenueEditModal: React.FC<VenueEditModalProps> = ({ tourId, venue, onClose }) => {
  const { updateVenue } = useApp();
  const [name, setName] = useState(venue.name);
  const [address, setAddress] = useState(venue.address);
  const [contactPhone, setContactPhone] = useState(venue.contactPhone);
  const [notes, setNotes] = useState(venue.notes);
  const [status, setStatus] = useState<VenueStatus>(venue.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateVenue(tourId, venue.id, { name, address, contactPhone, notes, status });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>编辑演出场地</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>场地名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>地址</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>联系电话</label>
              <input
                type="text"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>状态</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as VenueStatus)}
                className="form-input"
              >
                <option value="confirmed">已确认</option>
                <option value="pending">待确认</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>备注</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="form-input form-textarea"
              rows={3}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>取消</button>
            <button type="submit" className="btn-primary">保存</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VenueEditModal;
