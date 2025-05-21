"components/popups/PopUpProfileMenu.tsx"

"use client";

import React from "react";
import { LogOut, HelpCircle, User } from "lucide-react";

interface Props {
    onClose: () => void;
    onLogout: () => void;
}

export function ProfileMenuPopup({ onClose, onLogout }: Props) {
    return (
        <div className="absolute right-0 top-14 mt-2 w-56 bg-background-surface rounded-md shadow-lg z-50 border border-background-alt">
            <ul className="text-sm text-primary">
                <li className="px-4 py-2 hover:bg-background cursor-pointer flex items-center" onClick={() => { onClose(); window.location.href = "/profile"; }}>
                    <User size={16} className="mr-2" />
                    Hesabı Görüntüle
                </li>
                <li className="px-4 py-2 hover:bg-background cursor-pointer flex items-center" onClick={() => { onClose(); window.location.href = "/help"; }}>
                    <HelpCircle size={16} className="mr-2" />
                    Yardım ve SSS
                </li>
                <li>
                    <div className="border-t border-background-alt"></div>
                </li>
                <li className="px-4 py-2 hover:bg-background cursor-pointer flex items-center" onClick={onLogout}>
                    <LogOut size={16} className="mr-2" />
                    Oturumu Kapat
                </li>
            </ul>
        </div>
    );
}
