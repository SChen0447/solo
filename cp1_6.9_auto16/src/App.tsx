import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Pet, Customer, Table, SkillType, DrinkId, Particle } from './types';
import {
  DRINKS,
  createInitialPets,
  createInitialTables,
  generateCustomer,
  getAvailableDrinks,
  recruitPet,
  calculateTrainingSuccess,
  calculateSatisfaction,
  calculateEarnings,
  checkUnlocks,
  getPetEmoji,
  generateId,
} from './utils/gameLogic';
import { PetCard } from './components/PetCard';
import { CustomerQueue } from './components/CustomerQueue';

let socket: Socket | null = null;

const App: React.FC = () => {
  const [coins, setCoins] = useState(500);
  const [satisfaction, setSatisfaction] = useState(0);
  const [totalSatisfaction, setTotalSatisfaction] = useState(0);
  const [day, setDay] = useState(1);
  const [pets, setPets] = useState<Pet[]>(createInitialPets());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tables, setTables] = useState<Table[]>(createInitialTables());
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [hasAutoSteamer, setHasAutoSteamer] = useState(false);
  const [unlockedSpecials, setUnlockedSpecials] = useState<string[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [message, setMessage] = useState<string>('');
  const [specialArtAnimation, setSpecialArtAnimation] = useState<string | null>(null);

  const gameLoopRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());
  const customerTimerRef = useRef<number>(0);
  const dayTimerRef = useRef<number>(0);
  const drinksRef = useRef({ ...DRINKS });

  useEffect(() => {
    socket = io('http://localhost:3001', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('tableStatusUpdate', (updatedTables: Table[]) => {
      setTables(updatedTables);
    });

    socket.on('newCustomerFromServer', (customer: Customer) => {
      setCustomers(prev => [...prev, customer]);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  }, []);

  const spawnParticles = useCallback((x: number, y: number) => {
    const newParticles: Particle[] = Array.from({ length: 12 }, () => ({
      id: generateId(),
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 500);
  }, []);

  const handleStartTraining = useCallback((petId: string, skill: SkillType) => {
    setPets(prev => prev.map(pet => {
      if (pet.id === petId && !pet.isTraining && pet.skills[skill] < 5) {
        return { ...pet, isTraining: true, trainingProgress: 0, trainingSkill: skill };
      }
      return pet;
    }));
  }, []);

  const handleRecruitPet = useCallback(() => {
    if (coins < 100) {
      showToast('金币不足！招募需要100金币');
      return;
    }
    const newPet = recruitPet();
    setPets(prev => [...prev, newPet]);
    setCoins(prev => prev - 100);
    showToast(`招募了新宠物: ${getPetEmoji(newPet.type)} ${newPet.name}!`);
  }, [coins, showToast]);

  const handleBuyAutoSteamer = useCallback(() => {
    if (coins < 2000 || hasAutoSteamer || totalSatisfaction < 1000) {
      showToast('条件不满足！');
      return;
    }
    setCoins(prev => prev - 2000);
    setHasAutoSteamer(true);
    showToast('🎉 购买了自动蒸汽机！蒸奶步骤自动完成');
  }, [coins, hasAutoSteamer, totalSatisfaction, showToast]);

  const assignCustomerToTable = useCallback((customerId: string) => {
    const emptyTable = tables.find(t => t.status === 'empty');
    if (!emptyTable) {
      showToast('没有空桌了！');
      return;
    }
    const availablePet = pets.find(p => !p.isTraining && p.currentTableId === null);

    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, tableId: emptyTable.id, timeLeft: 20, totalTime: 20 } : c
    ));

    setTables(prev => prev.map(t =>
      t.id === emptyTable.id
        ? { ...t, status: 'waiting', customerId, waitTime: 0, maxWaitTime: 20 }
        : t
    ));

    if (availablePet) {
      setPets(prev => prev.map(p =>
        p.id === availablePet.id ? { ...p, currentTableId: emptyTable.id } : p
      ));
    }

    setSelectedCustomerId(customerId);
  }, [tables, pets, showToast]);

  const handleCoffeeButton = useCallback((actionKey: string) => {
    if (!selectedCustomerId) {
      showToast('请先选择一位顾客！');
      return;
    }

    setCustomers(prev => prev.map(customer => {
      if (customer.id !== selectedCustomerId) return customer;

      const drink = drinksRef.current[customer.drinkId];
      const nextStep = drink.steps[customer.currentStep];

      if (!nextStep) return customer;

      let expectedKey = nextStep.key;
      if (hasAutoSteamer && expectedKey === 'S') {
        return { ...customer, currentStep: customer.currentStep + 1 };
      }

      if (actionKey !== expectedKey) {
        return customer;
      }

      const newStep = customer.currentStep + 1;

      if (newStep >= drink.steps.length) {
        const sat = calculateSatisfaction(customer.timeLeft, customer.totalTime, drink);
        const earnings = calculateEarnings(drink, sat);

        setCoins(c => c + earnings);
        setSatisfaction(s => s + sat);
        setTotalSatisfaction(s => s + sat);
        spawnParticles(600, 250);

        if (drink.id === 'latte' || drink.id === 'cappuccino' || drink.id === 'mocha') {
          if (totalSatisfaction >= 500) {
            setSpecialArtAnimation(Math.random() > 0.5 ? '🐾' : '🌸');
            setTimeout(() => setSpecialArtAnimation(null), 1500);
          }
        }

        setTables(ts => ts.map(t =>
          t.id === customer.tableId ? { ...t, status: 'completed' } : t
        ));

        setTimeout(() => {
          setCustomers(cs => cs.filter(c => c.id !== customer.id));
          setTables(ts => ts.map(t =>
            t.id === customer.tableId
              ? { ...t, status: 'empty', customerId: null, waitTime: 0 }
              : t
          ));
          setPets(ps => ps.map(p =>
            p.currentTableId === customer.tableId
              ? { ...p, currentTableId: null, x: 80, y: 420 }
              : p
          ));
        }, 1500);

        showToast(`+${sat}满意度, +${earnings}金币!`);
        setSelectedCustomerId(null);

        return { ...customer, currentStep: newStep, isHappy: true };
      }

      return { ...customer, currentStep: newStep };
    }));
  }, [selectedCustomerId, hasAutoSteamer, totalSatisfaction, spawnParticles, showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (['G', 'E', 'S', 'F', 'M'].includes(key)) {
        handleCoffeeButton(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCoffeeButton]);

  useEffect(() => {
    const unlocks = checkUnlocks(totalSatisfaction, hasAutoSteamer, coins);

    if (unlocks.mocha && !drinksRef.current.mocha.unlocked) {
      drinksRef.current.mocha.unlocked = true;
      showToast('🎉 解锁新饮品: 摩卡!');
    }
    if (unlocks.specialArt && !unlockedSpecials.includes('specialArt')) {
      setUnlockedSpecials(prev => [...prev, 'specialArt']);
      showToast('🎉 解锁限定款拉花: 猫爪&兔子拉花!');
    }
  }, [totalSatisfaction, hasAutoSteamer, coins, unlockedSpecials, showToast]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      dayTimerRef.current += delta;
      if (dayTimerRef.current >= 60) {
        dayTimerRef.current = 0;
        setDay(d => d + 1);
      }

      customerTimerRef.current += delta;
      const nextCustomerInterval = 15 + Math.random() * 15;
      if (customerTimerRef.current >= nextCustomerInterval) {
        customerTimerRef.current = 0;
        const availableDrinks = getAvailableDrinks(drinksRef.current);
        const newCustomer = generateCustomer(availableDrinks);
        setCustomers(prev => {
          if (prev.filter(c => c.tableId === null).length >= 6) return prev;
          return [...prev, newCustomer];
        });
      }

      setPets(prev => prev.map(pet => {
        if (pet.isTraining && pet.trainingSkill) {
          const newProgress = Math.min(100, pet.trainingProgress + delta * 20);
          if (newProgress >= 100) {
            const skill = pet.trainingSkill;
            const success = calculateTrainingSuccess(pet, skill);
            if (success && pet.skills[skill] < 5) {
              return {
                ...pet,
                isTraining: false,
                trainingProgress: 0,
                trainingSkill: null,
                isExcited: true,
                skills: { ...pet.skills, [skill]: pet.skills[skill] + 1 },
              };
            }
            return {
              ...pet,
              isTraining: false,
              trainingProgress: 0,
              trainingSkill: null,
              isExcited: !success ? false : true,
            };
          }
          return { ...pet, trainingProgress: newProgress };
        }
        if (pet.isExcited) {
          return { ...pet, isExcited: false };
        }
        if (pet.currentTableId) {
          const table = tables.find(t => t.id === pet.currentTableId);
          if (table) {
            const dx = table.x - pet.x;
            const dy = table.y - pet.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 5) {
              const speed = 100 * delta;
              return {
                ...pet,
                x: pet.x + (dx / dist) * Math.min(speed, dist),
                y: pet.y + (dy / dist) * Math.min(speed, dist),
              };
            }
          }
        }
        return pet;
      }));

      setCustomers(prev => {
        let changed = false;
        const updated = prev.map(customer => {
          if (customer.tableId) {
            const newTime = customer.timeLeft - delta;
            if (newTime <= 0) {
              changed = true;
              setSatisfaction(s => s - 5);
              setTotalSatisfaction(s => s - 5);
              setTables(ts => ts.map(t =>
                t.id === customer.tableId
                  ? { ...t, status: 'empty', customerId: null, waitTime: 0 }
                  : t
              ));
              setPets(ps => ps.map(p =>
                p.currentTableId === customer.tableId
                  ? { ...p, currentTableId: null, x: 80, y: 420 }
                  : p
              ));
              return null;
            }
            if (newTime !== customer.timeLeft) changed = true;
            return { ...customer, timeLeft: newTime, isAngry: newTime < 5 };
          }
          return customer;
        }).filter((c): c is Customer => c !== null);

        return changed ? updated : prev;
      });

      setTables(prev => prev.map(table => {
        if (table.status === 'waiting' || table.status === 'serving') {
          return { ...table, waitTime: table.waitTime + delta };
        }
        return table;
      }));

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    gameLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [tables]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const currentDrink = selectedCustomer ? drinksRef.current[selectedCustomer.drinkId] : null;
  const nextStep = selectedCustomer && currentDrink ? currentDrink.steps[selectedCustomer.currentStep] : null;

  const renderCoffeeButton = (
    keyLabel: string,
    label: string,
    color: string,
    position: { top: string; left: string }
  ) => {
    const isHighlighted = nextStep?.key === keyLabel;
    return (
      <button
        onClick={() => handleCoffeeButton(keyLabel)}
        style={{
          position: 'absolute',
          ...position,
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          border: 'none',
          background: color,
          color: '#fff',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isHighlighted
            ? `0 0 20px ${color}, 0 0 40px ${color}`
            : '0 4px 8px rgba(0,0,0,0.4)',
          animation: isHighlighted ? 'blink 0.6s infinite' : undefined,
          transition: 'all 0.1s ease',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <span style={{ fontSize: '16px', marginBottom: '2px' }}>{keyLabel}</span>
        <span style={{ fontSize: '9px' }}>{label}</span>
      </button>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      minWidth: '1000px',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        @keyframes float-light {
          0% { top: -50px; left: -50px; opacity: 0.1; }
          50% { opacity: 0.15; }
          100% { top: calc(100% - 50px); left: calc(100% - 50px); opacity: 0.1; }
        }
        @keyframes particle-burst {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(1.5) translateY(-30px); opacity: 0; }
        }
        @keyframes special-art {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
          100% { transform: scale(2) rotate(360deg); opacity: 0; }
        }
        .wood-bg {
          background-color: #8B6F47;
          background-image:
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 30px,
              rgba(0,0,0,0.05) 30px,
              rgba(0,0,0,0.05) 32px
            ),
            repeating-linear-gradient(
              0deg,
              rgba(139,69,19,0.1),
              rgba(139,69,19,0.1) 2px,
              transparent 2px,
              transparent 60px
            );
        }
      `}</style>

      <div style={{
        position: 'absolute',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,248,220,0.8) 0%, transparent 70%)',
        animation: 'float-light 4s ease-in-out infinite',
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      <div style={{
        background: 'linear-gradient(90deg, #8B4513 0%, #D2691E 50%, #8B4513 100%)',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#FFF8DC',
                fontSize: '24px',
                cursor: 'pointer',
              }}
            >
              ☰
            </button>
          )}
          <h1 style={{ margin: 0, color: '#FFF8DC', fontSize: '22px' }}>
            🐾 宠物咖啡师培训模拟器
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '20px', color: '#FFF8DC', fontSize: '14px', fontWeight: 'bold' }}>
          <span>📅 第 {day} 天</span>
          <span>💰 {coins} 金币</span>
          <span>😊 {satisfaction} 满意度</span>
          <span>📊 累计: {totalSatisfaction}</span>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {showSidebar && (
          <div className="wood-bg" style={{
            width: '250px',
            padding: '15px',
            boxShadow: '2px 0 10px rgba(0,0,0,0.15)',
            overflowY: 'auto',
            zIndex: 5,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <h3 style={{ margin: 0, color: '#FFF8DC', fontSize: '16px' }}>
                🐾 员工 ({pets.length})
              </h3>
              <button
                onClick={() => setShowSidebar(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#FFF8DC',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  padding: '2px 8px',
                }}
              >
                ✕
              </button>
            </div>

            <button
              onClick={handleRecruitPet}
              style={{
                width: '100%',
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: coins >= 100 ? '#2E8B57' : '#888',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: coins >= 100 ? 'pointer' : 'not-allowed',
                marginBottom: '12px',
              }}
            >
              招募新宠物 (100💰)
            </button>

            {totalSatisfaction >= 1000 && !hasAutoSteamer && (
              <button
                onClick={handleBuyAutoSteamer}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: 'none',
                  borderRadius: '8px',
                  background: coins >= 2000 ? '#4682B4' : '#888',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: coins >= 2000 ? 'pointer' : 'not-allowed',
                  marginBottom: '12px',
                }}
              >
                购买自动蒸汽机 (2000💰)
              </button>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pets.map(pet => (
                <PetCard
                  key={pet.id}
                  pet={pet}
                  selected={selectedPetId === pet.id}
                  onSelect={() => setSelectedPetId(selectedPetId === pet.id ? null : pet.id)}
                  onStartTraining={handleStartTraining}
                />
              ))}
            </div>
          </div>
        )}

        <div style={{
          flex: 1,
          padding: '20px',
          position: 'relative',
          background: 'linear-gradient(180deg, #F5DEB3 0%, #DEB887 100%)',
          minWidth: 0,
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '30px',
          }}>
            <div style={{
              width: '400px',
              height: '300px',
              background: '#333',
              borderRadius: '16px',
              padding: '20px',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 2px 4px rgba(255,255,255,0.1)',
            }}>
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#00FF00',
                fontFamily: 'monospace',
                fontSize: '12px',
                textAlign: 'center',
                width: '300px',
              }}>
                {selectedCustomer ? (
                  <>
                    <div style={{ marginBottom: '4px' }}>
                      制作: {currentDrink?.name} 给 {selectedCustomer.name}
                    </div>
                    <div>
                      步骤 ({selectedCustomer.currentStep}/{currentDrink?.steps.length}):{' '}
                      {nextStep ? `按 [${nextStep.key}] - ${nextStep.label}` : '完成!'}
                    </div>
                    {hasAutoSteamer && (
                      <div style={{ color: '#FFD700', marginTop: '2px' }}>
                        🤖 自动蒸汽机已启用 (蒸奶[S]自动完成)
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ opacity: 0.6 }}>
                    请从右侧选择顾客开始制作咖啡...
                  </div>
                )}
              </div>

              {renderCoffeeButton('G', '研磨', '#2E8B57', { top: '80px', left: '40px' })}
              {renderCoffeeButton('E', '萃取', '#8B4513', { top: '80px', right: '40px', left: 'auto' } as any)}
              {renderCoffeeButton('S', '蒸汽', '#4682B4', { top: '170px', left: '40px' })}
              {renderCoffeeButton('F', '拉花', '#DAA520', { top: '170px', right: '40px', left: 'auto' } as any)}

              <button
                onClick={() => handleCoffeeButton('M')}
                style={{
                  position: 'absolute',
                  top: '125px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  border: 'none',
                  background: nextStep?.key === 'M' ? '#9370DB' : '#666',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: nextStep?.key === 'M'
                    ? '0 0 20px #9370DB, 0 0 40px #9370DB'
                    : '0 4px 8px rgba(0,0,0,0.4)',
                  animation: nextStep?.key === 'M' ? 'blink 0.6s infinite' : undefined,
                  transition: 'all 0.1s ease',
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'translateX(-50%) translateY(4px)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'translateX(-50%) translateY(0)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(-50%) translateY(0)'; }}
              >
                <span style={{ fontSize: '16px', marginBottom: '2px' }}>M</span>
                <span style={{ fontSize: '9px' }}>混合</span>
              </button>

              <div style={{
                position: 'absolute',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#888',
                fontSize: '10px',
              }}>
                键盘快捷键: G 研磨 | E 萃取 | S 蒸汽 | F 拉花 | M 混合
              </div>
            </div>
          </div>

          <div style={{
            position: 'relative',
            height: '350px',
            marginTop: '20px',
          }}>
            {tables.map(table => {
              const tableCustomer = customers.find(c => c.id === table.customerId);
              return (
                <div
                  key={table.id}
                  style={{
                    position: 'absolute',
                    left: table.x,
                    top: table.y,
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                  }}
                >
                  <div
                    onClick={() => {
                      if (table.customerId) {
                        setSelectedCustomerId(table.customerId);
                      }
                    }}
                    style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: table.status === 'empty'
                        ? 'linear-gradient(135deg, #D2B48C, #A0522D)'
                        : table.status === 'completed'
                          ? 'linear-gradient(135deg, #90EE90, #2E8B57)'
                          : 'linear-gradient(135deg, #FFD700, #DAA520)',
                      boxShadow: table.status !== 'empty'
                        ? `0 0 20px rgba(255, 215, 0, 0.5), 0 6px 12px rgba(0,0,0,0.3)`
                        : '0 6px 12px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: table.customerId ? 'pointer' : 'default',
                      transition: 'all 0.3s ease',
                      border: table.customerId === selectedCustomerId ? '3px solid #FF6347' : 'none',
                    }}
                  >
                    {tableCustomer && (
                      <span style={{ fontSize: '32px' }}>{tableCustomer.avatar}</span>
                    )}
                    {!tableCustomer && table.status === 'empty' && (
                      <span style={{ fontSize: '20px', opacity: 0.4 }}>🪑</span>
                    )}
                    {table.status === 'completed' && (
                      <span style={{ fontSize: '20px' }}>✅</span>
                    )}
                  </div>

                  {tableCustomer && (
                    <div style={{
                      marginTop: '6px',
                      fontWeight: 'bold',
                      color: tableCustomer.timeLeft < 5 ? '#FF0000' : '#4A2C0A',
                      fontSize: '14px',
                      animation: tableCustomer.timeLeft < 5 ? 'blink 0.5s infinite' : undefined,
                    }}>
                      {Math.ceil(tableCustomer.timeLeft)}s
                    </div>
                  )}

                  {tableCustomer && (
                    <div style={{
                      marginTop: '4px',
                      fontSize: '10px',
                      background: '#FFF8DC',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      display: 'inline-block',
                      color: '#4A2C0A',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}>
                      ☕ {DRINKS[tableCustomer.drinkId].name}
                    </div>
                  )}
                </div>
              );
            })}

            {pets.map(pet => (
              <div
                key={pet.id}
                style={{
                  position: 'absolute',
                  left: pet.x,
                  top: pet.y,
                  transform: 'translate(-50%, -50%)',
                  fontSize: '36px',
                  transition: 'left 0.1s linear, top 0.1s linear',
                  animation: pet.isExcited ? 'bounce 0.3s ease' : undefined,
                  zIndex: 3,
                  filter: pet.isTraining ? 'grayscale(50%)' : 'none',
                }}
              >
                {getPetEmoji(pet.type)}
                {pet.isTraining && (
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '12px',
                    color: '#D2691E',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                  }}>
                    📚 训练中
                  </div>
                )}
              </div>
            ))}

            {particles.map(p => (
              <div
                key={p.id}
                style={{
                  position: 'absolute',
                  left: p.x,
                  top: p.y,
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #FFD700, #FFA500)',
                  animation: 'particle-burst 0.5s ease-out forwards',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              />
            ))}

            {specialArtAnimation && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '80px',
                animation: 'special-art 1.5s ease-out forwards',
                zIndex: 20,
                pointerEvents: 'none',
              }}>
                {specialArtAnimation}
              </div>
            )}
          </div>

          <div style={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: '#8B4513',
            opacity: 0.7,
          }}>
            解锁进度: {totalSatisfaction}/200 摩卡 | {totalSatisfaction}/500 限定拉花 | {totalSatisfaction}/1000 自动蒸汽机
          </div>
        </div>

        <div style={{ padding: '15px', zIndex: 5 }}>
          <CustomerQueue
            customers={customers}
            onSelectCustomer={assignCustomerToTable}
            selectedCustomerId={selectedCustomerId}
          />
        </div>
      </div>

      {message && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(74, 44, 10, 0.95)',
          color: '#FFF8DC',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 'bold',
          zIndex: 100,
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          animation: 'particle-burst 0.3s ease-out',
        }}>
          {message}
        </div>
      )}
    </div>
  );
};

export default App;
