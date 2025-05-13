"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/app/lib/api";
import { useAuth } from "@/components/contexts/AuthContext";
import { ProfileMenuPopup } from "./popups/PopUpProfileMenu";
import { useState } from "react";

const Header: React.FC = () => {
    const router = useRouter();
    const { user, setUser } = useAuth();
    const [showMenu, setShowMenu] = useState(false);

    const handleLogout = async () => {
        await logoutUser();
        setUser(null);
        router.push("/auth");
    };


    const toggleMenu = () => setShowMenu((prev) => !prev);
    const closeMenu = () => setShowMenu(false);

    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-background-surface shadow-sm border-b border-background-alt">
            <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between select-none">
                    <div className="flex items-center space-x-10">
                        {/* Logo */}
                        <Link href="#" className="flex items-center text-2xl font-bold">
                            <span className="text-primary">Gök</span>
                            <span className="text-primary-light">izci</span>
                        </Link>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center text-sm text-primary-light">
                            <Link
                                href="/user"
                                className="hover:text-primary-dark font-medium"
                            >
                                Anasayfa
                            </Link>
                        </nav>
                    </div>

                    {/* Right-side Actions */}
                    <div className="flex items-center space-x-6 text-sm text-text-muted">
                        {user ? (
                            <>

                                <Link
                                    href="/"
                                    onClick={handleLogout}
                                    className="font-semibold text-primary hover:text-primary-dark"
                                >
                                    Çıkış Yap
                                </Link>
                                {/* Profil avatarı */}
                                <div className="flex items-center space-x-2">
                                    <div onClick={toggleMenu} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white  text-lg">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                                {showMenu && <ProfileMenuPopup onClose={closeMenu} onLogout={handleLogout} />}
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/auth"
                                    className="font-semibold text-primary hover:text-primary-dark"
                                >
                                    Giriş Yap
                                </Link>
                                <Link
                                    href="/auth"
                                    className="bg-primary text-white px-4 py-1.5 rounded-md hover:bg-primary-dark transition"
                                >
                                    Kayıt Ol
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
