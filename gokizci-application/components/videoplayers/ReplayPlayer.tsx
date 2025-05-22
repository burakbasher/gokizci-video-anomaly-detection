// components/videoplayers/ReplayPlayer.tsx

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useVideoSocket } from "../hooks/useVideoSocket";

interface ReplayPlayerProps {
  sourceId: string;
  mode: "live" | "replay";
  startTime?: string;
  endTime?: string;
  fps?: number;
  isPlaying: boolean;
}

/**
 * Optimized ReplayPlayer:
 * - Consolidated socket event setup/cleanup
 * - Abstracted play control logic
 * - Kept all logging and state management intact
 */
export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  sourceId,
  mode,
  startTime,
  endTime,
  fps = 35,
  isPlaying: propIsPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<ArrayBuffer[]>([]);
  const { socket } = useVideoSocket({ sourceId });

  const frameInterval = 1000 / fps;
  const rafRef = useRef<number>();
  const lastRender = useRef<number>(0);
  const playing = useRef(false);

  const [playerMessage, setPlayerMessage] = useState<string | null>(null);
  const noDataTimeout = useRef<NodeJS.Timeout | null>(null);

  // Main playback loop: processes buffer and schedules next frame
  const playLoop = useCallback((now: number) => {
    if (!playing.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      return;
    }

    if (now - lastRender.current >= frameInterval) {
      const frame = bufferRef.current.shift();
      if (frame instanceof ArrayBuffer) {
        drawFrame(frame);
        lastRender.current += frameInterval;
      } else {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = undefined;
        }
        stopPlayback();
        return;
      }
    }


    // Sadece dışarıdan oynatma komutu varsa ve RAF ID'si varsa bir sonraki frame'i iste
    if (propIsPlaying && rafRef.current) { // rafRef.current kontrolü eklendi (döngü içinde tekrar cancel edilmediyse)
      rafRef.current = requestAnimationFrame(playLoop);
    } else { // Oynatma istenmiyorsa veya RAF zaten iptal edilmişse
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    }
  }, [frameInterval]);

  // Draw a single frame to canvas
  const drawFrame = useCallback(async (frameBuffer: ArrayBuffer) => {
    const t0 = performance.now();
    try {
      const blob = new Blob([frameBuffer], { type: "image/jpeg" });
      const bitmap = await createImageBitmap(blob);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(bitmap, 0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      bitmap.close();
    } catch (error) {
      console.error("Error drawing frame in ReplayPlayer:", error);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
      stopPlayback();
    }
    const t1 = performance.now();
    console.log(`drawFrame time: ${t1 - t0} ms`);
  }, []);


  // Oynatma durumu (propIsPlaying) değiştiğinde playLoop'u yönet
  useEffect(() => {
    if (propIsPlaying) {
      // Oynatma isteniyor
      if (bufferRef.current.length > 0 && !rafRef.current) {
        // Buffer'da veri var ve döngü çalışmıyor -> başlat
        console.log("ReplayPlayer: Starting playLoop because propIsPlaying=true, buffer has content, and RAF is not running.");
        lastRender.current = performance.now() - frameInterval;
        rafRef.current = requestAnimationFrame(playLoop);
        setPlayerMessage(null);
      } else if (bufferRef.current.length === 0) {
        // Oynatma isteniyor ama buffer boş -> veri bekleniyor
        // console.log("ReplayPlayer: propIsPlaying=true, but buffer is empty. Waiting for frames.");
        // noDataTimeoutRef bu durumu yönetir
      }
    } else {
      // Durdurma isteniyor
      if (rafRef.current) {
        console.log("ReplayPlayer: Stopping playLoop because propIsPlaying=false and RAF is running.");
        cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
      }
    }
  }, [propIsPlaying, playLoop]); // playLoop bağımlılığını koru


  useEffect(() => {
    // ... (Bu useEffect'in başındaki mode ve socket kontrolü aynı) ...
    const handleReplayFrame = (data: any) => {
      // ... (frame'i buffer'a ekleme mantığı aynı) ...
      if (data.frame instanceof ArrayBuffer) {
        bufferRef.current.push(data.frame);
        if (noDataTimeout.current) clearTimeout(noDataTimeout.current);
        setPlayerMessage(null);

        // Eğer oynatma isteniyorsa (propIsPlaying) ve RAF çalışmıyorsa, başlat
        if (propIsPlaying && !rafRef.current && bufferRef.current.length > 0) {
          console.log("ReplayPlayer: Starting playLoop from handleReplayFrame because new frame arrived, propIsPlaying=true, and RAF not running.");
          lastRender.current = performance.now() - frameInterval;
          rafRef.current = requestAnimationFrame(playLoop);
        }
      }
    };
    // ... (handleReplayStatus ve socket.on/off aynı, sadece onPlaybackStatusChange çağrıları yok) ...
    const handleReplayStatus = (data: any) => {
      if (data.source_id !== sourceId) return;
      if (data.status === 'no_segments_found') {
        // ...
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
        // onPlaybackStatusChange?.(false); // KALDIRILDI
      } else if (data.status === 'stopped') {
        // ...
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = undefined;
        // onPlaybackStatusChange?.(false); // KALDIRILDI
      }
    };
    // ...
  }, [socket, sourceId, mode, playLoop, propIsPlaying]);


  useEffect(() => {
    // ... (Bu useEffect'in başındaki cleanup ve start_replay emit aynı) ...
    noDataTimeout.current = setTimeout(() => {
      if (propIsPlaying && bufferRef.current.length === 0 && !rafRef.current) {
        setPlayerMessage("Veri alınamadı veya zaman aşımına uğradı.");
        // onPlaybackStatusChange?.(false); // KALDIRILDI
      }
    }, 7000);
    // ...
    return () => {
      // ... (cleanup aynı, onPlaybackStatusChange çağrısı yok) ...
    };
  }, [mode, sourceId, fps, startTime, endTime, socket, propIsPlaying]);

  // Start playback if there are frames
  const startPlayback = useCallback(() => {
    if (!playing.current && bufferRef.current.length) {
      playing.current = true;
      lastRender.current = performance.now();
      rafRef.current = requestAnimationFrame(playLoop);
      setPlayerMessage(null);
    }
  }, [playLoop]);

  // Stop playback and cancel animation
  const stopPlayback = useCallback(() => {
    playing.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Sync external play prop
  useEffect(() => {
    propIsPlaying ? startPlayback() : stopPlayback();
  }, [propIsPlaying, startPlayback, stopPlayback]);

  // Handle socket events
  useEffect(() => {
    if (!socket || mode !== "replay") return;

    const onFrame = (data: any) => {
      if (data.source_id !== sourceId) return;
      let bufferItem: ArrayBuffer | null = null;
      if (data.frame instanceof ArrayBuffer) bufferItem = data.frame;
      else if (typeof data.frame === 'string') {
        try {
          const bin = atob(data.frame);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          bufferItem = bytes.buffer;
        } catch { console.error("Base64 decode failed"); }
      }
      if (bufferItem) {
        bufferRef.current.push(bufferItem);
        if (noDataTimeout.current) clearTimeout(noDataTimeout.current);
        setPlayerMessage(null);
        if (propIsPlaying) {
          startPlayback();
        }
      }
    };
    
    const onStatus = (data: any) => {
      if (data.source_id === sourceId && data.status === 'no_segments_found') {
        if (noDataTimeout.current) clearTimeout(noDataTimeout.current);
        setPlayerMessage(data.message || "Kayıt bulunamadı.");
        stopPlayback();
        bufferRef.current = [];
      }
    };

    socket.on("replay_frame", onFrame);
    socket.on("replay_status", onStatus);
    return () => {
      socket.off("replay_frame", onFrame);
      socket.off("replay_status", onStatus);
      stopPlayback();
      bufferRef.current = [];
    };
  }, [socket, sourceId, mode, startPlayback, stopPlayback, propIsPlaying]);

  // Emit replay commands
  useEffect(() => {
    if (!socket || mode !== "replay" || !startTime) return;

    stopPlayback();
    bufferRef.current = [];
    setPlayerMessage(null);

    socket.emit("start_replay", { source_id: sourceId, fps, start: startTime, end: endTime });
    noDataTimeout.current = setTimeout(() => {
      if (!playing.current) setPlayerMessage("Veri alınamadı.");
    }, 3000);

    return () => {
      socket.emit("stop_replay", { source_id: sourceId });
      if (noDataTimeout.current) clearTimeout(noDataTimeout.current);
      stopPlayback();
      bufferRef.current = [];
    };
  }, [socket, sourceId, mode, startTime, endTime, fps, stopPlayback]);

  // Initialize canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 640;
      canvas.height = 480;
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full bg-black object-contain" />
      {playerMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white p-4 text-center z-10">
          <p>{playerMessage}</p>
        </div>
      )}
    </div>
  );
};