import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { getUserId, userAPI } from './api';
import { User, Page, FlowerCard } from './types';
import HomePage from './pages/HomePage';
import WarehousePage from './pages/WarehousePage';
import SynthesisPage from './pages/SynthesisPage';
import ExplorePage from './pages/ExplorePage';
import ExchangePage from './pages/ExchangePage';

interface AppContextType {
  user: User | null;
  currentPage: Page;
  setPage: (p: Page) => void;
  refreshUser: () => Promise<void>;
  userId: string;
  flyingPetal: { color: string; visible: boolean } | null;
  setFlyingPetal: (p: { color: string; visible: boolean } | null) => void;
  justOpenedCard: FlowerCard | null;
  setJustOpenedCard: (c: FlowerCard | null) => void;
}

export const AppContext = createContext<AppContextType | null>(null);
export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

const GlobalStyle = createGlobalStyle`
  * { box-sizing: border-box; }
  body { -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,105,180,0.4); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,105,180,0.6); }
`;

const AppShell = styled.div`
  min-height: 100vh;
  position: relative;
  padding-bottom: 80px;
`;

const TopBar = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  backdrop-filter: blur(12px);
  background: rgba(0,0,0,0.2);
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid rgba(255,255,255,0.1);
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #FFD700, #FF69B4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  cursor: pointer;
  transition: transform 0.3s ease-out;
  &:hover { transform: scale(1.03); }
`;

const NavButtons = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

interface NavBtnProps { $active: boolean; }
const NavBtn = styled.button<NavBtnProps>`
  padding: 8px 16px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: ${props => props.$active ? 'linear-gradient(135deg, #FF69B4, #9370DB)' : 'rgba(255,255,255,0.08)'};
  color: #fff;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.3s ease-out;
  &:hover { background: ${props => props.$active ? 'linear-gradient(135deg, #FF69B4, #9370DB)' : 'rgba(255,255,255,0.16)'}; transform: translateY(-1px); }
`;

const UserBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255,255,255,0.08);
  border-radius: 999px;
  font-size: 13px;
  border: 1px solid rgba(255,255,255,0.1);
`;

const MainContent = styled.main`
  max-width: 1280px;
  margin: 0 auto;
  padding: 24px;
  @media (max-width: 768px) { padding: 16px; }
`;

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [flyingPetal, setFlyingPetal] = useState<{ color: string; visible: boolean } | null>(null);
  const [justOpenedCard, setJustOpenedCard] = useState<FlowerCard | null>(null);
  const userId = getUserId();

  const refreshUser = useCallback(async () => {
    try {
      const res = await userAPI.get(userId);
      if (res.data.success) setUser(res.data.data);
    } catch (e) { console.error(e); }
  }, [userId]);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const pages: { key: Page; label: string }[] = [
    { key: 'home', label: '🏠 首页' },
    { key: 'warehouse', label: '🗂️ 仓库' },
    { key: 'synthesis', label: '✨ 合成' },
    { key: 'explore', label: '🌐 探索' },
    { key: 'exchange', label: '💌 交换' }
  ];

  return (
    <AppContext.Provider value={{
      user, currentPage, setPage: setCurrentPage,
      refreshUser, userId, flyingPetal, setFlyingPetal,
      justOpenedCard, setJustOpenedCard
    }}>
      <AppShell>
        <GlobalStyle />
        <TopBar>
          <Logo onClick={() => setCurrentPage('home')}>
            <svg width="32" height="32" viewBox="0 0 100 100">
              <path d="M50 10 C65 20 75 35 50 50 C25 35 35 20 50 10" fill="#FF69B4"/>
              <path d="M90 50 C80 65 65 75 50 50 C65 25 80 35 90 50" fill="#DA70D6"/>
              <path d="M50 90 C35 80 25 65 50 50 C75 65 65 80 50 90" fill="#9370DB"/>
              <path d="M10 50 C20 35 35 25 50 50 C35 75 20 65 10 50" fill="#BA55D3"/>
            </svg>
            秘境花语
          </Logo>
          <NavButtons>
            {pages.map(p => (
              <NavBtn key={p.key} $active={currentPage === p.key} onClick={() => setCurrentPage(p.key)}>
                {p.label}
              </NavBtn>
            ))}
          </NavButtons>
          <UserBadge>
            <span style={{ fontSize: 16 }}>👤</span>
            <span>{user?.name || '加载中...'}</span>
            <span style={{ marginLeft: 6, opacity: 0.7 }}>🌸{user?.petals.length || 0}/7</span>
          </UserBadge>
        </TopBar>
        <MainContent>
          {currentPage === 'home' && <HomePage />}
          {currentPage === 'warehouse' && <WarehousePage />}
          {currentPage === 'synthesis' && <SynthesisPage />}
          {currentPage === 'explore' && <ExplorePage />}
          {currentPage === 'exchange' && <ExchangePage />}
        </MainContent>
      </AppShell>
    </AppContext.Provider>
  );
};

export default App;
