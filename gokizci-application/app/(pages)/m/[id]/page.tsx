/*"use client"

//tanstack query v5
import { useQuery } from '@tanstack/react-query'
import { getDeviceById } from "@/app/api/actions"
import StreamSkeleton from '@/components/streamskeleton';
import { useEffect, useState } from 'react';
import { getAlertClasses } from '@/app/lib/definitions';

/**
 * This component displays the live status of an X-ray device, fetching its data every 2 seconds using Tanstack Query.
 * 
 * Main Features:
 * - Fetches device data (X-ray and RFID) using the `getDeviceById` function and displays the device's live alert status.
 * - The X-ray image and RFID data are shown with a dynamic display of the number of detected laptops and tablets.
 * - It fetches data every 2 seconds in the background and updates the device's alert status accordingly.
 * - The page also shows a real-time clock that updates every second, ensuring the displayed data is fresh.
 *
 * Key components:
 * - StreamSkeleton: Displays a skeleton loading state while fetching device data.
 * - getAlertClasses: Dynamically provides alert-related CSS classes based on the device's alert status.
 * - Tanstack Query is used to manage server state and fetch data at regular intervals (2 seconds) in the background.
 *//*


export default function Page({ params, }: { params: { documentID: string }; }) {
    const { data, error, isLoading } = useQuery({
        queryKey: ['liveData', params.documentID],
        queryFn: () => getDeviceById(params.documentID),
        refetchInterval: 2000, // fetch every 2 seconds
        refetchIntervalInBackground: true, // work in background
    });

    const [currentTime, setCurrentTime] = useState(new Date().toLocaleString());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date().toLocaleString());
        }, 1000); // fetch every 1 second

        return () => clearInterval(interval); // clear
    }, []);

    if (isLoading) return <StreamSkeleton />;

    if (error) return <p>Error!</p>;
    const alert = data.device.alert;

    const { alertColorClass, alertBgClass, alertText } = getAlertClasses(alert);

    return (
        <div>
            {/* Filter Options *//*}
            <div className="flex flex-col flex-1 bg-background min-h-screen max-h-screen p-6 min-w-[1000px]">
                <div className="flex justify-end mb-3">
                    <div className="flex space-x-2">
                        <div className={`flex items-center justify-center ${alertBgClass} text-light py-1 px-3 rounded-lg h-full`}>
                            <div className="mr-2">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M13.3332 4L5.99984 11.3333L2.6665 8"
                                        stroke="#F5F5F5"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            RFID
                        </div>
                        <div className={`flex items-center justify-center ${alertBgClass} text-light py-1 px-3 rounded-lg h-full`}>
                            <div className="mr-2">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M13.3332 4L5.99984 11.3333L2.6665 8"
                                        stroke="#F5F5F5"
                                        strokeWidth="1.6"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            Otomatik Nesne Yakalama
                        </div>
                    </div>
                </div>
                <div className="flex flex-1 flex-col border border-stroke-main  overflow-hidden justify-between shadow-lg p-4 bg-white rounded-lg ">
                    <div className="flex justify-end  items-center  pb-2">
                        <span className={`font-semibold mx-2 ${alertColorClass}`}>
                            {alertText}
                        </span>
                        <svg width="30" height="30" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M24 16V24M24 32H24.02M44 24C44 35.0457 35.0457 44 24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C35.0457 4 44 12.9543 44 24Z" className={alertColorClass} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                    <div className="flex items-center justify-center flex-1 overflow-hidden rounded-lg mx-[15%] ">
                        <img
                            src={data.device.prediction.source}
                            alt="X-Ray"
                            className="h-auto rounded-lg"
                            style={{
                                width: '100%', 
                                maxWidth: '700px',
                                objectFit: 'contain',

                            }}
                        />
                    </div>
                    <div className="flex justify-between mt-4">
                        <div>
                            <div className="text-base font-semibold text-dark">X-ray Nesneler</div>
                            <div className="flex gap-4">
                                {data.device.prediction.laptopCount > 0 && (
                                    <span id="badge-dismiss-dark" className="inline-flex items-center px-2 my-1 me-2 text-sm font-medium text-dark bg-icon-passive rounded dark:bg-gray-700 dark:text-gray-300">
                                        Laptop
                                        <div className="inline-flex items-center p-1 ms-2 text-sm text-secondary bg-transparent rounded-sm">
                                            <span>{data.device.prediction.laptopCount}</span>
                                        </div>
                                    </span>
                                )}
                                {data.device.prediction.tabletCount > 0 && (
                                    <span id="badge-dismiss-dark" className="inline-flex items-center px-2 my-1 me-2 text-sm font-medium text-dark bg-icon-passive rounded dark:bg-gray-700 dark:text-gray-300">
                                        Tablet
                                        <div className="inline-flex items-center p-1 ms-2 text-sm text-secondary bg-transparent rounded-sm">
                                            <span>{data.device.prediction.tabletCount}</span>
                                        </div>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className='flex justify-end'>
                                <div className="text-base font-semibold justify-end text-dark">RFID Sertifikası</div>
                            </div>

                            <div className="flex justify-end gap-4">
                                <div className="flex justify-end gap-4">
                                    <div>
                                        <div className="text-sm text-dark font-semibold">Çalışan Adı Soyadı:</div>
                                        {data.device.rfids.map((rfid: any, index: number) => (
                                            <div key={index} className="text-sm text-dark">{rfid.employeeName || 'Bilinmiyor'}</div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="text-sm text-dark font-semibold">Çalışan Birimi:</div>
                                        {data.device.rfids.map((rfid: any, index: number) => (
                                            <div key={index} className="text-sm text-dark">{rfid.department || 'Bilinmiyor'}</div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="text-sm text-dark font-semibold">Cihaz Türü:</div>
                                        {data.device.rfids.map((rfid: any, index: number) => (
                                            <div key={index} className="text-sm text-dark">{rfid.deviceType || 'Bilinmiyor'}</div>
                                        ))}
                                    </div>
                                    <div>
                                        <div className="text-sm text-dark font-semibold">Cihaz Seri Numarası:</div>
                                        {data.device.rfids.map((rfid: any, index: number) => (
                                            <div key={index} className="text-sm text-dark">{rfid.serialNumber || 'Bilinmiyor'}</div>
                                        ))}

                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div className="flex justify-between text-sm text-secondary mt-2">
                        <div>
                            {currentTime}
                        </div>
                        <div>
                            {currentTime}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
*/