// components/videoplayers/VideoStream.tsx

"use client";

import { useEffect, useRef, useCallback } from "react"; // useCallback eklendi
import { useVideoSocket } from "../hooks/useVideoSocket";

interface VideoFrameData {
  bitmap: ImageBitmap;
  clientTimestampRel: number; // Kaynaktan gelen, akış başlangıcına göre ms cinsinden zaman damgası
  clientSequence: number;     // Kaynaktan gelen sıra numarası (debug için faydalı)
}

interface VideoStreamProps {
  sourceId: string;
  onAnomalyDetected?: (detected: boolean) => void;
  onStatusChange?: (status: "online" | "offline" | "error") => void;
}

const TARGET_FPS = 20; // Hedeflenen oynatma FPS'i
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS; // İki frame arası ideal süre (ms)

// Buffer Eşikleri
const MIN_BUFFER_DURATION_MS = 200; // Oynatmaya başlamak için buffer'da en az 200ms'lik video olmalı
const MAX_BUFFER_DURATION_MS = 2000; // Buffer'da en fazla 2 saniyelik video tutulsun (gecikmeyi sınırlar)
const CATCH_UP_THRESHOLD_MS = 1000; // Oynatma, canlıdan 1 saniye gerideyse hızlanmaya çalış
const JUMP_FORWARD_THRESHOLD_MS = 3000; // Oynatma, canlıdan 3 saniye gerideyse ileri sar (frame atla)


export const VideoStream = ({
  sourceId,
  onAnomalyDetected,
  onStatusChange,
}: VideoStreamProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isSocketConnected, socket } = useVideoSocket({
    sourceId,
    onAnomalyDetected,
    onStatusChange,
  });

  const frameBufferRef = useRef<VideoFrameData[]>([]);
  const isPlayingRef = useRef(false);
  const rafRef = useRef<number>();
  
  const videoClockStartTimeRef = useRef<number | null>(null); // performance.now() - Tarayıcı zamanı
  const firstFrameClientRelTsRef = useRef<number | null>(null); // Buffer'daki ilk frame'in clientTimestampRel'i

  // Canvas boyutu
  useEffect(() => {
    const c = canvasRef.current;
    if (c) {
      c.width = 640; // Veya dinamik boyutlandırma
      c.height = 480;
    }
  }, []);

  const addFrameToBuffer = useCallback((bitmap: ImageBitmap, clientTimestampRel: number, clientSequence: number) => {
    // Yeni frame'i ekle
    frameBufferRef.current.push({ bitmap, clientTimestampRel, clientSequence });
    // Buffer'ı zaman damgasına göre sıralı tut
    frameBufferRef.current.sort((a, b) => a.clientTimestampRel - b.clientTimestampRel);

    // Max buffer süresini aşan eski frame'leri at
    if (frameBufferRef.current.length > 1) {
      const currentBufferDuration = frameBufferRef.current[frameBufferRef.current.length - 1].clientTimestampRel - frameBufferRef.current[0].clientTimestampRel;
      while (currentBufferDuration > MAX_BUFFER_DURATION_MS && frameBufferRef.current.length > 1) {
        const oldestFrame = frameBufferRef.current.shift();
        oldestFrame?.bitmap.close();
        if (frameBufferRef.current.length <= 1) break;
        // currentBufferDuration'ı yeniden hesapla (opsiyonel, ama döngü koşulu için önemli)
      }
    }

    // Oynatmayı başlatma koşulu
    if (!isPlayingRef.current && frameBufferRef.current.length > 0) {
        const bufferDuration = frameBufferRef.current[frameBufferRef.current.length - 1].clientTimestampRel - frameBufferRef.current[0].clientTimestampRel;
        if (bufferDuration >= MIN_BUFFER_DURATION_MS) {
            console.log(`VideoStream: Starting playback for ${sourceId}. Buffer duration: ${bufferDuration}ms`);
            isPlayingRef.current = true;
            videoClockStartTimeRef.current = performance.now();
            firstFrameClientRelTsRef.current = frameBufferRef.current[0].clientTimestampRel;
            rafRef.current = requestAnimationFrame(drawLoop);
        }
    }
  }, []);


  // Frame decode + buffer'a ekle
  useEffect(() => {
    if (!socket) return;

    const handler = async (data: any) => { // Sunucudan gelen 'processed_frame' payload'ı
      if (data.source_id !== sourceId) return;

      const clientTimestampRel = data.client_timestamp_rel;
      const clientSequence = data.client_sequence;

      if (typeof clientTimestampRel !== 'number' || typeof clientSequence !== 'number') {
        console.warn(`VideoStream: Received frame for ${sourceId} without valid client_timestamp_rel or client_sequence. Data:`, data);
        return;
      }

      try {
        // data.frame'in ArrayBuffer olduğunu varsayalım (önceki tartışmalara göre)
        // Eğer base64 string ise, atob ve Blob oluşturma adımları burada olmalı.
        let bitmap: ImageBitmap | null = null;
        if (data.frame instanceof ArrayBuffer) {
            const blob = new Blob([data.frame], { type: "image/jpeg" });
            bitmap = await createImageBitmap(blob);
        } else if (typeof data.frame === 'string') { // Fallback for base64 string
            const bin = atob(data.frame);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            const blob = new Blob([bytes], { type: "image/jpeg" });
            bitmap = await createImageBitmap(blob);
        } else {
            console.error(`VideoStream: Unknown frame data type for ${sourceId}:`, typeof data.frame);
            return;
        }
        
        if (bitmap) {
            addFrameToBuffer(bitmap, clientTimestampRel, clientSequence);
        }

      } catch (e) {
        console.error(`VideoStream: Error processing or decoding frame for ${sourceId}, Seq: ${clientSequence}. Error:`, e);
      }
    };

    socket.on("processed_frame", handler);
    return () => {
      socket?.off("processed_frame", handler);
      isPlayingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [socket, sourceId, addFrameToBuffer]);


  // Çizim döngüsü
  const drawLoop = useCallback((timestamp: number) => { // timestamp = performance.now()
    if (!isPlayingRef.current) {
      // Oynamıyorsa ama buffer'da yeterli veri varsa tekrar başlatmayı dene
      if (frameBufferRef.current.length > 0) {
        const bufferDuration = frameBufferRef.current[frameBufferRef.current.length - 1].clientTimestampRel - frameBufferRef.current[0].clientTimestampRel;
        if (bufferDuration >= MIN_BUFFER_DURATION_MS) {
            console.log(`VideoStream: Re-starting playback for ${sourceId}.`);
            isPlayingRef.current = true;
            videoClockStartTimeRef.current = performance.now();
            firstFrameClientRelTsRef.current = frameBufferRef.current[0].clientTimestampRel;
        }
      }
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    if (!videoClockStartTimeRef.current || firstFrameClientRelTsRef.current === null) {
      rafRef.current = requestAnimationFrame(drawLoop);
      return;
    }

    // Tarayıcı zamanına göre o an oynatılması gereken video zamanı (kaynak istemcinin göreceli zamanı cinsinden)
    const targetClientRelTs = firstFrameClientRelTsRef.current + (timestamp - videoClockStartTimeRef.current);

    let frameToRender: VideoFrameData | null = null;
    let framesToDiscardCount = 0;

    // Buffer'da, zamanı gelmiş veya en yakın olan frame'i bul
    // Ve çok geride kalmışsak eski frame'leri atla (catch-up)
    while (frameBufferRef.current.length > 0) {
      const nextFrameInBuffer = frameBufferRef.current[0];
      if (nextFrameInBuffer.clientTimestampRel <= targetClientRelTs) {
        // Bu frame'in zamanı gelmiş veya geçmiş
        frameToRender = frameBufferRef.current.shift()!; // Al ve buffer'dan çıkar
        if (frameToRender.clientTimestampRel < targetClientRelTs - JUMP_FORWARD_THRESHOLD_MS && frameBufferRef.current.length > 0) {
          // Çok gerideyiz ve buffer'da daha yeni frame'ler var, bu frame'i atla (jump)
          // console.log(`VideoStream: Jumping. Discarding frame Seq ${frameToRender.clientSequence} (ts ${frameToRender.clientTimestampRel}) to catch up to target ${targetClientRelTs.toFixed(0)}`);
          frameToRender.bitmap.close();
          framesToDiscardCount++;
          frameToRender = null; // Bir sonrakine bak
          // videoClockStartTimeRef ve firstFrameClientRelTsRef'i de resetleyebiliriz burada
          if (frameBufferRef.current.length > 0) {
            videoClockStartTimeRef.current = performance.now();
            firstFrameClientRelTsRef.current = frameBufferRef.current[0].clientTimestampRel;
          }
          continue;
        }
        break; // Oynatılacak frame bulundu
      } else {
        // Buffer'daki ilk frame'in zamanı henüz gelmemiş, bekleyelim.
        break;
      }
    }

    if (framesToDiscardCount > 0) {
        console.log(`VideoStream: Discarded ${framesToDiscardCount} frames for ${sourceId} to catch up.`);
    }

    if (frameToRender) {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(frameToRender.bitmap, 0, 0, canvasRef.current.width, canvasRef.current.height);
        // console.debug(`VideoStream: Rendered frame Seq ${frameToRender.clientSequence} (ts ${frameToRender.clientTimestampRel}) for target ${targetClientRelTs.toFixed(0)}`);
      }
      frameToRender.bitmap.close();
    } else if (frameBufferRef.current.length === 0) {
        // console.debug(`VideoStream: Buffer empty for ${sourceId}. Waiting for frames. Target ts: ${targetClientRelTs.toFixed(0)}`);
        // Oynatmayı duraklat, MIN_BUFFER_DURATION_MS'e ulaşınca tekrar başlar
        isPlayingRef.current = false;
    }


    // Bir sonraki frame için döngüyü ayarla
    // İdeal olarak FRAME_INTERVAL_MS sonra çalışmalı, ama requestAnimationFrame tarayıcıya bırakır.
    // Bu yüzden `targetClientRelTs` hesaplaması `performance.now()`'a dayanır.
    rafRef.current = requestAnimationFrame(drawLoop);
  }, [sourceId]); // Bağımlılıklar eklendi


  // Unmount temizliği
  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      frameBufferRef.current.forEach(f => f.bitmap.close());
      frameBufferRef.current = [];
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain bg-black"
      />
    </div>
  );
};