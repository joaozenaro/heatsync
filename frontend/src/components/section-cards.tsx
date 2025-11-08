import { Activity, Thermometer, Droplets, Database } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Device, DeviceStats } from "@/types/device"

interface SectionCardsProps {
  devices: Device[]
  stats: DeviceStats[]
}

export function SectionCards({ devices, stats }: SectionCardsProps) {
  const activeDevices = devices.filter((d) => d.isActive).length
  const totalDevices = devices.length

  const avgTemp = stats.length > 0
    ? stats.reduce((sum, s) => sum + s.avgTemp, 0) / stats.length
    : 0

  const avgHumidity = stats.length > 0
    ? stats.reduce((sum, s) => sum + (s.avgHumidity || 0), 0) / stats.length
    : 0

  const totalReadings = stats.reduce((sum, s) => sum + s.readingCount, 0)

  const activePercentage = totalDevices > 0
    ? ((activeDevices / totalDevices) * 100).toFixed(1)
    : "0"

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Devices</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {activeDevices}/{totalDevices}
          </CardTitle>
          <CardAction>
            <Badge variant={activeDevices === totalDevices ? "default" : "outline"}>
              <Activity className="size-3 mr-1" />
              {activePercentage}%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {activeDevices === totalDevices ? "All devices online" : `${totalDevices - activeDevices} offline`}
          </div>
          <div className="text-muted-foreground">
            Connected IoT devices
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Temperature</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {avgTemp > 0 ? `${avgTemp.toFixed(1)}°C` : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Thermometer className="size-3 mr-1" />
              {stats.length} devices
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {avgTemp > 0 ? "Across all monitored devices" : "No data available"}
          </div>
          <div className="text-muted-foreground">
            Last 24 hours average
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Average Humidity</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {avgHumidity > 0 ? `${avgHumidity.toFixed(1)}%` : "—"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Droplets className="size-3 mr-1" />
              {stats.filter(s => s.avgHumidity !== null).length} sensors
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            {avgHumidity > 0 ? "Environmental monitoring" : "No humidity data"}
          </div>
          <div className="text-muted-foreground">
            Last 24 hours average
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Readings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalReadings.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <Database className="size-3 mr-1" />
              24h
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Data points collected
          </div>
          <div className="text-muted-foreground">
            Last 24 hours period
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
