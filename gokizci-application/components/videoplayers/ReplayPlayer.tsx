// components/videoplayers/ReplayPlayer.tsx

"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useVideoSocket } from "../hooks/useVideoSocket"; // Bu hook canlı yayın odaklı olabilir,
// replay için socket yönetimi farklılaşabilir.

interface ReplayPlayerProps {
  sourceId: string;
  mode: "live" | "replay"; // Bu component sadece replay için olduğundan, mode="replay" varsayılır.
  startTime?: string;  // ISO timestamp (Oynatmaya başlanacak kesin zaman)
  endTime?: string;    // ISO timestamp (Oynatmanın biteceği kesin zaman - opsiyonel)
  fps?: number;
}

export const ReplayPlayer: React.FC<ReplayPlayerProps> = ({
  sourceId,
  mode,
  startTime,
  endTime,
  fps = 15, // İsteğe bağlı, saniyedeki kare sayısı
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<ArrayBuffer[]>([]); // Frame buffer'ı ArrayBuffer tutacak

  // useVideoSocket'tan sadece socket'i alıyoruz. Replay için isConnected vb. durumlar farklı yönetilebilir.
  const { socket } = useVideoSocket({ sourceId });

  const frameInterval = 1000 / fps;
  const rafRef = useRef<number>(); // requestAnimationFrame ID'si
  const lastRender = useRef<number>(0); // Son karenin render edildiği zaman
  const isPlaying = useRef(false); // Oynatma durumu

  const [playerMessage, setPlayerMessage] = useState<string | null>(null); // Kullanıcıya gösterilecek mesaj
  const noDataTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Zaman aşımı ID'si
  // Canvas'a frame çizme fonksiyonu
  const drawFrame = useCallback(async (frameBuffer: ArrayBuffer) => {
    if (!frameBuffer || !canvasRef.current) {
      // console.warn("drawFrame: frameBuffer or canvasRef is null/undefined.");
      return;
    }

    try {
      const blob = new Blob([frameBuffer], { type: "image/jpeg" });
      // DEBUG: Blob boyutunu kontrol et
      // console.log(`Blob size: ${blob.size} bytes`);
      // if (blob.size === 0) {
      //   console.error("Blob size is 0, cannot create image bitmap.");
      //   return;
      // }

      const bitmap = await createImageBitmap(blob);
      const ctx = canvasRef.current.getContext("2d");

      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(bitmap, 0, 0, canvasRef.current.width, canvasRef.current.height);
      } else {
        // console.warn("drawFrame: Canvas context is not available.");
      }
      bitmap.close(); // Memory sızıntısını önlemek için ImageBitmap'i kapat
    } catch (error) {
      console.error("Error drawing frame in ReplayPlayer (eval @ ReplayPlayer.tsx:60):", error);
      // Hata "InvalidStateError: The source image could not be decoded." ise,
      // frameBuffer içindeki veri geçerli bir JPEG olmayabilir.
      // Bu noktada, bir önceki yanıttaki backend ve frontend debug adımlarını uygulayın.
      isPlaying.current = false; // Hata durumunda oynatmayı durdur
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    }
  }, []); // Bağımlılık yok (canvasRef.current değişmez bir referans)

  // Frame buffer'ından kareleri alıp çizen döngü
  const playLoop = useCallback((now: number) => {
    if (!isPlaying.current) return;

    if (now - lastRender.current >= frameInterval) {
      const frame = bufferRef.current.shift(); // Buffer'dan bir frame al (FIFO)
      if (frame) {
        if (frame instanceof ArrayBuffer) {
          drawFrame(frame);
        } else {
          console.warn("Skipping non-ArrayBuffer frame in ReplayPlayer playLoop:", frame);
        }
      } else {
        // console.log("Replay buffer empty or replay finished.");
        isPlaying.current = false; // Buffer boşsa oynatmayı durdur
        // Opsiyonel: Replay bittiğine dair bir bildirim/event
        return;
      }
      lastRender.current = now; // Son render zamanını güncelle
      // Alternatif: lastRender.current += frameInterval; (drift'i azaltmak için)
    }
    rafRef.current = requestAnimationFrame(playLoop); // Bir sonraki frame için döngüyü tekrar çağır
  }, [frameInterval, drawFrame]);

  // Socket üzerinden gelen 'replay_frame' event'lerini dinle
  useEffect(() => {
    if (!socket || mode !== "replay") {
      isPlaying.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      bufferRef.current = [];
      setPlayerMessage(null);
      return;
    }

    const handleReplayFrame = (data: any) => {
      if (data.source_id !== sourceId) return;

      let frameAddedToBuffer = false
      // DEBUG: Gelen frame verisini logla
      // console.log(`ReplayPlayer.tsx (handleReplayFrame): Received frame data for ${sourceId}`, data.frame);

      if (data.frame instanceof ArrayBuffer) {
        bufferRef.current.push(data.frame);
        frameAddedToBuffer = true;

        // === InvalidStateError DEBUGGING ===
        // Eğer "InvalidStateError" alıyorsanız, buraya gelen ArrayBuffer'ı inceleyin.
        // Tarayıcı konsolunda boyutunu ve yapısını kontrol edin.
        // Gerekirse, aşağıdaki gibi bir kodla dosyaya indirip geçerli bir resim olup olmadığına bakın:
        /*
        if (bufferRef.current.length < 3 && data.frame.byteLength > 0) { // Sadece ilk birkaç frame için
            const tempBlob = new Blob([data.frame], { type: "image/jpeg" });
            const tempUrl = window.URL.createObjectURL(tempBlob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = tempUrl;
            a.download = `client_debug_frame_${sourceId}_${Date.now()}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(tempUrl);
            document.body.removeChild(a);
            console.log(`Attempted to download client_debug_frame for ${sourceId}`);
        }
        */
        // === DEBUGGING SONU ===

      } else if (typeof data.frame === 'string' && data.frame.length > 0) {
        console.warn("ReplayPlayer received a string frame (expected ArrayBuffer). Attempting atob (this is unusual).");
        try {
          const bin = atob(data.frame);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          bufferRef.current.push(bytes.buffer);
          frameAddedToBuffer = true;
        } catch (e) {
          console.error("Failed to decode string frame in ReplayPlayer:", e, "Frame string (first 100 chars):", data.frame.substring(0, 100));
          return;
        }
      } else {
        console.warn("ReplayPlayer received an unknown or empty frame type:", data.frame);
        return;
      }

      if (frameAddedToBuffer) {
        // İlk frame başarıyla eklendiğinde veya oynatma başladığında:
        if (noDataTimeoutRef.current) { // Zaman aşımını temizle
          clearTimeout(noDataTimeoutRef.current);
          noDataTimeoutRef.current = null;
        }
        setPlayerMessage(null); // Mesajı temizle (eğer gösteriliyorsa)
      }

      if (!isPlaying.current && bufferRef.current.length > 0) {
        isPlaying.current = true;
        lastRender.current = performance.now();
        rafRef.current = requestAnimationFrame(playLoop);
      }
    };

    socket.on("replay_frame", handleReplayFrame);
    // Backend'den gelebilecek "no_segments_found" gibi bir durumu da dinleyebiliriz
    const handleReplayStatus = (data: any) => {
      if (data.source_id === sourceId && data.status === 'no_segments_found') {
        if (noDataTimeoutRef.current) {
          clearTimeout(noDataTimeoutRef.current);
          noDataTimeoutRef.current = null;
        }
        setPlayerMessage(data.message || "Belirtilen aralıkta kayıt bulunamadı.");
        isPlaying.current = false; // Oynatmayı durdur
        bufferRef.current = []; // Buffer'ı temizle
      }
    };

    socket.on("replay_frame", handleReplayFrame);
    socket.on("replay_status", handleReplayStatus);
    // Cleanup fonksiyonu: Component unmount olduğunda veya bağımlılıklar değiştiğinde çalışır
    return () => {
      socket.off("replay_frame", handleReplayFrame); // Event listener'ı kaldır
      socket.off("replay_status", handleReplayStatus); // Event listener'ı kaldır
      isPlaying.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current); // Animasyon döngüsünü durdur
      bufferRef.current = []; // Buffer'ı temizle
    };
  }, [socket, sourceId, mode, playLoop]); // Bağımlılıklar

  // Replay'i başlatmak/durdurmak için backend'e socket event'i gönder
  useEffect(() => {
    if (!socket) return;

    // startTime değiştiğinde veya component ilk yüklendiğinde önceki oynatmayı durdur ve buffer'ı temizle
    isPlaying.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    bufferRef.current = [];
    setPlayerMessage(null);

    if (noDataTimeoutRef.current) {
      clearTimeout(noDataTimeoutRef.current);
      noDataTimeoutRef.current = null;
    }

    if (mode === "replay" && startTime && sourceId) {
      console.log(`ReplayPlayer: Emitting 'start_replay' for ${sourceId} at ${startTime}, fps: ${fps}`);
      socket.emit("start_replay", {
        source_id: sourceId,
        fps: fps,
        start: startTime,
        end: endTime, // Opsiyonel, backend bunu desteklemeli
      });
      noDataTimeoutRef.current = setTimeout(() => {
        if (!isPlaying.current && bufferRef.current.length === 0) {
          setPlayerMessage("Bu zaman aralığında oynatılacak kayıt bulunamadı veya veri alınamadı.");
        }
      }, 3000); // 5 saniye sonra kontrol et
    } else {
      // Eğer replay modunda değilse veya startTime yoksa (örn: component mount oldu ama startTime henüz gelmedi)
      // Güvenlik için stop_replay gönderilebilir, ama genellikle bu durum üst component tarafından yönetilir.
      // console.log(`ReplayPlayer: Not starting replay (mode: ${mode}, startTime: ${startTime}, sourceId: ${sourceId})`);
      // socket.emit("stop_replay", { source_id: sourceId }); // Bu satır gereksiz olabilir
    }

    // Cleanup: Component unmount olduğunda veya bağımlılıklar (startTime vb.) değiştiğinde
    // mevcut replay'i durdurmak için.
    return () => {
      if (socket && sourceId) {
        // console.log(`ReplayPlayer Cleanup: Emitting 'stop_replay' for ${sourceId}`);
        socket.emit("stop_replay", { source_id: sourceId });
      }
      if (noDataTimeoutRef.current) { // Component unmount olurken veya dependencies değişirken zaman aşımını temizle
        clearTimeout(noDataTimeoutRef.current);
        noDataTimeoutRef.current = null;
      }
      isPlaying.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      bufferRef.current = [];
      setPlayerMessage(null);
    };
  }, [mode, sourceId, fps, startTime, endTime, socket]); // Bağımlılıklar

  // Canvas elementinin boyutlarını ayarla
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Bu değerler videonun doğal en/boy oranına veya parent container'ın boyutlarına göre
      // dinamik olarak ayarlanabilir. CSS ile stil vermek de bir seçenektir.
      // Örnek sabit boyutlar:
      canvas.width = 640;
      canvas.height = 480;
      // Veya parent'a göre:
      // if (canvas.parentElement) {
      //   canvas.width = canvas.parentElement.clientWidth;
      //   canvas.height = canvas.parentElement.clientHeight;
      // }
    }
  }, []); // Sadece component mount olduğunda çalışır

  return (
    <div className="relative w-full h-full"> {/* Mesajı konumlandırmak için relative parent */}
      <canvas
        ref={canvasRef}
        className="w-full h-full bg-black object-contain"
      />
      {playerMessage && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white p-4 text-center z-10"
        // Stili isteğinize göre ayarlayın
        >
          <p>{playerMessage}</p>
        </div>
      )}
    </div>
  );
};