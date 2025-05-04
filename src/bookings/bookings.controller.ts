import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '@prisma/client';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiOperation({ summary: 'Create a new booking' })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Time slot already booked/invalid' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Time slot not found' })
  @Post()
  create(@Body() createBookingDto: CreateBookingDto, @GetUser() user: User) {
    return this.bookingsService.create(createBookingDto, user);
  }

  @ApiOperation({ summary: 'Get all bookings for the logged-in user' })
  @ApiResponse({ status: 200, description: 'Returns all user bookings' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  findAll(@GetUser() user: User) {
    return this.bookingsService.findAll(user);
  }

  @ApiOperation({ summary: 'Get a booking by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Returns the booking' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not owner of booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.bookingsService.findOne(id, user);
  }

  @ApiOperation({ summary: 'Update a booking' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiBody({ type: UpdateBookingDto })
  @ApiResponse({ status: 200, description: 'Booking updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot cancel within 24 hours as provider' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not owner of booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @GetUser() user: User,
  ) {
    return this.bookingsService.update(id, updateBookingDto, user);
  }

  @ApiOperation({ summary: 'Delete a booking' })
  @ApiParam({ name: 'id', type: String, description: 'Booking ID' })
  @ApiResponse({ status: 200, description: 'Booking deleted successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Cannot cancel past booking' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not owner of booking' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.bookingsService.remove(id, user);
  }
} 