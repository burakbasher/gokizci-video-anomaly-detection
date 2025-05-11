"use client";

import { useEffect, useRef, useState } from "react";
import { useVideoSocket } from "../hooks/useVideoSocket";

interface VideoStreamProps {
  sourceId: string;
  onAnomalyDetected?: (detected: boolean) => void;
  onStatusChange?: (status: "online" | "offline" | "error") => void;
}

export const VideoStream = ({ sourceId, onAnomalyDetected, onStatusChange }: VideoStreamProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isConnected, error, status, socket } = useVideoSocket({ sourceId, onAnomalyDetected, onStatusChange });

  const frameQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);
  const animationFrameRef = useRef<number>();
  const mountedRef = useRef(true);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef<number>(0);
  const lastDrawTimeRef = useRef<number>(0);
  const targetFPS = 30;
  const frameInterval = 1000 / targetFPS;

  const processNextFrame = async () => {
    if (!mountedRef.current || !canvasRef.current || isProcessingRef.current || frameQueueRef.current.length === 0) return;

    const now = Date.now();
    const timeSinceLastDraw = now - lastDrawTimeRef.current;

    if (timeSinceLastDraw < frameInterval) {
      animationFrameRef.current = requestAnimationFrame(processNextFrame);
      return;
    }

    isProcessingRef.current = true;
    try {
      const frameData = frameQueueRef.current.shift();
      if (!frameData) return;

      const binaryString = atob(frameData);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext("2d");
        if (!ctx) return;

        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        frameCountRef.current++;
        lastDrawTimeRef.current = Date.now();
        const delta = lastDrawTimeRef.current - lastFrameTimeRef.current;
        lastFrameTimeRef.current = lastDrawTimeRef.current;

        console.log(`Displayed frame ${frameCountRef.current}, delta: ${delta}ms`);
      };
      img.src = url;
    } catch (err) {
      console.error("Frame processing error:", err);
    } finally {
      isProcessingRef.current = false;
      if (frameQueueRef.current.length > 0) {
        animationFrameRef.current = requestAnimationFrame(processNextFrame);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const handleProcessedFrame = (data: any) => {
      if (!mountedRef.current) return;

      if (data.source_id === sourceId) {
        frameQueueRef.current.push(data.frame);
        if (!isProcessingRef.current) {
          animationFrameRef.current = requestAnimationFrame(processNextFrame);
        }
      }
    };

    socket?.on("processed_frame", handleProcessedFrame);

    return () => {
      console.log("Unmounting VideoStream for", sourceId);
      mountedRef.current = false;

      socket?.off("processed_frame", handleProcessedFrame);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      frameQueueRef.current = [];
    };
  }, [sourceId, socket]);

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
      <canvas ref={canvasRef} className="w-full h-full object-contain bg-black" />
    </div>
  );
};
