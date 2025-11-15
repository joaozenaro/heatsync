import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import type { UpdateDeviceDto } from './devices.service';
import { HttpAuthGuard } from '../auth/http-auth.guard';
import type { AuthenticatedRequest } from '../auth/http-auth.guard';

@Controller('devices')
@UseGuards(HttpAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Get()
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('active') active?: string,
    @Query('locationId') locationId?: string,
  ) {
    const userId = req.user!.id;
    const locationIdNum = locationId ? parseInt(locationId, 10) : undefined;

    if (active === 'true') {
      return this.devicesService.findAllActive();
    }

    const result = await this.devicesService.findAll(userId, locationIdNum);
    return result;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const device = await this.devicesService.findById(id);

    if (!device) {
      return null;
    }

    return device;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateDeviceDto) {
    return this.devicesService.update(id, updateDto);
  }
}
