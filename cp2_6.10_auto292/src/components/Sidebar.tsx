import React from 'react';
import { Flame, ClipboardList, Users, MessageSquare, Menu, X } from 'lucide-react';

type PageKey = 'inventory' | 'orders' | 'customers' | 'notifications';

interface SidebarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const navItems: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'inventory', label: '蜡烛库存', icon: <Flame size={20} /> },
  { key: 'orders', label: '客户订单', icon: <ClipboardList size={20} /> },
  { key: 'customers', label: '客户偏好', icon: <Users size={20} /> },
  { key: 'notifications', label: '批量通知', icon: <MessageSquare size={20} /> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onToggle,
}) => {
  return (
    <>
      <button className="hamburger-btn" onClick={onToggle} aria-label="菜单">
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <div className={`backdrop ${isOpen ? 'show' : ''}`} onClick={onToggle} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-logo">🕯️</span>
          <span className="sidebar-title">香薰蜡烛工坊</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar-link ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => {
                onNavigate(item.key);
                if (window.innerWidth <= 768) onToggle();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
