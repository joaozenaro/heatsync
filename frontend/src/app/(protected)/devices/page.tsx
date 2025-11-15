"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Edit,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type Location = {
  id: number;
  name: string;
  type: string;
  parentId: number | null;
  children?: Location[];
};

type LocationWithDevices = Omit<Location, "children"> & {
  devices: Device[];
  children: LocationWithDevices[];
};

export default function DevicesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(
    new Set()
  );
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deviceFormData, setDeviceFormData] = useState({
    name: "",
    description: "",
  });
  const queryClient = useQueryClient();

  const {
    treeData,
    isLoading: isLoadingLocations,
    moveDevices,
  } = useLocations();

  const { data: devices = [], isLoading: isLoadingDevices } = useQuery<
    Device[]
  >({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data } = await api.get<Device[]>("/devices");
      return data;
    },
  });

  // Update device mutation
  const updateDeviceMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Device> & { id: string }) => {
      const { data: updated } = await api.put<Device>(`/devices/${id}`, data);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      setIsEditDialogOpen(false);
      setEditingDevice(null);
    },
  });

  // Flatten locations for select dropdown
  const allLocationsFlat = useMemo(() => {
    const flatten = (
      locations: Location[],
      level = 0
    ): Array<Location & { displayName: string }> => {
      const result: Array<Location & { displayName: string }> = [];
      locations.forEach((loc) => {
        const indent = "  ".repeat(level);
        result.push({ ...loc, displayName: `${indent}${loc.name}` });
        if (loc.children) {
          result.push(...flatten(loc.children, level + 1));
        }
      });
      return result;
    };
    return flatten(treeData);
  }, [treeData]);

  // Build tree with devices
  const treeWithDevices = useMemo(() => {
    const buildTreeWithDevices = (
      locations: Location[],
      devices: Device[]
    ): LocationWithDevices[] => {
      return locations.map((location) => {
        const locationDevices = devices.filter(
          (device) => device.locationId === location.id
        );
        return {
          ...location,
          devices: locationDevices,
          children: location.children
            ? buildTreeWithDevices(location.children, devices)
            : [],
        };
      });
    };

    const unassignedDevices = devices.filter(
      (device) => device.locationId === null || device.locationId === undefined
    );
    const tree = buildTreeWithDevices(treeData, devices);

    return { tree, unassignedDevices };
  }, [treeData, devices]);

  // Filter devices based on search query
  const filterDevices = (deviceList: Device[]) => {
    if (!searchQuery) return deviceList;
    const query = searchQuery.toLowerCase();
    return deviceList.filter(
      (device) =>
        device.name.toLowerCase().includes(query) ||
        device.description?.toLowerCase().includes(query) ||
        device.id.toLowerCase().includes(query)
    );
  };

  const toggleLocation = (locationId: number) => {
    setExpandedLocations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setDeviceFormData({
      name: device.name,
      description: device.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveDevice = () => {
    if (!editingDevice) return;
    updateDeviceMutation.mutate({
      id: editingDevice.id,
      name: deviceFormData.name,
      description: deviceFormData.description || null,
    });
  };

  const handleMoveDevice = async (
    deviceId: string,
    targetLocationId: number | null
  ) => {
    try {
      await moveDevices({
        deviceIds: [deviceId],
        targetLocationId,
      });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    } catch (error) {
      console.error("Failed to move device:", error);
      alert("Failed to move device. Please try again.");
    }
  };

  const handleUnassignDevice = async (deviceId: string) => {
    try {
      await moveDevices({
        deviceIds: [deviceId],
        targetLocationId: null,
      });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    } catch (error) {
      console.error("Failed to unassign device:", error);
      alert("Failed to unassign device. Please try again.");
    }
  };

  const renderLocationNode = (location: LocationWithDevices, level = 0) => {
    const isExpanded = expandedLocations.has(location.id);
    const hasChildren = location.children && location.children.length > 0;
    const locationDevices = filterDevices(location.devices);

    return (
      <div key={location.id} className="select-none">
        <div
          className="flex items-center py-2 px-3 rounded-md hover:bg-accent/50 transition-colors"
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {hasChildren ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 mr-2"
              onClick={() => toggleLocation(location.id)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="w-6 mr-2" />
          )}
          <div className="flex items-center flex-1 min-w-0">
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
            )}
            <span className="font-medium truncate">{location.name}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({locationDevices.length})
            </span>
          </div>
        </div>

        {/* Devices in this location */}
        {locationDevices.length > 0 && (
          <div style={{ paddingLeft: `${(level + 1) * 20 + 12}px` }}>
            {locationDevices.map((device) => (
              <div
                key={device.id}
                className="flex items-center py-1.5 px-3 rounded-md hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-primary mr-3 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{device.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {device.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDevice(device)}
                      className="h-7"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Select
                      value={device.locationId?.toString() || "unassign"}
                      onValueChange={(value) => {
                        if (value === "unassign") {
                          handleUnassignDevice(device.id);
                        } else {
                          handleMoveDevice(device.id, parseInt(value));
                        }
                      }}
                    >
                      <SelectTrigger className="h-7 w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassign">Unassign</SelectItem>
                        {allLocationsFlat.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id.toString()}>
                            {loc.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Child locations */}
        {hasChildren && isExpanded && (
          <div>
            {location.children.map((child) =>
              renderLocationNode(child, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredUnassignedDevices = filterDevices(
    treeWithDevices.unassignedDevices
  );

  if (isLoadingLocations || isLoadingDevices) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 overflow-hidden">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Devices</h1>
        <Input
          placeholder="Search devices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="flex-1 overflow-y-auto border rounded-lg p-4 bg-card">
        {/* Unassigned devices section - Always visible */}
        <div className="mb-6 pb-6 border-b">
          <div className="flex items-center py-2 px-3 mb-2">
            <Folder className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="font-semibold">Unassigned Devices</span>
            <span className="ml-2 text-xs text-muted-foreground">
              ({filteredUnassignedDevices.length})
            </span>
          </div>
          {filteredUnassignedDevices.length > 0 ? (
            <div style={{ paddingLeft: "32px" }}>
              {filteredUnassignedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center py-1.5 px-3 rounded-md hover:bg-accent/30 transition-colors group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground mr-3 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{device.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {device.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditDevice(device)}
                        className="h-7"
                        title="Edit device"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Select
                        value="unassign"
                        onValueChange={(value) => {
                          if (value !== "unassign") {
                            handleMoveDevice(device.id, parseInt(value));
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 w-48">
                          <SelectValue placeholder="Assign to location..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassign">
                            Keep Unassigned
                          </SelectItem>
                          {allLocationsFlat.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id.toString()}>
                              {loc.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{ paddingLeft: "32px" }}
              className="py-4 text-sm text-muted-foreground"
            >
              No unassigned devices. All devices are assigned to locations.
            </div>
          )}
        </div>

        {/* Location tree with devices */}
        {treeWithDevices.tree.length > 0 ? (
          <div>
            {treeWithDevices.tree.map((location) =>
              renderLocationNode(location)
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p>No locations found</p>
          </div>
        )}
      </div>

      {/* Edit Device Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Device</DialogTitle>
            <DialogDescription>
              Update the device information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="device-name">Name</Label>
              <Input
                id="device-name"
                value={deviceFormData.name}
                onChange={(e) =>
                  setDeviceFormData({ ...deviceFormData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="device-description">Description</Label>
              <Input
                id="device-description"
                value={deviceFormData.description}
                onChange={(e) =>
                  setDeviceFormData({
                    ...deviceFormData,
                    description: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveDevice}
              disabled={updateDeviceMutation.isPending}
            >
              {updateDeviceMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
