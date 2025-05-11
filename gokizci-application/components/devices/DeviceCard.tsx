"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Device } from '@/app/lib/definitions';
import { VideoStream } from './VideoStream';
import { Circle } from 'lucide-react';
import { Clipboard } from 'lucide-react';

interface Props {
  device: Device;
  onStatusChange?: (status: 'online' | 'offline' | 'error') => void;
}

export const DeviceCard = ({ device, onStatusChange }: Props) => {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAnomaly, setHasAnomaly] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<'online' | 'offline' | 'error'>(device.status);
  const [copied, setCopied] = useState(false);

  const handleAnomalyDetected = (detected: boolean) => {
    setHasAnomaly(detected);
  };

  const handleStatusChange = (status: 'online' | 'offline' | 'error') => {
    setDeviceStatus(status);
    if (onStatusChange) onStatusChange(status);
  };

  const handleConnect = () => {
    if (!device.stream_url || deviceStatus !== 'online') return;
    router.push(`/m/${device.stream_url}`);
  };

  const handleCopy = () => {
    if (!device.stream_url) return;
    navigator.clipboard.writeText(`http://localhost:3000/m/${device.stream_url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // 1.5 saniyede “Kopyalandı” reset
  };

  return (
    <div className="w-[280px] bg-background-surface rounded-2xl border border-background-alt shadow-md hover:shadow-lg transition-all duration-300">
      {/* Üst başlık */}
      <div className="flex justify-between items-center px-4 pt-4">
        <button
          onClick={handleConnect}
          disabled={deviceStatus !== 'online'}
          className="flex items-center gap-1 text-sm text-primary disabled:opacity-40"
        >
          <Circle className="w-4 h-4 text-primary" />
          Bağlan
        </button>

        <span
          className={`text-xs font-semibold px-3 py-1 rounded-xl tracking-wide ${deviceStatus === 'online'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
            }`}
        >
          {deviceStatus === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Cihaz Bilgileri */}
      <div className="px-4 pb-4 pt-2 space-y-2">
        <p className="text-primary text-lg font-semibold">{device.name}</p>

        <div className="space-y-1">
          <p className="text-primary text-sm">Cihaz Yayın URL'i</p>
          <div className="relative flex items-center bg-background rounded-md px-2 py-1">
            <span className="text-primary-light text-xs truncate">
              localhost:3000/m/{device.stream_url}
            </span>
            <button
              onClick={handleCopy}
              className="ml-2 text-primary-light hover:text-primary"
              title="Kopyala"
            >
              <Clipboard className="w-4 h-4" />
            </button>

            {/* Kopyalandı mesajı */}
            {copied && (
              <div className="absolute -top-6 right-0 bg-green-100 text-green-700 text-[10px] px-2 py-1 rounded shadow">
                Kopyalandı!
              </div>
            )}
          </div>
        </div>

        <p className="text-primary-light text-sm">Cihaz Türü: {device.type}</p>
      </div>

      {/* Görüntü */}
      {isExpanded && (
        <div className="relative h-[160px] bg-black">
          <VideoStream
            sourceId={device.source_id}
            onAnomalyDetected={handleAnomalyDetected}
            onStatusChange={handleStatusChange}
          />
          {hasAnomaly && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded-full shadow">
              Anomali!
            </div>
          )}
        </div>
      )}

      {/* Aç/Kapa butonu */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-sm py-3 text-primary hover:bg-background-alt border-t border-background-alt flex items-center justify-center gap-1"
      >
        {isExpanded ? (
          <>
            <span>▲</span> Görüntüyü Gizle
          </>
        ) : (
          <>
            <span>▼</span> Görüntüyü Göster
          </>
        )}
      </button>
    </div>

  );
};
