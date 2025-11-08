"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { TemperatureReading, TemperatureAggregate } from "@/types/device";
import { format } from "date-fns";
import { Thermometer, Droplets } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type TimeRange = 'live' | '15m' | '1h' | '6h' | '24h' | '7d';

interface TimeRangeConfig {
  label: string;
  granularity: '1m' | '5m' | '1h' | '6h' | '1d' | null;
  duration: number | null;
}

const TIME_RANGES: Record<TimeRange, TimeRangeConfig> = {
  live: { label: 'Live', granularity: null, duration: null },
  '15m': { label: '15 Min', granularity: '1m', duration: 15 * 60 * 1000 },
  '1h': { label: '1 Hour', granularity: '5m', duration: 60 * 60 * 1000 },
  '6h': { label: '6 Hours', granularity: '1h', duration: 6 * 60 * 60 * 1000 },
  '24h': { label: '24 Hours', granularity: '6h', duration: 24 * 60 * 60 * 1000 },
  '7d': { label: '7 Days', granularity: '1d', duration: 7 * 24 * 60 * 60 * 1000 },
};

interface TemperatureChartProps {
  deviceData: Map<string, { name: string; readings: TemperatureReading[] }>;
  aggregateData: Map<string, { name: string; aggregates: TemperatureAggregate[] }>;
  selectedDeviceIds: string[];
  onTimeRangeChange: (range: TimeRange) => void;
  isLoadingAggregates?: boolean;
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
  aggregateData,
  selectedDeviceIds,
  onTimeRangeChange,
  isLoadingAggregates = false,
}: TemperatureChartProps) {
  const [viewMode, setViewMode] = useState<"temperature" | "humidity">("temperature");
  const [timeRange, setTimeRange] = useState<TimeRange>('live');

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
    onTimeRangeChange(range);
  };

  const isLiveMode = timeRange === 'live';

  const chartData = useMemo(() => {
    if (selectedDeviceIds.length === 0) return [];

    // Use aggregate data for historical view, real-time data for live view
    if (isLiveMode) {
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
            const reading = data.readings.find(
              (r) => new Date(r.takenAt).getTime() === timestamp
            );
            if (reading) {
              dataPoint[`${deviceId}_temp`] = reading.temperatureC;
              if (reading.humidity !== null && reading.humidity !== undefined) {
                dataPoint[`${deviceId}_humidity`] = reading.humidity;
              }
            }
          }
        });

        return dataPoint;
      });
    } else {
      // Historical mode - use aggregates
      const allTimestamps = new Set<number>();
      selectedDeviceIds.forEach((deviceId) => {
        const data = aggregateData.get(deviceId);
        if (data) {
          data.aggregates.forEach((agg) => {
            allTimestamps.add(new Date(agg.bucketStart).getTime());
          });
        }
      });

      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

      const timeFormat = timeRange === '7d' ? 'MMM dd' : timeRange === '24h' ? 'HH:mm' : 'HH:mm';

      return sortedTimestamps.map((timestamp) => {
        const dataPoint: Record<string, number | string> = {
          timestamp,
          time: format(new Date(timestamp), timeFormat),
        };

        selectedDeviceIds.forEach((deviceId) => {
          const data = aggregateData.get(deviceId);
          if (data) {
            const aggregate = data.aggregates.find(
              (a) => new Date(a.bucketStart).getTime() === timestamp
            );
            if (aggregate) {
              dataPoint[`${deviceId}_temp`] = aggregate.medianC;
              // Note: aggregates only have temperature median, not humidity
            }
          }
        });

        return dataPoint;
      });
    }
  }, [deviceData, aggregateData, selectedDeviceIds, isLiveMode, timeRange]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {};
    selectedDeviceIds.forEach((deviceId, index) => {
      const data = deviceData.get(deviceId);
      const deviceName = data?.name || deviceId;
      config[`${deviceId}_temp`] = {
        label: `${deviceName} (Temp)`,
        color: DEVICE_COLORS[index % DEVICE_COLORS.length],
      };
      config[`${deviceId}_humidity`] = {
        label: `${deviceName} (Humidity)`,
        color: DEVICE_COLORS[index % DEVICE_COLORS.length],
      };
    });
    return config;
  }, [deviceData, selectedDeviceIds]);

  const hasHumidityData = useMemo(() => {
    return Array.from(deviceData.values()).some((data) =>
      data.readings.some((r) => r.humidity !== null && r.humidity !== undefined)
    );
  }, [deviceData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Temperature Monitor</CardTitle>
              <CardDescription>
                {selectedDeviceIds.length === 0
                  ? 'Select devices to view their temperature trends'
                  : `${isLiveMode ? 'Real-time' : TIME_RANGES[timeRange].label} readings for ${selectedDeviceIds.length} device${selectedDeviceIds.length > 1 ? "s" : ""}`
                }
                {isLoadingAggregates && <span className="ml-2 text-xs">(Loading...)</span>}
              </CardDescription>
            </div>
            {hasHumidityData && isLiveMode && selectedDeviceIds.length > 0 && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "temperature" | "humidity")}>
                <TabsList>
                  <TabsTrigger value="temperature" className="gap-1">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </TabsTrigger>
                  <TabsTrigger value="humidity" className="gap-1">
                    <Droplets className="h-4 w-4" />
                    Humidity
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(TIME_RANGES) as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleTimeRangeChange(range)}
                disabled={selectedDeviceIds.length === 0}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
                  } ${selectedDeviceIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {TIME_RANGES[range].label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedDeviceIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Thermometer className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No devices selected</p>
            <p className="text-sm">Select one or more devices from the table below</p>
          </div>
        ) : chartData.length === 0 && !isLoadingAggregates ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Thermometer className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">
              {isLiveMode ? 'Waiting for temperature readings...' : 'No historical data for this time range'}
            </p>
          </div>
        ) : (
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
                  domain={['auto', 'auto']}
                  label={{
                    value: viewMode === "temperature" ? "Temperature (°C)" : "Humidity (%)",
                    angle: -90,
                    position: "insideLeft"
                  }}
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                {selectedDeviceIds.map((deviceId, index) => (
                  <Line
                    key={deviceId}
                    type="monotone"
                    dataKey={viewMode === "temperature" ? `${deviceId}_temp` : `${deviceId}_humidity`}
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
        )}
      </CardContent>
    </Card>
  );
}
