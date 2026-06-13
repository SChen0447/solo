import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditPage from './pages/EditPage';
import ReadPage from './pages/ReadPage';
import DynamicBg from './components/DynamicBg';

function App() {
  return (
    <div className="app-container">
      <DynamicBg />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/edit" element={<EditPage />} />
        <Route path="/read/:id" element={<ReadPage />} />
      </Routes>
    </div>
  );
}

export default App;
