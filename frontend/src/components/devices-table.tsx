"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Device } from "@/types/device";
import { Thermometer, MapPin, Clock, Activity, Droplets } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DevicesTableProps {
  devices: Device[];
  selectedDeviceIds: string[];
  onSelectionChange: (deviceIds: string[]) => void;
  isLoading?: boolean;
}

export function DevicesTable({
  devices,
  selectedDeviceIds,
  onSelectionChange,
  isLoading = false,
}: DevicesTableProps) {
  const handleToggleDevice = (deviceId: string) => {
    if (selectedDeviceIds.includes(deviceId)) {
      onSelectionChange(selectedDeviceIds.filter((id) => id !== deviceId));
    } else {
      onSelectionChange([...selectedDeviceIds, deviceId]);
    }
  };

  const handleToggleAll = () => {
    if (selectedDeviceIds.length === devices.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(devices.map((d) => d.id));
    }
  };

  const formatTemperature = (temp: number | null | undefined) => {
    if (temp === null || temp === undefined) return "—";
    return `${temp.toFixed(1)}°C`;
  };

  const formatHumidity = (humidity: number | null | undefined) => {
    if (humidity === null || humidity === undefined) return "—";
    return `${humidity.toFixed(1)}%`;
  };

  const formatLastSeen = (date: Date | null | undefined) => {
    if (!date) return "Never";
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  const allSelected =
    devices.length > 0 && selectedDeviceIds.length === devices.length;
  const someSelected =
    selectedDeviceIds.length > 0 && selectedDeviceIds.length < devices.length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
          <CardDescription>Loading devices...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Devices</CardTitle>
          <CardDescription>No devices found</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mb-2 opacity-50" />
            <p>No devices are currently registered</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
        <CardDescription>
          Select devices to monitor their temperature readings
          {selectedDeviceIds.length > 0 && (
            <span className="ml-2 text-primary font-medium">
              ({selectedDeviceIds.length} selected)
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={handleToggleAll}
                    aria-label="Select all devices"
                  />
                </TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Temperature</TableHead>
                <TableHead>Humidity</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <TableRow
                  key={device.id}
                  className={`cursor-pointer ${
                    selectedDeviceIds.includes(device.id) ? "bg-muted/50" : ""
                  }`}
                  onClick={() => handleToggleDevice(device.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedDeviceIds.includes(device.id)}
                      onCheckedChange={() => handleToggleDevice(device.id)}
                      aria-label={`Select ${device.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{device.name}</span>
                      {device.description && (
                        <span className="text-sm text-muted-foreground">
                          {device.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {device.location ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium">
                            {device.location.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-5">
                          <span className="capitalize">
                            {device.location.type}
                          </span>
                          {device.location.description && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]">
                                {device.location.description}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : device.locationId ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>Location #{device.locationId}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">
                        {formatTemperature(device.currentTemperature)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Droplets className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">
                        {formatHumidity(device.currentHumidity)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatLastSeen(device.lastSeenAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={device.isActive ? "default" : "secondary"}>
                      {device.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
