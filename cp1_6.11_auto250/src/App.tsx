import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import PlantView from './components/PlantView';
import DrugControls from './components/DrugControls';
import CurveChart from './components/CurveChart';
import Toast from './components/Toast';
import {
  initInfection,
  createEmptyMatrix,
  simulateStep,
  injectDrug,
  calculateInfectionRate,
  predictNoDrugCurve,
  GRID_SIZE,
  SIMULATION_INTERVAL,
  MAX_SIMULATION_TIME,
} from './utils/infectionEngine';

interface CurveDataPoint {
  time: number;
  infectionRate: number;
}

interface SnapshotInfo {
  id: string;
  name: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [infectionMatrix, setInfectionMatrix] = useState<number[][]>(() =>
    initInfection(GRID_SIZE, 6)
  );
  const [drugMatrix, setDrugMatrix] = useState<number[][]>(() =>
    createEmptyMatrix(GRID_SIZE)
  );
  const [simulationTime, setSimulationTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [selectedConcentration, setSelectedConcentration] = useState(0.3);
  const [injectMode, setInjectMode] = useState(false);
  const [noDrugCurve, setNoDrugCurve] = useState<CurveDataPoint[]>([]);
  const [withDrugCurve, setWithDrugCurve] = useState<CurveDataPoint[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [plantSize, setPlantSize] = useState(600);
  const [panelHeight, setPanelHeight] = useState(200);

  const simulationRef = useRef<{
    infectionMatrix: number[][];
    drugMatrix: number[][];
    simulationTime: number;
    curveData: CurveDataPoint[];
  }>({
    infectionMatrix: initInfection(GRID_SIZE, 6),
    drugMatrix: createEmptyMatrix(GRID_SIZE),
    simulationTime: 0,
    curveData: [{ time: 0, infectionRate: calculateInfectionRate(initInfection(GRID_SIZE, 6)) }],
  });

  const animationRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const predicted = predictNoDrugCurve(MAX_SIMULATION_TIME, SIMULATION_INTERVAL);
    setNoDrugCurve(predicted);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setPlantSize(400);
        setPanelHeight(150);
      } else {
        setPlantSize(600);
        setPanelHeight(200);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchSnapshots = async () => {
      try {
        const response = await fetch('/api/simulationState');
        const data = await response.json();
        if (data.snapshots) {
          setSnapshots(data.snapshots);
        }
      } catch (e) {
        console.log('Failed to fetch snapshots');
      }
    };
    fetchSnapshots();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  const simulationLoop = useCallback((timestamp: number) => {
    if (!isRunning) {
      animationRef.current = requestAnimationFrame(simulationLoop);
      return;
    }

    if (timestamp - lastUpdateRef.current >= SIMULATION_INTERVAL) {
      lastUpdateRef.current = timestamp;

      const sim = simulationRef.current;

      if (sim.simulationTime < MAX_SIMULATION_TIME) {
        const result = simulateStep(sim.infectionMatrix, sim.drugMatrix);
        sim.infectionMatrix = result.infectionMatrix;
        sim.drugMatrix = result.drugMatrix;
        sim.simulationTime = Math.round((sim.simulationTime + SIMULATION_INTERVAL / 1000) * 100) / 100;

        const rate = calculateInfectionRate(result.infectionMatrix);
        const lastPoint = sim.curveData[sim.curveData.length - 1];
        if (!lastPoint || sim.simulationTime - lastPoint.time >= 0.5) {
          sim.curveData.push({ time: sim.simulationTime, infectionRate: rate });
        }

        setInfectionMatrix([...result.infectionMatrix]);
        setDrugMatrix([...result.drugMatrix]);
        setSimulationTime(sim.simulationTime);
        setWithDrugCurve([...sim.curveData]);
      }
    }

    animationRef.current = requestAnimationFrame(simulationLoop);
  }, [isRunning]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(simulationLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [simulationLoop]);

  const handleInject = async (x: number, y: number) => {
    try {
      const response = await fetch('/api/injectDrug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x,
          y,
          concentration: selectedConcentration,
          radius: 6,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const sim = simulationRef.current;

        const newDrugMatrix = data.drugMatrix || injectDrug(
          sim.drugMatrix,
          x,
          y,
          selectedConcentration,
          6
        );

        sim.drugMatrix = newDrugMatrix;
        setDrugMatrix([...newDrugMatrix]);
        setInjectMode(false);
        showToast('药物注射成功', 'success');
      }
    } catch (e) {
      const sim = simulationRef.current;
      const newDrugMatrix = injectDrug(sim.drugMatrix, x, y, selectedConcentration, 6);
      sim.drugMatrix = newDrugMatrix;
      setDrugMatrix([...newDrugMatrix]);
      setInjectMode(false);
      showToast('药物注射成功', 'success');
    }
  };

  const handleSaveSnapshot = async () => {
    const sim = simulationRef.current;
    const snapshot = {
      infectionMatrix: sim.infectionMatrix,
      drugMatrix: sim.drugMatrix,
      curveData: sim.curveData,
      simulationTime: sim.simulationTime,
      name: `快照 ${new Date().toLocaleTimeString('zh-CN')}`,
    };

    try {
      const response = await fetch('/api/simulationState', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      });

      if (response.ok) {
        const data = await response.json();
        setSnapshots((prev) => [
          { id: data.id, name: snapshot.name, timestamp: Date.now() },
          ...prev,
        ]);
        showToast('快照保存成功', 'success');
      }
    } catch (e) {
      const id = `local-${Date.now()}`;
      localStorage.setItem(`snapshot-${id}`, JSON.stringify(snapshot));
      setSnapshots((prev) => [
        { id, name: snapshot.name, timestamp: Date.now() },
        ...prev,
      ]);
      showToast('快照已保存到本地', 'info');
    }
  };

  const handleLoadSnapshot = async (id: string) => {
    try {
      const response = await fetch(`/api/simulationState/${id}`);
      if (response.ok) {
        const data = await response.json();
        loadSnapshotData(data);
        showToast('快照加载成功', 'success');
      }
    } catch (e) {
      const stored = localStorage.getItem(`snapshot-${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        loadSnapshotData(data);
        showToast('快照已从本地加载', 'info');
      } else {
        showToast('加载快照失败', 'error');
      }
    }
  };

  const loadSnapshotData = (data: any) => {
    const sim = simulationRef.current;
    sim.infectionMatrix = data.infectionMatrix;
    sim.drugMatrix = data.drugMatrix;
    sim.curveData = data.curveData || [{ time: data.simulationTime, infectionRate: calculateInfectionRate(data.infectionMatrix) }];
    sim.simulationTime = data.simulationTime;

    setInfectionMatrix([...data.infectionMatrix]);
    setDrugMatrix([...data.drugMatrix]);
    setSimulationTime(data.simulationTime);
    setWithDrugCurve([...sim.curveData]);
  };

  const infectionRate = calculateInfectionRate(infectionMatrix);

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ textAlign: 'center' }}
      >
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: '#3e2723',
          marginBottom: '8px',
          letterSpacing: '-0.5px',
        }}>
          植物维管束病原体传播模拟器
        </h1>
        <p style={{ fontSize: '14px', color: '#795548' }}>
          点击注射器选择药物浓度，在植物截面上点击注射抗菌剂，观察病原体扩散变化
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        style={{ position: 'relative' }}
      >
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '8px 14px',
          borderRadius: '8px',
          fontFamily: 'Roboto Mono, monospace',
          fontSize: '14px',
          backdropFilter: 'blur(4px)',
        }}>
          T: {simulationTime.toFixed(1)}s
        </div>

        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#ffb74d',
          padding: '8px 14px',
          borderRadius: '8px',
          fontFamily: 'Roboto Mono, monospace',
          fontSize: '14px',
          backdropFilter: 'blur(4px)',
        }}>
          感染率: {(infectionRate * 100).toFixed(1)}%
        </div>

        <PlantView
          infectionMatrix={infectionMatrix}
          drugMatrix={drugMatrix}
          size={plantSize}
          onInject={handleInject}
          injectMode={injectMode}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        style={{ width: '100%', maxWidth: plantSize + 100, minWidth: '320px' }}
      >
        <DrugControls
          selectedConcentration={selectedConcentration}
          onConcentrationChange={setSelectedConcentration}
          injectMode={injectMode}
          onInjectModeChange={setInjectMode}
          onSaveSnapshot={handleSaveSnapshot}
          onLoadSnapshot={handleLoadSnapshot}
          snapshots={snapshots}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{ width: '100%', maxWidth: plantSize + 100, minWidth: '320px' }}
      >
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#5d4037',
          marginBottom: '8px',
          paddingLeft: '4px',
        }}>
          感染扩散曲线
        </div>
        <CurveChart
          noDrugData={noDrugCurve}
          withDrugData={withDrugCurve}
          maxTime={MAX_SIMULATION_TIME}
          height={panelHeight}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        style={{
          display: 'flex',
          gap: '16px',
          marginTop: '8px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <motion.button
          onClick={() => setIsRunning(!isRunning)}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: '8px',
            background: isRunning
              ? 'linear-gradient(135deg, #ff7043, #e64a19)'
              : 'linear-gradient(135deg, #388e3c, #2e7d32)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '100px',
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          {isRunning ? '暂停' : '继续'}
        </motion.button>

        <motion.button
          onClick={() => {
            const sim = simulationRef.current;
            sim.infectionMatrix = initInfection(GRID_SIZE, 6);
            sim.drugMatrix = createEmptyMatrix(GRID_SIZE);
            sim.simulationTime = 0;
            sim.curveData = [{ time: 0, infectionRate: calculateInfectionRate(sim.infectionMatrix) }];
            setInfectionMatrix([...sim.infectionMatrix]);
            setDrugMatrix([...sim.drugMatrix]);
            setSimulationTime(0);
            setWithDrugCurve([...sim.curveData]);
            setIsRunning(true);
            showToast('模拟已重置', 'info');
          }}
          style={{
            padding: '10px 24px',
            border: '1px solid #bdbdbd',
            borderRadius: '8px',
            background: 'white',
            color: '#616161',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '100px',
          }}
          whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          重置
        </motion.button>
      </motion.div>

      <style>{`
        @media (max-width: 768px) {
          button {
            font-size: 12px !important;
            padding: 8px 16px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
