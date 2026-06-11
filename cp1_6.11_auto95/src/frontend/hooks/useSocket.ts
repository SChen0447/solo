import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { EditingState, PageContent } from '../../shared/types';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io({
        transports: ['websocket', 'polling']
      });
    }
    return socketRef.current;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const joinNotebook = useCallback((notebookId: string, userId: string, username: string) => {
    const socket = connect();
    socket.emit('join-notebook', { notebookId, userId, username });
  }, [connect]);

  const leaveNotebook = useCallback((notebookId: string, userId: string) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('leave-notebook', { notebookId, userId });
    }
  }, []);

  const sendEditingState = useCallback((state: EditingState) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('editing-state', state);
    }
  }, []);

  const sendPageUpdate = useCallback((notebookId: string, pageNumber: number, content: Partial<PageContent>) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit('page-update', { notebookId, pageNumber, content });
    }
  }, []);

  const onEditingUsers = useCallback((callback: (users: EditingState[]) => void) => {
    const socket = connect();
    socket.on('editing-users', callback);
    return () => socket.off('editing-users', callback);
  }, [connect]);

  const onEditingState = useCallback((callback: (state: EditingState) => void) => {
    const socket = connect();
    socket.on('editing-state', callback);
    return () => socket.off('editing-state', callback);
  }, [connect]);

  const onPageUpdate = useCallback((callback: (data: { pageNumber: number; content: Partial<PageContent> }) => void) => {
    const socket = connect();
    socket.on('page-update', callback);
    return () => socket.off('page-update', callback);
  }, [connect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    joinNotebook,
    leaveNotebook,
    sendEditingState,
    sendPageUpdate,
    onEditingUsers,
    onEditingState,
    onPageUpdate
  };
}
