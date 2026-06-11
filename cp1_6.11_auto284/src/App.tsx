import { useEffect, useRef, useState } from 'react';
import { UrbanScene } from '@/scene/UrbanScene';
import { ControlPanel } from '@/components/ControlPanel';
import { Dashboard } from '@/components/Dashboard';
import { HeatmapOverlay } from '@/utils/HeatmapOverlay';
import type { Particle, Building, TreeData } from '@/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heatmapRef = useRef<HeatmapOverlay | null>(null);
  const [concentration, setConcentration] = useState(120);
  const [efficiency, setEfficiency] = useState(0);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 200;
      canvas.height = 200;
      heatmapRef.current = new HeatmapOverlay(canvas, 200);
    }
  }, []);

  const handleStatsUpdate = (stats: { concentration: number; efficiency: number }) => {
    setConcentration(stats.concentration);
    setEfficiency(stats.efficiency);
  };

  const handleParticlesUpdate = (
    particles: Particle[],
    buildings: Building[],
    trees: TreeData[]
  ) => {
    if (heatmapRef.current) {
      heatmapRef.current.render(particles, buildings, trees);
    }
  };

  return (
    <div className="app-container">
      <div className="scene-container">
        <UrbanScene
          onStatsUpdate={handleStatsUpdate}
          onParticlesUpdate={handleParticlesUpdate}
        />
      </div>

      <ControlPanel />

      <Dashboard concentration={concentration} efficiency={efficiency} />

      <div className="heatmap-wrap">
        <div className="heatmap-title">浓度热力图（俯视）</div>
        <canvas ref={canvasRef} className="heatmap-canvas" />
        <div className="heatmap-legend">
          <span className="legend-low">低</span>
          <div className="legend-bar" />
          <span className="legend-high">高</span>
        </div>
      </div>

      <div className="app-title">
        <h1>城市街区 PM2.5 扩散与绿化拦截模拟</h1>
        <p>Urban PM2.5 Diffusion & Greenery Capture Simulation</p>
      </div>
    </div>
  );
}
