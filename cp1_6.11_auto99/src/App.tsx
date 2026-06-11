import WaveVisualizer from '@/components/WaveVisualizer';
import StarField from '@/components/StarField';
import ControlPanel from '@/components/ControlPanel';
import ColorMapper from '@/components/ColorMapper';
import { useAudioStore } from '@/store/audioStore';

export default function App() {
  const themeColors = useAudioStore((s) => s.themeColors);

  return (
    <div
      className="flex flex-col w-full h-full"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${themeColors.primary}08, transparent 60%), #0a0a1a`,
      }}
    >
      <ColorMapper />

      <div className="relative" style={{ height: '70%' }}>
        <StarField />
        <WaveVisualizer />
      </div>

      <div style={{ height: '30%', minHeight: 180 }}>
        <ControlPanel />
      </div>
    </div>
  );
}
