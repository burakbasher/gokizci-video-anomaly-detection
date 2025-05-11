// CSRF token yönetimi için yardımcı fonksiyonlar
let csrfToken: string | null = null;

async function getCsrfToken() {
  try {
    if (!csrfToken) {
      const res = await fetch('http://localhost:5000/api/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'CSRF token alınamadı');
      }
      
      const data = await res.json();
      csrfToken = data.csrf_token;
      
      // Header'dan CSRF token'ı al
      const headerToken = res.headers.get('X-CSRF-Token');
      if (headerToken) {
        csrfToken = headerToken;
      }
    }
    return csrfToken;
  } catch (error) {
    console.error('CSRF token error:', error);
    throw error;
  }
}

// API istekleri için ortak headers
async function getHeaders(contentType: boolean = true) {
  const token = await getCsrfToken();
  const headers: Record<string, string> = {
    'X-CSRF-Token': token || '',
  };
  
  if (contentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
}

export async function fetchUser(token?: string) {
  const res = await fetch('http://localhost:5000/api/auth/me', {
    headers: token ? {
      Cookie: `access_token=${token}`,
    } : {},
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
    
    // Logout sonrası CSRF token'ı sıfırla
    csrfToken = null;
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

export async function loginUser(email: string, password: string) {
  try {
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
    
    // CSRF token'ı header'dan al
    const headerToken = res.headers.get('X-CSRF-Token');
    if (headerToken) {
      csrfToken = headerToken;
    }
    
    return data.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export async function registerUser(username: string, email: string, password: string) {
  try {
    const headers = await getHeaders();
    
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ username, email, password }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Kayıt başarısız');
    }
    
    // CSRF token'ı header'dan al
    const headerToken = res.headers.get('X-CSRF-Token');
    if (headerToken) {
      csrfToken = headerToken;
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
    
    const res = await fetch('http://localhost:5000/api/changePassword', {
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
