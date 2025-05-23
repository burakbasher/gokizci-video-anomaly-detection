"use client"
import { Check, History } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { fetchDevicesPaginated, fetchAvailableReplayWindows } from '@/app/lib/api'; // fetchDevices yerine fetchDevicesPaginated kullanılıyor, bu OK.
import { Device } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';

interface MonitoringSideBarProps {
  selectedDevice: string | null; // Sadece device ID'si
  onDeviceSelect: (deviceId: string) => void; // URL değişimi Page'de yönetilecek
  onWindowSelect: (windowStartISO: string) => void;
  selectedReplayWindow: string | null;
}

export function MonitoringSideBar({
  selectedDevice, // Bu artık sadece ID
  onDeviceSelect,
  onWindowSelect,
  selectedReplayWindow,
}: MonitoringSideBarProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [availableWindows, setAvailableWindows] = useState<string[]>([]);
  const [isLoadingWindows, setIsLoadingWindows] = useState(false);
  const router = useRouter(); // URL değişimi için hala gerekli olabilir, ama onDeviceSelect ile Page'e delege ediliyor.

  useEffect(() => {
    async function getDevicesList() {
      setIsLoadingDevices(true);
      try {
        const { devices: fetchedDevices } = await fetchDevicesPaginated(1, 100); // Tüm cihazları alacak şekilde ayarlanabilir
        setDevices(fetchedDevices || []);
      } catch (error) {
        console.error("Failed to load devices in sidebar:", error);
        setDevices([]);
      } finally {
        setIsLoadingDevices(false);
      }
    };
    getDevicesList();
  }, []);

  useEffect(() => {
    async function loadAvailableWindowsForDevice() {
      // `selectedDevice` (ID) üzerinden `source_id`'yi bulmamız gerekiyor.
      const currentDeviceObject = devices.find(d => d.id === selectedDevice);

      if (currentDeviceObject?.source_id) {
        setIsLoadingWindows(true);
        try {
          const windows = await fetchAvailableReplayWindows(currentDeviceObject.source_id);
          setAvailableWindows(windows);
          // Otomatik ilk seçim: Eğer seçili bir pencere yoksa ve uygun pencereler varsa, en yenisini (ilkini) seçtir.
          // Bu, Page component'inin default meta yüklemesini tetikleyecektir.
          if (!selectedReplayWindow && windows.length > 0) {
            // onWindowSelect(windows[0]); // En yeni pencereyi otomatik seç. Page'de useEffect'i tetikler.
            // Bu satırı aktif etmek, sayfa ilk yüklendiğinde veya cihaz değiştiğinde otomatik olarak
            // ilk replay penceresinin datasını yükler. İsteğe bağlı.
          }
        } catch (error) {
          console.error("Failed to load available replay windows:", error);
          setAvailableWindows([]);
        } finally {
          setIsLoadingWindows(false);
        }
      } else {
        setAvailableWindows([]); // Cihaz seçili değilse veya source_id yoksa pencereleri temizle
      }
    }

    if (selectedDevice && devices.length > 0) { // devices yüklendikten sonra çalıştır
      loadAvailableWindowsForDevice();
    } else {
      setAvailableWindows([]); // Eğer seçili cihaz yoksa temizle
    }
    // selectedReplayWindow'u bağımlılıktan çıkardım, çünkü bu useEffect'in amacı sadece windows'ları yüklemek.
    // Otomatik seçim (yukarıdaki yorumlu satır) yapılırsa, o zaman selectedReplayWindow bağımlılığı döngü yaratabilir.
  }, [selectedDevice, devices]); // onWindowSelect'i bağımlılıktan çıkardım

  const formatWindowLabel = (isoString: string): string => {
    const dateUtc = new Date(isoString); // Bu tarih UTC olarak parse edilir.

    // Türkiye saati için UTC'ye 3 saat ekleyelim
    const dateTurkey = new Date(dateUtc.getTime() + (3 * 60 * 60 * 1000));

    const dateTurkeyEnd = new Date(dateUtc.getTime() + (4 * 60 * 60 * 1000));

    const year = dateTurkey.getUTCFullYear();
    const month = (dateTurkey.getUTCMonth() + 1).toString().padStart(2, '0'); // Aylar 0-11 arası olduğu için +1
    const day = dateTurkey.getUTCDate().toString().padStart(2, '0');
    const hours = dateTurkey.getUTCHours().toString().padStart(2, '0');
    const minutes = dateTurkey.getUTCMinutes().toString().padStart(2, '0');

    // Örneğin: 21 Mayıs 2024 14:30 (TRT)
    // Veya 'tr-TR' locale'ini kullanarak daha doğal bir format elde edebiliriz.
    // Aşağıdaki `toLocaleString` tarayıcının kendi saat dilimine göre formatlar.
    // Biz UTC+3'e çevirdiğimiz için, bu tarihi sanki yerel saatmiş gibi formatlayabiliriz.

    // Basit format: GG.AA.YYYY SS:DD
    // return `${day}.${month}.${year} ${hours}:${minutes}`;

    // Daha açıklayıcı format:
    const formattedDate = dateTurkey.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC' // ÖNEMLİ: dateTurkey zaten +3 saat eklenmiş. Şimdi bunu UTC gibi formatla.
    });

    const formattedTime = dateTurkey.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC' // ÖNEMLİ: dateTurkey zaten +3 saat eklenmiş. Şimdi bunu UTC gibi formatla.
    });

    const formattedTimeEnd = dateTurkeyEnd.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC' // ÖNEMLİ: dateTurkey zaten +3 saat eklenmiş. Şimdi bunu UTC gibi formatla.
    });

    // "21.05.2024 14:30" gibi bir çıktı için:
    return `${formattedDate} ${formattedTime} - ${formattedTimeEnd}`;
  };

  return (
    <div className="flex flex-col w-80 p-4 bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md ml-7 mr-3 mb-7 mt-7 justify-between min-w-[230px]">
      <div className="flex flex-col gap-5">
        {/* Devices */}
        <div>
          <h2 className="font-bold text-lg mb-2 text-primary">Kaynaklar</h2>
          {isLoadingDevices ? <p className="text-sm text-gray-500">Yükleniyor...</p> : (
            devices.length > 0 ? (
              <div className="flex flex-col gap-1">
                {devices.map((device) => (
                  <button
                    key={device.id}
                    className={`flex flex-row items-center gap-2 text-left px-2 py-1 rounded-lg transition-colors transition-all text-primary ${selectedDevice === device.id ? 'bg-primary text-white' : 'hover:bg-background-alt'}`}
                    onClick={() => {
                      onDeviceSelect(device.id); // Bu Page'deki router.push'u tetikleyecek
                    }}
                  >
                    {selectedDevice === device.id ? <Check className="w-4 h-4" /> : <div className="w-4 h-4" />}
                    {device.name}
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500">Kaynak bulunamadı.</p>
          )}
        </div>

        {/* Replay Saat Seçimi */}
        {selectedDevice && (
          <div>
            <h2 className="font-bold text-lg mb-2 text-primary flex items-center gap-2">
              <History className="w-5 h-5" /> Kayıt Saati Seçin
            </h2>
            {isLoadingWindows ? <p className="text-sm text-gray-500">Saatler yükleniyor...</p> : (
              availableWindows.length > 0 ? (
                <select
                  value={selectedReplayWindow || ""} // Eğer selectedReplayWindow null ise ilk option ("Bir saat dilimi seçin...") seçili olur.
                  onChange={(e) => {
                    if (e.target.value) { // Sadece geçerli bir değer seçildiğinde
                      onWindowSelect(e.target.value)
                    }
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-primary focus:ring-primary focus:border-primary text-sm"
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