import Footer from "../components/footer";
import Header from "../components/header";
import '@/app/ui/global.css';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { WebSocketProvider } from '@/components/contexts/WebSocketContext';
import { cookies } from 'next/headers';
import { fetchUser, logoutUser } from "./lib/api";
import { AuthProvider } from "@/components/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gökİzci",
  description: "Hareketli Video Görüntülerinde Anomali Tespiti",
  icons: {
    icon: '/gokizci.ico',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  const cookieStore = cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  let user = null;
  if (accessToken) {
    user = await fetchUser(accessToken);
  }

  // Logout handler (server component, so just reload page after logout)
  const handleLogout = async () => {
    'use server';
    await logoutUser();
  };

  return (
    <html lang="tr">
      <body className={inter.className}>
        <WebSocketProvider>
          <AuthProvider>
            <div className="min-h-screen font-sans font-normal bg-background-main selection:bg-black selection:text-light">
              <Header/>
              <div className="h-16"></div>
              {children}
              <Footer />
            </div>
          </AuthProvider>
        </WebSocketProvider>
      </body>
    </html>
  );
}
