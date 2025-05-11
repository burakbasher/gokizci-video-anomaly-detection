import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseVideoSocketProps {
  sourceId: string;
  onAnomalyDetected?: (detected: boolean) => void;
  onStatusChange?: (status: "online" | "offline" | "error") => void;
}

export const useVideoSocket = ({ sourceId, onAnomalyDetected, onStatusChange }: UseVideoSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"online" | "offline" | "error">("offline");
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io("http://localhost:5000", {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: false,
      });

      socketRef.current.on("connect", () => {
        console.log("Socket connected");
        setIsConnected(true);
        setError(null);
        setStatus("online");
        onStatusChange?.("online");
      });

      socketRef.current.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
        setIsConnected(false);
        setStatus("offline");
        onStatusChange?.("offline");
      });

      socketRef.current.on("connect_error", (err) => {
        console.error("Connection error:", err);
        setError(`Connection error: ${err.message}`);
        setStatus("error");
        onStatusChange?.("error");
      });
    }

    if (socketRef.current) {
      socketRef.current.emit("leave", { source_id: sourceId });
      socketRef.current.emit("join", { source_id: sourceId });
    }
  }, [sourceId, onStatusChange]);

  const disconnect = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("leave", { source_id: sourceId });
    }
  }, [sourceId]);

  useEffect(() => {
    connect();

    const handleProcessedFrame = (data: any) => {
      if (data.source_id === sourceId) {
        onAnomalyDetected?.(data.anomaly_detected);
        setStatus("online");
        onStatusChange?.("online");
      }
    };

    socketRef.current?.on("processed_frame", handleProcessedFrame);

    return () => {
      disconnect();
      socketRef.current?.off("processed_frame", handleProcessedFrame);
    };
  }, [sourceId, connect, disconnect, onAnomalyDetected, onStatusChange]);

  return {
    isConnected,
    error,
    status,
    socket: socketRef.current
  };
}; 