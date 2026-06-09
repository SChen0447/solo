import React, { createContext, useContext, useEffect, ReactNode, useState, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { createSocket, BorrowRequestEvent, BorrowResponseEvent, BorrowReturnedEvent, NoteEvent, ShelfUpdateEvent, ShelfRemoveEvent, ShelfRemoveBorrowedEvent, ShelfReorderEvent } from './api';
import { Activity } from '../shared/types';
import { api } from './api';

type AnyEvent = BorrowRequestEvent | BorrowResponseEvent | BorrowReturnedEvent | NoteEvent | ShelfUpdateEvent | ShelfRemoveEvent | ShelfRemoveBorrowedEvent | ShelfReorderEvent | Activity;

type EventBusListener = (event: AnyEvent, eventName: string) => void;

export class EventBus {
  private listeners = new Set<EventBusListener>();
  on(listener: EventBusListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  emit(event: AnyEvent, eventName: string) {
    this.listeners.forEach(l => l(event, eventName));
  }
}

export const eventBus = new EventBus();

interface SocketContextType {
  socket: Socket | null;
  borrowRequests: BorrowRequestEvent[];
  setBorrowRequests: React.Dispatch<React.SetStateAction<BorrowRequestEvent[]>>;
  notifications: { id: number; message: string }[];
  addNotification: (msg: string) => void;
  dismissNotification: (id: number) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequestEvent[]>([]);
  const [notifications, setNotifications] = useState<{ id: number; message: string }[]>([]);
  const notifIdRef = useRef(0);

  const addNotification = useCallback((msg: string) => {
    const id = ++notifIdRef.current;
    setNotifications(prev => [...prev, { id, message: msg }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  }, []);

  const dismissNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    if (!token || !user) return;
    const s = createSocket(token);
    setSocket(s);

    const emit = (e: AnyEvent, name: string) => eventBus.emit(e, name);

    s.on('borrow:request', (data: BorrowRequestEvent) => {
      setBorrowRequests(prev => [...prev, data]);
      addNotification(`${data.requesterNickname} 想借阅《${data.bookTitle}》`);
      emit(data, 'borrow:request');
    });

    s.on('borrow:response', (data: BorrowResponseEvent) => {
      if (data.request.status === 'approved') {
        addNotification(`${data.ownerNickname} 同意了你的借阅请求`);
      } else {
        addNotification(`${data.ownerNickname} 拒绝了你的借阅请求`);
      }
      emit(data, 'borrow:response');
    });

    s.on('borrow:returned', (data: BorrowReturnedEvent) => {
      addNotification(`${data.borrowerNickname} 归还了《${data.book.title}》`);
      emit(data, 'borrow:returned');
    });

    s.on('note:new', (data: NoteEvent) => {
      addNotification(`${data.borrowerNickname} 在《${data.bookTitle}》添加了笔记`);
      emit(data, 'note:new');
    });

    s.on('shelf:update', (data: ShelfUpdateEvent) => emit(data, 'shelf:update'));
    s.on('shelf:remove', (data: ShelfRemoveEvent) => emit(data, 'shelf:remove'));
    s.on('shelf:removeBorrowed', (data: ShelfRemoveBorrowedEvent) => emit(data, 'shelf:removeBorrowed'));
    s.on('shelf:reorder', (data: ShelfReorderEvent) => emit(data, 'shelf:reorder'));
    s.on('activity:new', (data: Activity) => emit(data, 'activity:new'));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token, user, addNotification]);

  useEffect(() => {
    if (!user) return;
    api.getPendingRequests().then(reqs => {
      setBorrowRequests(reqs as unknown as BorrowRequestEvent[]);
    }).catch(() => {});
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, borrowRequests, setBorrowRequests, notifications, addNotification, dismissNotification }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}

export function useSocketEvent<T = AnyEvent>(eventName: string | string[], handler: (event: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    const names = Array.isArray(eventName) ? eventName : [eventName];
    const off = eventBus.on((e, name) => {
      if (names.includes(name)) {
        handlerRef.current(e as T);
      }
    });
    return () => { off(); };
  }, [eventName]);
}
