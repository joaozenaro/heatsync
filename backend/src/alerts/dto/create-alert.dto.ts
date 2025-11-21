import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  IsEmail,
  ArrayMinSize,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  IsTimeFormat,
  IsValidDaysOfWeek,
  HasAtLeastOneThreshold,
  MinLessThanMax,
  StartDateBeforeEndDate,
} from '../validators/alert-validators';

export class CreateAlertDto {
  @IsString({ message: 'Device ID must be a string' })
  @IsNotEmpty({ message: 'Device is required' })
  deviceId: string;

  @IsEnum(['temperature', 'humidity'], {
    message: 'Type must be either "temperature" or "humidity"',
  })
  type: 'temperature' | 'humidity';

  @IsOptional()
  @IsNumber({}, { message: 'Minimum threshold must be a number' })
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  @HasAtLeastOneThreshold()
  @MinLessThanMax()
  minThreshold?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Maximum threshold must be a number' })
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  maxThreshold?: number;

  @IsOptional()
  @IsString({ message: 'Start time must be a string' })
  @IsTimeFormat()
  startTime?: string;

  @IsOptional()
  @IsString({ message: 'End time must be a string' })
  @IsTimeFormat()
  endTime?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'Start date must be a valid ISO 8601 date string' },
  )
  @StartDateBeforeEndDate()
  startDate?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'End date must be a valid ISO 8601 date string' },
  )
  endDate?: string;

  @IsOptional()
  @IsArray({ message: 'Days of week must be an array' })
  @IsValidDaysOfWeek()
  daysOfWeek?: number[];

  @IsArray({ message: 'Emails must be an array' })
  @ArrayMinSize(1, { message: 'At least one email address is required' })
  @IsEmail(
    {},
    { each: true, message: 'Each email must be a valid email address' },
  )
  emails: string[];

  @IsOptional()
  @IsBoolean({ message: 'Enabled must be a boolean value' })
  enabled?: boolean;
}
