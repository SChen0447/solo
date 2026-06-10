import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ActivityListPage from './pages/ActivityListPage';
import ActivityDetailPage from './pages/ActivityDetailPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ActivityListPage />} />
      <Route path="/activity/:id" element={<ActivityDetailPage />} />
    </Routes>
  );
};

export default App;
