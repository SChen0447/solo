import React, { useState } from 'react';
import { useAppContext } from '../App';

const Navbar: React.FC = () => {
  const { currentPage, setCurrentPage } = useAppContext();
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (page: string) => {
    setCurrentPage(page);
    setMobileOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo" onClick={() => go('shop')}>
        <span className="navbar-logo-icon">💐</span>
        <span>花语轩</span>
      </div>

      <div className="navbar-links">
        <button
          className={`navbar-link ${currentPage === 'shop' ? 'active' : ''}`}
          onClick={() => go('shop')}
        >
          花束选购
        </button>
        <button
          className={`navbar-link ${currentPage === 'orders' ? 'active' : ''}`}
          onClick={() => go('orders')}
        >
          我的订单
        </button>
      </div>

      <button className="hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
        ☰
      </button>

      {mobileOpen && (
        <div className="mobile-menu">
          <button
            className={`navbar-link ${currentPage === 'shop' ? 'active' : ''}`}
            onClick={() => go('shop')}
          >
            花束选购
          </button>
          <button
            className={`navbar-link ${currentPage === 'orders' ? 'active' : ''}`}
            onClick={() => go('orders')}
          >
            我的订单
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
