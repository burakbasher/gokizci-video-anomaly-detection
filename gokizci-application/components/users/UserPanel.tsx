"use client";

import React, { useState, useEffect } from "react";
import { userFormControls, Errors, User, initialErrors, initialFormValues } from "@/app/lib/definitions";
import { PopUpNewUser } from '../popups/PopUpNewUser';
import { fetchUsers, addUser } from "@/app/lib/api";
import { UserCard } from "./UserCard";
import { UserPlus } from "lucide-react";

export function UserPanel() {
    const [isPopupVisible, setPopupVisible] = useState(false);
    const [users, setUsers] = useState<User[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const usersPerPage = 6;

    const getUsers = async (page = 1) => {
        try {
            const { users, total } = await fetchUsers(page, usersPerPage);
            setUsers(users);
            setTotalUsers(total);
        } catch (error) {
            console.error("Error fetching users:", error);
            setUsers([]);
            setTotalUsers(0);
        }
    };

    useEffect(() => {
        getUsers(currentPage);
    }, [currentPage]);

    const handlePopupToggle = () => {
        setPopupVisible(!isPopupVisible);
    };

    const handleUserSubmit = async (userData: { username: string; email: string; password: string; role: string }) => {
        try {
            await addUser(userData);
            getUsers(currentPage);
            setPopupVisible(false);
        } catch (error) {
            console.error("Error adding user:", error);
        }
    };

    return (
        <div className="relative flex min-h-screen p-6 place-content-center">
            <div className="grid w-[1200px] h-[600px] p-10">
                <div className="px-4">
                    <div className="flex justify-between items-center">
                        <div className="w-[84%]">
                            <h2 className="text-primary text-2xl font-semibold ">Kullanıcı Yönetim Paneli</h2>
                            <p className="text-primary-light text-md">
                                Yeni bir kullanıcı eklemeden ve/veya var olan bir kullanıcıyı düzenlemeden önce lütfen yaptığınız
                                değişikliklerin doğru olduğundan emin olunuz.
                            </p>
                        </div>

                        {/* Kullanıcı Ekle Butonu */}
                        <button
                            onClick={handlePopupToggle}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                        >
                            <UserPlus className="w-5 h-5" />
                            <span>Kullanıcı Ekle</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-rows-2 grid-cols-3 min-w-[1000px] h-full gap-8 mt-4 mx-[5%]">
                    {users.map((user, index) => (
                        <UserCard key={index} id={user.id} role={user.role} name={user.username} />
                    ))}
                </div>

                <div className="flex flex-col items-center mt-8">
                    <span className="text-sm text-muted">
                        Toplam <span className="font-semibold text-primary">{totalUsers}</span> kullanıcıdan
                        <span className="font-semibold text-primary"> {(currentPage - 1) * usersPerPage + 1}</span> -
                        <span className="font-semibold text-primary"> {Math.min(currentPage * usersPerPage, totalUsers)}</span>{" "}
                        arası gösteriliyor.
                    </span>

                    <div className="inline-flex mt-2">
                        <button
                            className={`px-3 h-8 text-sm font-medium text-white bg-primary rounded-s hover:bg-primary-dark ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Önceki
                        </button>
                        <button
                            className={`px-3 h-8 text-sm font-medium text-white bg-primary rounded-e hover:bg-primary-dark ${currentPage * usersPerPage >= totalUsers ? "opacity-50 cursor-not-allowed" : ""
                                }`}
                            onClick={() =>
                                setCurrentPage((prev) =>
                                    currentPage * usersPerPage < totalUsers ? prev + 1 : prev
                                )
                            }
                            disabled={currentPage * usersPerPage >= totalUsers}
                        >
                            Sonraki
                        </button>
                    </div>
                </div>
            </div>

            {isPopupVisible && (
                <PopUpNewUser onClose={handlePopupToggle} onSubmit={handleUserSubmit} />
            )}
        </div>
    );
}
