"use client"

import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import { MonitoringSideBar } from '@/components/monitoring/MonitoringSideBar';
import { useState } from 'react';

const devices = ["Cha-1", "Cha-2", "Cha-3"];
const videoDuration = 83; // 1:23 in seconds
const timelineMarkers = [
  { time: 10, label: "Anomaly 1" },
  { time: 34, label: "Anomaly 2" },
  { time: 60, label: "Anomaly 3" },
];
const timelineThumbnails = [
  { time: 0, src: "https://placehold.co/120x80?text=0:00" },
  { time: 20, src: "https://placehold.co/120x80?text=0:20" },
  { time: 40, src: "https://placehold.co/120x80?text=0:40" },
  { time: 60, src: "https://placehold.co/120x80?text=1:00" },
  { time: 80, src: "https://placehold.co/120x80?text=1:20" },
];
const bookmarks = [
  { time: 10, label: "Anomaly 1" },
  { time: 34, label: "Anomaly 2" },
  { time: 60, label: "Anomaly 3" },
];

export default function Page({ params, }: { params: { documentID: string }; }) {
    const [selectedDevice, setSelectedDevice] = useState(devices[0]);
    const [anomalyRateEnabled, setAnomalyRateEnabled] = useState(true);
    const [currentTime, setCurrentTime] = useState(46); // Example: 0:34
    
    return (
        <div>
            {/* Filter Options */}
            <MonitoringPanel
                 devices={devices}
                 selectedDevice={selectedDevice}
                 onDeviceSelect={setSelectedDevice}
                 anomalyRateEnabled={anomalyRateEnabled}
                 onToggleAnomalyRate={setAnomalyRateEnabled}
                 videoSourceId={"ff77f3d0-3a30-4ced-90de-a57dc6ebe916"}
                 videoDuration={videoDuration}
                 currentTime={currentTime}
                 onSeek={setCurrentTime}
                 timelineMarkers={timelineMarkers}
                 timelineThumbnails={timelineThumbnails}
                 bookmarks={bookmarks}
                 onBookmarkClick={setCurrentTime}
            />      
        </div>
    );
}
