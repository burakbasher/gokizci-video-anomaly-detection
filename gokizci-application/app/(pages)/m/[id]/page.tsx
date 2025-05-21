// app/(pages)/m/[id]/page.tsx

"use client"

import { useEffect, useState } from 'react'; // ChangeEvent kaldırıldı
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import { fetchDevices, fetchReplayMeta } from '@/app/lib/api';
import { Device } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/loading';

interface ReplayMetaData {
    minute_anomaly_bits: number[];
    second_filled_bits: number[];
    window_start: string; // Bu, gösterilen 1 saatlik pencerenin başlangıcı olacak
}

export default function Page({ params }: { params: { id: string } }) {
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [replayMeta, setReplayMeta] = useState<ReplayMetaData | null>(null);
    const [isLoadingMeta, setIsLoadingMeta] = useState(false);
    const router = useRouter();

    // Cihazları yükleme
    useEffect(() => {
        async function loadDevices() {
            const allDevices = await fetchDevices();
            setDevices(allDevices || []);
            if (allDevices) {
                const found = allDevices.find((d: Device) => d.stream_url === params.id);
                setSelectedDevice(found || null);
            }
        }
        loadDevices();
    }, [params.id]);

    // Seçili cihaz değiştiğinde veya periyodik olarak replay meta'yı yükle
    useEffect(() => {
        const fetchMetaForCurrentWindow = async () => {
            if (selectedDevice) {
                setIsLoadingMeta(true);
                // Her zaman mevcut saatin bir önceki saat başını al
                const now = new Date();
                const currentWindowStart = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    now.getHours(), // Mevcut saat diliminin başlangıcı
                    0, 0, 0
                ).toISOString();

                try {
                    const meta = await fetchReplayMeta(selectedDevice.source_id, currentWindowStart);
                    setReplayMeta(meta);
                } catch (error) {
                    console.error("Failed to fetch replay meta for current window:", error);
                    setReplayMeta(null);
                } finally {
                    setIsLoadingMeta(false);
                }
            }
        };

        fetchMetaForCurrentWindow(); // İlk yüklemede çalıştır

        // Meta verisini periyodik olarak güncellemek için interval (örneğin her dakika)
        const intervalId = setInterval(fetchMetaForCurrentWindow, 60000); // 60 saniyede bir

        return () => clearInterval(intervalId); // Component unmount olduğunda interval'ı temizle
    }, [selectedDevice]); // Sadece selectedDevice değiştiğinde interval'ı yeniden kur

    if (!selectedDevice && !devices.length) {
        return <div className="flex justify-center items-center h-screen"><Loading /></div>;
    }
    if (!selectedDevice) {
        return <div className="text-center mt-10">Cihaz bulunamadı veya yüklenemedi.</div>;
    }

    return (
        <>
            {/* Saat seçim dropdown'ı kaldırıldı */}
            {/* Yükleme göstergesi MonitoringPanel içinde veya burada yönetilebilir */}
            {isLoadingMeta && !replayMeta && ( // Sadece ilk meta yüklenirken genel bir loading göster
                 <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
                    <Loading />
                 </div>
            )}
            <MonitoringPanel
                selectedDevice={selectedDevice.id}
                onDeviceSelect={(deviceId: string) => {
                    const dev = devices.find((d) => d.id === deviceId);
                    if (dev && dev.stream_url) {
                        router.push(`/m/${dev.stream_url}`);
                    }
                }}
                sourceId={selectedDevice.source_id}
                devices={devices}
                replayMeta={replayMeta} // Bu replayMeta her zaman son 1 saatlik pencereye ait olacak
            />
        </>
    );
}