import { useState } from 'react';
import type { Point, ElementType, SaveData } from './types';
import RuneCanvas from './components/RuneCanvas';
import PotionMixer from './components/PotionMixer';
import SummonCircle from './components/SummonCircle';
import StarBackground from './components/StarBackground';
import { detectElement } from './utils/elementDetector';

export default function App() {
  const [runePoints, setRunePoints] = useState<Point[][]>([]);
  const [potionColor, setPotionColor] = useState<string>('');
  const [materialNames, setMaterialNames] = useState<string[]>([]);
  const [resetKey, setResetKey] = useState(0);

  const handleConfirmRunes = (strokes: Point[][]) => {
    setRunePoints(strokes);
  };

  const handlePotionChange = (color: string, names: string[]) => {
    setPotionColor(color);
    setMaterialNames(names);
  };

  const handleReset = () => {
    setRunePoints([]);
    setPotionColor('');
    setMaterialNames([]);
    setResetKey(k => k + 1);
  };

  const handleSave = () => {
    const element: ElementType | null = potionColor ? detectElement(potionColor) : null;
    const data: SaveData = {
      runePoints,
      materials: materialNames,
      potionColor,
      element,
      timestamp: Date.now(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summon-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canSave = runePoints.length > 0 && potionColor !== '';

  return (
    <div className="app-container">
      <StarBackground />

      <header className="app-header">
        <h1 className="app-title">远古召唤阵</h1>
      </header>

      <main className="app-main">
        <section className="panel">
          <h2 className="panel-title">符文绘制</h2>
          <RuneCanvas
            key={`rune-${resetKey}`}
            onConfirm={handleConfirmRunes}
            confirmedStrokes={runePoints}
          />
        </section>

        <section className="panel">
          <h2 className="panel-title">魔药坩埚</h2>
          <PotionMixer
            key={`potion-${resetKey}`}
            onColorChange={handlePotionChange}
          />
        </section>

        <section className="panel">
          <h2 className="panel-title">召唤阵</h2>
          <SummonCircle
            key={`summon-${resetKey}`}
            runePoints={runePoints}
            potionColor={potionColor}
          />
        </section>
      </main>

      <footer className="app-footer">
        <button className="btn" onClick={handleReset}>重置</button>
        <button className="btn" onClick={handleSave} disabled={!canSave}>保存存档</button>
      </footer>
    </div>
  );
}
