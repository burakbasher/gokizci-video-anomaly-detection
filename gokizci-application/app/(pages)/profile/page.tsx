"use client";

import { useAuth } from "@/components/contexts/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return <p className="text-center mt-10 text-gray-500">Yükleniyor...</p>;
  }

  return (
    <div className="max-w-3xl mx-auto mt-16 p-6 bg-white shadow-md rounded-lg border border-gray-200">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Profilim</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600">Kullanıcı Adı</label>
          <p className="text-lg text-gray-900">{user.username}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">E-posta</label>
          <p className="text-lg text-gray-900">{user.email}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600">Rol</label>
          <p className="text-lg text-gray-900 capitalize">{user.role}</p>
        </div>
      </div>
    </div>
  );
}
