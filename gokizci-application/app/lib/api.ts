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
  await fetch('http://localhost:5000/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
}

export async function loginUser(email: string, password: string) {
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Giriş başarısız');
  }
  return data.user;
}

export async function registerUser(username: string, email: string, password: string) {
  const res = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Kayıt başarısız');
  }
  return data.user;
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
