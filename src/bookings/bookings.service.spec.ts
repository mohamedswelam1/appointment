import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, User, UserRole } from '@prisma/client';

// Mock user for testing
const mockUser: User = {
  id: 'user-id-1',
  email: 'test@example.com',
  password: 'hashed-password',
  firstName: 'Test',
  lastName: 'User',
  role: UserRole.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock provider user for testing
const mockProviderUser: User = {
  id: 'provider-id-1',
  email: 'provider@example.com',
  password: 'hashed-password',
  firstName: 'Provider',
  lastName: 'User',
  role: UserRole.PROVIDER,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('BookingsService', () => {
  let service: BookingsService;
  let prismaService: PrismaService;

  // Mock Prisma service
  const mockPrismaService = {
    timeSlot: {
      findUnique: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1); // Set date to tomorrow

    const createBookingDto = {
      timeSlotId: 'time-slot-id-1',
    };

    it('should create a booking for an available time slot', async () => {
      // Arrange
      const mockTimeSlot = {
        id: 'time-slot-id-1',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour after start
        duration: 60,
        providerId: 'provider-id-1',
        booking: null, // No existing booking
        provider: {
          id: 'provider-id-1',
          userId: 'provider-id-1',
        },
      };

      const mockCreatedBooking = {
        id: 'booking-id-1',
        userId: mockUser.id,
        timeSlotId: createBookingDto.timeSlotId,
        status: AppointmentStatus.CONFIRMED,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeSlot: {
          ...mockTimeSlot,
          provider: {
            ...mockTimeSlot.provider,
            user: mockProviderUser,
          },
        },
        user: mockUser,
      };

      mockPrismaService.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);
      mockPrismaService.booking.create.mockResolvedValue(mockCreatedBooking);

      // Act
      const result = await service.create(createBookingDto, mockUser);

      // Assert
      expect(mockPrismaService.timeSlot.findUnique).toHaveBeenCalledWith({
        where: { id: createBookingDto.timeSlotId },
        include: {
          booking: true,
          provider: true,
        },
      });
      expect(mockPrismaService.booking.create).toHaveBeenCalledWith({
        data: {
          userId: mockUser.id,
          timeSlotId: createBookingDto.timeSlotId,
          status: AppointmentStatus.CONFIRMED,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockCreatedBooking);
    });

    it('should throw BadRequestException if time slot is already booked', async () => {
      // Arrange
      const mockTimeSlot = {
        id: 'time-slot-id-1',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour after start
        duration: 60,
        providerId: 'provider-id-1',
        booking: { id: 'existing-booking-id' }, // Existing booking
        provider: {
          id: 'provider-id-1',
          userId: 'provider-id-1',
        },
      };

      mockPrismaService.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);

      // Act & Assert
      await expect(service.create(createBookingDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.booking.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if time slot is in the past', async () => {
      // Arrange
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Set date to yesterday

      const mockTimeSlot = {
        id: 'time-slot-id-1',
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 60 * 60 * 1000), // 1 hour after start
        duration: 60,
        providerId: 'provider-id-1',
        booking: null, // No existing booking
        provider: {
          id: 'provider-id-1',
          userId: 'provider-id-1',
        },
      };

      mockPrismaService.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);

      // Act & Assert
      await expect(service.create(createBookingDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.booking.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user tries to book their own time slot', async () => {
      // Arrange - create a time slot owned by the same user
      const mockTimeSlot = {
        id: 'time-slot-id-1',
        startTime: futureDate,
        endTime: new Date(futureDate.getTime() + 60 * 60 * 1000), // 1 hour after start
        duration: 60,
        providerId: 'provider-id-1',
        booking: null, // No existing booking
        provider: {
          id: 'provider-id-1',
          userId: mockUser.id, // Same user ID as the booking user
        },
      };

      mockPrismaService.timeSlot.findUnique.mockResolvedValue(mockTimeSlot);

      // Act & Assert
      await expect(service.create(createBookingDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.booking.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if time slot does not exist', async () => {
      // Arrange
      mockPrismaService.timeSlot.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(createBookingDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaService.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const bookingId = 'booking-id-1';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2); // 48 hours in the future

    it('should allow a user to cancel their own booking', async () => {
      // Arrange
      const mockBooking = {
        id: bookingId,
        userId: mockUser.id,
        timeSlotId: 'time-slot-id-1',
        status: AppointmentStatus.CONFIRMED,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeSlot: {
          id: 'time-slot-id-1',
          startTime: futureDate,
          endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
          duration: 60,
          providerId: 'provider-id-1',
          provider: {
            id: 'provider-id-1',
            userId: 'provider-id-1',
          },
        },
      };

      const updateBookingDto = {
        status: AppointmentStatus.CANCELLED,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        status: AppointmentStatus.CANCELLED,
      });

      // Act
      const result = await service.update(bookingId, updateBookingDto, mockUser);

      // Assert
      expect(mockPrismaService.booking.findUnique).toHaveBeenCalledWith({
        where: { id: bookingId },
        include: {
          timeSlot: {
            include: {
              provider: true,
            },
          },
        },
      });
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: updateBookingDto,
        include: expect.any(Object),
      });
      expect(result.status).toBe(AppointmentStatus.CANCELLED);
    });

    it('should prevent a provider from canceling a booking less than 24 hours in advance', async () => {
      // Arrange
      const soonDate = new Date();
      soonDate.setHours(soonDate.getHours() + 12); // 12 hours in the future (less than 24)

      const mockBooking = {
        id: bookingId,
        userId: 'client-id-1',
        timeSlotId: 'time-slot-id-1',
        status: AppointmentStatus.CONFIRMED,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeSlot: {
          id: 'time-slot-id-1',
          startTime: soonDate,
          endTime: new Date(soonDate.getTime() + 60 * 60 * 1000),
          duration: 60,
          providerId: 'provider-id-1',
          provider: {
            id: 'provider-id-1',
            userId: mockProviderUser.id,
          },
        },
      };

      const updateBookingDto = {
        status: AppointmentStatus.CANCELLED,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      // Act & Assert
      await expect(service.update(bookingId, updateBookingDto, mockProviderUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.booking.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not the owner or provider', async () => {
      // Arrange
      const mockBooking = {
        id: bookingId,
        userId: 'other-user-id',
        timeSlotId: 'time-slot-id-1',
        status: AppointmentStatus.CONFIRMED,
        reminderSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeSlot: {
          id: 'time-slot-id-1',
          startTime: futureDate,
          endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
          duration: 60,
          providerId: 'provider-id-1',
          provider: {
            id: 'provider-id-1',
            userId: 'other-provider-id',
          },
        },
      };

      const updateBookingDto = {
        status: AppointmentStatus.CANCELLED,
      };

      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      // Act & Assert
      await expect(service.update(bookingId, updateBookingDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.booking.update).not.toHaveBeenCalled();
    });
  });

  describe('updateExpiredAppointments', () => {
    it('should update expired appointments to COMPLETED status', async () => {
      // Arrange
      const mockExpiredBookings = [
        { id: 'booking-1' },
        { id: 'booking-2' },
      ];

      mockPrismaService.booking.findMany.mockResolvedValue(mockExpiredBookings);
      mockPrismaService.booking.update.mockResolvedValue({ status: AppointmentStatus.COMPLETED });

      // Act
      const result = await service.updateExpiredAppointments();

      // Assert
      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING],
          },
          timeSlot: {
            endTime: {
              lt: expect.any(Date),
            },
          },
        },
      });
      expect(mockPrismaService.booking.update).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ updatedCount: 2 });
    });
  });

  describe('findUpcomingAppointmentsForReminders', () => {
    it('should find appointments within 30 minutes that need reminders', async () => {
      // Arrange
      const mockUpcomingBookings = [
        {
          id: 'booking-1',
          user: mockUser,
          timeSlot: {
            startTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
            provider: {
              user: mockProviderUser,
            },
          },
        },
      ];

      mockPrismaService.booking.findMany.mockResolvedValue(mockUpcomingBookings);

      // Act
      const result = await service.findUpcomingAppointmentsForReminders();

      // Assert
      expect(mockPrismaService.booking.findMany).toHaveBeenCalledWith({
        where: {
          reminderSent: false,
          status: AppointmentStatus.CONFIRMED,
          timeSlot: {
            startTime: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockUpcomingBookings);
    });
  });

  describe('markReminderSent', () => {
    it('should update a booking to mark reminder as sent', async () => {
      // Arrange
      const bookingId = 'booking-id-1';
      mockPrismaService.booking.update.mockResolvedValue({
        id: bookingId,
        reminderSent: true,
      });

      // Act
      const result = await service.markReminderSent(bookingId);

      // Assert
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: { reminderSent: true },
      });
      expect(result.reminderSent).toBe(true);
    });
  });
}); 