import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { User, Trade, Order } from './types';
import UserPanel from './components/UserPanel';
import MarketOrders from './components/MarketOrders';
import './App.css';

const INITIAL_BALANCE = 100;

const SIMULATED_USERS: User[] = [
  { id: 'user-alice-001', name: 'Alice', balance: INITIAL_BALANCE },
  { id: 'user-bob-002', name: 'Bob', balance: INITIAL_BALANCE },
  { id: 'user-carol-003', name: 'Carol', balance: INITIAL_BALANCE },
  { id: 'user-dave-004', name: 'Dave', balance: INITIAL_BALANCE },
];

let orderCounter = 0;
let tradeCounter = 0;

const generateId = (prefix: string, counter: { value: number }) => {
  counter.value += 1;
  return `${prefix}-${Date.now()}-${counter.value}`;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'user-current-000',
    name: '我',
    balance: INITIAL_BALANCE,
  });
  const [simUsers, setSimUsers] = useState<User[]>(SIMULATED_USERS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [removingOrderIds, setRemovingOrderIds] = useState<Set<string>>(new Set());
  const [flashActive, setFlashActive] = useState(false);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerFlash = useCallback(() => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    setFlashActive(true);
    flashTimeoutRef.current = setTimeout(() => {
      setFlashActive(false);
    }, 300);
  }, []);

  const addTrade = useCallback((
    userId: string,
    type: 'buy' | 'sell',
    quantity: number,
    price: number,
    counterparty: string,
    setUser: React.Dispatch<React.SetStateAction<User>>,
    setTradesFn: React.Dispatch<React.SetStateAction<Trade[]>>
  ) => {
    const total = quantity * price;
    const trade: Trade = {
      id: generateId('trade', tradeCounter),
      time: new Date().toISOString(),
      type,
      quantity,
      price,
      counterparty,
      total,
    };
    setTradesFn((prev) => [trade, ...prev]);
    setUser((prev) => ({
      ...prev,
      balance: prev.balance + (type === 'sell' ? total : -total),
    }));
    return trade;
  }, []);

  const handleMatchOrder = useCallback((orderId: string) => {
    setOrders((prevOrders) => {
      const order = prevOrders.find((o) => o.id === orderId);
      if (!order) return prevOrders;

      const total = order.quantity * order.price;

      if (order.type === 'sell') {
        if (currentUser.balance < total) return prevOrders;

        addTrade(currentUser.id, 'buy', order.quantity, order.price, order.creatorName, setCurrentUser, setTrades);
        addTrade(order.creatorId, 'sell', order.quantity, order.price, currentUser.name,
          (fn) => setSimUsers((prev) => prev.map((u) => u.id === order.creatorId ? { ...u, balance: u.balance + total } : u)),
          setTrades
        );
      } else {
        const creator = simUsers.find((u) => u.id === order.creatorId);
        if (creator && creator.balance < total) return prevOrders;

        addTrade(currentUser.id, 'sell', order.quantity, order.price, order.creatorName, setCurrentUser, setTrades);
        setSimUsers((prev) => prev.map((u) =>
          u.id === order.creatorId ? { ...u, balance: u.balance - total } : u
        ));
        const tradeCreator: Trade = {
          id: generateId('trade', tradeCounter),
          time: new Date().toISOString(),
          type: 'buy',
          quantity: order.quantity,
          price: order.price,
          counterparty: currentUser.name,
          total,
        };
        setTrades((prev) => [tradeCreator, ...prev]);
      }

      setRemovingOrderIds((prev) => new Set(prev).add(orderId));
      setTimeout(() => {
        setOrders((p) => p.filter((o) => o.id !== orderId));
        setRemovingOrderIds((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }, 400);

      triggerFlash();
      return prevOrders;
    });
  }, [currentUser, simUsers, addTrade, triggerFlash]);

  const handleCreateOrder = useCallback((type: 'buy' | 'sell', quantity: number, price: number) => {
    const total = quantity * price;
    if (type === 'buy' && currentUser.balance < total) return;

    const newOrder: Order = {
      id: generateId('order', orderCounter),
      type,
      quantity,
      price,
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      createdAt: new Date().toISOString(),
    };
    setOrders((prev) => [newOrder, ...prev]);
  }, [currentUser]);

  useEffect(() => {
    const timer = setInterval(() => {
      const randomUser = simUsers[Math.floor(Math.random() * simUsers.length)];
      const type = Math.random() > 0.5 ? 'buy' as const : 'sell' as const;
      const quantity = Math.floor(Math.random() * 10) + 1;
      const price = parseFloat((Math.random() * 5 + 1).toFixed(1));

      setOrders((prev) => {
        if (prev.length >= 20) return prev;
        const newOrder: Order = {
          id: generateId('order', orderCounter),
          type,
          quantity,
          price,
          creatorId: randomUser.id,
          creatorName: randomUser.name,
          createdAt: new Date().toISOString(),
        };
        return [newOrder, ...prev];
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [simUsers]);

  useEffect(() => {
    const timer = setInterval(() => {
      setOrders((prev) => {
        const otherOrders = prev.filter((o) => o.creatorId !== currentUser.id);
        if (otherOrders.length === 0) return prev;
        const randomOrder = otherOrders[Math.floor(Math.random() * otherOrders.length)];
        handleMatchOrder(randomOrder.id);
        return prev;
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [handleMatchOrder, currentUser.id]);

  return (
    <div className="app-container">
      <div className={`flash-overlay ${flashActive ? 'active' : ''}`} />
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">积分交易市场</span>
          </div>
          <span className="header-badge">区块链模拟</span>
        </div>
        <div className="header-right">
          <span className="header-balance">余额: {currentUser.balance.toFixed(1)} PTS</span>
        </div>
      </header>
      <main className="app-main">
        <section className="left-panel">
          <UserPanel
            userId={currentUser.id}
            userName={currentUser.name}
            balance={currentUser.balance}
            trades={trades.filter(
              (t) => t.counterparty !== currentUser.name || trades.indexOf(t) === trades.indexOf(t)
            ).filter((_, i) => i < 50)}
          />
        </section>
        <section className="right-panel">
          <MarketOrders
            orders={orders}
            currentUserId={currentUser.id}
            onMatchOrder={handleMatchOrder}
            onCreateOrder={handleCreateOrder}
            removingOrderIds={removingOrderIds}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
