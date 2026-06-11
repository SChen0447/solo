import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import HomePage from './HomePage';
import LyricRoom from './LyricRoom';
import UserProfile from './UserProfile';
import HistoryPage from './HistoryPage';
import CreateRoom from './CreateRoom';
import Navbar from './Navbar';

const App: React.FC = () => {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/room/:id" element={<LyricRoom />} />
              <Route path="/user/:id" element={<UserProfile />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/create" element={<CreateRoom />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
};

export default App;
