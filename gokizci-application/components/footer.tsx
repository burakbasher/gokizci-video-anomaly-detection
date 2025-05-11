"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PopUpChangePassword } from "./popups/PopUpChangePassword";
import { useAuth } from "@/components/contexts/AuthContext";
import { logoutUser } from "@/app/lib/api";

const Footer = () => {
    const [isPopupVisible, setPopupVisible] = useState(false);
    const { user, setUser } = useAuth();
    const router = useRouter();

    const handlePopupToggle = () => {
        setPopupVisible(!isPopupVisible);
    };

    const handleLogout = async () => {
        await logoutUser();
        setUser(null);
        router.push("/");

    };

    return (
        <footer className="">
            <div className="mx-auto w-full max-w-screen-xl p-4 py-6 lg:py-8">
                <div className="md:flex md:justify-between">
                    <div className="mb-6 md:mb-0">
                        <a href="https://gazi.edu.tr/" className="flex items-center">
                            <img src="https://webupload.gazi.edu.tr/upload/1050/2022/4/4/4617d95e-de92-4809-8a94-3752295d3b37-gazi_universitesi_logo_2017.png" className="h-32" alt="Gazi Logo" />
                        </a>
                    </div>
                    <div className="grid grid-cols-2 gap-8 sm:gap-6 sm:grid-cols-2">
                        {user ? (
                            <>
                                <div>
                                    <h2 className="mb-6">
                                    <span className="mb-6 text-sm font-semibold text-primary">Gök</span>
                                    <span className="mb-6 text-sm font-semibold text-primary-light">izci</span>
                                    </h2>
                                    <ul className="text-primary-light font-medium">
                                        <li className="mb-4">
                                            <a href="/home" className="hover:underline">Anasayfa</a>
                                        </li>
                                        <li className="mb-4">
                                            <a href="/detection" className="hover:underline">Gözlem Sayfası</a>
                                        </li>
                                        <li className="mb-4">
                                            <a className="hover:underline cursor-pointer" onClick={handlePopupToggle}>Şifre Değiştir</a>
                                            {isPopupVisible && (
                                                <div className=''>
                                                    <div className='' onClick={handlePopupToggle}></div>
                                                    <PopUpChangePassword onClose={handlePopupToggle} />
                                                </div>
                                            )}
                                        </li>
                                        <li>
                                            <a onClick={handleLogout} className="hover:underline text-passive cursor-pointer">Çıkış Yap </a>
                                        </li>
                                    </ul>
                                </div>
                            </>
                        ) : (<div></div>)}
                        <div>
                            <h2 className="mb-6 text-sm font-semibold text-dark uppercase dark:text-white">Gazi Üniversitesi</h2>
                            <ul className="text-secondary dark:text-white font-medium">
                                <li className="mb-4">
                                    <a href="https://gazi.edu.tr/view/page/256514/kisisel-verilerin-korunmasi" className="hover:underline">Kişisel Verilerin Korunması</a>
                                </li>
                                <li className="mb-4">
                                    <a href="https://gazi.edu.tr/view/page/217061" className="hover:underline">Üniversitemiz</a>
                                </li>
                                <li className="mb-4">
                                    <a href="https://mf-bm.gazi.edu.tr/" className="hover:underline">Bölümümüz</a>
                                </li>
                                <li>
                                    <a href="https://gazi.edu.tr/view/page/153/iletisim-sayfasi" className="hover:underline">İletişim</a>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
                <hr className="my-6 border-passive sm:mx-auto dark:border-secondary lg:my-8" />
                <div className="sm:flex sm:items-center sm:justify-between">
                    <span className="text-sm text-secondary sm:text-center dark:text-secondary">© 2025 <a href="https://gazi.edu.tr/" className="hover:underline">Gazi Üniversitesi</a>
                    </span>
                    <span className="text-sm text-secondary sm:text-center dark:text-secondary">Gazili olmak ayrıcalıktır.</span>

                    <div className="flex mt-4 sm:justify-center sm:mt-0">
                        <a href="https://x.com/Gazi_Universite" className="text-gray-500 hover:text-gray-900 dark:hover:text-white ms-5">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z">
                                </path>
                            </svg>
                            <span className="sr-only">Twitter page</span>
                        </a>
                        <a href="https://www.instagram.com/gazi_universitesi/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white ms-5">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-4 h-4" >
                                <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334" />
                            </svg>
                            <span className="sr-only">Instagram page</span>
                        </a></div>
                </div>
            </div>
        </footer>

    );
}

export default Footer;