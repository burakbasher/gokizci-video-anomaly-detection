"use client";

import React, { useState, ChangeEvent } from 'react';
import { BlackButton } from '../buttons/BlackButton';
import { initialPasswordChangeForm, ErrorsPassword, passwordChangeFormControls, initialPasswordErrors } from '@/app/lib/definitions';

export function PopUpChangePassword({ onClose, userId }: { onClose: () => void; userId: string }) {
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<ErrorsPassword>(initialPasswordErrors);
    const [formValues, setFormValues] = useState(initialPasswordChangeForm);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        let hasError = false;
        const tempErrors: ErrorsPassword = { ...initialPasswordErrors };

        // Kontrolleri dinamik olarak denetleyin
        passwordChangeFormControls.forEach((control) => {
            if (!formValues[control.id as keyof typeof formValues]) {
                tempErrors[control.id as keyof typeof tempErrors] = `${control.label} zorunludur.`;
                hasError = true;
            }
        });

        if (formValues.passwordNew1.length < 8) {
            tempErrors.passwordNew1 = 'Parola 8 karakterden uzun olmak zorundadır.';
            hasError = true;
        }
        if (formValues.passwordNew2.length != formValues.passwordNew1.length) {
            tempErrors.passwordNew1 = 'Parolalar birbiriyle uyuşmuyor.';
            tempErrors.passwordNew2 = 'Parolalar birbiriyle uyuşmuyor.';
            hasError = true;
        }

        if (hasError) {
            setErrors(tempErrors);
            return;
        }

        console.log(formValues.passwordOld)

        console.log(formValues.passwordNew1)

        try {
            // Parola güncelleme isteği
            const res = await fetch("/api/changePassword", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: userId,
                    oldPassword: formValues.passwordOld,
                    newPassword: formValues.passwordNew1,
                })
            });


            if (res.status === 400) {
                tempErrors.passwordOld = 'Kullanıcı parolası yanlış.';
                hasError = true;
            }
            if (res.status === 200) {
                tempErrors.success = 'Parola başarıyla değiştirildi.';
                hasError = true;
            }

            if (hasError) {
                setErrors(tempErrors);
                return;
            }

        } catch (error) {
            tempErrors.passwordOld = 'Hata, lütfen tekrar deneyin.';
            tempErrors.passwordNew1 = 'Hata, lütfen tekrar deneyin.';
            tempErrors.passwordNew2 = 'Hata, lütfen tekrar deneyin.';
            hasError = true;
            console.log(error);
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
                    <div className="relative border border-stroke-main rounded-lg bg-background-surface mt-[10%] shadow-lg border-t-4 border-t-dark">
                        <button
                            type="button"
                            className="absolute top-3 right-2.5 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
                            onClick={() => onClose()}
                        >
                            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span className="sr-only">Close modal</span>
                        </button>
                        <form className='m-6 grid gap-4' onSubmit={handleSubmit}>
                            <p className='text-dark text-center text-2xl font-medium'>Parola Değiştir</p>
                            {passwordChangeFormControls.map(control => (
                                <div key={control.id} className='relative'>
                                    <div className="relative">
                                        {control.componentType === 'input' && (
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    id={control.id}
                                                    value={formValues[control.id as keyof typeof formValues]}
                                                    onChange={handleInputChange}
                                                    className={`block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 appearance-none bg-transparent rounded-lg border ${errors[control.id as keyof typeof errors] ? 'border-red-600' : 'border-stroke-main'} appearance-none dark:text-white dark:border-stroke-main dark:focus:border-stroke-dark focus:outline-none focus:ring-0 focus:border-stroke-dark peer hide-ms-clear-reveal`}
                                                    placeholder=" "
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                                                >
                                                    {showPassword ? (
                                                        <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <g clipPath="url(#clip0_161_660)">
                                                                <path d="M35.88 35.88C32.4612 38.486 28.2982 39.9297 24 40C10 40 2 24 2 24C4.48778 19.3638 7.93827 15.3132 12.12 12.12M19.8 8.48C21.1767 8.15776 22.5861 7.99668 24 8C38 8 46 24 46 24C44.786 26.2712 43.3381 28.4095 41.68 30.38M28.24 28.24C27.6907 28.8295 27.0283 29.3023 26.2923 29.6302C25.5563 29.9582 24.7618 30.1345 23.9562 30.1487C23.1506 30.1629 22.3503 30.0148 21.6032 29.713C20.8561 29.4112 20.1774 28.9621 19.6077 28.3923C19.0379 27.8226 18.5888 27.1439 18.287 26.3968C17.9852 25.6497 17.8371 24.8494 17.8513 24.0438C17.8655 23.2382 18.0418 22.4437 18.3698 21.7077C18.6977 20.9717 19.1705 20.3093 19.76 19.76M2 2L46 46" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                                            </g>
                                                            <defs>
                                                                <clipPath id="clip0_161_660">
                                                                    <rect width="48" height="48" fill="white" />
                                                                </clipPath>
                                                            </defs>
                                                        </svg>
                                                    ) : (
                                                        <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M2 24C2 24 10 8 24 8C38 8 46 24 46 24C46 24 38 40 24 40C10 40 2 24 2 24Z" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                                            <path d="M24 30C27.3137 30 30 27.3137 30 24C30 20.6863 27.3137 18 24 18C20.6863 18 18 20.6863 18 24C18 27.3137 20.6863 30 24 30Z" stroke="#1E1E1E" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>

                                                    )}
                                                </button>
                                            </div>
                                        )}
                                        <label
                                            htmlFor={control.id}
                                            className={`absolute text-sm ${errors[control.id as keyof typeof errors] ? 'text-red-600' : 'text-secondary'} dark:text-secondary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-background-surface dark:bg-gray-900 px-2 peer-focus:px-2 peer-focus:text-dark peer-focus:dark:text-dark peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}>
                                            {control.label}
                                        </label>
                                        {errors[control.id as keyof typeof errors] && (
                                            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                                <span className="font-medium">Hata:</span> {errors[control.id as keyof typeof errors]}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
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
    )
}