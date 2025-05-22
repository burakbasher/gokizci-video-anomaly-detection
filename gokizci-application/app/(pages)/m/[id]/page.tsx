// app/(pages)/m/[id]/page.tsx

"use client"

import { useCallback, useEffect, useState } from 'react'; // ChangeEvent kaldırıldı
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import { fetchDevices, fetchReplayMeta } from '@/app/lib/api';
import { Device } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/loading';
import { MonitoringSideBar } from '@/components/monitoring/MonitoringSideBar';

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
    const [selectedReplayWindow, setSelectedReplayWindow] = useState<string | null>(null);

    
    const handleDeviceSelectionFromSidebar = useCallback((device: Device) => { // Satır 92
        setSelectedReplayWindow(null);
    }, []);

    const handleWindowSelectionFromSidebar = useCallback((windowStartISO: string) => {
        setSelectedReplayWindow(windowStartISO);
    }, []);
    
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

    useEffect(() => {
        const fetchMeta = async () => {
            if (selectedDevice?.source_id) {
                setIsLoadingMeta(true);
                let windowToFetch = selectedReplayWindow;

                if (!windowToFetch) { // Eğer kullanıcı bir pencere seçmediyse, son 1 saati al
                    const now = new Date();
                    windowToFetch = new Date(
                        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
                        now.getUTCHours(), 0, 0, 0 
                    ).toISOString(); // Her zaman UTC saat başı
                }
                
                // console.log(`Fetching meta for ${selectedDevice.source_id} at window: ${windowToFetch}`);
                try {
                    const meta = await fetchReplayMeta(selectedDevice.source_id, windowToFetch);
                    setReplayMeta(meta);
                    // Eğer meta başarıyla yüklendiyse ve selectedReplayWindow null ise (yani otomatik son saat yüklendiyse)
                    // selectedReplayWindow'u da güncelle, böylece dropdown senkronize olur.
                    if (meta?.window_start && !selectedReplayWindow) {
                        // setSelectedReplayWindow(meta.window_start); // Bu döngüye sokabilir, dikkat!
                                                                // Daha iyisi, initial load'da uygunsa set etmek.
                    }
                } catch (error) {
                    console.error("Failed to fetch replay meta:", error);
                    setReplayMeta(null);
                } finally {
                    setIsLoadingMeta(false);
                }
            } else {
                setReplayMeta(null); // Cihaz seçili değilse meta'yı temizle
            }
        };

        fetchMeta();
        
        // Periyodik güncelleme, eğer hep "son 1 saat" gösteriliyorsa mantıklı olabilir.
        // Kullanıcı spesifik bir saat seçtiyse, o saatin metası değişmeyeceği için interval gereksiz.
        // Şimdilik periyodik güncellemeyi kaldırıyorum, kullanıcı seçimine odaklanalım.
        // const intervalId = setInterval(fetchMeta, 60000);
        // return () => clearInterval(intervalId);

    }, [selectedDevice, selectedReplayWindow]);

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
            <div className="flex pb-5 h-full">
                <MonitoringSideBar
                    selectedDevice={selectedDevice.id}
                    onDeviceSelect={(deviceId: string) => {
                        const dev = devices.find((d) => d.id === deviceId);
                        if (dev && dev.stream_url) {
                            router.push(`/m/${dev.stream_url}`);
                        }
                    }}
                    onWindowSelect={handleWindowSelectionFromSidebar}
                    selectedReplayWindow={selectedReplayWindow}
                />
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
            </div>
        </>
    );
}