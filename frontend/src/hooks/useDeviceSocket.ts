"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./useSocket";
import { Device, TemperatureUpdate } from "@/types/device";

interface UseDeviceSocketReturn {
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  subscribeToDevices: (deviceIds: string[]) => void;
  unsubscribeFromDevices: (deviceIds: string[]) => void;
  onTemperatureUpdate: (
    callback: (update: TemperatureUpdate) => void
  ) => () => void;
  refreshDevices: () => void;
}

export function useDeviceSocket(): UseDeviceSocketReturn {
  const { socket, isConnected, error: socketError } = useSocket();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDevices = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("devices:list");
    }
  }, [socket, isConnected]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    refreshDevices();

    socket.on("devices:list", (data: Device[]) => {
      setDevices(data);
      setIsLoading(false);
      setError(null);
    });

    socket.on("error", (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    });

    return () => {
      socket.off("devices:list");
      socket.off("error");
    };
  }, [socket, isConnected, refreshDevices]);

  const subscribeToDevices = useCallback(
    (deviceIds: string[]) => {
      if (socket && isConnected) {
        socket.emit("devices:subscribe", { deviceIds });
      }
    },
    [socket, isConnected]
  );

  const unsubscribeFromDevices = useCallback(
    (deviceIds: string[]) => {
      if (socket && isConnected) {
        socket.emit("devices:unsubscribe", { deviceIds });
      }
    },
    [socket, isConnected]
  );

  const onTemperatureUpdate = useCallback(
    (callback: (update: TemperatureUpdate) => void) => {
      if (!socket) return () => {};

      socket.on("temperature:update", callback);

      return () => {
        socket.off("temperature:update", callback);
      };
    },
    [socket]
  );

  return {
    devices,
    isLoading,
    error: error || socketError,
    subscribeToDevices,
    unsubscribeFromDevices,
    onTemperatureUpdate,
    refreshDevices,
  };
}
