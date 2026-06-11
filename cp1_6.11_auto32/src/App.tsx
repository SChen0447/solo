import React from 'react';
import { Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import MyBidsPage from './pages/MyBidsPage';

const App: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          艺术拍卖行
        </div>
        <div className="navbar-links">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            首页
          </NavLink>
          <NavLink
            to="/my-bids"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            我的出价
          </NavLink>
        </div>
      </nav>

      <TransitionGroup>
        <CSSTransition
          key={location.key}
          timeout={300}
          classNames="page"
          unmountOnExit
        >
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/artwork/:id" element={<DetailPage />} />
            <Route path="/my-bids" element={<MyBidsPage />} />
          </Routes>
        </CSSTransition>
      </TransitionGroup>
    </div>
  );
};

export default App;
