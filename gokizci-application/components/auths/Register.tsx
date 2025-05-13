import { useRouter } from 'next/navigation'
import { BlackButton } from '../buttons/BlackButton';
import React, { useEffect, useState } from 'react';
import { registerUser } from '@/app/lib/api';

interface Errors {
    email: string;
    password: string;
}

interface RegisterProps {
    onLoginClick: () => void;
}

export function Register({ onLoginClick }: RegisterProps) {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({
        username: '',
        email: '',
        password: ''
    });

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);
        const username = formData.get('username')?.toString() || '';
        const email = formData.get('email')?.toString() || '';
        const password = formData.get('password')?.toString() || '';

        let hasError = false;
        const tempErrors = { username: '', email: '', password: '' };

        if (!username) {
            tempErrors.username = 'Kullanıcı adı zorunludur.';
            hasError = true;
        }

        if (!email) {
            tempErrors.email = 'E-posta adresi zorunludur.';
            hasError = true;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            tempErrors.email = 'Geçerli bir e-posta adresi giriniz.';
            hasError = true;
        }

        if (!password) {
            tempErrors.password = 'Parola zorunludur.';
            hasError = true;
        } else if (password.length < 6) {
            tempErrors.password = 'Parola en az 6 karakter olmalıdır.';
            hasError = true;
        }

        if (hasError) {
            setErrors(tempErrors);
            setLoading(false);
            return;
        }

        try {
            await registerUser(username, email, password);
            router.push('/user');
        } catch (err: any) {
            setErrors({
                ...tempErrors,
                email: err.message || 'Kayıt işlemi başarısız oldu.'
            });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className='flex min-h-screen p-6 place-content-center'>
            <div>
                <div className='grid gap-4 border border-stroke-main h-[420px] rounded-lg w-[350px] bg-background-surface mt-[10%] 
            shadow-lg border-t-4 border-t-primary border-background-alt'>
                    <form className='m-6 grid gap-4' onSubmit={handleSubmit}>
                        <p className='text-dark text-center text-2xl font-medium select-none'>Hesap Oluştur</p>

                        {/* username input */}
                        <div className=''>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="username"
                                    className={`block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border ${errors.username ? 'border-red-600' : 'border-stroke-main'} appearance-none dark:text-white dark:border-stroke-main dark:focus:border-stroke-dark focus:outline-none focus:ring-0 focus:border-stroke-dark peer`}
                                    placeholder=" "
                                    required
                                />
                                <label
                                    htmlFor="username"
                                    className={`absolute text-sm ${errors.username ? 'text-red-600' : 'text-secondary'} dark:text-secondary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-background-surface dark:bg-gray-900 px-2 peer-focus:px-2 peer-focus:text-dark peer-focus:dark:text-dark peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}>
                                    Kullanıcı Adı
                                </label>
                                {errors.username && (
                                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                        <span className="font-medium">Hata:</span> {errors.username}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* email input */}
                        <div className=''>
                            <div className="relative">
                                <input
                                    type="email"
                                    name="email"
                                    className={`block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border ${errors.email ? 'border-red-600' : 'border-stroke-main'} appearance-none dark:text-white dark:border-stroke-main dark:focus:border-stroke-dark focus:outline-none focus:ring-0 focus:border-stroke-dark peer`}
                                    placeholder=" "
                                    required
                                />
                                <label
                                    htmlFor="email"
                                    className={`absolute text-sm ${errors.email ? 'text-red-600' : 'text-secondary'} dark:text-secondary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-background-surface dark:bg-gray-900 px-2 peer-focus:px-2 peer-focus:text-dark peer-focus:dark:text-dark peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}>
                                    E-posta
                                </label>
                                {errors.email && (
                                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                        <span className="font-medium">Hata:</span> {errors.email}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* password input */}
                        <div className=''>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    className={`block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border ${errors.password ? 'border-red-600' : 'border-stroke-main'} appearance-none dark:text-white dark:border-stroke-main dark:focus:border-stroke-dark focus:outline-none focus:ring-0 focus:border-stroke-dark peer`}
                                    placeholder=" "
                                    required
                                />
                                <label
                                    htmlFor="password"
                                    className={`absolute text-sm ${errors.password ? 'text-red-600' : 'text-secondary'} dark:text-secondary duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-background-surface dark:bg-gray-900 px-2 peer-focus:px-2 peer-focus:text-dark peer-focus:dark:text-dark peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1`}>
                                    Parola
                                </label>
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
                                {errors.password && (
                                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                        <span className="font-medium">Hata:</span> {errors.password}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* submit button */}
                        <div className='w-full'>
                            <BlackButton text={loading ? "Hesap Oluşturuluyor..." : "Hesap Oluştur"} disabled={loading} />
                        </div>

                        {/* login link */}
                        <p className='text-dark font-normal hover:underline cursor-pointer select-none text-sm' onClick={onLoginClick}>
                            Zaten hesabınız var mı? Giriş yapın
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}