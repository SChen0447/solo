import GameBoard from './components/GameBoard';
import ControlPanel from './components/ControlPanel';
import LevelSelector from './components/LevelSelector';
import GameResult from './components/GameResult';
import { GameProvider } from './context/GameContext';
import './App.css';

function App() {
  return (
    <GameProvider>
      <div className="app-container">
        <header className="app-header">
          <h1>🤖 像素迷宫编程闯关</h1>
          <p className="subtitle">用指令控制机器人收集代码碎片，解开谜题！</p>
        </header>

        <main className="game-layout">
          <aside className="left-panel">
            <LevelSelector />
            <ControlPanel />
          </aside>

          <section className="center-panel">
            <GameBoard />
          </section>
        </main>

        <GameResult />
      </div>
    </GameProvider>
  );
}

export default App;
