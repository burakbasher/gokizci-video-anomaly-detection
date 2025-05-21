"components/profile/ProfilePanel.tsx"

"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/contexts/AuthContext";
import { Shield, Bell, Calendar, User, Mail, Lock, Edit2 } from "lucide-react";
import { editSelf } from "@/app/lib/api";
import { PopUpChangePassword } from "../popups/PopUpChangePassword";

export const ProfilePanel = () => {
    const { user, refreshUser } = useAuth();
    const [isEditingInfo, setIsEditingInfo] = useState(false);

    // form state
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [isPopupVisible, setPopupVisible] = useState(false);
    // Örnek: Bildirim tercihleri state
    const [emailNotif, setEmailNotif] = useState(false);
    const [smsNotif, setSmsNotif] = useState(false);
    const [profileCompletion, setProfileCompletion] = useState(0);

    
    useEffect(() => {
        if (!user) return;
        setUsername(user.username);
        setEmail(user.email);
        setProfileCompletion(user.profile_completion);
        setEmailNotif(user.email_notification);
        setSmsNotif(user.sms_notification);
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            await editSelf({ username, email });
            await refreshUser();
            setMsg("Bilgiler kaydedildi.");
            setIsEditingInfo(false);
        } catch {
            setMsg("Kaydetme sırasında hata!");
        } finally {
            setSaving(false);
        }
    };

    const handlePopupToggle = () => {
        setPopupVisible(!isPopupVisible);
    };

    if (user === undefined || user === null) return null;

    
    const handleEmailNotif = async () => {
        const newState = !emailNotif;
        setEmailNotif(newState);
        await editSelf({ email_notification: newState });
    };

    const handleSmsNotif = async () => {
        const newState = !smsNotif;
        setSmsNotif(newState);
        await editSelf({ sms_notification: newState });
    };

    return (
        <div className="flex justify-center min-h-screen p-8">
            <div className="w-full max-w-4xl space-y-8">
                {/* --- Başlık & Avatar --- */}
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-24 h-24 bg-primary text-white rounded-full flex items-center justify-center text-4xl font-semibold hover:shadow-md">
                            {user.username.charAt(0).toUpperCase()}
                        </div>
                    </div>
                    <div>
                        <h1 className="text-primary text-3xl font-semibold">{user.username}</h1>
                        <p className="text-primary-light text-sm">
                            {user.role === "admin" ? "Yönetici" : "Kullanıcı"}
                        </p>
                        <p className="text-secondary text-xs flex items-center gap-1 mt-1">
                            <Calendar className="w-4 h-4" /> {new Date(user.created_at).toLocaleDateString()} tarihinde katıldı
                        </p>
                    </div>
                </div>

                {/* --- Profil Tamamlama Çubuğu --- */}
                <section className="flex flex-col bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md transition-all p-4">
                    <h2 className="text-primary font-medium mb-2">Profil Tamamlama</h2>
                    <div className="w-full bg-background-alt h-2 rounded-full overflow-hidden">
                        <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: `${profileCompletion}%` }}
                        />
                    </div>
                    <p className="text-secondary text-xs mt-1">Profiliniz %{profileCompletion} tamamlandı</p>
                </section>

                {/* --- Bilgi & Ayarlar Grid'i --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <section className="col-span-2">
                        {/* Düzenlenebilir Kişisel Bilgiler */}
                        <section className="col-span-2 flex flex-col bg-background-surface rounded-lg border border-background-alt shadow-sm 
                        hover:shadow-md transition-all p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-primary text-xl font-semibold">Kişisel Bilgiler</h2>
                                <button
                                    onClick={() => {
                                        setMsg(null);
                                        setIsEditingInfo((v) => !v);
                                        if (isEditingInfo) {
                                            // iptal edince eski değerlere dön
                                            setUsername(user.username);
                                            setEmail(user.email);
                                        }
                                    }}
                                    className="text-primary-light hover:text-primary transition"
                                    title={isEditingInfo ? "İptal et" : "Düzenle"}
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            </div>
                            {isEditingInfo ? (
                                <form onSubmit={handleSave} className="text-sm">
                                    {/* Kullanıcı Adı */}
                                    <div className="flex mb-2">
                                        <label htmlFor="username" className="text-primary text-sm flex items-center">
                                            <User className="w-4 h-4 mr-2" />
                                            Kullanıcı Adı:
                                        </label>
                                        <input
                                            id="username"
                                            type="text"
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            className="ml-2 px-3 py-2 border border-background-alt rounded-lg focus:outline-none"
                                        />
                                    </div>
                                    {/* E-posta */}
                                    <div className="flex mb-6">
                                        <label htmlFor="email" className="text-primary text-sm flex items-center">
                                            <Mail className="w-4 h-4 mr-2" />
                                            E-posta:
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="ml-2 px-2 py-2 border border-background-alt rounded-lg focus:outline-none"
                                        />
                                    </div>

                                    {/* Kaydet Button'u */}

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="submit"
                                            disabled={!isEditingInfo}
                                            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-40 
                                            disabled:cursor-not-allowed disabled:hover:bg-primary"
                                        >
                                            {saving ? "Kaydediliyor..." : "Kaydet"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsEditingInfo(false);
                                                setUsername(user.username);
                                                setEmail(user.email);
                                                setMsg(null);
                                            }}
                                            disabled={saving}
                                            className="px-4 py-2 bg-background-alt text-primary rounded-lg hover:bg-background-main transition disabled:opacity-50"
                                        >
                                            İptal
                                        </button>
                                        {msg && (
                                            <p className="text-xs text-primary-light">{msg}</p>
                                        )}
                                    </div>
                                </form>
                            ) : (
                                <div className="text-sm">
                                    {/* Kullanıcı Adı */}
                                    <div className="flex mb-2">
                                        <label htmlFor="username" className="text-primary text-sm flex items-center">
                                            <User className="w-4 h-4 mr-2" />
                                            Kullanıcı Adı:
                                        </label>
                                        <label
                                            className="ml-2 px-3 py-2 border border-background-surface rounded-lg focus:outline-none"
                                        >
                                            {user.username}
                                        </label>
                                    </div>
                                    {/* E-posta */}
                                    <div className="flex mb-6">
                                        <label htmlFor="email" className="text-primary text-sm flex items-center">
                                            <Mail className="w-4 h-4 mr-2" />
                                            E-posta:
                                        </label>
                                        <label
                                            className="ml-2 px-2 py-2 border border-background-surface rounded-lg focus:outline-none"
                                        >
                                            {user.email}
                                        </label>
                                    </div>

                                    {/* Kaydet Button'u */}

                                    <div className="md:col-span-2 flex items-center">
                                        <button
                                            type="submit"
                                            disabled={!isEditingInfo}
                                            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-40 
                                            disabled:cursor-not-allowed disabled:hover:bg-primary"
                                        >
                                            {saving ? "Kaydediliyor..." : "Kaydet"}
                                        </button>
                                        {msg && (
                                            <p className="ml-4 text-sm text-primary-light">{msg}</p>
                                        )}
                                    </div>

                                </div>
                            )}
                        </section>
                    </section>

                    <section className="flex flex-col gap-6">
                        {/* Hesap Güvenliği */}
                        <section className="flex flex-col bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md 
                    transition-all  p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-primary" />
                                <h2 className="text-primary text-xl font-semibold">Hesap Güvenliği</h2>
                            </div>
                            <ul className="text-secondary text-sm space-y-2">
                                <li>
                                    <span className="font-medium">Son Şifre Değişikliği:</span>{" "}
                                    {new Date(user.created_at).toLocaleDateString()}
                                </li>

                            </ul>
                            <button
                                onClick={handlePopupToggle}
                                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm">
                                Şifreyi Değiştir
                            </button>

                        </section>

                        {/* Bildirim Ayarları */}
                        <section className=" bg-background-surface rounded-lg border border-background-alt shadow-sm hover:shadow-md 
                    transition-all rounded-lg p-6 space-y-4">
                            <div className="flex items-center gap-2">
                                <Bell className="w-5 h-5 text-primary" />
                                <h2 className="text-primary text-xl font-semibold">Bildirim Ayarları</h2>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-secondary text-sm">E-posta Bildirimleri</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={emailNotif}
                                        onChange={handleEmailNotif}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-4 bg-background-alt rounded-full peer-checked:bg-primary transition-colors" />
                                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-6 transition-transform" />
                                </label>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-secondary text-sm">SMS Bildirimleri</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={smsNotif}
                                        onChange={handleSmsNotif}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-4 bg-background-alt rounded-full peer-checked:bg-primary transition-colors" />
                                    <div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-6 transition-transform" />
                                </label>
                            </div>
                        </section>
                    </section>
                </div>
            </div>
            {isPopupVisible && (
                <div>
                    <div onClick={handlePopupToggle} />
                    <PopUpChangePassword onClose={handlePopupToggle} />
                </div>
            )}
        </div >
    );
};
