"use client"
import { Check } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { fetchDevices, fetchDevicesPaginated } from '@/app/lib/api';
import { Device } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';

interface MonitoringSideBarProps {
  selectedDevice: string | null;
  onDeviceSelect: (device: string) => void;
  anomalyRateEnabled: boolean;
  onToggleAnomalyRate: (enabled: boolean) => void;
}

export function MonitoringSideBar({
  selectedDevice,
  onDeviceSelect,
  anomalyRateEnabled,
  onToggleAnomalyRate,
}: MonitoringSideBarProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function getDevices() {
    try {
      setIsLoading(true);
      const { devices, total } = await fetchDevicesPaginated(1, 100);
      console.log(devices);
      setDevices(devices);
    } catch (error) {
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getDevices();
  }, []);

  return (
    <div className="flex flex-col w-80 p-4 bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md ml-7 mr-3 mb-7 mt-7 justify-between min-w-[230px]">
      <div className="flex flex-col gap-5">
        {/* Devices */}
        <div>
          <h2 className="font-bold text-lg mb-2">Kaynaklar</h2>
          <div className="flex flex-col gap-1">
            {devices.map((device) => (
              <button
                key={device.id}
                className={`flex flex-row items-center gap-2 text-left px-2 py-1 rounded-lg transition-colors transition-all text-primary ${selectedDevice === device.id ? 'bg-primary text-white' : 'hover:bg-background-alt'}`}
                onClick={() => {
                  onDeviceSelect(device.id);
                  router.push(`/m/${device.stream_url}`);
                }}
              >
                {selectedDevice === device.id && <Check className="w-4 h-4" /> || <div className="w-4 h-4" />}  
                {device.name}
              </button>
            ))}
          </div>
        </div>
        {/* Indicators */}
        
        {/*
        <div>
          <h2 className="font-bold text-lg mb-3">Göstergeler</h2>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4" />
            <span>Anomaly Rate</span>
            <label className="inline-flex relative items-center cursor-pointer">
              <input
                type="checkbox"
                checked={anomalyRateEnabled}
                onChange={e => onToggleAnomalyRate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-background-alt outline-none border border-primary rounded-full peer dark:bg-primary peer-checked:bg-primary transition-all"></div>
              <div className={`absolute w-6 h-6 bg-background-surface border border-primary rounded-full peer-checked:translate-x-full transition-all`}></div>
            </label>
          </div>
        </div>
        */}
      </div>
    </div>
  );
}
