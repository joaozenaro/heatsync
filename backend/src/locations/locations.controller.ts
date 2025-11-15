import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import type { CreateLocationDto, UpdateLocationDto } from './locations.service';
import { HttpAuthGuard } from '../auth/http-auth.guard';
import type { AuthenticatedRequest } from '../auth/http-auth.guard';

@Controller('locations')
@UseGuards(HttpAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async findAll(@Request() req: AuthenticatedRequest) {
    const userId = req.user!.id;
    return this.locationsService.findAll(userId);
  }

  @Get('tree')
  async getTree(@Request() req: AuthenticatedRequest) {
    const userId = req.user!.id;
    return this.locationsService.getTree(userId);
  }

  @Get(':id/device-count')
  async getDeviceCount(@Param('id', ParseIntPipe) id: number) {
    const count = await this.locationsService.getDeviceCount(id);
    return { count };
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user!.id;
    return this.locationsService.findById(id, userId);
  }

  @Post()
  async create(
    @Body() createDto: Omit<CreateLocationDto, 'ownerId'>,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user!.id;
    return this.locationsService.create({
      ...createDto,
      ownerId: userId,
    });
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLocationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user!.id;
    return this.locationsService.update(id, userId, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: AuthenticatedRequest,
  ) {
    const userId = req.user!.id;
    await this.locationsService.delete(id, userId);
  }
}
