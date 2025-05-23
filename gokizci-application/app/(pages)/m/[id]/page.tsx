"use client"

import { useCallback, useEffect, useState } from 'react';
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import { fetchDevices, fetchReplayMeta } from '@/app/lib/api'; // fetchAvailableReplayWindows'a burada gerek kalmadı
import { Device } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/loading';
import { MonitoringSideBar } from '@/components/monitoring/MonitoringSideBar';

interface ReplayMetaData {
    minute_anomaly_bits: number[];
    second_filled_bits: number[];
    window_start: string;
}

export default function Page({ params }: { params: { id: string } }) {
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [replayMeta, setReplayMeta] = useState<ReplayMetaData | null>(null);
    const [isLoadingMeta, setIsLoadingMeta] = useState(false);
    const router = useRouter();
    const [selectedReplayWindow, setSelectedReplayWindow] = useState<string | null>(null);

    // Cihazları yükleme ve URL'den gelen ID'ye göre seçili cihazı ayarlama
    useEffect(() => {
        async function loadDevicesAndSelect() {
            const allDevices = await fetchDevices();
            setDevices(allDevices || []);
            if (allDevices) {
                const foundDevice = allDevices.find((d: Device) => d.stream_url === params.id);
                setSelectedDevice(foundDevice || null);
                if (foundDevice) {
                    // Cihaz değiştiğinde, seçili replay penceresini ve metayı sıfırla.
                    // Yeni cihaz için uygun pencereler sidebar'da yüklenecek.
                    setSelectedReplayWindow(null); // Bu, sidebar'ın yeni cihaz için varsayılan (veya ilk) pencereyi seçmesini tetikleyebilir.
                    setReplayMeta(null);
                } else if (params.id && allDevices.length > 0) {
                    // URL'de id var ama cihaz bulunamadı, belki ilk cihazı seç? Veya hata göster.
                    // Şimdilik null bırakıyoruz, kullanıcı sidebar'dan seçebilir.
                    console.warn(`Device with stream_url ${params.id} not found.`);
                }
            }
        }
        loadDevicesAndSelect();
    }, [params.id]); // Sadece params.id değiştiğinde çalışır

    // Sidebar'dan cihaz seçildiğinde URL'i güncelle
    const handleDeviceSelectionFromSidebar = useCallback((deviceId: string) => {
        const dev = devices.find((d) => d.id === deviceId);
        if (dev && dev.stream_url) {
            // URL değişince yukarıdaki useEffect (params.id bağımlı olan) tetiklenerek
            // selectedDevice, selectedReplayWindow ve replayMeta'yı güncelleyecek.
            router.push(`/m/${dev.stream_url}`);
        }
    }, [devices, router]);

    // Sidebar'dan replay penceresi seçildiğinde
    const handleWindowSelectionFromSidebar = useCallback((windowStartISO: string) => {
        setSelectedReplayWindow(windowStartISO);
        // Bu, aşağıdaki fetchReplayMeta useEffect'ini tetikleyecek.
    }, []);

    // Seçili cihaz veya seçili replay penceresi değiştiğinde Replay Meta'yı yükle
    useEffect(() => {
        const fetchMetaForSelectedWindow = async () => {
            if (selectedDevice?.source_id && selectedReplayWindow) { // Sadece kullanıcı bir pencere seçtiyse yükle
                setIsLoadingMeta(true);
                // console.log(`Fetching meta for ${selectedDevice.source_id} at user selected window: ${selectedReplayWindow}`);
                try {
                    const meta = await fetchReplayMeta(selectedDevice.source_id, selectedReplayWindow);
                    setReplayMeta(meta);
                } catch (error) {
                    console.error("Failed to fetch replay meta for selected window:", error);
                    setReplayMeta(null);
                } finally {
                    setIsLoadingMeta(false);
                }
            } else if (selectedDevice?.source_id && !selectedReplayWindow) {
                // Kullanıcı henüz bir pencere seçmedi.
                // İsteğe bağlı: Burada "son 1 saat" için varsayılan bir meta yüklenebilir.
                // Veya sidebar'da ilk pencere otomatik seçilirse, bu `else if` bloğuna hiç girilmez.
                // Şimdilik, kullanıcı bir pencere seçene kadar meta yüklemiyoruz.
                // console.log("No replay window selected by user. Waiting for selection.");
                setReplayMeta(null); // Önceki metayı temizle
                // Eğer MonitoringSideBar'da `onWindowSelect(windows[0])` aktif edilirse,
                // bu blok nadiren veya hiç çalışmayacaktır.
            } else {
                setReplayMeta(null); // Cihaz seçili değilse meta'yı temizle
                setIsLoadingMeta(false);
            }
        };

        fetchMetaForSelectedWindow();
    }, [selectedDevice, selectedReplayWindow]); // selectedDevice veya selectedReplayWindow değiştiğinde çalışır


    if (!selectedDevice && devices.length === 0 && !params.id) {
        return <div className="flex justify-center items-center h-screen"><Loading /></div>;
    }
    // URL'de ID var ama cihaz bulunamadı (veya cihaz listesi boş)
    if (params.id && !selectedDevice && (devices.length === 0 || (devices.length > 0 && !devices.find(d => d.stream_url === params.id)))) {
        // Eğer cihazlar yüklendi ama `params.id` ile eşleşen yoksa
        if (devices.length > 0) {
             return <div className="text-center mt-10">Kaynak (ID: {params.id}) bulunamadı.</div>;
        }
        // Cihazlar henüz yükleniyorsa veya hiç cihaz yoksa
        return <div className="flex justify-center items-center h-screen"><Loading /></div>;
    }

    return (
        <>
            {isLoadingMeta && !replayMeta && selectedReplayWindow && ( // Sadece meta yüklenirken ve bir pencere seçiliyken genel loading
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <Loading />
                </div>
            )}
            <div className="flex pb-5 h-full">
                <MonitoringSideBar
                    selectedDevice={selectedDevice?.id || null}
                    onDeviceSelect={handleDeviceSelectionFromSidebar}
                    onWindowSelect={handleWindowSelectionFromSidebar}
                    selectedReplayWindow={selectedReplayWindow}
                />
                {selectedDevice && selectedDevice.source_id ? (
                    <MonitoringPanel
                        selectedDevice={selectedDevice.id} // Artık sadece ID
                        onDeviceSelect={handleDeviceSelectionFromSidebar}
                        sourceId={selectedDevice.source_id}
                        devices={devices} // MonitoringPanel'e hala geçiliyor, belki başka bir amaçla kullanılır
                        replayMeta={replayMeta} // Bu replayMeta artık seçilen saate göre gelecek
                    />
                ) : (
                    <div className="flex-1 flex justify-center items-center text-gray-500 p-10">
                         { devices.length > 0 && !params.id ? "Lütfen görüntülenecek bir kaynak seçin." :
                           params.id && devices.length === 0 ? <Loading /> : // Cihazlar yüklenirken
                           !params.id && devices.length === 0 ? "Kullanılabilir kaynak bulunamadı." : // Hiç kaynak yoksa
                           " " // Diğer durumlar için boş (örn: params.id var ama selectedDevice null)
                         }
                    </div>
                )}
            </div>
        </>
    );
}