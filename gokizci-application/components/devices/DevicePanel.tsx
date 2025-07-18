"components/devices/DevicePanel.tsx"

"use client";

import React, { useState, useEffect } from 'react';
import { DeviceCard } from './DeviceCard';
import { useWebSocket } from '../contexts/WebSocketContext';
import { Loading } from '../loading';
import { PopUpNewDevice } from '../popups/PopUpNewDevice';
import { Device } from '@/app/lib/definitions';
import { fetchDevicesPaginated, deleteDevice } from '@/app/lib/api';
import { useAuth } from '../contexts/AuthContext';


export const DevicePanel = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDevices, setTotalDevices] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewDevicePopup, setShowNewDevicePopup] = useState(false);
  const devicePerPage = 2;
  const { isConnected, socket } = useWebSocket();
  const { user } = useAuth();


  async function getDevices(page = 1) {
    try {
      setIsLoading(true);
      const { devices, total } = await fetchDevicesPaginated(page, devicePerPage);
      setDevices(devices);
      setTotalDevices(total);
    } catch (error) {
      setDevices([]);
      setTotalDevices(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getDevices(currentPage);
  }, [currentPage, user]);

  if (user === undefined) {
    return null;
  }


  const handleAddDevice = () => {
    setShowNewDevicePopup(true);
  };

  const handleNewDeviceSubmit = async (deviceData: Device) => {
    try {
      if (socket) {
        socket.emit('device_connect', {
          device_id: deviceData.id,
          device_type: deviceData.type
        });
      }
      await getDevices();
      setShowNewDevicePopup(false);
    } catch (error) {
      console.error('Error handling new device:', error);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await deleteDevice(deviceId);
      if (socket) {
        socket.emit('device_disconnect', {
          device_id: deviceId
        });
      }
      getDevices();
    } catch (error) {
      console.error('Error removing device:', error);
    }
  };

  const isAdmin = user?.role === "admin";


  return (
    <div className='relative flex p-6 place-content-center'>
      <div className='grid min-w-[1200px] w-[1200px] p-10 rounded-md'>
        <div className='mb-6'>
          <div className="flex justify-between items-center">
            <div>
              <h2 className='text-primary text-2xl font-semibold'>Görüntü Kaynakları Yönetim Paneli</h2>
              <p className='text-primary-light text-md'>
                Yeni bir kaynak eklemeden önce lütfen gerekli bağlantıları sağladığınızdan emin olunuz.
              </p>
              {!isConnected && (
                <p className="text-red-600 text-sm mt-2">● Sunucu bağlantısı kesildi</p>
              )}
            </div>

            {/* SAĞA HİZALANMIŞ BUTON */}
            {isAdmin && (
            <button
              onClick={handleAddDevice}
              className="ml-auto flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
                <span className="ml-2">Yeni Cihaz Ekle</span>
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className='flex justify-center items-center h-80 '>
            <Loading />
          </div>
        )}
        {!isLoading && (
          <div className='grid gap-8 grid-cols-2 pt-4 justify-items-center pb-1'>
            {devices.map((device) => (
              <DeviceCard key={`${device.id}-${currentPage}`} device={device} refreshDevices={getDevices} />
            ))}
          </div>
        )}
        <div className="flex flex-col items-center mt-8">
          <span className="text-sm text-muted">
            Toplam <span className="font-semibold text-primary">{totalDevices}</span> kaynaktan
            <span className="font-semibold text-primary"> {(currentPage - 1) * devicePerPage + 1}.</span> ile
            <span className="font-semibold text-primary"> {Math.min(currentPage * devicePerPage, totalDevices)}.</span> arasındaki kaynaklar gösteriliyor.
          </span>

          <div className="inline-flex mt-2">
            <button
              className={`px-3 h-8 text-sm font-medium text-white bg-primary rounded-s hover:bg-primary-dark ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Önceki
            </button>
            <button
              className={`px-3 h-8 text-sm font-medium text-white bg-primary rounded-e hover:bg-primary-dark ${currentPage * devicePerPage >= totalDevices ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => setCurrentPage(prev => (currentPage * devicePerPage < totalDevices ? prev + 1 : prev))}
              disabled={currentPage * devicePerPage >= totalDevices}
            >
              Sonraki
            </button>
          </div>
        </div>
        {isAdmin && (
          <>
            {showNewDevicePopup && (
              <PopUpNewDevice
                onClose={() => setShowNewDevicePopup(false)}
                onSubmit={handleNewDeviceSubmit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};