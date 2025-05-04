import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { TimeSlotsService } from './time-slots.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { FilterTimeSlotsDto } from './dto/filter-time-slots.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('time-slots')
@Controller('time-slots')
export class TimeSlotsController {
  constructor(private readonly timeSlotsService: TimeSlotsService) {}

  @ApiOperation({ summary: 'Create a new time slot (Provider only)' })
  @ApiBody({ type: CreateTimeSlotDto })
  @ApiResponse({ status: 201, description: 'Time slot created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a provider' })
  @ApiBearerAuth()
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  create(@Body() createTimeSlotDto: CreateTimeSlotDto, @GetUser() user) {
    return this.timeSlotsService.create(createTimeSlotDto, user);
  }

  @ApiOperation({ summary: 'Get all time slots (filtered)' })
  @ApiQuery({ name: 'providerId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Returns all matching time slots' })
  @Get()
  findAll(@Query() filterDto: FilterTimeSlotsDto) {
    return this.timeSlotsService.findAll(filterDto);
  }

  @ApiOperation({ summary: 'Get time slots for the logged-in provider' })
  @ApiResponse({ status: 200, description: 'Returns provider time slots' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a provider' })
  @ApiBearerAuth()
  @Get('provider')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  getProviderTimeSlots(@GetUser() user) {
    return this.timeSlotsService.getProviderTimeSlots(user);
  }

  @ApiOperation({ summary: 'Get a time slot by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Time slot ID' })
  @ApiResponse({ status: 200, description: 'Returns the time slot' })
  @ApiResponse({ status: 404, description: 'Time slot not found' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timeSlotsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a time slot (Provider only)' })
  @ApiParam({ name: 'id', type: String, description: 'Time slot ID' })
  @ApiBody({ type: UpdateTimeSlotDto })
  @ApiResponse({ status: 200, description: 'Time slot updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a provider or not the owner' })
  @ApiResponse({ status: 404, description: 'Time slot not found' })
  @ApiBearerAuth()
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  update(
    @Param('id') id: string,
    @Body() updateTimeSlotDto: UpdateTimeSlotDto,
    @GetUser() user,
  ) {
    return this.timeSlotsService.update(id, updateTimeSlotDto, user);
  }

  @ApiOperation({ summary: 'Delete a time slot (Provider only)' })
  @ApiParam({ name: 'id', type: String, description: 'Time slot ID' })
  @ApiResponse({ status: 200, description: 'Time slot deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User is not a provider or not the owner' })
  @ApiResponse({ status: 404, description: 'Time slot not found' })
  @ApiBearerAuth()
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PROVIDER)
  remove(@Param('id') id: string, @GetUser() user) {
    return this.timeSlotsService.remove(id, user);
  }
} 