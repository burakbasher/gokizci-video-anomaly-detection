// components/users/UserCard.tsx
import { useState } from "react";
import { PopUpEditUser } from "../popups/PopUpEditUser";
import { PopUpConfirmDelete } from "../popups/PopUpConfirmDelete"; // Eklendi
import { Edit2, Trash2 } from "lucide-react"; // Trash2 eklendi
import { deleteUser } from "@/app/lib/api"; // Eklendi
import { toast } from 'react-toastify'; // İsteğe bağlı: Bildirimler için

interface Props {
    id: string;
    name: string;
    email: string;
    role: string;
    refreshUsers: () => void; // Bu prop zaten vardı, kullanılacak
}

export function UserCard({ id, name, role, email, refreshUsers }: Props) {
    const [isEditPopupVisible, setEditPopupVisible] = useState(false);
    const [isDeletePopupVisible, setDeletePopupVisible] = useState(false); // Silme pop-up'ı için state
    const [isDeleting, setIsDeleting] = useState(false); // Silme işlemi sırasında loading state

    const handleEditPopupToggle = () => {
        setEditPopupVisible(!isEditPopupVisible);
    };

    const handleDeletePopupToggle = () => {
        setDeletePopupVisible(!isDeletePopupVisible);
    };

    const handleDeleteUser = async () => {
        setIsDeleting(true);
        try {
            await deleteUser(id);
            toast.success(`"${name}" adlı kullanıcı başarıyla silindi.`);
            refreshUsers(); // Kullanıcı listesini yenile
            setDeletePopupVisible(false); // Pop-up'ı kapat
        } catch (error) {
            console.error("Error deleting user:", error);
            const errorMessage = error instanceof Error ? error.message : "Kullanıcı silinirken bir hata oluştu.";
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-5 w-full bg-background-surface border border-background-alt shadow-sm hover:shadow-md rounded-lg transition">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <p className="text-primary text-xl font-semibold">{name}</p>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Edit2
                            className="w-5 h-5 text-primary-light hover:text-primary cursor-pointer"
                            onClick={handleEditPopupToggle}
                        />
                        <span className="absolute -top-8 right-1/2 translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Düzenle
                        </span>
                    </div>
                    <div className="relative group">
                        <Trash2
                            className="w-5 h-5 text-red-500 hover:text-red-700 cursor-pointer"
                            onClick={handleDeletePopupToggle}
                        />
                        <span className="absolute -top-8 right-1/2 translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Sil
                        </span>
                    </div>
                </div>

                {isEditPopupVisible && (
                    <PopUpEditUser
                        userId={id}
                        userName={name}
                        userRole={role}
                        userEmail={email}
                        onClose={handleEditPopupToggle}
                        refreshUsers={refreshUsers}
                    />
                )}
                {isDeletePopupVisible && (
                    <PopUpConfirmDelete
                        itemType="kullanıcıyı"
                        itemName={name}
                        onClose={handleDeletePopupToggle}
                        onConfirm={handleDeleteUser}
                        isLoading={isDeleting}
                    />
                )}
            </div>

            <div className="border-t border-background-alt -mx-5 mb-4"></div>

            {/* Body */}
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-lg font-semibold shadow-md">
                    {name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="text-primary font-medium text-base">{email}</p>
                    <span
                        className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium
              ${role === "admin"
                                ? "bg-red-100 text-red-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                    >
                        {role}
                    </span>
                </div>
            </div>
        </div>
    );
}