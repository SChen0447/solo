import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import type { Product, QuoteItem, Quote, AppState } from './types';

const STORAGE_KEY = 'snack_inventory_quote_data';

const defaultProducts: Product[] = [
  { id: 'p1', name: '乐事薯片原味', specification: '70g', unit: '袋', purchasePrice: 3.5, retailPrice: 6.0, stock: 120, warningThreshold: 10 },
  { id: 'p2', name: '乐事薯片番茄味', specification: '70g', unit: '袋', purchasePrice: 3.5, retailPrice: 6.0, stock: 85, warningThreshold: 10 },
  { id: 'p3', name: '卫龙大面筋', specification: '106g', unit: '袋', purchasePrice: 2.8, retailPrice: 5.0, stock: 200, warningThreshold: 15 },
  { id: 'p4', name: '卫龙亲嘴烧', specification: '300g', unit: '盒', purchasePrice: 6.5, retailPrice: 12.0, stock: 8, warningThreshold: 10 },
  { id: 'p5', name: '奥利奥原味饼干', specification: '116g', unit: '盒', purchasePrice: 4.2, retailPrice: 7.5, stock: 45, warningThreshold: 10 },
  { id: 'p6', name: '奥利奥巧克力饼干', specification: '116g', unit: '盒', purchasePrice: 4.2, retailPrice: 7.5, stock: 5, warningThreshold: 10 },
  { id: 'p7', name: '康师傅红烧牛肉面', specification: '105g', unit: '桶', purchasePrice: 3.0, retailPrice: 5.5, stock: 150, warningThreshold: 20 },
  { id: 'p8', name: '康师傅老坛酸菜面', specification: '120g', unit: '桶', purchasePrice: 3.2, retailPrice: 5.5, stock: 3, warningThreshold: 10 },
  { id: 'p9', name: '旺旺雪饼', specification: '84g', unit: '袋', purchasePrice: 2.5, retailPrice: 4.5, stock: 60, warningThreshold: 10 },
  { id: 'p10', name: '旺旺仙贝', specification: '52g', unit: '袋', purchasePrice: 1.8, retailPrice: 3.5, stock: 30, warningThreshold: 10 },
  { id: 'p11', name: '好丽友派巧克力', specification: '34g×6枚', unit: '盒', purchasePrice: 8.5, retailPrice: 15.0, stock: 25, warningThreshold: 8 },
  { id: 'p12', name: '德芙丝滑牛奶巧克力', specification: '43g', unit: '条', purchasePrice: 5.5, retailPrice: 9.9, stock: 7, warningThreshold: 10 },
];

const getInitialState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load state from localStorage', e);
  }
  return {
    products: defaultProducts,
    currentQuote: [],
    discount: 0,
    history: [],
  };
};

type Action =
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string }
  | { type: 'ADD_TO_QUOTE'; payload: Product }
  | { type: 'REMOVE_FROM_QUOTE'; payload: string }
  | { type: 'UPDATE_QUOTE_QUANTITY'; payload: { productId: string; quantity: number } }
  | { type: 'SET_DISCOUNT'; payload: number }
  | { type: 'CLEAR_QUOTE' }
  | { type: 'SAVE_QUOTE_TO_HISTORY'; payload: Quote }
  | { type: 'DELETE_HISTORY'; payload: string }
  | { type: 'LOAD_QUOTE_FROM_HISTORY'; payload: Quote }
  | { type: 'SET_PRODUCTS'; payload: Product[] };

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.payload),
        currentQuote: state.currentQuote.filter((q) => q.productId !== action.payload),
      };
    case 'ADD_TO_QUOTE': {
      const existing = state.currentQuote.find((q) => q.productId === action.payload.id);
      if (existing) {
        return {
          ...state,
          currentQuote: state.currentQuote.map((q) =>
            q.productId === action.payload.id
              ? { ...q, quantity: q.quantity + 1, subtotal: (q.quantity + 1) * q.unitPrice }
              : q
          ),
        };
      }
      const newItem: QuoteItem = {
        productId: action.payload.id,
        productName: action.payload.name,
        specification: action.payload.specification,
        unit: action.payload.unit,
        unitPrice: action.payload.retailPrice,
        quantity: 1,
        subtotal: action.payload.retailPrice,
      };
      return { ...state, currentQuote: [...state.currentQuote, newItem] };
    }
    case 'REMOVE_FROM_QUOTE':
      return {
        ...state,
        currentQuote: state.currentQuote.filter((q) => q.productId !== action.payload),
      };
    case 'UPDATE_QUOTE_QUANTITY': {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          currentQuote: state.currentQuote.filter((q) => q.productId !== productId),
        };
      }
      return {
        ...state,
        currentQuote: state.currentQuote.map((q) =>
          q.productId === productId
            ? { ...q, quantity, subtotal: quantity * q.unitPrice }
            : q
        ),
      };
    }
    case 'SET_DISCOUNT':
      return { ...state, discount: Math.max(0, Math.min(100, action.payload)) };
    case 'CLEAR_QUOTE':
      return { ...state, currentQuote: [], discount: 0 };
    case 'SAVE_QUOTE_TO_HISTORY':
      return {
        ...state,
        history: [action.payload, ...state.history].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      };
    case 'DELETE_HISTORY':
      return {
        ...state,
        history: state.history.filter((h) => h.id !== action.payload),
      };
    case 'LOAD_QUOTE_FROM_HISTORY':
      return {
        ...state,
        currentQuote: action.payload.items,
        discount: action.payload.discount,
      };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };
    default:
      return state;
  }
};

interface AppContextType {
  state: AppState;
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  addToQuote: (product: Product) => void;
  removeFromQuote: (productId: string) => void;
  updateQuoteQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  clearQuote: () => void;
  saveQuoteToHistory: () => Quote;
  deleteHistory: (id: string) => void;
  loadQuoteFromHistory: (quote: Quote) => void;
  getLowStockCount: () => number;
  generateQuoteJson: () => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, undefined, getInitialState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }, [state]);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addProduct = (product: Omit<Product, 'id'>) => {
    dispatch({ type: 'ADD_PRODUCT', payload: { ...product, id: generateId() } });
  };

  const updateProduct = (product: Product) => {
    dispatch({ type: 'UPDATE_PRODUCT', payload: product });
  };

  const deleteProduct = (id: string) => {
    dispatch({ type: 'DELETE_PRODUCT', payload: id });
  };

  const addToQuote = (product: Product) => {
    dispatch({ type: 'ADD_TO_QUOTE', payload: product });
  };

  const removeFromQuote = (productId: string) => {
    dispatch({ type: 'REMOVE_FROM_QUOTE', payload: productId });
  };

  const updateQuoteQuantity = (productId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUOTE_QUANTITY', payload: { productId, quantity } });
  };

  const setDiscount = (discount: number) => {
    dispatch({ type: 'SET_DISCOUNT', payload: discount });
  };

  const clearQuote = () => {
    dispatch({ type: 'CLEAR_QUOTE' });
  };

  const calculateTotal = () => {
    const subtotal = state.currentQuote.reduce((sum, item) => sum + item.subtotal, 0);
    return subtotal * (1 - state.discount / 100);
  };

  const saveQuoteToHistory = (): Quote => {
    const quote: Quote = {
      id: generateId(),
      items: state.currentQuote,
      discount: state.discount,
      totalAmount: parseFloat(calculateTotal().toFixed(2)),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'SAVE_QUOTE_TO_HISTORY', payload: quote });
    dispatch({ type: 'CLEAR_QUOTE' });
    return quote;
  };

  const deleteHistory = (id: string) => {
    dispatch({ type: 'DELETE_HISTORY', payload: id });
  };

  const loadQuoteFromHistory = (quote: Quote) => {
    dispatch({ type: 'LOAD_QUOTE_FROM_HISTORY', payload: quote });
  };

  const getLowStockCount = () => {
    return state.products.filter((p) => p.stock <= p.warningThreshold).length;
  };

  const generateQuoteJson = () => {
    const quoteData = {
      generatedAt: new Date().toISOString(),
      discount: state.discount,
      items: state.currentQuote.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        specification: item.specification,
        unit: item.unit,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal.toFixed(2)),
      })),
      subtotal: parseFloat(state.currentQuote.reduce((s, i) => s + i.subtotal, 0).toFixed(2)),
      totalAmount: parseFloat(calculateTotal().toFixed(2)),
    };
    return JSON.stringify(quoteData, null, 2);
  };

  return (
    <AppContext.Provider
      value={{
        state,
        addProduct,
        updateProduct,
        deleteProduct,
        addToQuote,
        removeFromQuote,
        updateQuoteQuantity,
        setDiscount,
        clearQuote,
        saveQuoteToHistory,
        deleteHistory,
        loadQuoteFromHistory,
        getLowStockCount,
        generateQuoteJson,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
};
