export interface Device {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  isActive: boolean;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string | null;
  groupId: string | null;
  currentTemperature?: number | null;
  currentHumidity?: number | null;
  lastReading?: Date | null;
}

export interface TemperatureReading {
  id: number;
  takenAt: Date;
  temperatureC: number;
  humidity?: number | null;
  deviceId: string | null;
}

export interface TemperatureUpdate {
  deviceId: string;
  temperatureC: number;
  humidity?: number | null;
  timestamp: string;
}

export interface HumidityUpdate {
  deviceId: string;
  humidity: number;
  timestamp: string;
}

export interface DeviceStats {
  deviceId: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  avgHumidity: number | null;
  readingCount: number;
}

export interface TemperatureAggregate {
  id: number;
  bucketStart: Date;
  granularity: string;
  medianC: number;
  deviceId: string | null;
}

export interface DeviceEvent {
  type: "added" | "updated" | "removed" | "status";
  device?: Device;
  deviceId?: string;
  isActive?: boolean;
}

export interface DeviceWithHistory extends Device {
  history: TemperatureReading[];
}
