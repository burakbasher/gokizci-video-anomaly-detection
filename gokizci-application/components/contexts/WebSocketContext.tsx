"components/contexts/WebSocketContext.tsx"

"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketContextType {
  socket: Socket | null;
  connectToSource: (sourceId: string) => void;
  disconnectFromSource: (sourceId: string) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  connectToSource: () => {},
  disconnectFromSource: () => {},
  isConnected: false,
});

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const connectToSource = (sourceId: string) => {
    if (socket) {
      socket.emit('join', { source_id: sourceId });
    }
  };

  const disconnectFromSource = (sourceId: string) => {
    if (socket) {
      socket.emit('leave', { source_id: sourceId });
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        socket,
        connectToSource,
        disconnectFromSource,
        isConnected,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}; 