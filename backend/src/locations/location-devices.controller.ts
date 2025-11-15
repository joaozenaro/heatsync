import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { LocationDevicesService } from './location-devices.service';
import { HttpAuthGuard } from '../auth/http-auth.guard';
import type { AuthenticatedRequest } from '../auth/http-auth.guard';

@Controller('locations')
@UseGuards(HttpAuthGuard)
export class LocationDevicesController {
  constructor(
    private readonly locationDevicesService: LocationDevicesService,
  ) {}

  @Get(':id/devices')
  async getDevicesInLocation(
    @Param('id', ParseIntPipe) locationId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user!.id;
    return this.locationDevicesService.getDevicesInLocation(locationId, userId);
  }

  @Post('devices/move')
  @HttpCode(HttpStatus.OK)
  async moveDevices(
    @Body() body: { deviceIds: string[]; targetLocationId: number | null },
    @Request() req: AuthenticatedRequest,
  ) {
    const { deviceIds, targetLocationId } = body;
    const userId = req.user!.id;

    if (!Array.isArray(deviceIds) || deviceIds.length === 0) {
      throw new BadRequestException('At least one device ID is required');
    }

    await this.locationDevicesService.moveDevices(
      deviceIds,
      targetLocationId,
      userId,
    );
    return { success: true };
  }
}
