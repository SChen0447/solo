import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuction } from '../context/AuctionContext';
import { formatTime } from '../utils';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getArtworkById, placeBid, currentUser } = useAuction();
  const artwork = id ? getArtworkById(id) : undefined;

  const [bidAmount, setBidAmount] = useState('');
  const [error, setError] = useState('');
  const animatedPrice = useAnimatedNumber(artwork?.currentPrice || 0, 600);

  if (!artwork) {
    return (
      <div className="content-area">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回首页
        </button>
        <div className="empty-state">
          <div className="empty-state-icon">🎨</div>
          <p>未找到该艺术品</p>
        </div>
      </div>
    );
  }

  const minBid = artwork.currentPrice + 10;

  const handleBid = () => {
    const amount = parseInt(bidAmount, 10);
    if (isNaN(amount)) {
      setError('请输入有效的金额');
      return;
    }
    if (amount < minBid) {
      setError(`出价金额必须高于当前价格，最低加价10元（最低 ${minBid} 元）`);
      return;
    }
    if (amount % 10 !== 0) {
      setError('出价金额必须是10的整数倍');
      return;
    }

    const success = placeBid(artwork.id, amount, currentUser, true);
    if (success) {
      setBidAmount('');
      setError('');
    } else {
      setError('出价失败，请重试');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBid();
    }
  };

  return (
    <div className="content-area">
      <div className="detail-container">
        <button className="back-button" onClick={() => navigate('/')}>
          ← 返回首页
        </button>

        <div
          className="detail-image"
          style={{ background: artwork.gradient }}
        />

        <div className="detail-header">
          <div>
            <h1 className="detail-title">{artwork.title}</h1>
            <div className="detail-artist">作者：{artwork.artist}</div>
          </div>
          <div className="detail-current-price">
            <div className="detail-price-label">当前最高价</div>
            <span className={`detail-price-value ${animatedPrice.isUpdating ? 'updating' : ''}`}>
              ¥{animatedPrice.value.toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        <p className="detail-description">{artwork.description}</p>

        <h2 className="section-title">出价历史</h2>
        <div className="bid-history">
          <div className="bid-history-header">
            <span>竞拍者</span>
            <span>出价时间</span>
            <span>出价金额</span>
          </div>
          {artwork.bids.length === 0 ? (
            <div className="bid-history-row" style={{ justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <span style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>暂无出价，快来成为第一个出价的人吧！</span>
            </div>
          ) : (
            artwork.bids.map((bid) => (
              <div
                key={bid.id}
                className={`bid-history-row ${bid.isUserBid ? 'user-bid' : ''}`}
              >
                <span className="bidder-cell">
                  {bid.bidder}
                  {bid.isUserBid && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>（我）</span>}
                </span>
                <span className="time-cell">{formatTime(bid.timestamp)}</span>
                <span className="amount-cell">¥{bid.amount.toLocaleString('zh-CN')}</span>
              </div>
            ))
          )}
        </div>

        <h2 className="section-title">我要出价</h2>
        <div className="bid-form">
          <div className="bid-form-input-group">
            <label className="bid-form-label">
              出价金额（最低 ¥{minBid.toLocaleString('zh-CN')}，加价幅度为10元的整数倍）
            </label>
            <input
              type="number"
              className="bid-form-input"
              placeholder={`输入金额，如 ${minBid}`}
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              min={minBid}
              step={10}
            />
            {error && <div className="bid-error">{error}</div>}
          </div>
          <button className="btn" onClick={handleBid}>
            出价
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailPage;
