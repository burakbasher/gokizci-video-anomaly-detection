/*import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Device, getAlertClasses } from '@/app/lib/definitions';
import { useRouter } from "next/navigation";

import { Loading } from '../loading';

export function StreamSideBar() {
  const { data: session } = useSession();
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [showPopover, setShowPopover] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const router = useRouter();


  const handleConfirmClick = async () => {
    if (selectedDeviceId) {
      try {
        const res = await fetch('/api/editThreshold', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedDeviceId, detectionThreshold: sliderValue }),
        });
        if (!res.ok) throw new Error('Failed to update detection threshold');
      } catch (error) {
        console.error('Error updating detection threshold:', error);
      }
    }
  };

  const { alertRadio, alertSlider, alertHoverBg } = getAlertClasses(selectedDevice?.alert || 0);

  if (isLoading) return <Loading />;
  if (error) return <p>Error!</p>;

  return (
    <div className="flex flex-col w-1/6 p-4 space-y-4 bg-white shadow-lg rounded-lg m-6 border border-stroke-main justify-between min-w-[230px]">
      <div className="flex flex-col gap-6">
        {/* Etiketler *//*}
        <div>
          <h2 className="font-semibold text-lg mb-2">Nesneler</h2>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-2 py-1 me-2 text-sm font-medium text-dark bg-icon-passive rounded">
              Laptop
              <div className="inline-flex items-center p-1 ms-2 text-sm text-gray-400">
                <svg className="w-2 h-2" viewBox="0 0 14 14" fill="none">
                  <path stroke="currentColor" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </div>
            </span>
            <span className="inline-flex items-center px-2 py-1 me-2 text-sm font-medium text-dark bg-icon-passive rounded">
              Tablet
              <div className="inline-flex items-center p-1 ms-2 text-sm text-gray-400">
                <svg className="w-2 h-2" viewBox="0 0 14 14" fill="none">
                  <path stroke="currentColor" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                </svg>
              </div>
            </span>
          </div>
        </div>

        {/* Cihazlar *//*}
        <div>
          <h2 className="font-semibold text-lg mb-2">Cihazlar</h2>
          {devices.map((device, index) => (
            <DeviceList
              key={index}
              deviceID={device.deviceId}
              documentID={device._id}
              name={device.name}
              onChange={handleDeviceChange}
              color={alertRadio}
              checked={selectedDeviceId === device._id}
            />
          ))}
        </div>

        {/* Slider *//*}
        <div className="relative">
          <div className="flex justify-between" onMouseEnter={() => setShowPopover(true)} onMouseLeave={() => setShowPopover(false)}>
            <label className="font-semibold text-lg mb-2">Yakalama Eşiği</label>
            {showPopover && (
              <div className="absolute z-10 w-64 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm p-3" style={{ top: '-90px', left: '50%', transform: 'translateX(-50%)' }}>
                <h3 className="font-semibold text-gray-900">Yakalama Eşiği</h3>
                <p>Bu ayar, sistemin nesneleri algılama hassasiyetini ayarlar.</p>
              </div>
            )}
            <label className="font-semibold text-lg mb-2">%{sliderValue}</label>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleSliderChange}
            className={`w-full h-2 bg-gray-200 ${alertSlider} appearance-none rounded-lg cursor-pointer`}
          />
        </div>

        {/* Buton *//*}
        <div className='flex justify-center items-center'>
          <div className='flex justify-center items-center w-1/2'>
            <DynamicButton text="Onayla" dynamicBg={alertHoverBg} onClick={handleConfirmClick} />
          </div>
        </div>
      </div>

      {/* Kullanıcı *//*}
      <div className='flex'>
        <div className='shadow-lg h-fit w-fit rounded-full'>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="0.5" y="0.5" width="39" height="39" rx="19.5" fill="white" stroke="#D9D9D9" />
            <path fillRule="evenodd" clipRule="evenodd" d="M26 16c0 3.314-2.686 6-6 6s-6-2.686-6-6 2.686-6 6-6 6 2.686 6 6zm-2 0c0-2.209-1.791-4-4-4s-4 1.791-4 4 1.791 4 4 4 4-1.791 4-4z" fill="#1E1E1E" />
            <path d="M20 25c-6.474 0-11.99 3.828-14.091 9.192a35.797 35.797 0 0 0 1.614 1.44c1.565-4.924 6.474-8.632 12.477-8.632s10.912 3.707 12.477 8.632a35.797 35.797 0 0 0 1.614-1.44C31.99 28.828 26.474 25 20 25z" fill="#1E1E1E" />
          </svg>
        </div>
        <div className='ml-4'>
          <p className='text-primary font-medium mb-1'>{session?.user?.userName}</p>
          <span className='flex text-muted font-normal'>{session?.user?.role}</span>
          <button onClick={() => signOut()} className="text-muted font-normal hover:underline underline-offset-2">Çıkış Yap</button>
        </div>
      </div>
    </div>
  );
}
*/