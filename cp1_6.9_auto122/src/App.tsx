import React, { useState, useEffect, createContext, useContext, useCallback, lazy, Suspense } from 'react';
import { io, Socket } from 'socket.io-client';
import Navbar from './components/Navbar';
import Cart from './components/Cart';

const FlowerShop = lazy(() => import('./components/FlowerShop'));
const Checkout = lazy(() => import('./components/Checkout'));
const OrderDetail = lazy(() => import('./components/OrderDetail'));
const OrderHistory = lazy(() => import('./components/OrderHistory'));

export interface Bouquet {
  id: string;
  name: string;
  price: number;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}

export interface CustomBouquet {
  baseId: string;
  baseName: string;
  colorTone: string;
  colorShade: number;
  flowerType: string;
  message: string;
  unitPrice: number;
  quantity: number;
}

export interface DeliveryInfo {
  name: string;
  phone: string;
  address: string;
  deliveryTime: string;
  gridX?: number;
  gridY?: number;
}

export type OrderStatus = 'confirmed' | 'preparing' | 'delivering' | 'delivered';

export interface Order {
  id: number;
  items: CustomBouquet[];
  totalPrice: number;
  deliveryInfo: DeliveryInfo;
  status: OrderStatus;
  createdAt: string;
  deliveryPersonPosition?: { x: number; y: number };
}

interface AppContextType {
  cart: CustomBouquet[];
  addToCart: (item: CustomBouquet) => void;
  updateCartQuantity: (index: number, qty: number) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  socket: Socket | null;
  currentPage: string;
  setCurrentPage: (page: string) => void;
  currentOrderId: number | null;
  setCurrentOrderId: (id: number | null) => void;
  bouquets: Bouquet[];
}

const AppContext = createContext<AppContextType | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('AppContext not found');
  return ctx;
};

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [cart, setCart] = useState<CustomBouquet[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState('shop');
  const [currentOrderId, setCurrentOrderId] = useState<number | null>(null);
  const [bouquets, setBouquets] = useState<Bouquet[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const s = io('http://localhost:3001');
    setSocket(s);

    fetch('/api/bouquets')
      .then((r) => r.json())
      .then((data) => setBouquets(data));

    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => setOrders(data));

    return () => {
      s.disconnect();
    };
  }, []);

  const addToCart = useCallback((item: CustomBouquet) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (i) =>
          i.baseId === item.baseId &&
          i.colorTone === item.colorTone &&
          i.colorShade === item.colorShade &&
          i.flowerType === item.flowerType &&
          i.message === item.message
      );
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex].quantity += item.quantity;
        return copy;
      }
      return [...prev, item];
    });
    setCartOpen(true);
    setTimeout(() => setCartOpen(false), 2000);
  }, []);

  const updateCartQuantity = useCallback((index: number, qty: number) => {
    setCart((prev) => {
      const copy = [...prev];
      if (qty <= 0) {
        copy.splice(index, 1);
      } else {
        copy[index].quantity = qty;
      }
      return copy;
    });
  }, []);

  const removeFromCart = useCallback((index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  const updateOrderStatus = useCallback((orderId: number, status: OrderStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }, []);

  const ctxValue: AppContextType = {
    cart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    orders,
    addOrder,
    updateOrderStatus,
    socket,
    currentPage,
    setCurrentPage,
    currentOrderId,
    setCurrentOrderId,
    bouquets,
  };

  const renderPage = () => {
    const fallback = (
      <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>加载中...</div>
    );
    switch (currentPage) {
      case 'shop':
        return (
          <Suspense fallback={fallback}>
            <FlowerShop />
          </Suspense>
        );
      case 'checkout':
        return (
          <Suspense fallback={fallback}>
            <Checkout />
          </Suspense>
        );
      case 'orderDetail':
        return (
          <Suspense fallback={fallback}>
            <OrderDetail />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={fallback}>
            <OrderHistory />
          </Suspense>
        );
      default:
        return null;
    }
  };

  return (
    <AppContext.Provider value={ctxValue}>
      <div className="app">
        <Navbar />
        <main className="main-content">{renderPage()}</main>
        {currentPage !== 'checkout' && cart.length > 0 && (
          <Cart isOpen={cartOpen} setIsOpen={setCartOpen} />
        )}
      </div>
    </AppContext.Provider>
  );
};

export default App;
