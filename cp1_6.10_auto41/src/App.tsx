import React, { useCallback } from 'react';
import { Canvas } from '@/components/Canvas';
import { Timeline } from '@/components/Timeline';
import { useAnimationEngine } from '@/hooks/useAnimationEngine';
import type { JointId } from '@/types';

const App: React.FC = () => {
  const engine = useAnimationEngine();
  const currentJoints = engine.getCurrentJoints();

  const handleJointUpdate = useCallback(
    (jointId: JointId, angle: number) => {
      engine.updateJointAtFrame(engine.state.currentFrame, jointId, angle);
    },
    [engine]
  );

  return (
    <div className="app-root">
      <header className="app-header">
        <h1 className="app-title">像素角色动画编辑器</h1>
        <div className="app-subtitle">Pixel Character Animation Editor</div>
      </header>

      <main className="app-main">
        <Canvas
          joints={currentJoints}
          currentFrame={engine.state.currentFrame}
          onJointUpdate={handleJointUpdate}
        />
      </main>

      <Timeline
        state={engine.state}
        getJointsAtFrame={engine.getJointsAtFrame}
        setCurrentFrame={engine.setCurrentFrame}
        toggleKeyframe={engine.toggleKeyframe}
        togglePlay={engine.togglePlay}
        stop={engine.stop}
        toggleLooping={engine.toggleLooping}
        reset={engine.reset}
        exportAnimation={engine.exportAnimation}
      />
    </div>
  );
};

export default App;
