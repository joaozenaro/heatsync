"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DevicesTable } from "@/components/devices-table";
import { TemperatureChart } from "@/components/temperature-chart";
import { useDeviceSocket } from "@/hooks/useDeviceSocket";
import {
  TemperatureReading,
  TemperatureUpdate,
  HumidityUpdate,
  TemperatureAggregate,
} from "@/types/device";
import { SectionCards } from "@/components/section-cards";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, WifiOff } from "lucide-react";

type TimeRange = "live" | "15m" | "1h" | "6h" | "24h" | "7d";

interface TimeRangeConfig {
  label: string;
  granularity: "1m" | "5m" | "1h" | "6h" | "1d" | null;
  duration: number | null;
}

const TIME_RANGES: Record<TimeRange, TimeRangeConfig> = {
  live: { label: "Live", granularity: null, duration: null },
  "15m": { label: "15 Min", granularity: "1m", duration: 15 * 60 * 1000 },
  "1h": { label: "1 Hour", granularity: "5m", duration: 60 * 60 * 1000 },
  "6h": { label: "6 Hours", granularity: "1h", duration: 6 * 60 * 60 * 1000 },
  "24h": {
    label: "24 Hours",
    granularity: "6h",
    duration: 24 * 60 * 60 * 1000,
  },
  "7d": {
    label: "7 Days",
    granularity: "1d",
    duration: 7 * 24 * 60 * 60 * 1000,
  },
};

export default function DashboardPage() {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [deviceReadings, setDeviceReadings] = useState<
    Map<string, { name: string; readings: TemperatureReading[] }>
  >(new Map());
  const [aggregateData, setAggregateData] = useState<
    Map<string, { name: string; aggregates: TemperatureAggregate[] }>
  >(new Map());
  const [isLoadingAggregates, setIsLoadingAggregates] = useState(false);
  const hasAutoSelected = useRef(false);

  const {
    devices,
    isLoading,
    error,
    stats,
    subscribeToDevices,
    unsubscribeFromDevices,
    onTemperatureUpdate,
    onHumidityUpdate,
    requestAggregates,
    onAggregatesData,
  } = useDeviceSocket();

  // Auto-select up to 3 devices when devices are first loaded
  useEffect(() => {
    if (devices.length > 0 && !hasAutoSelected.current && !isLoading) {
      const MAX_AUTO_SELECT = 3;
      const activeDevices = devices.filter((d) => d.isActive);
      const devicesToSelect =
        activeDevices.length > 0 ? activeDevices : devices;
      const autoSelected = devicesToSelect.slice(0, MAX_AUTO_SELECT);

      if (autoSelected.length > 0) {
        hasAutoSelected.current = true;

        // Initialize deviceReadings for auto-selected devices
        const initialReadings = new Map<
          string,
          { name: string; readings: TemperatureReading[] }
        >();
        autoSelected.forEach((device) => {
          initialReadings.set(device.id, {
            name: device.name,
            readings: [],
          });
        });

        // Use setTimeout to avoid setState in effect
        setTimeout(() => {
          setDeviceReadings(initialReadings);
          setSelectedDeviceIds(autoSelected.map((d) => d.id));
        }, 0);
      }
    }
  }, [devices, isLoading]);

  useEffect(() => {
    if (selectedDeviceIds.length === 0) return;

    subscribeToDevices(selectedDeviceIds);
  }, [selectedDeviceIds, subscribeToDevices]);

  // Handle temperature updates
  useEffect(() => {
    const unsubscribe = onTemperatureUpdate((update: TemperatureUpdate) => {
      if (selectedDeviceIds.includes(update.deviceId)) {
        setDeviceReadings((prev) => {
          const newReadings = new Map(prev);
          const deviceData = newReadings.get(update.deviceId);

          if (deviceData) {
            const newReading: TemperatureReading = {
              id: Date.now(),
              takenAt: new Date(update.timestamp),
              temperatureC: update.temperatureC,
              humidity: update.humidity,
              deviceId: update.deviceId,
            };

            const updatedReadings = [...deviceData.readings, newReading].slice(
              -100
            );

            newReadings.set(update.deviceId, {
              ...deviceData,
              readings: updatedReadings,
            });
          }

          return newReadings;
        });
      }
    });

    return unsubscribe;
  }, [onTemperatureUpdate, selectedDeviceIds]);

  // Handle humidity updates
  useEffect(() => {
    const unsubscribe = onHumidityUpdate((update: HumidityUpdate) => {
      if (selectedDeviceIds.includes(update.deviceId)) {
        setDeviceReadings((prev) => {
          const newReadings = new Map(prev);
          const deviceData = newReadings.get(update.deviceId);

          if (deviceData && deviceData.readings.length > 0) {
            // Update the latest reading with humidity data
            const updatedReadings = [...deviceData.readings];
            const lastReading = updatedReadings[updatedReadings.length - 1];

            if (lastReading) {
              updatedReadings[updatedReadings.length - 1] = {
                ...lastReading,
                humidity: update.humidity,
              };

              newReadings.set(update.deviceId, {
                ...deviceData,
                readings: updatedReadings,
              });
            }
          }

          return newReadings;
        });
      }
    });

    return unsubscribe;
  }, [onHumidityUpdate, selectedDeviceIds]);

  // Handle aggregate data responses
  useEffect(() => {
    const unsubscribe = onAggregatesData((data) => {
      setAggregateData((prev) => {
        const newAggregates = new Map(prev);
        const device = devices.find((d) => d.id === data.deviceId);

        if (device) {
          newAggregates.set(data.deviceId, {
            name: device.name,
            aggregates: data.aggregates,
          });
        }

        return newAggregates;
      });
      setIsLoadingAggregates(false);
    });

    return unsubscribe;
  }, [onAggregatesData, devices]);

  // Handle time range changes
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      if (range === "live") {
        // Clear aggregate data when switching to live mode
        setAggregateData(new Map());
        setIsLoadingAggregates(false);
        return;
      }

      const config = TIME_RANGES[range];
      if (!config.granularity || !config.duration) return;

      setIsLoadingAggregates(true);
      const to = new Date();
      const from = new Date(to.getTime() - config.duration);

      // Request aggregates for all selected devices
      selectedDeviceIds.forEach((deviceId) => {
        requestAggregates(deviceId, config.granularity!, from, to);
      });
    },
    [selectedDeviceIds, requestAggregates]
  );

  const handleSelectionChange = useCallback(
    (newSelection: string[]) => {
      // Unsubscribe from devices that were deselected
      const deselected = selectedDeviceIds.filter(
        (id) => !newSelection.includes(id)
      );

      // Find newly selected devices
      const newlySelected = newSelection.filter(
        (id) => !selectedDeviceIds.includes(id)
      );

      setDeviceReadings((prev) => {
        const newReadings = new Map(prev);

        // Remove deselected devices
        deselected.forEach((id) => newReadings.delete(id));

        // Initialize newly selected devices
        newlySelected.forEach((deviceId) => {
          const device = devices.find((d) => d.id === deviceId);
          if (device && !newReadings.has(deviceId)) {
            newReadings.set(deviceId, {
              name: device.name,
              readings: [],
            });
          }
        });

        return newReadings;
      });

      if (deselected.length > 0) {
        unsubscribeFromDevices(deselected);
      }

      setSelectedDeviceIds(newSelection);
    },
    [selectedDeviceIds, unsubscribeFromDevices, devices]
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <SectionCards devices={devices} stats={stats} />
          <div className="px-4 lg:px-6">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>
                  {error}
                  <div className="mt-2 flex items-center gap-2">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm">
                      Attempting to reconnect automatically...
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:gap-6">
              <TemperatureChart
                deviceData={deviceReadings}
                aggregateData={aggregateData}
                selectedDeviceIds={selectedDeviceIds}
                onTimeRangeChange={handleTimeRangeChange}
                isLoadingAggregates={isLoadingAggregates}
              />

              <DevicesTable
                devices={devices}
                selectedDeviceIds={selectedDeviceIds}
                onSelectionChange={handleSelectionChange}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
