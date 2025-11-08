"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "./useSocket";
import {
  Device,
  TemperatureUpdate,
  HumidityUpdate,
  DeviceStats,
  TemperatureAggregate,
} from "@/types/device";

interface UseDeviceSocketReturn {
  devices: Device[];
  isLoading: boolean;
  error: string | null;
  stats: DeviceStats[];
  subscribeToDevices: (deviceIds: string[]) => void;
  unsubscribeFromDevices: (deviceIds: string[]) => void;
  onTemperatureUpdate: (
    callback: (update: TemperatureUpdate) => void
  ) => () => void;
  onHumidityUpdate: (callback: (update: HumidityUpdate) => void) => () => void;
  onDeviceAdded: (callback: (device: Device) => void) => () => void;
  onDeviceUpdated: (callback: (device: Device) => void) => () => void;
  onDeviceRemoved: (callback: (deviceId: string) => void) => () => void;
  onDeviceStatus: (
    callback: (data: { deviceId: string; isActive: boolean }) => void
  ) => () => void;
  requestStats: (from?: Date, to?: Date) => void;
  requestAggregates: (
    deviceId: string,
    granularity: "1m" | "5m" | "1h" | "6h" | "1d",
    from: Date,
    to: Date
  ) => void;
  onAggregatesData: (
    callback: (data: {
      deviceId: string;
      granularity: string;
      aggregates: TemperatureAggregate[];
    }) => void
  ) => () => void;
}

export function useDeviceSocket(): UseDeviceSocketReturn {
  const { socket, isConnected, error: socketError } = useSocket();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request devices list
  const requestDevices = useCallback(() => {
    if (socket && isConnected) {
      socket.emit("devices:list");
    }
  }, [socket, isConnected]);

  // Request statistics
  const requestStats = useCallback(
    (from?: Date, to?: Date) => {
      if (socket && isConnected) {
        socket.emit("stats:request", {
          from: from?.toISOString(),
          to: to?.toISOString(),
        });
      }
    },
    [socket, isConnected]
  );

  // Request aggregates
  const requestAggregates = useCallback(
    (
      deviceId: string,
      granularity: "1m" | "5m" | "1h" | "6h" | "1d",
      from: Date,
      to: Date
    ) => {
      if (socket && isConnected) {
        socket.emit("aggregates:request", {
          deviceId,
          granularity,
          from: from.toISOString(),
          to: to.toISOString(),
        });
      }
    },
    [socket, isConnected]
  );

  // Auto-request devices and stats on connection
  useEffect(() => {
    if (!socket || !isConnected) return;

    requestDevices();
    requestStats();

    socket.on("devices:list", (data: Device[]) => {
      setDevices(data);
      setIsLoading(false);
      setError(null);
    });

    socket.on("stats:data", (data: DeviceStats[]) => {
      setStats(data);
    });

    socket.on("device:added", (device: Device) => {
      setDevices((prev) => [...prev, device]);
    });

    socket.on("device:updated", (device: Device) => {
      setDevices((prev) => prev.map((d) => (d.id === device.id ? device : d)));
    });

    socket.on("device:removed", ({ deviceId }: { deviceId: string }) => {
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
    });

    socket.on(
      "device:status",
      ({ deviceId, isActive }: { deviceId: string; isActive: boolean }) => {
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, isActive } : d))
        );
      }
    );

    socket.on("temperature:update", (update: TemperatureUpdate) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === update.deviceId
            ? {
                ...d,
                currentTemperature: update.temperatureC,
                currentHumidity: update.humidity ?? d.currentHumidity,
                lastReading: new Date(update.timestamp),
              }
            : d
        )
      );
    });

    socket.on("data:humidity", (update: HumidityUpdate) => {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === update.deviceId
            ? {
                ...d,
                currentHumidity: update.humidity,
                lastReading: new Date(update.timestamp),
              }
            : d
        )
      );
    });

    socket.on("error", (err: { message: string }) => {
      setError(err.message);
      setIsLoading(false);
    });

    return () => {
      socket.off("devices:list");
      socket.off("stats:data");
      socket.off("device:added");
      socket.off("device:updated");
      socket.off("device:removed");
      socket.off("device:status");
      socket.off("temperature:update");
      socket.off("data:humidity");
      socket.off("error");
    };
  }, [socket, isConnected, requestDevices, requestStats]);

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

  const onHumidityUpdate = useCallback(
    (callback: (update: HumidityUpdate) => void) => {
      if (!socket) return () => {};

      socket.on("data:humidity", callback);

      return () => {
        socket.off("data:humidity", callback);
      };
    },
    [socket]
  );

  const onDeviceAdded = useCallback(
    (callback: (device: Device) => void) => {
      if (!socket) return () => {};

      socket.on("device:added", callback);

      return () => {
        socket.off("device:added", callback);
      };
    },
    [socket]
  );

  const onDeviceUpdated = useCallback(
    (callback: (device: Device) => void) => {
      if (!socket) return () => {};

      socket.on("device:updated", callback);

      return () => {
        socket.off("device:updated", callback);
      };
    },
    [socket]
  );

  const onDeviceRemoved = useCallback(
    (callback: (deviceId: string) => void) => {
      if (!socket) return () => {};

      const handler = ({ deviceId }: { deviceId: string }) =>
        callback(deviceId);
      socket.on("device:removed", handler);

      return () => {
        socket.off("device:removed", handler);
      };
    },
    [socket]
  );

  const onDeviceStatus = useCallback(
    (callback: (data: { deviceId: string; isActive: boolean }) => void) => {
      if (!socket) return () => {};

      socket.on("device:status", callback);

      return () => {
        socket.off("device:status", callback);
      };
    },
    [socket]
  );

  const onAggregatesData = useCallback(
    (
      callback: (data: {
        deviceId: string;
        granularity: string;
        aggregates: TemperatureAggregate[];
      }) => void
    ) => {
      if (!socket) return () => {};

      socket.on("aggregates:data", callback);

      return () => {
        socket.off("aggregates:data", callback);
      };
    },
    [socket]
  );

  return {
    devices,
    isLoading,
    error: error || socketError,
    stats,
    subscribeToDevices,
    unsubscribeFromDevices,
    onTemperatureUpdate,
    onHumidityUpdate,
    onDeviceAdded,
    onDeviceUpdated,
    onDeviceRemoved,
    onDeviceStatus,
    requestStats,
    requestAggregates,
    onAggregatesData,
  };
}
