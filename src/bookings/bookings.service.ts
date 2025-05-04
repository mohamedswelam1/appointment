import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { User, AppointmentStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(createBookingDto: CreateBookingDto, user: User) {
    const { timeSlotId } = createBookingDto;

    const timeSlot = await this.prisma.timeSlot.findUnique({
      where: { id: timeSlotId },
      include: {
        booking: true,
        provider: true,
      },
    });

    if (!timeSlot) {
      throw new NotFoundException(`Time slot not found`);
    }

    if (timeSlot.booking) {
      throw new BadRequestException('This time slot is already booked');
    }

    console.log('timeSlot', timeSlot.startTime, new Date());
    if (timeSlot.startTime < new Date()) {
      throw new BadRequestException('Cannot book a time slot in the past');
    }

    if (timeSlot.provider.userId === user.id) {
      throw new BadRequestException('Cannot book your own time slot');
    }

    return this.prisma.booking.create({
      data: {
        userId: user.id,
        timeSlotId,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        timeSlot: {
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
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(user: User) {
    return this.prisma.booking.findMany({
      where: {
        userId: user.id,
      },
      include: {
        timeSlot: {
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
          },
        },
      },
      orderBy: {
        timeSlot: {
          startTime: 'asc',
        },
      },
    });
  }

  async findOne(id: string, user: User) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        timeSlot: {
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
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (
      booking.userId !== user.id &&
      booking.timeSlot.provider.userId !== user.id
    ) {
      throw new ForbiddenException(
        'You can only access your own bookings or bookings for your time slots',
      );
    }

    return booking;
  }

  async update(id: string, updateBookingDto: UpdateBookingDto, user: User) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        timeSlot: {
          include: {
            provider: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    const isOwner = booking.userId === user.id;
    const isProvider = booking.timeSlot.provider.userId === user.id;

    if (!isOwner && !isProvider) {
      throw new ForbiddenException(
        'You can only update your own bookings or bookings for your time slots',
      );
    }

    if (updateBookingDto.status === AppointmentStatus.CANCELLED) {
      if (isProvider) {
        const now = new Date();
        const bookingTime = booking.timeSlot.startTime;
        const hoursUntilBooking =
          (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilBooking < 24) {
          throw new BadRequestException(
            'Providers cannot cancel bookings less than 24 hours in advance',
          );
        }
      }
    }

    return this.prisma.booking.update({
      where: { id },
      data: updateBookingDto,
      include: {
        timeSlot: {
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
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async remove(id: string, user: User) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        timeSlot: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking not found`);
    }

    // Check if user is the booking owner
    if (booking.userId !== user.id) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    // Check if booking is in the past
    if (booking.timeSlot.startTime < new Date()) {
      throw new BadRequestException('Cannot cancel a booking in the past');
    }

    // Delete booking
    return this.prisma.booking.delete({
      where: { id },
    });
  }

  // Methods for the cron job
  async updateExpiredAppointments() {
    const now = new Date();
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
        },
        timeSlot: {
          endTime: {
            lt: now,
          },
        },
      },
    });

    for (const booking of expiredBookings) {
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: AppointmentStatus.COMPLETED },
      });
    }

    return { updatedCount: expiredBookings.length };
  }

  async findUpcomingAppointmentsForReminders() {
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    // Find appointments that are 30 minutes from now and haven't had reminders sent
    return this.prisma.booking.findMany({
      where: {
        reminderSent: false,
        status: AppointmentStatus.CONFIRMED,
        timeSlot: {
          startTime: {
            gte: now,
            lte: thirtyMinutesLater,
          },
        },
      },
      include: {
        user: true,
        timeSlot: {
          include: {
            provider: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });
  }

  async markReminderSent(bookingId: string) {
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { reminderSent: true },
    });
  }
} 