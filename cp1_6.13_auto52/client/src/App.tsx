import { Routes, Route, useLocation } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Publish from './pages/Publish';
import Matches from './pages/Matches';
import Messages from './pages/Messages';
import ChatDetail from './pages/ChatDetail';
import Toast from './components/Toast';
import type { ToastType } from './components/Toast';

function App() {
  const location = useLocation();
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="app">
      <Navbar isScrolled={isScrolled} />
      <main className="main-content">
        <TransitionGroup>
          <CSSTransition
            key={location.pathname}
            timeout={300}
            classNames="page"
            unmountOnExit
          >
            <Routes location={location}>
              <Route path="/" element={<Home showToast={showToast} />} />
              <Route path="/publish" element={<Publish showToast={showToast} />} />
              <Route path="/matches" element={<Matches showToast={showToast} />} />
              <Route path="/messages" element={<Messages showToast={showToast} />} />
              <Route path="/messages/:matchId" element={<ChatDetail showToast={showToast} />} />
            </Routes>
          </CSSTransition>
        </TransitionGroup>
      </main>
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}

export default App;
