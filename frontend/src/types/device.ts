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
  lastReading?: Date | null;
}

export interface TemperatureReading {
  id: number;
  takenAt: Date;
  temperatureC: number;
  deviceId: string | null;
}

export interface TemperatureUpdate {
  deviceId: string;
  temperatureC: number;
  timestamp: string;
}

export interface DeviceWithHistory extends Device {
  history: TemperatureReading[];
}
