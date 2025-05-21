// components/monitoring/MonitoringPanel.tsx

import { Maximize, Play } from "lucide-react";
// ... (diğer importlar aynı)
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Device, TimelineMarker } from '@/app/lib/definitions';
import { VideoStream } from "../videoplayers/VideoStream";
import { ReplayPlayer } from "../videoplayers/ReplayPlayer";
import { MonitoringSideBar } from "./MonitoringSideBar";
// ... (interface ReplayMetaData ve const MOCK_DATA aynı)
interface ReplayMetaData {
    minute_anomaly_bits: number[];
    second_filled_bits: number[];
    window_start: string;
}

const MOCK_DATA = {
    videoDuration: 3600, // Her zaman 1 saatlik pencere
};

interface MonitoringPanelProps {
    selectedDevice: string | null;
    onDeviceSelect: (device: string) => void;
    devices: Device[];
    sourceId: string;
    replayMeta: ReplayMetaData | null;
}


export function MonitoringPanel({ selectedDevice, onDeviceSelect, devices, sourceId, replayMeta }: MonitoringPanelProps) {
    // ... (state'ler ve useEffect'ler büyük ölçüde aynı kalacak)
    const [mode, setMode] = useState<"live" | "replay">("live");
    const [currentTime, setCurrentTime] = useState(0);
    const [replayPlayerStartTime, setReplayPlayerStartTime] = useState<string | undefined>(undefined);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const prevWindowStartRef = useRef<string | null | undefined>(null);

    const videoDuration = MOCK_DATA.videoDuration;

    useEffect(() => {
        if (mode === "live") {
            setCurrentTime(videoDuration);
        }
    }, [mode, videoDuration]);

    useEffect(() => {
        if (replayMeta && replayMeta.window_start !== prevWindowStartRef.current) {
            if (mode === "replay") {
                setCurrentTime(0);
                setReplayPlayerStartTime(new Date(replayMeta.window_start).toISOString());
            }
            prevWindowStartRef.current = replayMeta.window_start;
        } else if (!replayMeta && prevWindowStartRef.current) {
            if (mode === "replay") {
                setCurrentTime(0);
                setReplayPlayerStartTime(undefined);
            }
            prevWindowStartRef.current = null;
        }
    }, [replayMeta, mode]);

    const timelineAnomalyMarkers = useMemo((): TimelineMarker[] => {
        if (mode === "live" || !replayMeta || !replayMeta.minute_anomaly_bits) return [];
        return replayMeta.minute_anomaly_bits.reduce((acc, bit, index) => {
            if (bit === 1) {
                acc.push({
                    time: index * 60,
                    label: `Anomaly around minute ${index + 1}`
                });
            }
            return acc;
        }, [] as TimelineMarker[]);
    }, [replayMeta, mode]);

    const handleSeek = (timeInWindow: number) => {
        if (mode === "live") return;
        const newTimeInWindow = Math.max(0, Math.min(Math.floor(timeInWindow), videoDuration));
        setCurrentTime(newTimeInWindow);

        if (replayMeta?.window_start) {
            const windowStartDate = new Date(replayMeta.window_start);
            const actualReplayTime = new Date(windowStartDate.getTime() + newTimeInWindow * 1000);
            setReplayPlayerStartTime(actualReplayTime.toISOString());
        } else {
            const now = Date.now();
            const pseudoWindowStart = now - videoDuration * 1000;
            const actualReplayTime = new Date(pseudoWindowStart + newTimeInWindow * 1000);
            setReplayPlayerStartTime(actualReplayTime.toISOString());
        }
    };

    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (mode === "live" || !replayMeta || !replayMeta.second_filled_bits) return; // Meta yoksa veya live modundaysa çık

        if (progressBarRef.current) {
            const rect = progressBarRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const rawTimeInWindow = (clickX / rect.width) * videoDuration;
            const timeInWindowSeconds = Math.floor(rawTimeInWindow);

            // Tıklanan saniyede kayıt var mı kontrol et
            if (replayMeta.second_filled_bits[timeInWindowSeconds] !== 1) {
                console.warn(`No recording at second ${timeInWindowSeconds} in the current window.`);
                // Opsiyonel: Kullanıcıya bildirim göster
                // toast.info("Bu saniyede kayıt bulunmuyor.");
                return; // Kayıt yoksa seek işlemini yapma
            }

            setMode("replay");
            handleSeek(timeInWindowSeconds); // Sadece doluysa seek yap
        }
    };

    // Replay butonuna tıklandığında
    const handleReplayButtonClick = () => {
        if (!replayMeta || !replayMeta.window_start) {
            // toast.error("Replay için meta verisi yüklenemedi.");
            return;
        }

        // Penceredeki ilk dolu saniyeyi bul
        const firstFilledSecond = replayMeta.second_filled_bits.findIndex(bit => bit === 1);

        if (firstFilledSecond === -1) {
            // toast.info("Bu saat aralığında hiç kayıt bulunmuyor.");
            // Replay butonunu disable etmek daha iyi olabilir
            return;
        }
        setMode("replay");
        handleSeek(firstFilledSecond); // İlk dolu saniyeden başlat
    };

    // Pencere zaman etiketi
    const windowTimeLabel = useMemo(() => {
        if (replayMeta?.window_start) {
            const start = new Date(replayMeta.window_start);
            const end = new Date(start.getTime() + videoDuration * 1000); // videoDuration saniye cinsinden
            return `${formatTimeForLabel(start)} - ${formatTimeForLabel(end)}`;
        }
        return "Son 1 Saat"; // Fallback
    }, [replayMeta, videoDuration]);


    return (
        <div className="flex pb-5 h-full"> {/* h-full eklendi */}
            <div className="flex w-72">
                <MonitoringSideBar
                    selectedDevice={selectedDevice}
                    onDeviceSelect={onDeviceSelect}
                    anomalyRateEnabled={false}
                    onToggleAnomalyRate={() => { }}
                />
            </div>

            <div className="flex flex-col flex-1 pt-7 pb-7 pr-7">
                {/* Pencere Zaman Etiketi BURADAN KALDIRILDI */}
                {/* <div className="mb-2 text-sm text-gray-600"> ... </div> */}
                <div className="flex flex-row gap-3 h-full"> {/* h-full eklendi */}
                    <div className="flex flex-col flex-1 gap-3">
                        <div className="flex gap-2 mb-2">
                            <button
                                className={`px-3 py-1 rounded ${mode === "live" ? "bg-primary text-white" : "bg-gray-200"}`}
                                onClick={() => setMode("live")}
                            >
                                Live
                            </button>
                            <button
                                className={`px-3 py-1 rounded ${mode === "replay" ? "bg-primary text-white" : "bg-gray-200"}`}
                                onClick={() => {handleReplayButtonClick}}
                                disabled={!replayMeta?.window_start || (replayMeta && replayMeta.second_filled_bits.every(bit => bit === 0))}  // Hiç dolu saniye yoksa disable
                            >
                                Replay
                            </button>
                        </div>
                        <div className="bg-black rounded-lg shadow-sm overflow-hidden relative aspect-video flex items-center justify-center hover:shadow-md transition-all">
                            {mode === "live" ? (
                                <VideoStream key={`live-player-${sourceId}`} sourceId={sourceId} />
                            ) : (
                                <ReplayPlayer
                                    key={`replay-player-${sourceId}-${replayPlayerStartTime}`}
                                    sourceId={sourceId}
                                    mode={mode}
                                    startTime={replayPlayerStartTime}
                                    fps={15}
                                />
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent flex items-center gap-2">
                                <button className="w-10 h-10 rounded-full flex items-center justify-center text-white">
                                    <Play className="w-6 h-6 hover:h-7 hover:w-7 transition-all" />
                                </button>
                                <div
                                    ref={progressBarRef}
                                    className={`flex-1 mx-2 h-3 ${mode === 'live' ? 'bg-gray-400' : 'bg-gray-600'} rounded-full relative ${mode === 'replay' ? 'cursor-pointer' : 'cursor-default'} overflow-hidden`}
                                    onClick={mode === 'replay' ? handleProgressBarClick : undefined}
                                >
                                    {/* ... (dolu segmentler, ilerleme çubuğu, anomali markerları aynı) ... */}
                                    {mode === "replay" && replayMeta && replayMeta.second_filled_bits.map((bit, index) => {
                                        if (bit === 1) {
                                            const segmentWidth = (1 / videoDuration) * 100;
                                            const segmentLeft = (index / videoDuration) * 100;
                                            return (
                                                <div
                                                    key={`filled-${index}`}
                                                    className="absolute top-0 h-full bg-gray-400"
                                                    style={{
                                                        left: `${segmentLeft}%`,
                                                        width: `${segmentWidth}%`,
                                                        zIndex: 1,
                                                    }}
                                                />
                                            );
                                        }
                                        return null;
                                    })}
                                    <div
                                        className="absolute top-0 h-full bg-white rounded-full"
                                        style={{
                                            width: `${(currentTime / videoDuration) * 100}%`,
                                            zIndex: 2,
                                        }}
                                    />
                                    {mode === "replay" && timelineAnomalyMarkers.map((marker, i) => (
                                        <div
                                            key={`anomaly-marker-${i}`}
                                            className="absolute top-0 h-full w-1 bg-red-500 opacity-75"
                                            style={{
                                                left: `${(marker.time / videoDuration) * 100}%`,
                                                zIndex: 3,
                                            }}
                                            title={marker.label}
                                        />
                                    ))}
                                </div>
                                <span className="text-white text-xs select-none w-28 text-center"> {/* Genişlik ve hizalama ayarlandı */}
                                    {mode === 'live' ? 'CANLI 🔴' :
                                        replayMeta?.window_start ? `${formatTime(currentTime)} / ${windowTimeLabel}` : `${formatTime(currentTime)} / ${formatTime(videoDuration)}`
                                    }
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="w-40 bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md p-4 flex flex-col gap-2">
                        <h2 className="text-lg font-bold text-primary mb-2">Anomaliler</h2>
                        {mode === "replay" && timelineAnomalyMarkers.length > 0 ? (
                            <ul className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-300px)]">
                                {timelineAnomalyMarkers.map((bm, i) => (
                                    <li key={`bookmark-${i}`}>
                                        <button
                                            className="w-full flex flex-row items-center gap-2 px-2 py-1 rounded-lg text-left bg-primary text-white hover:bg-primary-dark transition-colors text-sm"
                                            onClick={() => handleSeek(bm.time)}
                                        >
                                            {bm.label || `Anomaly at ${formatTime(bm.time)}`}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : mode === "replay" ? (
                            <p className="text-sm text-gray-500">Bu aralıkta anomali bulunamadı.</p>
                        ) : (
                            <p className="text-sm text-gray-500">Anomaliler replay modunda gösterilir.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTimeForLabel(date: Date): string {
    if (!date || isNaN(date.getTime())) { // Geçersiz tarih kontrolü
        return "--:--";
    }
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}