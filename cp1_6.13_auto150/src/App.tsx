import { Routes, Route } from 'react-router-dom';
import CreatePage from './pages/CreatePage';
import ArtworkPage from './pages/ArtworkPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<CreatePage />} />
      <Route path="/artwork/:id" element={<ArtworkPage />} />
    </Routes>
  );
}

export default App;
