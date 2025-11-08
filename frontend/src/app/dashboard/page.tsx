"use client";

import { useState, useEffect, useCallback } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DevicesTable } from "@/components/devices-table";
import { TemperatureChart } from "@/components/temperature-chart";
import { useDeviceSocket } from "@/hooks/useDeviceSocket";
import { TemperatureReading, TemperatureUpdate } from "@/types/device";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { SectionCards } from "@/components/section-cards";

export default function DashboardPage() {
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [deviceReadings, setDeviceReadings] = useState<
    Map<string, { name: string; readings: TemperatureReading[] }>
  >(new Map());
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatar: string;
  } | null>(null);

  const {
    devices,
    isLoading,
    error,
    subscribeToDevices,
    unsubscribeFromDevices,
    onTemperatureUpdate,
    refreshDevices,
  } = useDeviceSocket();

  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser({
        name: userData?.user?.user_metadata?.name || userData?.user?.email,
        email: userData?.user?.email || "",
        avatar: userData?.user?.user_metadata?.avatar_url || "",
      });
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    if (selectedDeviceIds.length === 0) return;

    subscribeToDevices(selectedDeviceIds);
  }, [selectedDeviceIds, subscribeToDevices]);

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
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      {user && <AppSidebar variant="inset" user={user} />}
      <SidebarInset>
        <SiteHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />
              <div className="px-4 lg:px-6">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshDevices}
                    disabled={isLoading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""
                        }`}
                    />
                    Refresh
                  </Button>
                </div>

                <div className="grid gap-4 md:gap-6">
                  <TemperatureChart
                    deviceData={deviceReadings}
                    selectedDeviceIds={selectedDeviceIds}
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
      </SidebarInset>
    </SidebarProvider>
  );
}
