import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from '../components/Calendar';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const navigate = useNavigate();
  const { user } = useAuth();

  const goToday = () => {
    navigate(`/edit/${formatDate(new Date())}`);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">你好，{user?.username} 👋</h1>
          <p style={{ color: '#5a4a3a', opacity: 0.7, marginTop: 4 }}>
            选择一个日期，开始记录今天的心情吧～
          </p>
        </div>
        <button className="btn" onClick={goToday}>
          ✏️ 写今天的手账
        </button>
      </div>
      <Calendar
        year={year}
        month={month}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
      />
    </div>
  );
};

export default Dashboard;
