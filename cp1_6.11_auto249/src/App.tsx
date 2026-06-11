import React, { useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GameUI from './components/GameUI';
import {
  Ore,
  OreType,
  SmeltingOre,
  WeaponBlank,
  Particle,
  initializeCart,
  createSmeltingOre,
  updateSmeltingOre,
  isOreMelted,
  calculateImpurity,
  forgeWeapon,
  createFireParticle,
  updateParticle,
  isParticleDead,
} from './forgeEngine';
import {
  RuneStone,
  EnchantmentResult,
  createRuneStones,
  attemptEnchant,
  applyEnchantToWeapon,
  getRuneGlowColor,
  RuneType,
} from './enchantSystem';

export type GamePhase = 'mining' | 'forging' | 'enchanting' | 'testing';

export interface EnchantRecord {
  type: RuneType;
  success: boolean;
  glowColor: string;
}

export interface GameState {
  phase: GamePhase;
  cartOres: Ore[];
  smeltingOres: SmeltingOre[];
  meltedOres: Ore[];
  temperature: number;
  impurity: number;
  weapon: WeaponBlank | null;
  forgeFailed: boolean;
  runeStones: RuneStone[];
  enchantments: EnchantRecord[];
  enchantCount: number;
  showFlash: boolean;
  flyingOre: { ore: Ore; startX: number; startY: number; startTime: number } | null;
  particles: Particle[];
}

const INITIAL_STATE: GameState = {
  phase: 'mining',
  cartOres: initializeCart(),
  smeltingOres: [],
  meltedOres: [],
  temperature: 800,
  impurity: 0,
  weapon: null,
  forgeFailed: false,
  runeStones: [],
  enchantments: [],
  enchantCount: 0,
  showFlash: false,
  flyingOre: null,
  particles: [],
};

export default function App() {
  const [state, setState] = useState<GameState>({ ...INITIAL_STATE });
  const particleFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const lastFrameRef = useRef<number>(Date.now());

  const throwOreIntoForge = useCallback(
    (ore: Ore, startX: number, startY: number) => {
      setState((prev) => {
        const newCart = prev.cartOres.filter((o) => o.id !== ore.id);
        const smeltingOre = createSmeltingOre(ore);
        return {
          ...prev,
          cartOres: newCart,
          smeltingOres: [...prev.smeltingOres, smeltingOre],
          flyingOre: { ore, startX, startY, startTime: Date.now() },
        };
      });
    },
    []
  );

  const setTemperature = useCallback((temp: number) => {
    setState((prev) => ({ ...prev, temperature: temp }));
  }, []);

  const startForging = useCallback(() => {
    setState((prev) => {
      if (prev.smeltingOres.length === 0 && prev.meltedOres.length === 0) {
        return prev;
      }
      return { ...prev, phase: 'forging' };
    });
  }, []);

  const completeForging = useCallback(() => {
    setState((prev) => {
      const result = forgeWeapon(prev.meltedOres, prev.impurity, prev.temperature);
      if (!result.success) {
        return { ...prev, forgeFailed: true, showFlash: true };
      }
      return {
        ...prev,
        weapon: result.weapon,
        phase: 'enchanting',
        runeStones: createRuneStones(),
        forgeFailed: false,
      };
    });
    setTimeout(() => {
      setState((prev) => {
        if (prev.forgeFailed) {
          return { ...prev, showFlash: false };
        }
        return prev;
      });
    }, 1000);
  }, []);

  const performEnchant = useCallback(
    (rune: RuneStone) => {
      setState((prev) => {
        if (prev.enchantCount >= 3 || rune.broken || !prev.weapon) return prev;
        const result = attemptEnchant(rune, prev.impurity);
        const newRuneStones = prev.runeStones.map((r) =>
          r.id === rune.id ? { ...r, broken: !result.success } : r
        );
        const newImpurity = prev.impurity + result.impurityChange;
        if (result.success) {
          const newWeapon = applyEnchantToWeapon(prev.weapon, rune);
          const newEnchantments = [
            ...prev.enchantments,
            { type: rune.type, success: true, glowColor: getRuneGlowColor(rune.type) },
          ];
          return {
            ...prev,
            weapon: newWeapon,
            runeStones: newRuneStones,
            enchantments: newEnchantments,
            enchantCount: prev.enchantCount + 1,
            impurity: newImpurity,
          };
        }
        const newEnchantments = [
          ...prev.enchantments,
          { type: rune.type, success: false, glowColor: '' },
        ];
        return {
          ...prev,
          runeStones: newRuneStones,
          enchantments: newEnchantments,
          enchantCount: prev.enchantCount + 1,
          impurity: newImpurity,
        };
      });
    },
    []
  );

  const proceedToTest = useCallback(() => {
    setState((prev) => ({ ...prev, phase: 'testing' }));
  }, []);

  const resetGame = useCallback(() => {
    particlesRef.current = [];
    if (particleFrameRef.current) cancelAnimationFrame(particleFrameRef.current);
    setState({ ...INITIAL_STATE, cartOres: initializeCart() });
  }, []);

  const updateSmelting = useCallback(() => {
    setState((prev) => {
      const now = Date.now();
      let newSmelting = prev.smeltingOres.map((o) =>
        updateSmeltingOre(o, prev.temperature, now)
      );
      const newlyMelted = newSmelting.filter(isOreMelted);
      const stillSmelting = newSmelting.filter((o) => !isOreMelted(o));
      const newMeltedOres = [...prev.meltedOres, ...newlyMelted];
      const newImpurity = calculateImpurity(newMeltedOres.length, 0);
      return {
        ...prev,
        smeltingOres: stillSmelting,
        meltedOres: newMeltedOres,
        impurity: newImpurity,
        flyingOre: null,
      };
    });
  }, []);

  const updateParticles = useCallback(() => {
    const now = Date.now();
    const dt = (now - lastFrameRef.current) / 1000;
    lastFrameRef.current = now;

    particlesRef.current = particlesRef.current
      .map((p) => updateParticle(p, dt))
      .filter((p) => !isParticleDead(p));

    while (particlesRef.current.length < 1000) {
      particlesRef.current.push(createFireParticle(0, 0));
    }

    particleFrameRef.current = requestAnimationFrame(updateParticles);
  }, []);

  React.useEffect(() => {
    lastFrameRef.current = Date.now();
    particleFrameRef.current = requestAnimationFrame(updateParticles);
    return () => {
      if (particleFrameRef.current) cancelAnimationFrame(particleFrameRef.current);
    };
  }, [updateParticles]);

  React.useEffect(() => {
    if (state.phase !== 'forging' && state.phase !== 'mining') return;
    const interval = setInterval(updateSmelting, 100);
    return () => clearInterval(interval);
  }, [state.phase, updateSmelting]);

  const slideIn = {
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(180deg, #2b1a16 0%, #d84315 100%)',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: '"Segoe UI", sans-serif',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={state.phase}
          {...slideIn}
          style={{ width: '100%', height: '100%' }}
        >
          <GameUI
            state={state}
            onThrowOre={throwOreIntoForge}
            onSetTemperature={setTemperature}
            onStartForging={startForging}
            onCompleteForging={completeForging}
            onEnchant={performEnchant}
            onProceedToTest={proceedToTest}
            onReset={resetGame}
            particles={particlesRef.current}
          />
        </motion.div>
      </AnimatePresence>

      {state.showFlash && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,0,0,0.4)',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'flashRed 0.5s ease-out forwards',
          }}
        />
      )}

      <style>{`
        @keyframes flashRed {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
