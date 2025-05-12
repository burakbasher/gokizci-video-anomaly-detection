import { useState } from "react";
import { PopUpEditUser } from "../popups/PopUpEditUser";
import { Edit2 } from "lucide-react";

interface Props {
    id: string;
    name: string;
    email: string;
    role: string;
}

export function UserCard({ id, name, role, email }: Props) {
    const [isPopupVisible, setPopupVisible] = useState(false);

    const handlePopupToggle = () => {
        setPopupVisible(!isPopupVisible);
    };

    return (
        <div className="p-5 w-full bg-background-surface border border-background-alt shadow-sm hover:shadow-md rounded-lg transition">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <p className="text-primary text-xl font-semibold">{name}</p>
                <div className="relative group">
                    <Edit2
                        className="w-5 h-5 text-primary-light hover:text-primary cursor-pointer"
                        onClick={handlePopupToggle}
                    />
                    <span className="absolute -top-8 -right-4 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Düzenle
                    </span>
                </div>
                {isPopupVisible && (
                    <PopUpEditUser userId={id} userName={name} userRole={role} onClose={handlePopupToggle} />
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
