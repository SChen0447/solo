import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import CartSidebar from './components/CartSidebar';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import Orders from './pages/Orders';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import './styles/navbar.css';

const Navbar: React.FC = () => {
  const { cartCount, user, logout } = useApp();
  const [showCart, setShowCart] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="navbar-inner">
          <Link to="/" className="logo">
            <span className="logo-icon">🎒</span>
            <span className="logo-text">革物工坊</span>
          </Link>
          
          <div className="nav-links">
            <Link to="/" className="nav-link">首页</Link>
            {user?.isAdmin && (
              <Link to="/admin" className="nav-link">管理后台</Link>
            )}
            {user ? (
              <>
                <Link to="/orders" className="nav-link">我的订单</Link>
                <span className="nav-user">你好, {user.name}</span>
                <button className="nav-link nav-btn" onClick={logout}>退出</button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">登录</Link>
                <Link to="/register" className="nav-link">注册</Link>
              </>
            )}
            <button className="cart-btn" onClick={() => setShowCart(true)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1"/>
                <circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
              {cartCount > 0 && (
                <span className="cart-badge">{cartCount}</span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <CartSidebar isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
};

const Toast: React.FC = () => {
  const { toast } = useApp();
  
  if (!toast || !toast.visible) return null;
  
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
    </div>
  );
};

const App: React.FC = () => {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = useState(location);
  const [transitionStage, setTransitionStage] = useState('fadeIn');

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('fadeOut');
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionStage('fadeIn');
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [location, displayLocation]);

  return (
    <div className="app">
      <Navbar />
      <Toast />
      <div className={`page-transition ${transitionStage}`}>
        <Routes location={displayLocation}>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>
      
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <h3>革物工坊</h3>
            <p>匠心独运，每一件都是孤品</p>
          </div>
          <div className="footer-links">
            <div>
              <h4>关于我们</h4>
              <p>品牌故事</p>
              <p>匠人团队</p>
              <p>工艺介绍</p>
            </div>
            <div>
              <h4>客户服务</h4>
              <p>配送说明</p>
              <p>退换政策</p>
              <p>保养指南</p>
            </div>
            <div>
              <h4>联系我们</h4>
              <p>客服微信：leathercraft</p>
              <p>工作时间：9:00-18:00</p>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2024 革物工坊 版权所有</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
