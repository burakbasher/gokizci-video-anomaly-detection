"app/page.tsx"

'use client'

import { BlackButton } from '@/components/buttons/BlackButton';
import { WhiteButton } from '@/components/buttons/WhiteButton';
import { useRouter } from 'next/navigation'
import React from 'react';
import { Loading } from '@/components/loading';
import { useEffect, useState } from 'react';


export default function Page() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          credentials: 'include',
        });

        if (res.ok) {
          router.replace('/user'); // replace() kullan, history stack'e eklemesin
        }
      } catch (err) {
        // Kullanıcı login değilse, ana sayfa gösterilir
      }
    };
    checkAuth();
  }, [router]);

  return <>
    <div className='flex min-h-screen place-content-center'>
      <div className='grid content-center text-center gap-4 mb-40 '>
        <p className="text-6xl font-bold">
          <span className="text-primary">Gök</span>
          <span className="text-primary-light">izci</span>
        </p>

        <p className="text-primary text-center  grid content-center text-2xl font-normal">
          <span>Hareketli Video Görüntülerinde Anomali Tespiti</span>
          <span>Anomali Tespiti</span>
        </p>

        <div className='flex gap-x-8 justify-between px-12'>
          <WhiteButton text="Kullanıcı Girişi" onClick={() => router.push('/auth')} ></WhiteButton>
          <BlackButton text="Kayıt Ol" onClick={() => router.push('/auth')}></BlackButton>
        </div>
      </div>
    </div>
  </>
}
