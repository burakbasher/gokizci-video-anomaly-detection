"components/hooks/useDeviceSocket.ts"

import { useEffect, useCallback, useState } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';

interface DeviceSocketOptions {
  deviceId: string;
  deviceType: string;
  onStatusChange?: (status: string) => void;
  onDataUpdate?: (data: any) => void;
  onError?: (error: string) => void;
}

export const useDeviceSocket = ({
  deviceId,
  deviceType,
  onStatusChange,
  onDataUpdate,
  onError
}: DeviceSocketOptions) => {
  const { socket, isConnected } = useWebSocket();
  const [isDeviceConnected, setIsDeviceConnected] = useState(false);
  const [deviceRoom, setDeviceRoom] = useState<string | null>(null);

  // Connect to device room
  const connect = useCallback(() => {
    if (socket && deviceId) {
      socket.emit('device_connect', {
        device_id: deviceId,
        device_type: deviceType
      });
    }
  }, [socket, deviceId, deviceType]);

  // Disconnect from device room
  const disconnect = useCallback(() => {
    if (socket && deviceId) {
      socket.emit('device_disconnect', {
        device_id: deviceId
      });
    }
  }, [socket, deviceId]);

  // Send command to device
  const sendCommand = useCallback((command: string, params: any = {}) => {
    if (socket && deviceId) {
      socket.emit('device_command', {
        device_id: deviceId,
        command,
        params
      });
    }
  }, [socket, deviceId]);

  // Send data to device
  const sendData = useCallback((type: string, payload: any) => {
    if (socket && deviceId) {
      socket.emit('device_data', {
        device_id: deviceId,
        type,
        payload
      });
    }
  }, [socket, deviceId]);

  useEffect(() => {
    if (!socket) return;

    // Handle device connection response
    const handleDeviceConnected = (data: any) => {
      if (data.device_id === deviceId) {
        setIsDeviceConnected(true);
        setDeviceRoom(data.room);
      }
    };

    // Handle device status changes
    const handleStatusChanged = (data: any) => {
      if (data.device_id === deviceId) {
        onStatusChange?.(data.status);
      }
    };

    // Handle device data updates
    const handleDataUpdate = (data: any) => {
      if (data.device_id === deviceId) {
        onDataUpdate?.(data);
      }
    };

    // Handle errors
    const handleError = (error: any) => {
      onError?.(error.message);
    };

    // Subscribe to events
    socket.on('device_connected', handleDeviceConnected);
    socket.on('device_status_changed', handleStatusChanged);
    socket.on('device_data_update', handleDataUpdate);
    socket.on('error', handleError);

    // Connect to device room if socket is connected
    if (isConnected) {
      connect();
    }

    return () => {
      // Cleanup
      socket.off('device_connected', handleDeviceConnected);
      socket.off('device_status_changed', handleStatusChanged);
      socket.off('device_data_update', handleDataUpdate);
      socket.off('error', handleError);
      
      // Disconnect from device room
      if (isDeviceConnected) {
        disconnect();
      }
    };
  }, [socket, deviceId, isConnected, connect, disconnect, onStatusChange, onDataUpdate, onError]);

  return {
    isDeviceConnected,
    deviceRoom,
    connect,
    disconnect,
    sendCommand,
    sendData
  };
}; 