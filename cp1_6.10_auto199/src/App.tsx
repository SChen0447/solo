import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './components/AuthPage';
import Workbench from './components/Workbench';
import ExhibitView from './components/ExhibitView';
import { useApp } from './context/AppContext';

function App() {
  const { currentUser } = useApp();

  return (
    <Routes>
      <Route
        path="/"
        element={currentUser ? <Navigate to="/workbench" replace /> : <AuthPage />}
      />
      <Route
        path="/workbench"
        element={currentUser ? <Workbench /> : <Navigate to="/" replace />}
      />
      <Route path="/exhibit/:id" element={<ExhibitView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
