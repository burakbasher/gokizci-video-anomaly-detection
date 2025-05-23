// components/monitoring/MonitoringPanel.tsx

import { Play, Pause } from "lucide-react";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Device, TimelineMarker } from '@/app/lib/definitions';
import { VideoStream } from "../videoplayers/VideoStream";
import { ReplayPlayer } from "../videoplayers/ReplayPlayer";
import { MonitoringSideBar } from "./MonitoringSideBar";

interface ReplayMetaData {
    minute_anomaly_bits: number[];
    second_filled_bits: number[];
    window_start: string;
}

const VIDEO_DURATION_SECONDS = 3600;

interface MonitoringPanelProps {
    selectedDevice: string | null;
    onDeviceSelect: (device: string) => void;
    devices: Device[];
    sourceId: string;
    replayMeta: ReplayMetaData | null;
}

const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const formatTimeForLabel = (date: Date): string => {
    if (!date || isNaN(date.getTime())) {
        return "--:--";
    }
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export function MonitoringPanel({ selectedDevice, onDeviceSelect, devices, sourceId, replayMeta }: MonitoringPanelProps) {
    // ... (diğer state'ler ve fonksiyonlar aynı kalacak) ...
    const [mode, setMode] = useState<"live" | "replay">("live");
    const [currentTime, setCurrentTime] = useState(0);
    const [replayPlayerStartTime, setReplayPlayerStartTime] = useState<string | undefined>(undefined);
    const [isReplayPlaying, setIsReplayPlaying] = useState(false);

    const progressBarRef = useRef<HTMLDivElement>(null);
    const prevReplayMetaWindowStartRef = useRef<string | null | undefined>(null);


    // --- Memoized Values ---
    const timelineAnomalyMarkers = useMemo((): TimelineMarker[] => {
        if (mode === "live" || !replayMeta?.minute_anomaly_bits) return [];
        return replayMeta.minute_anomaly_bits.reduce((acc, bit, minuteIndex) => {
            if (bit === 1) {
                // Her bir anomali marker'ı o dakikanın başlangıcını işaret eder.
                // Genişlik, render sırasında 1 dakikaya göre hesaplanacak.
                acc.push({
                    time: minuteIndex * 60, // Dakikanın başlangıç saniyesi
                    label: `Dakika ${formatTime(minuteIndex * 60)}`
                });
            }
            return acc;
        }, [] as TimelineMarker[]);
    }, [replayMeta, mode]);

    const windowTimeLabel = useMemo(() => {
        if (replayMeta?.window_start) {
            const start = new Date(replayMeta.window_start);
            const end = new Date(start.getTime() + VIDEO_DURATION_SECONDS * 1000);
            return `${formatTimeForLabel(start)} - ${formatTimeForLabel(end)}`;
        }
        return "Son 1 Saat";
    }, [replayMeta]);

    // --- Callback Functions ---
    const updateReplayPlayerState = useCallback((timeInWindow: number) => {
        if (!replayMeta?.window_start) return;

        const newValidTime = Math.max(0, Math.min(Math.floor(timeInWindow), VIDEO_DURATION_SECONDS));
        setCurrentTime(newValidTime);

        const windowStartDate = new Date(replayMeta.window_start);
        const actualReplayTime = new Date(windowStartDate.getTime() + newValidTime * 1000);
        setReplayPlayerStartTime(actualReplayTime.toISOString());
    }, [replayMeta]);

    const switchToLiveMode = useCallback(() => {
        setMode("live");
    }, []);

    const switchToReplayMode = useCallback((startTimeInWindow?: number) => {
        if (!replayMeta || !replayMeta.second_filled_bits) return;
        
        setMode("replay");
        const targetTime = typeof startTimeInWindow === 'number' 
            ? startTimeInWindow 
            : replayMeta.second_filled_bits.findIndex(bit => bit === 1);
        
        if (targetTime !== -1) {
            updateReplayPlayerState(targetTime);
            setIsReplayPlaying(true);
        } else {
            updateReplayPlayerState(0);
            setIsReplayPlaying(false);
        }
    }, [replayMeta, updateReplayPlayerState]);


    const handlePlayPauseToggle = useCallback(() => {
        if (mode === "replay") {
            setIsReplayPlaying(prev => !prev);
        }
    }, [mode]);

    const handleSeek = useCallback((timeInWindow: number) => {
        if (mode === "live" || !replayMeta) return;
        updateReplayPlayerState(timeInWindow);
        setIsReplayPlaying(true); // Seek sonrası oynatmaya başla/devam et
    }, [mode, replayMeta, updateReplayPlayerState]);

    const handleProgressBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (mode !== "replay" || !replayMeta?.second_filled_bits || !progressBarRef.current) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const rawTimeInWindow = (clickX / rect.width) * VIDEO_DURATION_SECONDS;
        const timeInWindowSeconds = Math.floor(rawTimeInWindow);

        if (replayMeta.second_filled_bits[timeInWindowSeconds] === 1) {
            handleSeek(timeInWindowSeconds);
        } else {
            console.warn(`No recording at second ${timeInWindowSeconds} in the current window.`);
        }
    }, [mode, replayMeta, handleSeek]);

    const handleReplayPlaybackStatusChange = useCallback((newIsPlayingStatus: boolean) => {
        setIsReplayPlaying(newIsPlayingStatus);
    }, []);


    // --- useEffect Hooks ---
    useEffect(() => {
        if (mode === "live") {
            setCurrentTime(VIDEO_DURATION_SECONDS);
            setIsReplayPlaying(false);
            setReplayPlayerStartTime(undefined);
        } else { // mode === "replay"
            // Replay moduna ilk geçişte veya meta güncellendiğinde başlangıç zamanını ayarla
            if (!replayPlayerStartTime && replayMeta?.window_start) {
                 const firstFilledSecond = replayMeta.second_filled_bits.findIndex(bit => bit === 1);
                 const initialSeekTime = firstFilledSecond !== -1 ? firstFilledSecond : 0;
                 updateReplayPlayerState(initialSeekTime);
                 // Otomatik oynatma isteniyorsa: setIsReplayPlaying(true);
            } else if (!replayMeta) {
                 setCurrentTime(0);
                 setReplayPlayerStartTime(undefined);
                 setIsReplayPlaying(false);
            }
        }
    }, [mode, replayMeta, replayPlayerStartTime, updateReplayPlayerState]); // replayPlayerStartTime eklendi

    // Meta penceresi değiştiğinde (farklı saat dilimine geçildiğinde)
    useEffect(() => {
        if (mode === "replay" && replayMeta?.window_start) {
            prevReplayMetaWindowStartRef.current = replayMeta.window_start;
            const firstFilledSecond = replayMeta.second_filled_bits.findIndex(bit => bit === 1);
            const initialSeekTime = firstFilledSecond !== -1 ? firstFilledSecond : 0;
            updateReplayPlayerState(initialSeekTime);
            // Oynatma durumunu koruyabilir veya yeni pencere için sıfırlayabiliriz.
            // Örneğin, yeni pencereye geçince duraklat: setIsReplayPlaying(false);
            // Veya yeni pencerede de otomatik oynat (eğer veri varsa):
            // setIsReplayPlaying(firstFilledSecond !== -1);
            setIsReplayPlaying(false);
        } else if (mode === "replay" && !replayMeta) {
            // Replay modundayız ama meta null oldu (örn: API hatası veya seçim yok)
            setCurrentTime(0);
            setReplayPlayerStartTime(undefined);
            setIsReplayPlaying(false);
            prevReplayMetaWindowStartRef.current = null;
        }
    }, [replayMeta, mode, updateReplayPlayerState]);


    return (
            <div className="flex flex-col flex-1 pt-7 pb-7 pr-7">
                <div className="flex flex-row gap-3 h-full">
                    <div className="flex flex-col flex-1 gap-3">
                        {/* Mode Buttons */}
                        <div className="flex gap-2 mb-2">
                            <button
                                className={`px-3 py-1 rounded ${mode === "live" ? "bg-primary text-white" : "bg-gray-200 text-primary hover:bg-gray-300"}`}
                                onClick={switchToLiveMode}
                            >
                                Live
                            </button>
                            <button
                                className={`px-3 py-1 rounded ${mode === "replay" ? "bg-primary text-white" : "bg-gray-200 text-primary hover:bg-gray-300"}`}
                                onClick={() => switchToReplayMode()}
                                disabled={!replayMeta?.window_start || (replayMeta && replayMeta.second_filled_bits.every(bit => bit === 0))}
                            >
                                Replay
                            </button>
                        </div>

                        {/* Video Player Area */}
                        <div className="bg-black rounded-lg shadow-sm overflow-hidden relative aspect-video flex items-center justify-center hover:shadow-md transition-all">
                            {mode === "live" ? (
                                <VideoStream key={`live-player-${sourceId}`} sourceId={sourceId} />
                            ) : (
                                replayPlayerStartTime && (
                                    <ReplayPlayer
                                        key={`replay-player-${sourceId}-${replayPlayerStartTime}`}
                                        sourceId={sourceId}
                                        mode={mode}
                                        startTime={replayPlayerStartTime}
                                        fps={20}
                                        isPlaying={isReplayPlaying}
                                    />
                                )
                            )}
                            {/* Player Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent flex items-center gap-2">
                                <button 
                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white opacity-75 hover:opacity-100 disabled:opacity-50"
                                    onClick={handlePlayPauseToggle}
                                    disabled={mode === 'live'}
                                    title={isReplayPlaying && mode === 'replay' ? "Duraklat" : "Oynat"}
                                >
                                    {isReplayPlaying && mode === 'replay' ? (
                                        <Pause className="w-6 h-6 hover:scale-110 transition-transform" />
                                    ) : (
                                        <Play className="w-6 h-6 hover:scale-110 transition-transform" />
                                    )}
                                </button>
                                <div
                                    ref={progressBarRef}
                                    className={`flex-1 mx-2 h-3 ${mode === 'live' ? 'bg-gray-500' : 'bg-gray-700'} rounded-full relative ${mode === 'replay' ? 'cursor-pointer' : 'cursor-default'} overflow-hidden group`}
                                    onClick={handleProgressBarClick}
                                >
                                    {/* Dolu segmentler (arka plan) */}
                                    {mode === "replay" && replayMeta?.second_filled_bits.map((bit, index) => (
                                        bit === 1 && (
                                            <div
                                                key={`filled-${index}`}
                                                className="absolute top-0 h-full bg-gray-500"
                                                style={{
                                                    left: `${(index / VIDEO_DURATION_SECONDS) * 100}%`,
                                                    width: `${(1 / VIDEO_DURATION_SECONDS) * 100}%`, // Her bir dolu saniye için 1 saniyelik genişlik
                                                    zIndex: 1,
                                                }}
                                            />
                                        )
                                    ))}
                                    {/* Anomali markerları (Genişletilmiş) */}
                                    {mode === "replay" && timelineAnomalyMarkers.map((marker, i) => {
                                        const anomalyDurationSeconds = 60; // Her anomali 1 dakika (60 saniye) sürer
                                        const markerWidthPercentage = (anomalyDurationSeconds / VIDEO_DURATION_SECONDS) * 100;
                                        const markerLeftPercentage = (marker.time / VIDEO_DURATION_SECONDS) * 100;

                                        return (
                                            <div
                                                key={`anomaly-block-marker-${i}`}
                                                className="absolute top-0 h-full bg-red-500 opacity-60 hover:opacity-80 cursor-pointer" // Opaklık ve hover efekti
                                                style={{
                                                    left: `${markerLeftPercentage}%`,
                                                    width: `${markerWidthPercentage}%`, // 1 dakikalık genişlik
                                                    zIndex: 3, // Dolu segmentlerin üzerinde, ilerleme çubuğunun altında
                                                }}
                                                title={marker.label}
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    handleSeek(marker.time); // Anomali bloğunun başına git
                                                }}
                                            />
                                        );
                                    })}
                                    {/* İlerleme çubuğu (beyaz çizgi/top) */}
                                    <div
                                        className="absolute top-0 h-full bg-white rounded-full"
                                        style={{
                                            width: `${(currentTime / VIDEO_DURATION_SECONDS) * 100}%`,
                                            zIndex: 4, // Anomali bloklarının üzerinde olmalı
                                        }}
                                    />
                                </div>
                                <span className="text-white text-xs select-none w-32 text-center tabular-nums">
                                    {mode === 'live' ? 'CANLI 🔴' : `${formatTime(currentTime)} / ${windowTimeLabel}`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Anomaly List */}
                    <div className="w-48 bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md p-4 flex flex-col gap-2">
                        <h2 className="text-lg font-semibold text-primary mb-2">Anomaliler</h2>
                        {mode === "replay" && timelineAnomalyMarkers.length > 0 ? (
                            <ul className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-300px)] pr-1">
                                {timelineAnomalyMarkers.map((bm, i) => (
                                    <li key={`bookmark-${i}`}>
                                        <button
                                            className="w-full flex flex-row items-center gap-2 px-3 py-1.5 rounded-lg text-left bg-primary text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light transition-colors text-sm"
                                            onClick={() => handleSeek(bm.time)}
                                        >
                                            {bm.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 text-center mt-4">
                                {mode === "replay" ? "Bu aralıkta anomali bulunamadı." : "Anomaliler replay modunda gösterilir."}
                            </p>
                        )}
                    </div>
                </div>
            </div>
    );
}