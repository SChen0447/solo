import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FlaskConical, BookOpen, History } from 'lucide-react';
import { playClickSound } from '@/utils/audio';

const NavBar: React.FC = () => {
  const navItems = [
    { path: '/', label: '熔炉', icon: FlaskConical },
    { path: '/dashboard', label: '配方', icon: BookOpen },
    { path: '/history', label: '图谱', icon: History }
  ];

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 flex justify-center py-3 px-4"
      style={{
        background: 'linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(30,30,30,0) 100%)'
      }}
    >
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: 'rgba(45, 45, 45, 0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(205, 127, 50, 0.3)' }}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => playClickSound()}
            className={({ isActive }) =>
              `relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all`
            }
            style={({ isActive }) => ({
              color: isActive ? '#ffd700' : '#e0d0b0',
              backgroundColor: 'transparent'
            })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute inset-0 rounded-lg"
                    style={{ backgroundColor: 'rgba(205, 127, 50, 0.25)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon size={16} style={{ position: 'relative', zIndex: 1 }} />
                <span style={{ position: 'relative', zIndex: 1 }} className="hidden sm:inline">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default NavBar;
