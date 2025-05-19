let csrfToken: string | null = null;


/**
 * CSRF token’ı getirir. 
 * @param force Eğer true ise önbelleğe bakmadan mutlaka sunucudan yeni token alır.
 */
export async function getCsrfToken(force = false): Promise<string> {
  // 1) Eğer önbellekte varsa ve force===false, direkt dön
  if (!force && csrfToken) {
    return csrfToken;
  }

  // 2) localStorage’da varsa ve force===false, orayı yükle
  const stored = localStorage.getItem('csrfToken');
  if (!force && stored) {
    csrfToken = stored;
    return csrfToken;
  }

  // 3) Aksi halde sunucudan al
  const res = await fetch('http://localhost:5000/api/auth/csrf-token', {
    method: 'GET',
    credentials: 'include',
    headers: { 'Accept': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'CSRF token alınamadı');
  }
  const data = await res.json();
  csrfToken = res.headers.get('X-CSRF-Token') || data.csrf_token;
  if (!csrfToken) {
    throw new Error('CSRF token boş geldi');
  }

  // 4) localStorage’a kaydet
  localStorage.setItem('csrfToken', csrfToken);
  return csrfToken;
}


/**
 * Ortak header’ları oluşturur. 
 * CSRF token’ı header’a ekler, gerekiyorsa body için Content-Type.
 */
async function getHeaders(contentType = true): Promise<Record<string,string>> {
  const token = await getCsrfToken(false);
  const headers: Record<string,string> = {
    'X-CSRF-Token': token,
  };
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export async function fetchUser(token?: string) {
  const res = await fetch('http://localhost:5000/api/auth/me', {
    headers: token ? { Cookie: `access_token=${token}` } : {},
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user;
}


export async function fetchDevices() {
  const res = await fetch('http://localhost:5000/api/devices', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.devices;
}

export async function logoutUser() {
  try {
    const headers = await getHeaders(false);
    await fetch('http://localhost:5000/api/auth/logout', {
      method: 'POST',
      headers,
      credentials: 'include',
    });
    // Temizlik
    csrfToken = null;
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('isLoggedIn');
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  try {
    // Önceki token’ları temizle
    csrfToken = null;
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('isLoggedIn');

    // İstek öncesi headers al (CSRF için fetch tetikleyebilir)
    const headers = await getHeaders();

    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Giriş başarısız');
    }

    // Yeni CSRF token’ı alıp sakla
    const headerToken = res.headers.get('X-CSRF-Token');
    if (headerToken) {
      csrfToken = headerToken;
      localStorage.setItem('csrfToken', headerToken);
      localStorage.setItem('isLoggedIn', 'true');
    }

    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function registerUser(
  username: string,
  email: string,
  password: string,
  role: string = 'user'
) {
  try {
    // Önceki token’ları temizle
    csrfToken = null;
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('isLoggedIn');

    const headers = await getHeaders();

    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ username, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Kayıt başarısız');
    }

    // Gelen CSRF token’ı sakla
    const headerToken = res.headers.get('X-CSRF-Token');
    if (headerToken) {
      csrfToken = headerToken;
      localStorage.setItem('csrfToken', headerToken);
      localStorage.setItem('isLoggedIn', 'true');
    }

    return data.user;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
}

export async function fetchDevicesPaginated(page = 1, limit = 2) {
  const res = await fetch(`http://localhost:5000/api/devices?page=${page}&limit=${limit}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) return { devices: [], total: 0 };
  const data = await res.json();
  return { devices: data.devices, total: data.total || data.devices.length };
}

export async function deleteDevice(deviceId: string) {
  const res = await fetch(`http://localhost:5000/api/devices/${deviceId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to remove device');
  }
  return true;
}

export async function changePassword(oldPassword: string, newPassword: string) {
  try {
    const headers = await getHeaders();

    const res = await fetch('http://localhost:5000/api/auth/changePassword', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({
        oldPassword,
        newPassword,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        throw new Error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      }
      throw new Error(data.error || 'Şifre değiştirme başarısız');
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Password change error:', error);
    throw error;
  }
}

export async function addDevice(deviceData: { name: string; type: string; stream_url: string }) {
  try {
    const headers = await getHeaders();

    const res = await fetch('http://localhost:5000/api/devices', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(deviceData)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Cihaz eklenirken bir hata oluştu.');
    }

    const data = await res.json();
    return data.device;
  } catch (error) {
    console.error('Add device error:', error);
    throw error;
  }
}

export async function fetchUsers(page = 1, limit = 6) {
  try {
    const headers = await getHeaders();
    const res = await fetch(`http://localhost:5000/api/users?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Kullanıcılar alınırken bir hata oluştu.');
    }

    const data = await res.json();
    return { users: data.users, total: data.total };
  } catch (error) {
    console.error('Fetch users error:', error);
    throw error;
  }
}

export async function addUser(userData: { username: string; email: string; password: string; role: string }) {
  try {
    const headers = await getHeaders();
    const res = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify(userData)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Kullanıcı eklenirken bir hata oluştu.');
    }

    const data = await res.json();
    return data.user;
  } catch (error) {
    console.error('Add user error:', error);
    throw error;
  }
}

export async function editUser(
  userId: string,
  userData: { username?: string; email?: string; password?: string; role?: string }
) {
  try {
    // 1. Deneme
    let headers = await getHeaders();
    let res = await fetch(`http://localhost:5000/api/users/${userId}`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    // 401 ise CSRF token zaman aşımı olabilir: yenile ve tekrar dene
    if (res.status === 401) {
      await getCsrfToken(true);
      headers = await getHeaders();
      res = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(userData),
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Kullanıcı güncellenirken bir hata oluştu.');
    }

    const data = await res.json();
    return data.user;
  } catch (error: any) {
    console.error('Edit user error:', error);
    // Dışarıya anlaşılır bir mesajla fırlat
    throw new Error(error.message || 'Kullanıcı güncellenirken bir hata oluştu.');
  }
}

export async function editSelf(
  userData: { username?: string; email?: string; password?: string; sms_notification?: boolean; email_notification?: boolean }
) {
  try {
    // 1. Deneme
    let headers = await getHeaders();
    let res = await fetch(`http://localhost:5000/api/users/me`, {
      method: 'PUT',
      headers,
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    // 401 ise CSRF token zaman aşımı olabilir: yenile ve tekrar dene
    if (res.status === 401) {
      await getCsrfToken(true);
      headers = await getHeaders();
      res = await fetch(`http://localhost:5000/api/users/me`, {
        method: 'PUT',
        headers,
        credentials: 'include',
        body: JSON.stringify(userData),
      });
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Kullanıcı güncellenirken bir hata oluştu.');
    }

    const data = await res.json();
    return data.user;
  } catch (error: any) {
    console.error('Edit user error:', error);
    // Dışarıya anlaşılır bir mesajla fırlat
    throw new Error(error.message || 'Kullanıcı güncellenirken bir hata oluştu.');
  }
}


/**
 * Son 1 saatteki (veya verilen aralıktaki) segment meta-verilerini getirir.
 * @param sourceId Cihazın source_id değeri
 * @param start   ISO format start timestamp (opsiyonel)
 * @param end     ISO format end   timestamp (opsiyonel)
 */
export async function fetchReplaySegments(
  sourceId: string,
  start?: string,
  end?: string
): Promise<
  { timestamp: string; anomaly: boolean; confidence?: number }[]
> {
  const params = new URLSearchParams();
  if (start) params.append("start", start);
  if (end)   params.append("end",   end);

  const res = await fetch(
    `http://localhost:5000/api/replay/${sourceId}/segments?${params.toString()}`,
    {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Replay segments alınamadı");
  }

  const data = await res.json();
  return data.segments;
}
