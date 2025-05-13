import Footer from "../components/footer";
import Header from "../components/header";
import '@/app/ui/global.css';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { WebSocketProvider } from '@/components/contexts/WebSocketContext';
import { AuthProvider } from "@/components/contexts/AuthContext";
import { CSRFInitializer } from "@/components/contexts/CSRFInitializerContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gökİzci",
  description: "Hareketli Video Görüntülerinde Anomali Tespiti",
  icons: {
    icon: '/gokizci.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <WebSocketProvider>
          <AuthProvider>
            <CSRFInitializer />
            <div className="min-h-screen font-sans font-normal bg-gradient-radial from-gray-50 via-zink-200 to-gray-300 selection:bg-gray-300 selection:text-light">
              <Header />
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
