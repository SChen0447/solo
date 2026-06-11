import React, { useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TradePanel from './components/TradePanel';
import ToastContainer from './components/ToastContainer';
import { useStore } from './store/useStore';
import { mockApi } from './api/mockApi';

const App: React.FC = () => {
  const { setStocks, refreshRanking, updateStockPrice, setSelectedStockId } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const roomId = 'DEMO';
    useStore.getState().loadInitialData(roomId);

    const cleanup = mockApi.startPriceUpdate(
      (updatedStocks) => {
        setStocks(updatedStocks);
        updatedStocks.forEach(stock => {
          updateStockPrice(stock.id, stock.price);
        });
      },
      () => {}
    );

    const rankingInterval = setInterval(() => {
      refreshRanking(roomId);
    }, 10000);

    return () => {
      cleanup();
      clearInterval(rankingInterval);
    };
  }, [setStocks, refreshRanking, updateStockPrice]);

  const handleNavigateToTrade = (roomId: string, stockId?: string) => {
    if (stockId) {
      setSelectedStockId(stockId);
    }
    navigate(`/room/${roomId}`);
  };

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Dashboard onNavigateToTrade={handleNavigateToTrade} />} />
        <Route path="/room/:roomId" element={<TradePanel />} />
      </Routes>
      <ToastContainer />
    </div>
  );
};

export default App;
