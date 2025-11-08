"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { TemperatureReading } from "@/types/device";
import { format } from "date-fns";
import { Thermometer } from "lucide-react";

interface TemperatureChartProps {
  deviceData: Map<string, { name: string; readings: TemperatureReading[] }>;
  selectedDeviceIds: string[];
}

// Color palette for different devices
const DEVICE_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

export function TemperatureChart({
  deviceData,
  selectedDeviceIds,
}: TemperatureChartProps) {
  const chartData = useMemo(() => {
    if (selectedDeviceIds.length === 0) return [];

    // Collect all timestamps from all selected devices
    const allTimestamps = new Set<number>();
    selectedDeviceIds.forEach((deviceId) => {
      const data = deviceData.get(deviceId);
      if (data) {
        data.readings.forEach((reading) => {
          allTimestamps.add(new Date(reading.takenAt).getTime());
        });
      }
    });

    // Sort timestamps
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // Create data points for each timestamp
    return sortedTimestamps.map((timestamp) => {
      const dataPoint: Record<string, number | string> = {
        timestamp,
        time: format(new Date(timestamp), "HH:mm:ss"),
      };

      selectedDeviceIds.forEach((deviceId) => {
        const data = deviceData.get(deviceId);
        if (data) {
          // Find the reading closest to this timestamp
          const reading = data.readings.find(
            (r) => new Date(r.takenAt).getTime() === timestamp
          );
          if (reading) {
            dataPoint[deviceId] = reading.temperatureC;
          }
        }
      });

      return dataPoint;
    });
  }, [deviceData, selectedDeviceIds]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    selectedDeviceIds.forEach((deviceId, index) => {
      const data = deviceData.get(deviceId);
      config[deviceId] = {
        label: data?.name || deviceId,
        color: DEVICE_COLORS[index % DEVICE_COLORS.length],
      };
    });
    return config;
  }, [deviceData, selectedDeviceIds]);

  if (selectedDeviceIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Temperature Monitor</CardTitle>
          <CardDescription>Select devices to view their temperature trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Thermometer className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No devices selected</p>
            <p className="text-sm">Select one or more devices from the table above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Temperature Monitor</CardTitle>
          <CardDescription>
            Monitoring {selectedDeviceIds.length} device{selectedDeviceIds.length > 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Thermometer className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">Waiting for temperature readings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Temperature Monitor</CardTitle>
        <CardDescription>
          Real-time temperature readings for {selectedDeviceIds.length} device
          {selectedDeviceIds.length > 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                scale="log"
                domain={['auto', 'auto']}
                label={{ value: "Temperature (°C)", angle: -90, position: "insideLeft" }}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              {selectedDeviceIds.map((deviceId, index) => (
                <Line
                  key={deviceId}
                  type="monotone"
                  dataKey={deviceId}
                  stroke={DEVICE_COLORS[index % DEVICE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  name={deviceData.get(deviceId)?.name || deviceId}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
