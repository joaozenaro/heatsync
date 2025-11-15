"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationTree } from "@/components/location-tree";
import { useLocations } from "@/hooks/use-locations";
import { api } from "@/lib/api";

type Device = {
  id: string;
  name: string;
  description: string | null;
  locationId: number | null;
  isActive: boolean;
  lastSeenAt: string | null;
  ownerId: string | null;
  groupId: string | null;
  currentTemperature?: number;
  currentHumidity?: number;
  lastReading?: string;
};

export default function DevicesPage() {
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const {
    treeData,
    isLoading: isLoadingLocations,
    moveDevices,
  } = useLocations();

  // Fetch devices with optional location filter
  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<
    Device[]
  >({
    queryKey: ["devices", selectedLocationId],
    queryFn: async () => {
      const { data } = await api.get<Device[]>(
        selectedLocationId
          ? `/devices?locationId=${selectedLocationId}`
          : "/devices"
      );
      return data;
    },
  });

  // Filter devices based on search query
  const filteredDevices = useMemo(() => {
    if (!searchQuery) return devices;
    const query = searchQuery.toLowerCase();
    return devices.filter(
      (device) =>
        device.name.toLowerCase().includes(query) ||
        device.description?.toLowerCase().includes(query) ||
        device.id.toLowerCase().includes(query)
    );
  }, [devices, searchQuery]);

  // Handle device selection
  const toggleDeviceSelection = (deviceId: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  // Handle moving selected devices to a location
  const handleMoveDevices = async (
    deviceIds: string[],
    targetLocationId: number | null
  ) => {
    if (deviceIds.length === 0) return;

    try {
      await moveDevices({
        deviceIds,
        targetLocationId,
      });

      console.log(
        `${deviceIds.length} device(s) have been moved successfully.`
      );

      setSelectedDeviceIds((prev) =>
        prev.filter((id) => !deviceIds.includes(id))
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    } catch (error) {
      console.error("Failed to move devices:", error);
      alert("Failed to move devices. Please try again.");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {selectedDeviceIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleMoveDevices(selectedDeviceIds, selectedLocationId)
              }
            >
              <Move className="h-4 w-4 mr-2" />
              Move to Current Location
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left sidebar - Location Tree */}
        <div className="w-64 border rounded-lg p-4 overflow-y-auto bg-card">
          <h2 className="font-semibold mb-4">Locations</h2>
          {isLoadingLocations ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <LocationTree
              locations={treeData}
              selectedLocationId={selectedLocationId}
              onSelectLocation={setSelectedLocationId}
              onMoveDevices={handleMoveDevices}
              selectedDeviceIds={selectedDeviceIds}
            />
          )}
        </div>

        {/* Main content - Devices */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="mb-4">
            <Input
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Tabs defaultValue="all" className="flex-1 flex flex-col">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Devices</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex-1 overflow-auto">
              <DeviceList
                devices={filteredDevices}
                selectedDeviceIds={selectedDeviceIds}
                onToggleDevice={toggleDeviceSelection}
                isLoading={isLoadingDevices}
              />
            </TabsContent>

            <TabsContent value="active" className="flex-1 overflow-auto">
              <DeviceList
                devices={filteredDevices.filter((device) => device.isActive)}
                selectedDeviceIds={selectedDeviceIds}
                onToggleDevice={toggleDeviceSelection}
                isLoading={isLoadingDevices}
              />
            </TabsContent>

            <TabsContent value="inactive" className="flex-1 overflow-auto">
              <DeviceList
                devices={filteredDevices.filter((device) => !device.isActive)}
                selectedDeviceIds={selectedDeviceIds}
                onToggleDevice={toggleDeviceSelection}
                isLoading={isLoadingDevices}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

// Device list component
function DeviceList({
  devices,
  selectedDeviceIds,
  onToggleDevice,
  isLoading,
}: {
  devices: Device[];
  selectedDeviceIds: string[];
  onToggleDevice: (id: string) => void;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <p>No devices found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="w-12 p-2 text-left"></th>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">ID</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-left">Last Seen</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr
              key={device.id}
              className={`border-t hover:bg-muted/30 ${
                selectedDeviceIds.includes(device.id) ? "bg-muted/20" : ""
              }`}
            >
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={selectedDeviceIds.includes(device.id)}
                  onChange={() => onToggleDevice(device.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="p-2 font-medium">{device.name}</td>
              <td className="p-2 text-sm text-muted-foreground font-mono">
                {device.id}
              </td>
              <td className="p-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    device.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {device.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="p-2 text-sm text-muted-foreground">
                {device.lastSeenAt
                  ? new Date(device.lastSeenAt).toLocaleString()
                  : "Never"}
              </td>
              <td className="p-2 text-right">
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
