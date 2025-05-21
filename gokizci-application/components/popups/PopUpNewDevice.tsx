"components/popups/PopUpNewDevice.tsx"

"use client";

import React, { useState, ChangeEvent } from 'react';
import { BlackButton } from '../buttons/BlackButton';
import { addDevice } from '@/app/lib/api';

interface PopUpNewDeviceProps {
    onClose: () => void;
    onSubmit: (deviceData: any) => void;
}

interface DeviceFormValues {
    name: string;
    type: string;
    stream_url: string;
}

interface DeviceErrors {
    name?: string;
    type?: string;
    stream_url?: string;
    success?: string;
}

const initialFormValues: DeviceFormValues = {
    name: '',
    type: 'ip_camera',
    stream_url: ''
};

const initialErrors: DeviceErrors = {
    name: '',
    type: '',
    stream_url: '',
    success: ''
};

const deviceTypes = [
    { value: 'drone', label: 'Drone' },
    { value: 'ip_camera', label: 'IP Kamera' },
    { value: 'webcam', label: 'Webcam' }
];

export function PopUpNewDevice({ onClose, onSubmit }: PopUpNewDeviceProps) {
    const [formValues, setFormValues] = useState<DeviceFormValues>(initialFormValues);
    const [errors, setErrors] = useState<DeviceErrors>(initialErrors);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let hasError = false;
        const tempErrors: DeviceErrors = { ...initialErrors };

        // Validate form fields
        if (!formValues.name.trim()) {
            tempErrors.name = 'Cihaz adı zorunludur.';
            hasError = true;
        }

        if (!formValues.type) {
            tempErrors.type = 'Cihaz tipi zorunludur.';
            hasError = true;
        }

        if (!formValues.stream_url.trim()) {
            tempErrors.stream_url = 'Stream URL zorunludur.';
            hasError = true;
        }

        if (hasError) {
            setErrors(tempErrors);
            return;
        }

        try {
            const device = await addDevice(formValues);
            tempErrors.success = 'Cihaz başarıyla eklendi.';
            setErrors(tempErrors);
            
            // Call onSubmit with the new device data
            onSubmit(device);
            
            // Close popup after successful submission
            setTimeout(() => {
                onClose();
            }, 1500);

        } catch (error) {
            console.error('Error adding device:', error);
            tempErrors.name = 'Cihaz eklenirken bir hata oluştu.';
            setErrors(tempErrors);
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormValues(prev => ({ ...prev, [id]: value }));
    };

    return (
        <>
            {/* Modal */}
            <div id="popup-modal" tabIndex={-1} className="overflow-y-auto overflow-x-hidden bg-background/40 fixed top-0 right-0 left-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full flex">
                <div className="relative p-4 w-full max-w-md max-h-full">
                    <div className="relative border border-stroke-main rounded-lg bg-background-surface mt-[10%] shadow-lg border-t-4 border-t-primary border-1 border-background-alt">
                        <button
                            type="button"
                            className="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                            onClick={onClose}
                        >
                            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span className="sr-only">Close modal</span>
                        </button>
                        <form className='m-6 grid gap-4' onSubmit={handleSubmit}>
                            <p className='text-dark text-center text-2xl font-medium'>Yeni Cihaz Ekle</p>

                            {/* Device Name Input */}
                            <div className='relative'>
                                <input
                                    type="text"
                                    id="name"
                                    value={formValues.name}
                                    onChange={handleInputChange}
                                    className={`block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border ${errors.name ? 'border-red-600' : 'border-stroke-main'} appearance-none dark:text-white dark:border-stroke-main dark:focus:border-stroke-dark focus:outline-none focus:ring-0 focus:border-stroke-dark peer`}
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="name"
                                    className={`absolute text-sm ${errors.name ? 'text-red-600' : 'text-secondary'} dark:text-secondary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-background-surface dark:bg-gray-900 px-2 peer-focus:px-2 peer-focus:text-dark peer-focus:dark:text-dark peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}
                                >
                                    Cihaz Adı
                                </label>
                                {errors.name && (
                                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                        <span className="font-medium">Hata:</span> {errors.name}
                                    </p>
                                )}
                            </div>

                            {/* Device Type Select */}
                            <div className='relative'>
                                <select
                                    id="type"
                                    value={formValues.type}
                                    onChange={handleInputChange}
                                    className={`block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border ${errors.type ? 'border-red-600' : 'border-stroke-main'} appearance-none dark:text-white dark:border-stroke-main dark:focus:border-stroke-dark focus:outline-none focus:ring-0 focus:border-stroke-dark peer`}
                                >
                                    {deviceTypes.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                                <label
                                    htmlFor="type"
                                    className={`absolute text-sm ${errors.type ? 'text-red-600' : 'text-secondary'} dark:text-secondary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-background-surface dark:bg-gray-900 px-2 peer-focus:px-2 peer-focus:text-dark peer-focus:dark:text-dark peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}
                                >
                                    Cihaz Tipi
                                </label>
                                {errors.type && (
                                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                        <span className="font-medium">Hata:</span> {errors.type}
                                    </p>
                                )}
                            </div>

                            {/* Stream URL Input */}
                            <div className='relative'>
                                <input
                                    type="text"
                                    id="stream_url"
                                    value={formValues.stream_url}
                                    onChange={handleInputChange}
                                    className={`block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border ${errors.stream_url ? 'border-red-600' : 'border-stroke-main'} appearance-none dark:text-white dark:border-stroke-main dark:focus:border-stroke-dark focus:outline-none focus:ring-0 focus:border-stroke-dark peer`}
                                    placeholder=" "
                                />
                                <label
                                    htmlFor="stream_url"
                                    className={`absolute text-sm ${errors.stream_url ? 'text-red-600' : 'text-secondary'} dark:text-secondary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-background-surface dark:bg-gray-900 px-2 peer-focus:px-2 peer-focus:text-dark peer-focus:dark:text-dark peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}
                                >
                                    Stream URL
                                </label>
                                {errors.stream_url && (
                                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                        <span className="font-medium">Hata:</span> {errors.stream_url}
                                    </p>
                                )}
                            </div>

                            {errors.success && (
                                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                                    {errors.success}
                                </p>
                            )}

                            <div className='w-full'>
                                <BlackButton text="Kaydet" />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
} 