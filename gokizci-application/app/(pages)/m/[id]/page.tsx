"app/(pages)/m/[id]/page.tsx"

"use client"

import { useEffect, useState } from 'react';
import { MonitoringPanel } from '@/components/monitoring/MonitoringPanel';
import { fetchDevices } from '@/app/lib/api';
import { Device } from '@/app/lib/definitions';
import { useRouter } from 'next/navigation';

export default function Page({ params }: { params: { id: string } }) {
    const [devices, setDevices] = useState<Device[]>([]);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const router = useRouter();

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

    if (!selectedDevice) return <div>Cihaz bulunamadı.</div>;

    return (
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
        />
    );
}
