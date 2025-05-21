"components/contexts/AuthContext.tsx"

"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { fetchUser } from "@/app/lib/api";
import type { User } from "@/app/lib/definitions";

interface AuthContextType {
  user: User | null | undefined; 
  setUser: React.Dispatch<React.SetStateAction<User | null | undefined>>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: undefined, setUser: () => {}, refreshUser: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User|null|undefined>(undefined);

  const refreshUser = async () => {
    const currentUser = await fetchUser();
    setUser(currentUser);
  };

  useEffect(() => {
    // 🎯 Sadece localStorage'da login flag varsa me'yi çağır
    if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true") {
      refreshUser().catch(console.error);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);