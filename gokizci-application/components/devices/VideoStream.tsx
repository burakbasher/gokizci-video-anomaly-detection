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

  const frameBufferRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number>();
  const lastRenderRef = useRef<number>(0);

  const targetFPS = 30;
  const frameInterval = 1000 / targetFPS;
  const initialBufferSize = 5; // Kaç frame biriktirince başlasın

  // Canvas boyutunu sadece bir kez ayarla
  useEffect(() => {
    const c = canvasRef.current;
    if (c) {
      c.width = 640;
      c.height = 480;
    }
  }, []);

  // Socket’ten gelen frame’leri buffer’a at
  useEffect(() => {
    const handler = (data: any) => {
      if (data.source_id !== sourceId) return;
      frameBufferRef.current.push(data.frame);

      // Buffer yeterince dolduysa oynatmayı başlat
      if (
        !isPlayingRef.current &&
        frameBufferRef.current.length >= initialBufferSize
      ) {
        isPlayingRef.current = true;
        lastRenderRef.current = performance.now();
        rafRef.current = requestAnimationFrame(drawLoop);
      }
    };

    socket?.on("processed_frame", handler);
    return () => {
      socket?.off("processed_frame", handler);
    };
  }, [socket, sourceId]);

  // Sabit hızda frame tüketen döngü
  const drawLoop = (now: number) => {
    const elapsed = now - lastRenderRef.current;
    if (elapsed >= frameInterval) {
      const nextFrame = frameBufferRef.current.shift();
      if (nextFrame) {
        drawFrame(nextFrame);
        lastRenderRef.current = now;
      } else {
        // Buffer boşaldı, tekrar biriktirene kadar durakla
        isPlayingRef.current = false;
        return;
      }
    }
    rafRef.current = requestAnimationFrame(drawLoop);
  };

  // Bitmap ile tek adımda çizim
  const drawFrame = async (frameData: string) => {
    try {
      const bin = atob(frameData);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "image/jpeg" });
      const bitmap = await createImageBitmap(blob);

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, 640, 480);
        ctx.drawImage(bitmap, 0, 0);
      }
      bitmap.close();
    } catch (e) {
      console.error("Draw error:", e);
    }
  };

  // Unmount temizliği
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      frameBufferRef.current = [];
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
