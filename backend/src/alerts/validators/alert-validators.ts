import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Type interfaces for validation
interface ThresholdObject {
  minThreshold?: number | null;
  maxThreshold?: number | null;
}

interface DateObject {
  startDate?: string;
  endDate?: string;
}

// Validator: Time format HH:mm
@ValidatorConstraint({ name: 'isTimeFormat', async: false })
export class IsTimeFormatConstraint implements ValidatorConstraintInterface {
  validate(time: any) {
    if (typeof time !== 'string') return false;
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  }

  defaultMessage() {
    return 'Time must be in HH:mm format (e.g., 09:30)';
  }
}

export function IsTimeFormat(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTimeFormatConstraint,
    });
  };
}

// Validator: Days of week array (0-6)
@ValidatorConstraint({ name: 'isValidDaysOfWeek', async: false })
export class IsValidDaysOfWeekConstraint
  implements ValidatorConstraintInterface
{
  validate(days: any) {
    if (!Array.isArray(days)) return false;
    return days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  }

  defaultMessage() {
    return 'Days of week must be an array of integers between 0 (Sunday) and 6 (Saturday)';
  }
}

export function IsValidDaysOfWeek(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDaysOfWeekConstraint,
    });
  };
}

// Validator: At least one threshold required
@ValidatorConstraint({ name: 'hasAtLeastOneThreshold', async: false })
export class HasAtLeastOneThresholdConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments) {
    const object = args.object as ThresholdObject;
    return (
      object.minThreshold !== undefined ||
      object.minThreshold !== null ||
      object.maxThreshold !== undefined ||
      object.maxThreshold !== null
    );
  }

  defaultMessage() {
    return 'At least one threshold (min or max) must be provided';
  }
}

export function HasAtLeastOneThreshold(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: HasAtLeastOneThresholdConstraint,
    });
  };
}

// Validator: Min threshold < Max threshold when both exist
@ValidatorConstraint({ name: 'minLessThanMax', async: false })
export class MinLessThanMaxConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const object = args.object as ThresholdObject;
    if (
      object.minThreshold !== undefined &&
      object.minThreshold !== null &&
      object.maxThreshold !== undefined &&
      object.maxThreshold !== null
    ) {
      return object.minThreshold < object.maxThreshold;
    }
    return true; // If both don't exist, it's valid
  }

  defaultMessage() {
    return 'Minimum threshold must be less than maximum threshold';
  }
}

export function MinLessThanMax(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: MinLessThanMaxConstraint,
    });
  };
}

// Validator: Start date < End date when both exist
@ValidatorConstraint({ name: 'startDateBeforeEndDate', async: false })
export class StartDateBeforeEndDateConstraint
  implements ValidatorConstraintInterface
{
  validate(_value: unknown, args: ValidationArguments) {
    const object = args.object as DateObject;
    if (object.startDate && object.endDate) {
      const start = new Date(object.startDate);
      const end = new Date(object.endDate);
      return start < end;
    }
    return true;
  }

  defaultMessage() {
    return 'Start date must be before end date';
  }
}

export function StartDateBeforeEndDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: StartDateBeforeEndDateConstraint,
    });
  };
}
