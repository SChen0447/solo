import { useReducer, useEffect, Dispatch } from 'react';
import type { AppState, AppAction, Flower, Order, Scheme, Page, CartItem } from './types';
import FlowerGrid from './components/FlowerGrid';
import OrderPanel from './components/OrderPanel';
import InspirationBoard from './components/InspirationBoard';
import Dashboard from './components/Dashboard';

const initialState: AppState = {
  flowers: [],
  cart: [],
  orders: [],
  schemes: [],
  currentPage: 'dashboard',
  cartOpen: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_FLOWERS':
      return { ...state, flowers: action.payload };
    case 'SET_ORDERS':
      return { ...state, orders: action.payload };
    case 'SET_SCHEMES':
      return { ...state, schemes: action.payload };
    case 'ADD_TO_CART': {
      const existing = state.cart.find((c) => c.flowerId === action.payload.id);
      if (existing) {
        return {
          ...state,
          cart: state.cart.map((c) =>
            c.flowerId === action.payload.id ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }
      return {
        ...state,
        cart: [
          ...state.cart,
          {
            flowerId: action.payload.id,
            name: action.payload.name,
            quantity: 1,
            price: action.payload.price,
          },
        ],
      };
    }
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: state.cart.filter((c) => c.flowerId !== action.payload),
      };
    case 'UPDATE_CART_QTY':
      return {
        ...state,
        cart: state.cart
          .map((c) =>
            c.flowerId === action.payload.flowerId
              ? { ...c, quantity: Math.max(0, action.payload.quantity) }
              : c
          )
          .filter((c) => c.quantity > 0),
      };
    case 'CLEAR_CART':
      return { ...state, cart: [], cartOpen: false };
    case 'ADD_ORDER':
      return { ...state, orders: [action.payload, ...state.orders] };
    case 'ADD_SCHEME':
      return { ...state, schemes: [action.payload, ...state.schemes] };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'TOGGLE_CART':
      return { ...state, cartOpen: !state.cartOpen };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [flowersRes, ordersRes, schemesRes] = await Promise.all([
          fetch('/api/flowers'),
          fetch('/api/orders'),
          fetch('/api/schemes'),
        ]);
        const flowers: Flower[] = await flowersRes.json();
        const orders: Order[] = await ordersRes.json();
        const schemes: Scheme[] = await schemesRes.json();
        dispatch({ type: 'SET_FLOWERS', payload: flowers });
        dispatch({ type: 'SET_ORDERS', payload: orders });
        dispatch({ type: 'SET_SCHEMES', payload: schemes });
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };
    loadData();
  }, []);

  const cartItemCount = state.cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleCheckout = async () => {
    if (state.cart.length === 0) return;
    const total = state.cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
    const items: CartItem[] = state.cart.map((c) => ({ ...c }));
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, total }),
      });
      const newOrder: Order = await res.json();
      dispatch({ type: 'ADD_ORDER', payload: newOrder });
      dispatch({ type: 'CLEAR_CART' });
      dispatch({ type: 'SET_PAGE', payload: 'orders' });
    } catch (err) {
      console.error('Failed to submit order:', err);
    }
  };

  const pages: { key: Page; label: string; icon: string }[] = [
    { key: 'dashboard', label: '仪表盘', icon: '📊' },
    { key: 'flowers', label: '花材', icon: '🌸' },
    { key: 'orders', label: '订单', icon: '📦' },
    { key: 'inspiration', label: '灵感', icon: '🎨' },
  ];

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-brand">🌸 花语轩</div>
        <ul className="navbar-nav">
          {pages.map((p) => (
            <li key={p.key}>
              <button
                className={state.currentPage === p.key ? 'active' : ''}
                onClick={() => dispatch({ type: 'SET_PAGE', payload: p.key })}
              >
                {p.icon} {p.label}
              </button>
            </li>
          ))}
        </ul>
        <button className="navbar-cart-btn" onClick={() => dispatch({ type: 'TOGGLE_CART' })}>
          🛒 <span className="cart-badge">{cartItemCount}</span>
        </button>
      </nav>

      <main className="page-content">
        {state.currentPage === 'dashboard' && (
          <Dashboard flowers={state.flowers} orders={state.orders} />
        )}
        {state.currentPage === 'flowers' && (
          <FlowerGrid flowers={state.flowers} dispatch={dispatch} />
        )}
        {state.currentPage === 'orders' && <OrderPanel orders={state.orders} />}
        {state.currentPage === 'inspiration' && (
          <InspirationBoard flowers={state.flowers} schemes={state.schemes} dispatch={dispatch} />
        )}
      </main>

      <div
        className={`cart-overlay ${state.cartOpen ? 'open' : ''}`}
        onClick={() => dispatch({ type: 'TOGGLE_CART' })}
      />
      <CartSidebar
        cart={state.cart}
        open={state.cartOpen}
        dispatch={dispatch}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

function CartSidebar({
  cart,
  open,
  dispatch,
  onCheckout,
}: {
  cart: CartItem[];
  open: boolean;
  dispatch: Dispatch<AppAction>;
  onCheckout: () => void;
}) {
  const total = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);

  return (
    <aside className={`cart-panel ${open ? 'open' : ''}`}>
      <div className="cart-header">
        <h3 className="cart-title">🛒 购物车</h3>
        <button className="cart-close" onClick={() => dispatch({ type: 'TOGGLE_CART' })}>
          ✕
        </button>
      </div>
      <div className="cart-body">
        {cart.length === 0 ? (
          <div className="cart-empty">
            <div style={{ fontSize: 48, marginBottom: 12 }}>🌷</div>
            <p>购物车是空的</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>去花材页面添加你喜欢的花吧~</p>
          </div>
        ) : (
          cart.map((item) => (
            <div className="cart-item" key={item.flowerId}>
              <div className="cart-item-info">
                <div className="cart-item-name">{item.name}</div>
                <div className="cart-item-price">¥{item.price.toFixed(2)}/枝</div>
              </div>
              <div className="cart-item-qty">
                <button
                  className="qty-btn"
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_CART_QTY',
                      payload: { flowerId: item.flowerId, quantity: item.quantity - 1 },
                    })
                  }
                >
                  −
                </button>
                <span className="qty-value">{item.quantity}</span>
                <button
                  className="qty-btn"
                  onClick={() =>
                    dispatch({
                      type: 'UPDATE_CART_QTY',
                      payload: { flowerId: item.flowerId, quantity: item.quantity + 1 },
                    })
                  }
                >
                  +
                </button>
              </div>
              <button
                className="remove-btn"
                onClick={() => dispatch({ type: 'REMOVE_FROM_CART', payload: item.flowerId })}
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
      <div className="cart-footer">
        <div className="cart-total">
          <span>合计</span>
          <span className="cart-total-value">¥{total.toFixed(2)}</span>
        </div>
        <button
          className="checkout-btn"
          onClick={onCheckout}
          disabled={cart.length === 0}
        >
          提交订单
        </button>
      </div>
    </aside>
  );
}
