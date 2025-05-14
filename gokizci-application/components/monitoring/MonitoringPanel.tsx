import { Maximize, Play, PlayCircle } from "lucide-react";
import { VideoStream } from "../devices/VideoStream";
import { MonitoringSideBar } from "./MonitoringSideBar";
import React from "react";
import { MonitoringPanelProps } from "@/app/lib/definitions";


export function MonitoringPanel({
    devices,
    selectedDevice,
    onDeviceSelect,
    anomalyRateEnabled,
    onToggleAnomalyRate,
    videoSourceId,
    videoDuration,
    currentTime,
    onSeek,
    timelineMarkers,
    timelineThumbnails,
    bookmarks,
    onBookmarkClick,
}: MonitoringPanelProps) {
    return (
        <div className="flex pb-5">
            {/* Sidebar */}
            <MonitoringSideBar
                devices={devices}
                selectedDevice={selectedDevice}
                onDeviceSelect={onDeviceSelect}
                anomalyRateEnabled={anomalyRateEnabled}
                onToggleAnomalyRate={onToggleAnomalyRate}
            />
            {/* Main Content */}
            <div className="flex flex-col flex-1 pt-7 pb-7 pr-7">
                <div className="flex flex-row gap-3">
                    {/* Video Player & Timeline */}
                    <div className="flex flex-col flex-1 gap-3">
                        <div className="bg-black rounded-lg shadow-sm overflow-hidden relative aspect-video flex items-center justify-center hover:shadow-md transition-all">
                            {/* Video Player */}
                            <VideoStream sourceId={videoSourceId} />
                            {/* Controls (placeholder) */}
                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary to-transparent flex items-center gap-2">
                                <button className="w-10 h-10 rounded-full flex items-center justify-center text-white">
                                    <Play className="w-6 h-6 hover:h-7 hover:w-7 transition-all" />
                                </button>
                                <div className="flex-1 mx-2">
                                    <div className="h-2 bg-background-surface/50 rounded-full relative cursor-pointer" onClick={() => onSeek(currentTime)}>
                                        {/* Progress bar */}
                                        <div className="h-2 bg-background-surface/90  rounded-full" style={{ width: `${(currentTime / videoDuration) * 100}%` }} />
                                        {/* Markers */}
                                        {timelineMarkers.map((marker, i) => (
                                            <div
                                                key={i}
                                                className="absolute top-0 h-2 w-1 bg-red-500"
                                                style={{ left: `${(marker.time / videoDuration) * 100}%` }}
                                                title={marker.label}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <span className="text-background-surface/90 text-sm">{formatTime(currentTime)} / {formatTime(videoDuration)}</span>
                                <button className="w-8 h-8 rounded-full text-white flex items-center justify-center">
                                    <Maximize className="w-5 h-5  hover:h-6 hover:w-6 transition-all" />
                                </button>
                            </div>
                        </div>
                        {/* Timeline Thumbnails */}
                        <div className="flex flex-row items-center gap-2 bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md  p-2 overflow-x-auto">
                            {timelineThumbnails.map((thumb, i) => (
                                <div key={i} className="relative flex flex-col items-center cursor-pointer" onClick={() => onSeek(thumb.time)}>
                                    <img src={thumb.src} alt="thumb" className="w-24 h-14 object-cover rounded border border-background-alt" />
                                    {/* Marker below thumbnail if exists */}
                                    {timelineMarkers.some(m => Math.abs(m.time - thumb.time) < 1) && (
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
                            {bookmarks.map((bm, i) => (
                                <li key={i}>
                                    <button
                                        className="w-full flex flex-row gap-2 px-2 py-1 rounded-lg text-left bg-primary text-white hover:bg-primary-dark transition-colors"
                                        onClick={() => onBookmarkClick(bm.time)}
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
