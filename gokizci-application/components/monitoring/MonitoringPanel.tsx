"components/monitoring/MonitoringPanel.tsx"

import { Maximize, Play } from "lucide-react";
import { VideoStream } from "../videoplayers/VideoStream";
import { ReplayPlayer } from "../videoplayers/ReplayPlayer";
import { MonitoringSideBar } from "./MonitoringSideBar";
import React, { useState, useEffect } from "react";
import { Device } from '@/app/lib/definitions';
import { fetchReplayMeta } from '@/app/lib/api';

// Mock data - ileride backend'den gelecek
const MOCK_DATA = {
    videoDuration: 3600, // demo: 1 saat = 3600s
    timelineMarkers: [
        { time: 10, label: "Anomaly 1" },
        { time: 34, label: "Anomaly 2" },
        { time: 60, label: "Anomaly 3" },
    ],
    timelineThumbnails: [
        { time: 0, src: "https://placehold.co/120x80?text=0:00" },
        { time: 20, src: "https://Fplacehold.co/120x80?text=0:20" },
        { time: 40, src: "https://placehold.co/120x80?text=0:40" },
        { time: 60, src: "https://placehold.co/120x80?text=1:00" },
        { time: 80, src: "https://placehold.co/120x80?text=1:20" },
    ],
    bookmarks: [
        { time: 10, label: "Anomaly 1" },
        { time: 34, label: "Anomaly 2" },
        { time: 60, label: "Anomaly 3" },
    ],
};

interface MonitoringPanelProps {
    selectedDevice: string | null;
    onDeviceSelect: (device: string) => void;
    devices: Device[];
    sourceId: string;
}

export function MonitoringPanel({ selectedDevice, onDeviceSelect, devices, sourceId }: MonitoringPanelProps) {
    const [mode, setMode] = useState<"live" | "replay">("live");
    const [currentTime, setCurrentTime] = useState(0);
    const [replayStartTime, setReplayStartTime] = useState<string | undefined>(undefined);
    const [meta, setMeta] = useState<{ minute_anomaly_bits: number[]; second_filled_bits: number[]; window_start: string } | null>(null);

    // Replay meta verisini çek
    useEffect(() => {
        if (!sourceId) return;
        const now = new Date();
        const windowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0).toISOString();
        fetchReplayMeta(sourceId, windowStart).then(setMeta).catch(() => setMeta(null));
    }, [sourceId]);

    // Replay moduna geçiş için yardımcı fonksiyon
    const handleSeek = (time: number) => {
        setCurrentTime(time);
        const iso = new Date(Date.now() - (MOCK_DATA.videoDuration - time) * 1000).toISOString();
        setReplayStartTime(iso);
        setMode("replay");
    };

    // Live modunda zamanı güncelle
    useEffect(() => {
        if (mode === "live") {
            const interval = setInterval(() => {
                setCurrentTime(prev => (prev + 1) % MOCK_DATA.videoDuration);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [mode]);

    return (
        <div className="flex pb-5">
            {/* Sidebar */}
            <MonitoringSideBar
                selectedDevice={selectedDevice}
                onDeviceSelect={onDeviceSelect}
                anomalyRateEnabled={false}
                onToggleAnomalyRate={() => { }}
            />
            {/* Main Content */}
            <div className="flex flex-col flex-1 pt-7 pb-7 pr-7">
                <div className="flex flex-row gap-3">
                    {/* Video Player & Timeline */}
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
                                onClick={() => setMode("replay")}
                                disabled={!replayStartTime}
                            >
                                Replay
                            </button>
                        </div>
                        <div className="bg-black rounded-lg shadow-sm overflow-hidden relative aspect-video flex items-center justify-center hover:shadow-md transition-all">
                            {/* Replay Bar */}
                            {meta && (
                                <div className="absolute left-0 right-0 top-0 h-3 flex z-20 cursor-pointer" style={{margin: 4}}>
                                    {Array.from({ length: 60 }).map((_, i) => {
                                        const anomaly = meta.minute_anomaly_bits[i] === 1;
                                        // O dakikada en az 1 saniye doluysa dolu say
                                        const filled = meta.second_filled_bits.slice(i * 60, (i + 1) * 60).some(b => b === 1);
                                        let color = '#bbb';
                                        if (anomaly) color = '#e11d48'; // kırmızı
                                        else if (filled) color = '#22c55e'; // yeşil
                                        return (
                                            <div
                                                key={i}
                                                title={`Dakika ${i}`}
                                                style={{ flex: 1, height: '100%', background: color, marginLeft: i === 0 ? 0 : 1, borderRadius: 2, transition: 'background 0.2s' }}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    handleSeek(i * 60);
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            {/* Video Player */}
                            {mode === "live" ? (
                                <VideoStream key="live-player" sourceId={sourceId} />
                            ) : (
                                <ReplayPlayer
                                    key="replay-player"
                                    sourceId={sourceId}
                                    mode={mode}
                                    startTime={replayStartTime}
                                    fps={15}
                                />
                            )}
                            {/* Controls (placeholder) */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary to-transparent flex items-center gap-2">
                                <button className="w-10 h-10 rounded-full flex items-center justify-center text-white">
                                    <Play className="w-6 h-6 hover:h-7 hover:w-7 transition-all" />
                                </button>
                                <div className="flex-1 mx-2">
                                    <div className="h-2 bg-background-surface/50 rounded-full relative cursor-pointer" onClick={() => handleSeek(currentTime)}>
                                        {/* Progress bar */}
                                        <div className="h-2 bg-background-surface/90  rounded-full" style={{ width: `${(currentTime / MOCK_DATA.videoDuration) * 100}%` }} />
                                        {/* Markers */}
                                        {MOCK_DATA.timelineMarkers.map((marker, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-0 h-2 w-1 bg-red-500"
                                                style={{ left: `${(marker.time / MOCK_DATA.videoDuration) * 100}%` }}
                                                title={marker.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <span className="text-background-surface/90 text-sm">{formatTime(currentTime)} / {formatTime(MOCK_DATA.videoDuration)}</span>
                                <button className="w-8 h-8 rounded-full text-white flex items-center justify-center">
                                    <Maximize className="w-5 h-5  hover:h-6 hover:w-6 transition-all" />
                                </button>
                            </div>
                        </div>
                        {/* Timeline Thumbnails */}
                        <div className="flex flex-row items-center gap-2 bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md  p-2 overflow-x-auto">
                            {MOCK_DATA.timelineThumbnails.map((thumb, i) => (
                                <div key={i} className="relative flex flex-col items-center cursor-pointer" onClick={() => handleSeek(thumb.time)}>
                                    <img src={thumb.src} alt="thumb" className="w-24 h-14 object-cover rounded border border-background-alt" />
                                    {/* Marker below thumbnail if exists */}
                                    {MOCK_DATA.timelineMarkers.some(m => Math.abs(m.time - thumb.time) < 1) && (
                                        <div className="w-2 h-2 bg-red-500 rounded-full mt-1" />
                                    )}
                                    <span className="text-xs text- mt-1">{formatTime(thumb.time)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Bookmarks */}
                    <div className="w-72 bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md  p-4 flex flex-col gap-2">
                        <h2 className="text-lg font-bold text-primary mb-2">Yer İşaretleri</h2>
                        <ul className="flex flex-col gap-2">
                            {MOCK_DATA.bookmarks.map((bm, i) => (
                                <li key={i}>
                                    <button
                                        className="w-full flex flex-row gap-2 px-2 py-1 rounded-lg text-left bg-primary text-white hover:bg-primary-dark transition-colors"
                                        onClick={() => handleSeek(bm.time)}
                                    >
                                        <div className="w-4 h-4" />
                                        {bm.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
