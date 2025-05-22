"components/monitoring/MonitoringSideBar.tsx"

"use client"
import { Check, History } from 'lucide-react'; 
import React, { useEffect, useState } from 'react';
import { fetchDevices, fetchDevicesPaginated, fetchAvailableReplayWindows } from '@/app/lib/api';
import { Device } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';

interface MonitoringSideBarProps {
  selectedDevice: string | null;
  onDeviceSelect: (device: string) => void;
  onWindowSelect: (windowStartISO: string) => void; // Seçilen pencereyi parent'a ilet
  selectedReplayWindow: string | null; // Parent'tan gelen, o an seçili olan pencere
}

export function MonitoringSideBar({
  selectedDevice,
  onDeviceSelect,
  onWindowSelect,
  selectedReplayWindow,
}: MonitoringSideBarProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableWindows, setAvailableWindows] = useState<string[]>([]);
  const [isLoadingWindows, setIsLoadingWindows] = useState(false);
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

  async function loadAvailableWindows() {
    setIsLoadingWindows(true);
    try {
      const windows = await fetchAvailableReplayWindows(selectedDevice!);
      setAvailableWindows(windows);
      // Eğer seçili bir pencere yoksa ve uygun pencereler varsa, en yenisini (ilkini) seç
      if (!selectedReplayWindow && windows.length > 0) {
        // onWindowSelect(windows[0]); // Otomatik ilk seçimi parent'a bırakabiliriz veya burada yapabiliriz
      }
    } catch (error) {
      console.error("Failed to load available replay windows:", error);
      setAvailableWindows([]);
    } finally {
      setIsLoadingWindows(false);
    }
  }

  useEffect(() => {
    if (selectedDevice) {
      loadAvailableWindows();
    } else {
      setAvailableWindows([]); // Cihaz seçili değilse pencereleri temizle
    }
  }, [selectedDevice, /* onWindowSelect, selectedReplayWindow */]); // selectedReplayWindow ve onWindowSelect bağımlılıklarını gözden geçir

  const formatWindowLabel = (isoString: string): string => {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      hour12: false
    };
    return date.toLocaleString(undefined, options); // Tarayıcının locali kullanılır
  };

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
        {/* Replay Saat Seçimi */}
        {selectedDevice && ( // Sadece bir cihaz seçiliyse göster
          <div>
            <h2 className="font-bold text-lg mb-2 text-primary flex items-center gap-2">
              <History className="w-5 h-5" /> Kayıt Saati Seçin
            </h2>
            {isLoadingWindows ? <p className="text-sm text-gray-500">Saatler yükleniyor...</p> : (
              availableWindows.length > 0 ? (
                <select
                  value={selectedReplayWindow || ""}
                  onChange={(e) => onWindowSelect(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-primary focus:ring-primary focus:border-primary text-sm"
                  disabled={availableWindows.length === 0}
                >
                  <option value="" disabled>Bir saat dilimi seçin...</option>
                  {availableWindows.map(windowIso => (
                    <option key={windowIso} value={windowIso}>
                      {formatWindowLabel(windowIso)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500">Bu kaynak için kayıtlı saat dilimi bulunamadı.</p>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
