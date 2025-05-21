"components/hooks/useVideoSocket.ts"

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useWebSocket } from '../contexts/WebSocketContext'; 

interface UseVideoSocketProps {
  sourceId: string;
  onAnomalyDetected?: (detected: boolean) => void;
  onStatusChange?: (status: "online" | "offline" | "error") => void;
}

export const useVideoSocket = ({ sourceId, onAnomalyDetected, onStatusChange }: UseVideoSocketProps) => {
  const { socket, isConnected: isSocketConnectedGlobally, connectToSource, disconnectFromSource } = useWebSocket(); // CONTEXT'TEN GELEN SOCKET
  // const [isConnected, setIsConnected] = useState(false); // Bu hook'un kendi bağlantı durumu yerine global durumu kullan
  // const socketRef = useRef<Socket | null>(null); // Artık buna gerek yok, context'teki socket kullanılacak

  // `connect` ve `disconnect` fonksiyonları context'ten gelenleri kullanabilir veya
  // bu hook içinde sadece event dinleme/gönderme yapılabilir.
  // Şimdilik, context'teki join/leave (connectToSource/disconnectFromSource) mantığını kullanalım.

  useEffect(() => {
    if (socket && sourceId) {
      // console.log(`useVideoSocket: Joining room for ${sourceId}`);
      connectToSource(sourceId); // Context üzerinden odaya katıl

      const handleProcessedFrame = (data: any) => {
        if (data.source_id === sourceId) {
          onAnomalyDetected?.(data.anomaly_detected);
          // onStatusChange?.("online"); // Status yönetimi global socket'ten veya device'dan gelmeli
        }
      };

      socket.on("processed_frame", handleProcessedFrame);
      // Gerekirse 'error', 'status' gibi diğer global event'ler de burada dinlenebilir
      // veya bu event'ler WebSocketProvider seviyesinde yönetilip context üzerinden aktarılabilir.

      return () => {
        // console.log(`useVideoSocket: Leaving room for ${sourceId}`);
        socket.off("processed_frame", handleProcessedFrame);
        disconnectFromSource(sourceId); // Context üzerinden odadan ayrıl
      };
    }
  }, [socket, sourceId, connectToSource, disconnectFromSource, onAnomalyDetected, onStatusChange]);

  // Bu hook artık kendi `isConnected`, `error`, `status` state'lerini tutmamalı,
  // bunları ya WebSocketContext'ten almalı ya da prop olarak parent'tan.
  // Şimdilik sadece socket'i döndürelim, ana component'ler global state'i kullanır.
  return { socket, isSocketConnected: isSocketConnectedGlobally };
};