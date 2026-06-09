import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

const Navbar: React.FC = () => {
  const { currentPage, navigateTo, projects, currentProjectId } = useAppContext();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    position: 'relative',
    padding: '6px 2px',
    fontSize: 14,
    color: active ? '#64FFDA' : 'var(--text-primary)',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'color 0.15s ease',
    userSelect: 'none'
  });

  const underlineStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    width: '100%',
    backgroundColor: '#64FFDA',
    transform: 'scaleX(1)',
    transformOrigin: 'left',
    transition: 'transform 0.2s ease-out'
  };

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 56,
      backgroundColor: 'var(--bg-nav)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      zIndex: 100,
      borderBottom: '1px solid rgba(100, 255, 218, 0.1)'
    }}>
      <div 
        onClick={() => navigateTo('projects')}
        style={{
          fontFamily: "'Playfair Display', serif",
          fontStyle: 'italic',
          fontSize: 24,
          color: '#64FFDA',
          cursor: 'pointer',
          fontWeight: 700,
          letterSpacing: 0.5
        }}
      >
        ArtFlow
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <div
            onClick={() => currentPage === 'kanban' ? setDropdownOpen(!dropdownOpen) : navigateTo('projects')}
            style={{
              ...navLinkStyle(currentPage === 'projects' || currentPage === 'kanban'),
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            {currentPage === 'kanban' && currentProject ? `项目: ${currentProject.name}` : '项目'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            {(currentPage === 'projects' || currentPage === 'kanban') && <span style={underlineStyle} />}
          </div>

          {dropdownOpen && currentPage === 'kanban' && (
            <div 
              className="animate-fade-in-scale"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                minWidth: 200,
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                overflow: 'hidden',
                border: '1px solid var(--border-dark)'
              }}
            >
              <div
                onClick={() => { setDropdownOpen(false); navigateTo('projects'); }}
                style={{
                  padding: '12px 16px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  borderBottom: '1px solid var(--border-dark)',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(100, 255, 218, 0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                ← 返回项目列表
              </div>
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => { setDropdownOpen(false); navigateTo('kanban', p.id); }}
                  style={{
                    padding: '12px 16px',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    backgroundColor: p.id === currentProjectId ? 'rgba(100, 255, 218, 0.08)' : 'transparent',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(100, 255, 218, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = p.id === currentProjectId ? 'rgba(100, 255, 218, 0.08)' : 'transparent'}
                >
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0
                  }} />
                  <span style={{ color: p.id === currentProjectId ? '#64FFDA' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <div
            onClick={() => navigateTo('overview')}
            style={navLinkStyle(currentPage === 'overview')}
          >
            概览
            {currentPage === 'overview' && <span style={underlineStyle} />}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
