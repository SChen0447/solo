import { useRef, useCallback, useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { MindMapNode, User, JoinRoomResult } from '../types';

const SOCKET_URL = 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [nodes, setNodes] = useState<Record<string, MindMapNode>>({});
  const [roomName, setRoomName] = useState<string>('');

  const connect = useCallback(() => {
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('user-joined', (user: User) => {
      setUsers((prev) => [...prev, user]);
    });

    socket.on('user-left', (userId: string) => {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    socket.on('node-added', (node: MindMapNode, parentId: string) => {
      setNodes((prev) => {
        const newNodes = { ...prev };
        newNodes[node.id] = node;
        if (newNodes[parentId]) {
          newNodes[parentId] = {
            ...newNodes[parentId],
            children: [...newNodes[parentId].children, node.id],
            collapsed: false,
          };
        }
        return newNodes;
      });
    });

    socket.on('node-updated', (nodeId: string, updates: Partial<MindMapNode>, _userId: string) => {
      setNodes((prev) => {
        if (!prev[nodeId]) return prev;
        return {
          ...prev,
          [nodeId]: { ...prev[nodeId], ...updates },
        };
      });
    });

    socket.on('node-deleted', (nodeId: string, parentId: string) => {
      setNodes((prev) => {
        const newNodes = { ...prev };

        const deleteRecursive = (id: string) => {
          const node = newNodes[id];
          if (!node) return;
          node.children.forEach(deleteRecursive);
          delete newNodes[id];
        };

        deleteRecursive(nodeId);

        if (newNodes[parentId]) {
          newNodes[parentId] = {
            ...newNodes[parentId],
            children: newNodes[parentId].children.filter((id) => id !== nodeId),
          };
        }

        return newNodes;
      });
    });

    socket.on('node-moved', (nodeId: string, x: number, y: number) => {
      setNodes((prev) => {
        if (!prev[nodeId]) return prev;
        return {
          ...prev,
          [nodeId]: { ...prev[nodeId], x, y },
        };
      });
    });

    socket.on('node-toggled', (nodeId: string, collapsed: boolean) => {
      setNodes((prev) => {
        if (!prev[nodeId]) return prev;
        return {
          ...prev,
          [nodeId]: { ...prev[nodeId], collapsed },
        };
      });
    });

    socket.on('node-color-changed', (nodeId: string, color: string) => {
      setNodes((prev) => {
        if (!prev[nodeId]) return prev;
        return {
          ...prev,
          [nodeId]: { ...prev[nodeId], color },
        };
      });
    });

    socket.on('cursor-updated', (userId: string, nodeId: string | null, offset: number) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === userId) {
            return {
              ...u,
              cursorPosition: nodeId ? { nodeId, offset } : undefined,
            };
          }
          return u;
        })
      );
    });

    socketRef.current = socket;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setCurrentUser(null);
      setUsers([]);
      setNodes({});
      setRoomName('');
    }
  }, []);

  const joinRoom = useCallback(
    (name: string, userName: string): Promise<JoinRoomResult> => {
      if (!socketRef.current) {
        connect();
      }

      return new Promise((resolve) => {
        if (!socketRef.current) {
          resolve({ success: false, error: '无法连接到服务器' });
          return;
        }

        socketRef.current.emit(
          'join-room',
          name,
          userName,
          (result: JoinRoomResult) => {
            if (result.success && result.user && result.users && result.nodes) {
              setCurrentUser(result.user);
              setUsers(result.users);
              setNodes(result.nodes);
              setRoomName(name);
            }
            resolve(result);
          }
        );
      });
    },
    [connect]
  );

  const addNode = useCallback((parentId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('add-node', parentId);
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<MindMapNode>) => {
    if (!socketRef.current) return;
    socketRef.current.emit('update-node', nodeId, updates);
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('delete-node', nodeId);
  }, []);

  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit('move-node', nodeId, x, y);
  }, []);

  const toggleCollapse = useCallback((nodeId: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('toggle-collapse', nodeId);
  }, []);

  const changeNodeColor = useCallback((nodeId: string, color: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('change-node-color', nodeId, color);
  }, []);

  const sendCursorPosition = useCallback((nodeId: string | null, offset: number) => {
    if (!socketRef.current) return;
    socketRef.current.emit('cursor-move', nodeId, offset);
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    currentUser,
    users,
    nodes,
    roomName,
    connect,
    disconnect,
    joinRoom,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    toggleCollapse,
    changeNodeColor,
    sendCursorPosition,
  };
}
