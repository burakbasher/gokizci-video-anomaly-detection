"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loading } from '@/components/loading';

/**
 * This RootLayout component  it is the main layout for detection pages that require user authentication.
 * 
 * Key functionalities:
 * - It uses NextAuth's `useSession` hook to manage user session state (`authenticated`, `unauthenticated`, or `loading`).
 * - If the user is unauthenticated, it redirects them to the home page (`/`).
 * - While the session state is loading, it displays a loading spinner (`Loading` component).
 * - If the session is authenticated, the layout renders with a sidebar (`SideBar` component) and the main content (`children`).
 *
 * This component ensures that only authenticated users can access the content wrapped within this layout.
 */

export default function RootLayout({ children,}: { children: React.ReactNode; }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <Loading />
      </div>
    );
  }

  if (status === 'authenticated') {
    return (
      <div className="flex min-h-screen bg-background">
        {/*   Sidebar */}
        
        <div className="flex flex-col flex-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Loading />
    </div>
  );
}
