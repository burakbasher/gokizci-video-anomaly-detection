'use client'

import { useEffect } from 'react'
import { getCsrfToken } from '@/app/lib/api'


export function CSRFInitializer() {
  useEffect(() => {
    // Eğer localStorage'da daha önce saklanmış bir CSRF token varsa getHeaders bununla çalışacak.
    const stored = localStorage.getItem('csrfToken')
    if (stored) {
      // sadece bellekteki değişkenin sync olması için getCsrfToken çağırmaya gerek yok
      return
    }
    // Eğer kullanıcı gerçekten login olduysa flag üzerinden anlıyoruz:
    if (localStorage.getItem('isLoggedIn') === 'true') {
      // bu çağrı header ve cookie ile birlikte backend'ten yeni CSRF token'ı alıp saklayacak
      getCsrfToken().catch(console.error)
    }
  }, [])

  return null
}
