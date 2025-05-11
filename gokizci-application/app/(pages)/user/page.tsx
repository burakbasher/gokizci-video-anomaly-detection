"use client";

import { Loading } from '../../../components/loading';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DevicePanel } from '@/components/devices/DevicePanel';
import { Device, User } from '@/app/lib/definitions';
import { fetchUser, fetchDevices, logoutUser } from '@/app/lib/api';

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const userData = await fetchUser();
        if (!userData) throw new Error('Failed to fetch user data');
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    const getDevices = async () => {
      try {
        const deviceList = await fetchDevices();
        setDevices(deviceList || []);
      } catch (error) {
        console.error('Error fetching devices:', error);
      }
    };

    getUserData();
    getDevices();

    // Set up polling for device updates
    const devicePollingInterval = setInterval(getDevices, 5000);

    return () => {
      clearInterval(devicePollingInterval);
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push('/auth');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  return (
    <DevicePanel devices={devices} />
  );
}