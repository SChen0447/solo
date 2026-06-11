import React from 'react';
import { useAuction } from '../context/AuctionContext';
import ArtCard from '../components/ArtCard';

const HomePage: React.FC = () => {
  const { artworks, autoBidEnabled, setAutoBidEnabled } = useAuction();

  return (
    <div className="content-area">
      <div className="header-row">
        <h1 className="page-title">正在拍卖</h1>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={autoBidEnabled}
            onChange={(e) => setAutoBidEnabled(e.target.checked)}
          />
          <span>模拟其他用户出价</span>
        </label>
      </div>
      <div className="art-grid">
        {artworks.map((artwork) => (
          <ArtCard key={artwork.id} artwork={artwork} />
        ))}
      </div>
    </div>
  );
};

export default HomePage;
