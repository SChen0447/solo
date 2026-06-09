import { Routes, Route, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import BrewingLab from './components/BrewingLab';
import Marketplace from './components/Marketplace';
import Inventory from './components/Inventory';
import { useApp } from './store/AppContext';
import type { Material, Recipe } from './shared/types';

export default function App() {
  const { state, dispatch, toast } = useApp();

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const [matRes, recRes] = await Promise.all([
          fetch('/api/materials'),
          fetch('/api/recipes'),
        ]);
        const matData = await matRes.json();
        const recData = await recRes.json();
        if (matData.success) {
          dispatch({ type: 'SET_MATERIALS', payload: matData.data as Material[] });
        }
        if (recData.success) {
          dispatch({ type: 'SET_RECIPES', payload: recData.data as Recipe[] });
        }
      } catch (e) {
        console.error('Failed to fetch initial data', e);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    fetchData();
  }, [dispatch]);

  return (
    <div>
      <nav className="nav-bar">
        <NavLink to="/" className="nav-link" end>
          ⚗️ 酿造工坊
        </NavLink>
        <NavLink to="/market" className="nav-link">
          🏪 魔药市场
        </NavLink>
        <NavLink to="/inventory" className="nav-link">
          📚 收藏柜
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<BrewingLab />} />
        <Route path="/market" element={<Marketplace />} />
        <Route path="/inventory" element={<Inventory />} />
      </Routes>
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
      {state.loading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
}
