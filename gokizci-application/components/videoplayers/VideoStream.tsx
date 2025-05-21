"components/videoplayers/VideoStream.tsx"

"use client";

import { useEffect, useRef } from "react";
import { useVideoSocket } from "../hooks/useVideoSocket";

interface VideoStreamProps {
  sourceId: string;
  onAnomalyDetected?: (detected: boolean) => void;
  onStatusChange?: (status: "online" | "offline" | "error") => void;
}

export const VideoStream = ({
  sourceId,
  onAnomalyDetected,
  onStatusChange,
}: VideoStreamProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isConnected, error, status, socket } = useVideoSocket({
    sourceId,
    onAnomalyDetected,
    onStatusChange,
  });

  // artık ImageBitmap tutacağız
  const frameBufferRef = useRef<ImageBitmap[]>([]);
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number>();
  const lastRenderRef = useRef<number>(0);
  const frameTimestampsRef = useRef<number[]>([]);

  const targetFPS = 20;
  const frameInterval = 1000 / targetFPS;

  // eşiği ihtiyaçlarınıza göre ayarlayın
  const minBufferSize = 80;   // önce 30 frame topla
  const maxBufferSize = 300;  // 120 üzerini at

  // canvas boyutu
  useEffect(() => {
    const c = canvasRef.current;
    if (c) {
      c.width = 640;
      c.height = 480;
    }
  }, []);

  // frame decode + buffer'a ekle
  useEffect(() => {
    const handler = async (data: any) => {
      if (data.source_id !== sourceId) return;

      try {
        // base64 → blob → bitmap
        const bin = atob(data.frame);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], { type: "image/jpeg" });
        const bitmap = await createImageBitmap(blob);

        // timestamp'i kaydet
        frameTimestampsRef.current.push(data.timestamp);

        // tampon limitini koru
        frameBufferRef.current.push(bitmap);
        if (frameBufferRef.current.length > maxBufferSize) {
          const old = frameBufferRef.current.shift();
          frameTimestampsRef.current.shift();
          old?.close();
        }

        // eşiğe ulaşıldıysa oynatmayı başlat
        if (!isPlayingRef.current && frameBufferRef.current.length >= minBufferSize) {
          isPlayingRef.current = true;
          lastRenderRef.current = performance.now();
          rafRef.current = requestAnimationFrame(drawLoop);
        }
      } catch (e) {
        console.error("Decoding error:", e);
      }
    };

    socket?.on("processed_frame", handler);
    return () => {
      socket?.off("processed_frame", handler);
    };
  }, [socket, sourceId]);

  // çizim döngüsü
  const drawLoop = (now: number) => {
    if (!isPlayingRef.current) return;

    const elapsed = now - lastRenderRef.current;
    if (elapsed >= frameInterval) {
      // tampon kritik altına düşünce durakla
      if (frameBufferRef.current.length < minBufferSize) {
        isPlayingRef.current = false;
        return;
      }

      // en eski frame'i al (FIFO)
      const nextBitmap = frameBufferRef.current.shift();
      const frameTimestamp = frameTimestampsRef.current.shift();

      if (nextBitmap) {
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
          ctx.drawImage(nextBitmap, 0, 0);
        }
        nextBitmap.close();

        // drift'i minimize et
        lastRenderRef.current += frameInterval;
      } else {
        isPlayingRef.current = false;
        return;
      }
    }

    // performans takibi (isteğe bağlı)
    // console.log("buffer:", frameBufferRef.current.length, "elapsed:", elapsed);

    rafRef.current = requestAnimationFrame(drawLoop);
  };

  // unmount temizliği
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      frameBufferRef.current.forEach(b => b.close());
      frameBufferRef.current = [];
      frameTimestampsRef.current = [];
    };
  }, []);

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
      {status === "offline" && (
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
