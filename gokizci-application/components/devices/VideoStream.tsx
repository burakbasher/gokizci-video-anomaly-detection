import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface VideoStreamProps {
  sourceId: string;
  onAnomalyDetected?: (detected: boolean) => void;
  onStatusChange?: (status: 'online' | 'offline' | 'error') => void;
}

// Global socket instance
let globalSocket: Socket | null = null;

export const VideoStream = ({ sourceId, onAnomalyDetected, onStatusChange }: VideoStreamProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'online' | 'offline' | 'error'>('offline');
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef<number>(0);
  const mountedRef = useRef(true);
  const frameQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const animationFrameRef = useRef<number>();
  const lastDrawTimeRef = useRef<number>(0);
  const targetFPS = 30; // Hedef FPS
  const frameInterval = 1000 / targetFPS; // Frame'ler arası süre (ms)

  // Frame işleme fonksiyonu
  const processNextFrame = async () => {
    if (!mountedRef.current || !canvasRef.current || isProcessingRef.current || frameQueueRef.current.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastDraw = now - lastDrawTimeRef.current;

    // Eğer son çizimden bu yana yeterli süre geçmediyse, bir sonraki frame'e geç
    if (timeSinceLastDraw < frameInterval) {
      animationFrameRef.current = requestAnimationFrame(processNextFrame);
      return;
    }

    isProcessingRef.current = true;
    try {
      const frameData = frameQueueRef.current.shift();
      if (!frameData) return;

      // Base64 frame'i decode et
      const binaryString = atob(frameData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Blob oluştur
      const blob = new Blob([bytes], { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);

      // Canvas'a frame'i çiz
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Canvas boyutlarını ayarla
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;

        // Frame'i çiz
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        frameCountRef.current++;
        lastDrawTimeRef.current = Date.now();

        const timeSinceLastFrame = lastDrawTimeRef.current - lastFrameTimeRef.current;
        lastFrameTimeRef.current = lastDrawTimeRef.current;

        console.log(`Displayed frame ${frameCountRef.current}, time since last: ${timeSinceLastFrame}ms`);
        setStatus('online');
        if (onStatusChange) onStatusChange('online');
      };
      img.src = url;

    } catch (err) {
      console.error('Error processing frame:', err);
      setError(`Frame processing error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      isProcessingRef.current = false;
      // Kuyrukta frame varsa bir sonrakini işle
      if (frameQueueRef.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(processNextFrame);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    console.log('VideoStream component mounted for source:', sourceId);

    // Socket bağlantısını başlat veya mevcut bağlantıyı kullan
    if (!globalSocket) {
      console.log('Creating new Socket.IO connection...');
      globalSocket = io('http://localhost:5000', {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        forceNew: false
      });

      globalSocket.on('connect', () => {
        if (!mountedRef.current) return;
        console.log('Socket.IO connected successfully');
        setIsConnected(true);
        setError(null);
        setStatus('online');
        if (onStatusChange) onStatusChange('online');
      });

      globalSocket.on('disconnect', (reason) => {
        if (!mountedRef.current) return;
        console.log('Socket.IO disconnected. Reason:', reason);
        setIsConnected(false);
        setStatus('offline');
        if (onStatusChange) onStatusChange('offline');
      });

      globalSocket.on('connect_error', (err) => {
        if (!mountedRef.current) return;
        console.error('Socket.IO connection error:', err);
        setError(`Connection error: ${err.message}`);
        setStatus('error');
        if (onStatusChange) onStatusChange('error');
      });
    }

    // Odaya katıl
    if (globalSocket.connected) {
      console.log('Joining room:', sourceId);
      globalSocket.emit('join', { source_id: sourceId });
    }

    // Frame işleme
    const handleProcessedFrame = (data: any) => {
      if (!mountedRef.current) return;
      
      if (data.source_id === sourceId) {
        try {
          // Frame'i kuyruğa ekle
          frameQueueRef.current.push(data.frame);
          
          // Eğer işleme yoksa başlat
          if (!isProcessingRef.current) {
            animationFrameRef.current = requestAnimationFrame(processNextFrame);
          }

          // Anomali kontrolü
          if (onAnomalyDetected) {
            onAnomalyDetected(data.anomaly_detected);
          }
          setStatus('online');
          if (onStatusChange) onStatusChange('online');
        } catch (err) {
          console.error('Error handling frame:', err);
          setError(`Frame handling error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    };

    globalSocket.on('processed_frame', handleProcessedFrame);

    return () => {
      console.log('Cleaning up VideoStream component...');
      mountedRef.current = false;
      
      // Sadece event listener'ı kaldır
      if (globalSocket) {
        globalSocket.off('processed_frame', handleProcessedFrame);
      }

      // Animation frame'i iptal et
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Frame kuyruğunu temizle
      frameQueueRef.current = [];
    };
  }, [sourceId, onAnomalyDetected, onStatusChange]);

  return (
    <div className="relative w-full h-full">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-sm">
          {error}
        </div>
      )}
      {!isConnected && !error && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-sm">
          Connecting...
        </div>
      )}
      {status === 'offline' && (
        <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-50">
          Device is offline
        </div>
      )}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain bg-black"
      />
    </div>
  );
}; 