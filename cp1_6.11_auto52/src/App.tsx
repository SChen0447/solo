import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import axios from 'axios';
import CoffeeList from './components/CoffeeList';
import CoffeeDetail from './components/CoffeeDetail';
import type { Coffee, TastingNote } from './types';

const App: React.FC = () => {
  const [coffees, setCoffees] = useState<Coffee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoffees = async () => {
      try {
        const res = await axios.get('/api/coffees');
        setCoffees(res.data);
      } catch (error) {
        console.error('获取咖啡豆数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoffees();
  }, []);

  const handleAddNote = (note: TastingNote) => {
    setCoffees((prev) =>
      prev.map((coffee) => {
        if (coffee.id === note.coffeeId) {
          const relatedNotes = [note];
          const avgRating =
            relatedNotes.reduce((sum, n) => sum + n.rating, 0) / relatedNotes.length;
          return {
            ...coffee,
            avgRating: Math.round(avgRating * 10) / 10,
          };
        }
        return coffee;
      })
    );
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-title">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 30h55v35c0 11-9 20-20 20H40c-11 0-20-9-20-20V30z"
              fill="#6d4c41"
            />
            <path
              d="M75 35h8c5.5 0 10 4.5 10 10s-4.5 10-10 10h-8"
              stroke="#8d6e63"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <ellipse cx="47.5" cy="30" rx="27.5" ry="6" fill="#3e2723" />
            <path
              d="M30 15c0 4 4 6 4 10M45 10c0 5 4 7 4 12M60 15c0 4 4 6 4 10"
              stroke="#a1887f"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span>咖啡豆溯源社区</span>
        </div>
        <button className="hamburger-btn" aria-label="菜单">
          <span />
        </button>
      </header>

      <Routes>
        <Route path="/" element={<CoffeeList coffees={coffees} loading={loading} />} />
        <Route
          path="/coffee/:id"
          element={<CoffeeDetail coffees={coffees} onAddNote={handleAddNote} />}
        />
      </Routes>
    </div>
  );
};

export default App;
