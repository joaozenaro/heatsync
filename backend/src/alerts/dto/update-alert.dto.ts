import { CreateAlertDto } from './create-alert.dto';

export class UpdateAlertDto implements Partial<CreateAlertDto> {
  deviceId?: string;
  type?: 'temperature' | 'humidity';
  minThreshold?: number;
  maxThreshold?: number;
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
  emails?: string[];
  enabled?: boolean;
}
