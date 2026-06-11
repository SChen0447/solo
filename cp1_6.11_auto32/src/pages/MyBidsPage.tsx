import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuction } from '../context/AuctionContext';

const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const MyBidsPage: React.FC = () => {
  const { userBids } = useAuction();
  const navigate = useNavigate();

  const sortedBids = [...userBids].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="content-area">
      <h1 className="page-title">我的出价</h1>

      {sortedBids.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎨</div>
          <p>还没有出价记录</p>
          <p style={{ marginTop: 8, fontSize: '0.9rem' }}>去首页看看艺术品，参与竞拍吧！</p>
          <button
            className="btn"
            style={{ marginTop: 24 }}
            onClick={() => navigate('/')}
          >
            去竞拍
          </button>
        </div>
      ) : (
        <div className="bids-list">
          {sortedBids.map((bid) => (
            <div key={bid.id} className="bid-item">
              <div className="bid-item-info" style={{ cursor: 'pointer' }} onClick={() => navigate(`/artwork/${bid.artworkId}`)}>
                <div className="bid-item-title">{bid.artworkTitle}</div>
                <div className="bid-item-time">{formatDateTime(bid.timestamp)}</div>
              </div>
              <div className="bid-item-right">
                <div className="bid-item-amount">
                  ¥{bid.amount.toLocaleString('zh-CN')}
                </div>
                <span className={`status-badge ${bid.status}`}>
                  {bid.status === 'leading' ? '领先' : '被超过'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBidsPage;
