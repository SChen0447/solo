import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { PageKey } from '../types';
import { useApp } from '../App';
import '../styles/sidebar.scss';

interface NavItem {
  key: PageKey;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface Props {
  navItems: NavItem[];
}

function Sidebar({ navItems }: Props): JSX.Element {
  const { user, scoreDelta } = useApp();
  const location = useLocation();

  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="sidebar__brand">
        <div className="brand__vinyl">
          <div className="vinyl__grooves" />
          <div className="vinyl__label" />
        </div>
        <div className="brand__text">
          <h1>声色·盲选</h1>
          <span>Vinyl Blind Box</span>
        </div>
      </div>

      <nav className="sidebar__nav">
        <ul>
          {navItems.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.path}
              className={({ isActive }) =>
              `nav-btn ${location.pathname === item.path || isActive ? 'nav-btn--active' : ''}`
            }
            aria-label={item.label}
          >
            <span className="nav-btn__icon">{item.icon}</span>
            <span className="nav-btn__label">{item.label}</span>
            <span className="nav-btn__glow" />
          </NavLink>
        </li>
        ))}
      </ul>
      </nav>

      <div className="sidebar__usercard">
        <div className="usercard__avatar">{user?.avatar}</div>
        <div className="usercard__info">
          <div className="usercard__name">{user?.nickname ?? '访客'}</div>
          <div className="usercard__score">
            <span className={`score-value ${scoreDelta !== 0 ? 'score-value--bounce' : ''}`}>
              {user?.score ?? 0}
            </span>
            {scoreDelta !== 0 && (
              <span className={`score-delta ${scoreDelta > 0 ? 'score-delta--up' : 'score-delta--down'}`}>
                {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
              </span>
            )}
            <span className="score-label">积分</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
