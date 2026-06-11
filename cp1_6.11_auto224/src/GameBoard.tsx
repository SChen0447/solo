import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, GameGrid, Player, ComboResult } from './types';
import { CardDeck } from './CardDeck';
import { ScoringEngine } from './ScoringEngine';
import { Animator } from './Animator';
import { GameBoardGrid } from './components/GameBoardGrid';
import { PlayerPanel } from './components/PlayerPanel';
import { BurstEffect } from './components/BurstEffect';
import { VictoryScreen } from './components/VictoryScreen';

const GRID_SIZE = 7;
const MAX_HAND_SIZE = 7;
const INITIAL_HAND_SIZE = 5;
const MAX_ENERGY = 50;
const WINNING_ENERGY = 200;
const SUPPRESSION_TURNS = 3;

export const GameBoard: React.FC = () => {
  const [deck, setDeck] = useState<CardDeck | null>(null);
  const [players, setPlayers] = useState<[Player, Player]>([
    {
      id: 0,
      name: '占星师·阳',
      hand: [],
      energy: 0,
      boardEnergy: 0,
      isBurstReady: false,
    },
    {
      id: 1,
      name: '占星师·阴',
      hand: [],
      energy: 0,
      boardEnergy: 0,
      isBurstReady: false,
    },
  ]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [grid, setGrid] = useState<GameGrid>(() =>
    Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null))
  );
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [turn, setTurn] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [isBurstMode, setIsBurstMode] = useState(false);
  const [burstCardIndex, setBurstCardIndex] = useState<number | null>(null);
  const [pulsingCells, setPulsingCells] = useState<{ row: number; col: number }[]>([]);
  const [burstTargetCells, setBurstTargetCells] = useState<{ row: number; col: number }[]>([]);
  const [showBurstEffect, setShowBurstEffect] = useState(false);
  const [comboMessage, setComboMessage] = useState<string | null>(null);
  const [isWideScreen, setIsWideScreen] = useState(true);

  const animatorRef = useRef<Animator | null>(null);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsWideScreen(window.innerWidth > 1200);
    };
    checkScreenWidth();
    window.addEventListener('resize', checkScreenWidth);
    return () => window.removeEventListener('resize', checkScreenWidth);
  }, []);

  useEffect(() => {
    const newDeck = new CardDeck();
    newDeck.shuffle();

    const player1Hand = newDeck.drawMultiple(INITIAL_HAND_SIZE);
    const player2Hand = newDeck.drawMultiple(INITIAL_HAND_SIZE);

    setDeck(newDeck);
    setPlayers((prev) => [
      { ...prev[0], hand: player1Hand },
      { ...prev[1], hand: player2Hand },
    ]);

    const animator = new Animator();
    animator.setMaxEnergy(MAX_ENERGY);
    animator.start();
    animatorRef.current = animator;

    return () => {
      animator.stop();
    };
  }, []);

  const currentPlayer = players[currentPlayerIndex];
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;

  const handleCardSelect = useCallback(
    (index: number) => {
      if (gameOver) return;

      if (isBurstMode) {
        const card = currentPlayer.hand[index];
        if (card.arcanaType === 'major') {
          setBurstCardIndex(index);
          setSelectedCardIndex(index);
        }
      } else {
        setSelectedCardIndex(index === selectedCardIndex ? null : index);
      }
    },
    [currentPlayer, selectedCardIndex, isBurstMode, gameOver]
  );

  const get3x3Cells = (centerRow: number, centerCol: number) => {
    const cells: { row: number; col: number }[] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  };

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (gameOver || !deck) return;

      if (isBurstMode && burstCardIndex !== null) {
        const targetCells = get3x3Cells(row, col);
        setBurstTargetCells(targetCells);
        setShowBurstEffect(true);

        setTimeout(() => {
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((r) => [...r]);
            for (const cell of targetCells) {
              if (newGrid[cell.row][cell.col]) {
                newGrid[cell.row][cell.col] = {
                  ...newGrid[cell.row][cell.col]!,
                  suppressed: true,
                  suppressionTurns: SUPPRESSION_TURNS,
                };
              }
            }
            return newGrid;
          });

          setPlayers((prev) => {
            const newPlayers = [...prev] as [Player, Player];
            const currentP = { ...newPlayers[currentPlayerIndex] };
            currentP.energy = 0;
            currentP.isBurstReady = false;
            currentP.hand = currentP.hand.filter((_, i) => i !== burstCardIndex);
            newPlayers[currentPlayerIndex] = currentP;
            return newPlayers;
          });

          setTimeout(() => {
            setShowBurstEffect(false);
            setIsBurstMode(false);
            setBurstCardIndex(null);
            setBurstTargetCells([]);
            setSelectedCardIndex(null);
            endTurn();
          }, 800);
        }, 1200);

        return;
      }

      if (selectedCardIndex === null) return;
      if (grid[row][col] !== null) return;

      const card = currentPlayer.hand[selectedCardIndex];
      if (!card) return;

      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((r) => [...r]);
        newGrid[row][col] = { ...card };
        return newGrid;
      });

      setPlayers((prev) => {
        const newPlayers = [...prev] as [Player, Player];
        const currentP = { ...newPlayers[currentPlayerIndex] };

        currentP.hand = currentP.hand.filter((_, i) => i !== selectedCardIndex);

        const newEnergy = Math.min(currentP.energy + card.energyValue, MAX_ENERGY);
        currentP.energy = newEnergy;
        currentP.isBurstReady = newEnergy >= MAX_ENERGY;

        newPlayers[currentPlayerIndex] = currentP;

        return newPlayers;
      });

      setSelectedCardIndex(null);

      setTimeout(() => {
        checkCombosAndWin();
      }, 500);
    },
    [selectedCardIndex, grid, currentPlayer, deck, isBurstMode, burstCardIndex, gameOver, currentPlayerIndex]
  );

  const checkCombosAndWin = useCallback(() => {
    setGrid((currentGrid) => {
      const combos = ScoringEngine.evaluateCombo(currentGrid);

      if (combos.length > 0) {
        const allPositions: { row: number; col: number }[] = [];
        let totalBonus = 0;

        for (const combo of combos) {
          allPositions.push(...combo.positions);
          totalBonus += combo.score;
        }

        setPulsingCells(allPositions);
        setComboMessage(combos.map((c) => c.comboName).join(' + '));

        setTimeout(() => {
          setPulsingCells([]);
          setComboMessage(null);
        }, 1200);

        setPlayers((prev) => {
          const newPlayers = [...prev] as [Player, Player];
          const currentP = { ...newPlayers[currentPlayerIndex] };

          const bonusEnergy = ScoringEngine.getComboBonusEnergy() * combos.length;
          currentP.energy = Math.min(currentP.energy + bonusEnergy, MAX_ENERGY);
          currentP.isBurstReady = currentP.energy >= MAX_ENERGY;

          if (deck && currentP.hand.length < MAX_HAND_SIZE) {
            const drawCount = Math.min(
              ScoringEngine.getComboCardDraw() * combos.length,
              MAX_HAND_SIZE - currentP.hand.length
            );
            const drawnCards = deck.drawMultiple(drawCount);
            currentP.hand = [...currentP.hand, ...drawnCards];
          }

          newPlayers[currentPlayerIndex] = currentP;
          return newPlayers;
        });
      }

      const boardEnergy = ScoringEngine.calculateBoardEnergy(currentGrid);
      setPlayers((prev) => {
        const newPlayers = [...prev] as [Player, Player];
        const currentP = { ...newPlayers[currentPlayerIndex] };
        currentP.boardEnergy = boardEnergy;
        newPlayers[currentPlayerIndex] = currentP;

        if (ScoringEngine.checkWinCondition(boardEnergy)) {
          setGameOver(true);
          setWinner(currentPlayerIndex);
        }

        return newPlayers;
      });

      return currentGrid;
    });

    if (!isBurstMode) {
      setTimeout(() => {
        endTurn();
      }, 800);
    }
  }, [currentPlayerIndex, deck, isBurstMode]);

  const endTurn = useCallback(() => {
    if (gameOver) return;

    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) =>
        row.map((cell) => {
          if (cell && cell.suppressed && cell.suppressionTurns !== undefined) {
            const newTurns = cell.suppressionTurns - 1;
            if (newTurns <= 0) {
              return { ...cell, suppressed: false, suppressionTurns: undefined };
            }
            return { ...cell, suppressionTurns: newTurns };
          }
          return cell;
        })
      );
      return newGrid;
    });

    setPlayers((prev) => {
      const newPlayers = [...prev] as [Player, Player];
      const nextIndex = currentPlayerIndex === 0 ? 1 : 0;
      const nextPlayer = { ...newPlayers[nextIndex] };

      if (deck && nextPlayer.hand.length < MAX_HAND_SIZE) {
        const drawnCard = deck.draw();
        if (drawnCard) {
          nextPlayer.hand = [...nextPlayer.hand, drawnCard];
        }
      }

      newPlayers[nextIndex] = nextPlayer;
      return newPlayers;
    });

    setCurrentPlayerIndex((prev) => (prev === 0 ? 1 : 0));
    setTurn((prev) => prev + 1);
    setSelectedCardIndex(null);
  }, [currentPlayerIndex, deck, gameOver]);

  const triggerBurstMode = useCallback(() => {
    if (!currentPlayer.isBurstReady || gameOver) return;
    setIsBurstMode(true);
    setSelectedCardIndex(null);
  }, [currentPlayer.isBurstReady, gameOver]);

  const restartGame = useCallback(() => {
    const newDeck = new CardDeck();
    newDeck.shuffle();

    const player1Hand = newDeck.drawMultiple(INITIAL_HAND_SIZE);
    const player2Hand = newDeck.drawMultiple(INITIAL_HAND_SIZE);

    setDeck(newDeck);
    setPlayers([
      {
        id: 0,
        name: '占星师·阳',
        hand: player1Hand,
        energy: 0,
        boardEnergy: 0,
        isBurstReady: false,
      },
      {
        id: 1,
        name: '占星师·阴',
        hand: player2Hand,
        energy: 0,
        boardEnergy: 0,
        isBurstReady: false,
      },
    ]);
    setCurrentPlayerIndex(0);
    setGrid(
      Array(GRID_SIZE)
        .fill(null)
        .map(() => Array(GRID_SIZE).fill(null))
    );
    setSelectedCardIndex(null);
    setTurn(1);
    setGameOver(false);
    setWinner(null);
    setIsBurstMode(false);
    setBurstCardIndex(null);
    setPulsingCells([]);
    setBurstTargetCells([]);
    setShowBurstEffect(false);
    setComboMessage(null);
  }, []);

  const selectedCard =
    selectedCardIndex !== null ? currentPlayer.hand[selectedCardIndex] || null : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        <h1
          style={{
            fontSize: isWideScreen ? '28px' : '20px',
            color: '#d4af37',
            fontFamily: 'Georgia, serif',
            textShadow: '0 0 20px rgba(212, 175, 55, 0.5)',
            marginBottom: '8px',
            letterSpacing: '4px',
          }}
        >
          ✦ 星象卡牌对战 ✦
        </h1>
        <div
          style={{
            fontSize: isWideScreen ? '14px' : '12px',
            color: '#8880a0',
            fontFamily: 'Georgia, serif',
          }}
        >
          第 {turn} 回合 · {currentPlayer.name} 的回合
        </div>
      </div>

      <AnimatePresence>
        {comboMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '12px 24px',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 236, 139, 0.2) 100%)',
              border: '2px solid #ffd700',
              borderRadius: '8px',
              color: '#ffd700',
              fontSize: isWideScreen ? '18px' : '14px',
              fontFamily: 'Georgia, serif',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.8)',
              zIndex: 50,
              boxShadow: '0 0 30px rgba(255, 215, 0, 0.3)',
            }}
          >
            ✨ {comboMessage} ✨
          </motion.div>
        )}
      </AnimatePresence>

      {isBurstMode && (
        <div
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            background: 'rgba(255, 100, 100, 0.2)',
            border: '1px solid #ff6b6b',
            borderRadius: '6px',
            color: '#ff9999',
            fontSize: '14px',
            fontFamily: 'Georgia, serif',
            zIndex: 20,
          }}
        >
          🌟 占星爆发模式 - 选择爆发位置
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isWideScreen ? '30px' : '10px',
          width: '100%',
          maxWidth: '1200px',
        }}
      >
        <PlayerPanel
          player={players[0]}
          isCurrentPlayer={currentPlayerIndex === 0}
          isLeftSide={true}
          selectedCardIndex={currentPlayerIndex === 0 ? selectedCardIndex : null}
          onCardSelect={currentPlayerIndex === 0 ? handleCardSelect : () => {}}
          isBurstMode={isBurstMode}
          isSmall={!isWideScreen}
        />

        <div style={{ position: 'relative' }}>
          <GameBoardGrid
            grid={grid}
            pulsingCells={pulsingCells}
            onCellClick={handleCellClick}
            selectedCard={selectedCard}
            isBurstMode={isBurstMode}
            burstTargetCells={burstTargetCells}
            isGameOver={gameOver}
            winner={winner}
          />

          {currentPlayer.isBurstReady && !isBurstMode && currentPlayerIndex === 0 && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={triggerBurstMode}
              style={{
                position: 'absolute',
                bottom: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
                color: '#1a1530',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.5)',
              }}
            >
              ⚡ 发动占星爆发
            </motion.button>
          )}
        </div>

        <PlayerPanel
          player={players[1]}
          isCurrentPlayer={currentPlayerIndex === 1}
          isLeftSide={false}
          selectedCardIndex={currentPlayerIndex === 1 ? selectedCardIndex : null}
          onCardSelect={currentPlayerIndex === 1 ? handleCardSelect : () => {}}
          isBurstMode={isBurstMode}
          isSmall={!isWideScreen}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          color: '#666080',
          fontSize: '12px',
          fontFamily: 'Georgia, serif',
        }}
      >
        {deck && <div>牌堆剩余: {deck.getRemainingCount()} 张</div>}
      </div>

      <BurstEffect isActive={showBurstEffect} />

      <VictoryScreen
        isVisible={gameOver}
        winnerName={winner !== null ? players[winner].name : ''}
        finalGrid={grid}
        onRestart={restartGame}
      />
    </div>
  );
};

export default GameBoard;
