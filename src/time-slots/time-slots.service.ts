import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { UpdateTimeSlotDto } from './dto/update-time-slot.dto';
import { FilterTimeSlotsDto } from './dto/filter-time-slots.dto';
import { User } from '@prisma/client';

@Injectable()
export class TimeSlotsService {
  constructor(private prisma: PrismaService) {}

  async create(createTimeSlotDto: CreateTimeSlotDto, user: User) {
    const { startTime, endTime, duration } = createTimeSlotDto;

    // Validate time slots
    if (startTime >= endTime) {
      throw new BadRequestException('Start time must be before end time');
    }

    // Check if user is a provider
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      throw new ForbiddenException('Only providers can create time slots');
    }

    if (startTime < new Date()) {
      throw new BadRequestException('Start time must be in the future');
    }

    // Create time slot
    return this.prisma.timeSlot.create({
      data: {
        providerId: provider.id,
        startTime,
        endTime,
        duration,
      },
    });
  }

  async findAll(filters: FilterTimeSlotsDto) {
    const { providerId, startDate, endDate } = filters;
    
    const where: any = {};

    if (providerId) {
      where.providerId = providerId;
    }

    if (startDate || endDate) {
      where.startTime = {};

      if (startDate) {
        where.startTime.gte = startDate;
      }

      if (endDate) {
        where.startTime.lte = endDate;
      }
    }

    return this.prisma.timeSlot.findMany({
      where,
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        booking: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }

  async findOne(id: string) {
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
      include: {
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        booking: true,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${id} not found`);
    }

    return timeSlot;
  }

  async update(id: string, updateTimeSlotDto: UpdateTimeSlotDto, user: User) {
    // Check if time slot exists
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
      include: {
        provider: true,
        booking: true,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${id} not found`);
    }

    // Check if user is the owner
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider || timeSlot.providerId !== provider.id) {
      throw new ForbiddenException('You can only update your own time slots');
    }

    // Check if time slot is already booked
    if (timeSlot.booking) {
      throw new BadRequestException('Cannot update a booked time slot');
    }

    // Update time slot
    return this.prisma.timeSlot.update({
      where: { id },
      data: updateTimeSlotDto,
    });
  }

  async remove(id: string, user: User) {
    // Check if time slot exists
    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id },
      include: {
        provider: true,
        booking: true,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot with ID ${id} not found`);
    }

    // Check if user is the owner
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider || timeSlot.providerId !== provider.id) {
      throw new ForbiddenException('You can only delete your own time slots');
    }

    // Check if time slot is already booked
    if (timeSlot.booking) {
      throw new BadRequestException('Cannot delete a booked time slot');
    }

    // Delete time slot
    return this.prisma.timeSlot.delete({
      where: { id },
    });
  }

  async getProviderTimeSlots(user: User) {
    // Check if user is a provider
    const provider = await this.prisma.provider.findUnique({
      where: { userId: user.id },
    });

    if (!provider) {
      throw new ForbiddenException('Only providers can access this endpoint');
    }

    return this.prisma.timeSlot.findMany({
      where: {
        providerId: provider.id,
      },
      include: {
        booking: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }
} 