"components/videoplayers/ReplayPlayer.tsx"

"use client";

import React, { useEffect, useRef, useState } from "react";
import { fetchReplaySegments } from "@/app/lib/api";  
import { useVideoSocket } from "../hooks/useVideoSocket";

interface ReplayPlayerProps {
  sourceId: string;
  mode: "live" | "replay";
  startTime?: string;  // ISO timestamp
  endTime?: string;
  fps?: number;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  sourceId,
  mode,
  startTime,
  endTime,
  fps = 10,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<string[]>([]);
  const [segments, setSegments] = useState<
    { timestamp: string; anomaly: boolean; confidence?: number }[]
  >([]);
  const { socket, isConnected } = useVideoSocket({ sourceId });

  const frameInterval = 1000 / fps;
  const rafRef = useRef<number>();
  const lastRender = useRef<number>(0);
  const isPlaying = useRef(false);

  // 1) Eğer replay modu, segment listesini çek
  useEffect(() => {
    if (mode !== "replay" || !startTime) return;
    
    // Clear existing buffer when switching to replay
    bufferRef.current = [];
    isPlaying.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    fetchReplaySegments(sourceId, startTime, endTime)
      .then(setSegments)
      .catch(console.error);
  }, [mode, sourceId, startTime, endTime]);
  
  // 2) SocketIO üzerinden gelen replay_frame veya processed_frame'leri buffer'la
  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      if (data.source_id !== sourceId) return;
      bufferRef.current.push(data.frame);
      if (!isPlaying.current && bufferRef.current.length > 0) {
        isPlaying.current = true;
        lastRender.current = performance.now();
        rafRef.current = requestAnimationFrame(playLoop);
      }
    };

    const eventName = mode === "live" ? "processed_frame" : "replay_frame";
    socket.on(eventName, handler);
    return () => {
      socket.off(eventName, handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [socket, sourceId, mode]);

  // 3) Sabit hızla buffer'dan tüket
  const playLoop = (now: number) => {
    if (now - lastRender.current >= frameInterval) {
      const frame = bufferRef.current.shift();
      if (frame) drawFrame(frame);
      else {
        isPlaying.current = false;
        return;
      }
      lastRender.current = now;
    }
    rafRef.current = requestAnimationFrame(playLoop);
  };

  const drawFrame = async (b64: string) => {
    if (!b64) return;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(bitmap, 0, 0);
    }
    bitmap.close();
  };

  // 4) Replay başlat/durdur
  useEffect(() => {
    if (!socket) return;
    
    // Clear existing buffer when switching modes
    bufferRef.current = [];
    isPlaying.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    if (mode === "replay" && startTime) {
      socket.emit("start_replay", { source_id: sourceId, fps, start: startTime, end: endTime });
    } else {
      socket.emit("stop_replay", { source_id: sourceId });
    }
  }, [mode, sourceId, fps, startTime, endTime, socket]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={480}
      className="w-full h-full bg-black"
    />
  );
};
