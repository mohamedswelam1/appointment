import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsCronService } from './appointments.cron.service';
import { BookingsService } from '../bookings/bookings.service';
import { EmailService } from '../email/email.service';
import { Logger } from '@nestjs/common';
import { AppointmentStatus, UserRole } from '@prisma/client';

describe('AppointmentsCronService', () => {
  let service: AppointmentsCronService;
  let bookingsService: BookingsService;
  let emailService: EmailService;

  beforeEach(async () => {
    // Create mocks for dependencies
    const mockBookingsService = {
      findUpcomingAppointmentsForReminders: jest.fn(),
      updateExpiredAppointments: jest.fn(),
    };

    const mockEmailService = {
      sendAppointmentReminder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsCronService,
        {
          provide: BookingsService,
          useValue: mockBookingsService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsCronService>(AppointmentsCronService);
    bookingsService = module.get<BookingsService>(BookingsService);
    emailService = module.get<EmailService>(EmailService);

    // Override logger to avoid console noise during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendAppointmentReminders', () => {
    it('should send reminders for upcoming appointments', async () => {
      // Arrange
      const mockStartTime = new Date();
      mockStartTime.setMinutes(mockStartTime.getMinutes() + 30); // 30 minutes from now
      
      const mockUpcomingAppointments = [
        {
          id: 'booking-1',
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-1',
          timeSlotId: 'timeslot-1',
          user: {
            id: 'user-1',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
            password: 'hashed-password',
            role: UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          timeSlot: {
            id: 'timeslot-1',
            startTime: mockStartTime,
            endTime: new Date(mockStartTime.getTime() + 60 * 60 * 1000),
            duration: 60,
            providerId: 'provider-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: {
              id: 'provider-1',
              userId: 'provider-user-1',
              createdAt: new Date(),
              updatedAt: new Date(),
              specialization: 'Finance',
              description: 'Financial advisor',
              user: {
                id: 'provider-user-1',
                email: 'provider@example.com',
                firstName: 'Dr',
                lastName: 'Smith',
                password: 'hashed-password',
                role: UserRole.PROVIDER,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          },
        },
        {
          id: 'booking-2',
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: 'user-2',
          timeSlotId: 'timeslot-2',
          user: {
            id: 'user-2',
            email: 'user2@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            password: 'hashed-password',
            role: UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          timeSlot: {
            id: 'timeslot-2',
            startTime: mockStartTime,
            endTime: new Date(mockStartTime.getTime() + 30 * 60 * 1000),
            duration: 30,
            providerId: 'provider-2',
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: {
              id: 'provider-2',
              userId: 'provider-user-2',
              createdAt: new Date(),
              updatedAt: new Date(),
              specialization: 'Tax',
              description: 'Tax consultant',
              user: {
                id: 'provider-user-2',
                email: 'provider2@example.com',
                firstName: 'Dr',
                lastName: 'Johnson',
                password: 'hashed-password',
                role: UserRole.PROVIDER,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          },
        },
      ];

      jest.spyOn(bookingsService, 'findUpcomingAppointmentsForReminders').mockResolvedValue(mockUpcomingAppointments);
      jest.spyOn(emailService, 'sendAppointmentReminder').mockResolvedValue(true);

      // Act
      await service.sendAppointmentReminders();

      // Assert
      expect(bookingsService.findUpcomingAppointmentsForReminders).toHaveBeenCalled();
      expect(emailService.sendAppointmentReminder).toHaveBeenCalledTimes(2);
      
      // Verify first reminder call
      expect(emailService.sendAppointmentReminder).toHaveBeenCalledWith(
        'user@example.com',
        'John Doe',
        'Dr Smith',
        mockStartTime,
        60,
        'booking-1',
      );
      
      // Verify second reminder call
      expect(emailService.sendAppointmentReminder).toHaveBeenCalledWith(
        'user2@example.com',
        'Jane Smith',
        'Dr Johnson',
        mockStartTime,
        30,
        'booking-2',
      );
    });

    it('should handle errors when sending reminders', async () => {
      // Arrange
      jest.spyOn(bookingsService, 'findUpcomingAppointmentsForReminders').mockRejectedValue(new Error('Database error'));
      
      // Act
      await service.sendAppointmentReminders();
      
      // Assert - should not throw and should log error
      expect(bookingsService.findUpcomingAppointmentsForReminders).toHaveBeenCalled();
      expect(emailService.sendAppointmentReminder).not.toHaveBeenCalled();
    });

    it('should not send reminders if no upcoming appointments', async () => {
      // Arrange
      jest.spyOn(bookingsService, 'findUpcomingAppointmentsForReminders').mockResolvedValue([]);
      
      // Act
      await service.sendAppointmentReminders();
      
      // Assert
      expect(bookingsService.findUpcomingAppointmentsForReminders).toHaveBeenCalled();
      expect(emailService.sendAppointmentReminder).not.toHaveBeenCalled();
    });
  });

  describe('updateExpiredAppointments', () => {
    it('should update expired appointments', async () => {
      // Arrange
      const mockResult = { updatedCount: 5 };
      jest.spyOn(bookingsService, 'updateExpiredAppointments').mockResolvedValue(mockResult);
      
      // Act
      await service.updateExpiredAppointments();
      
      // Assert
      expect(bookingsService.updateExpiredAppointments).toHaveBeenCalled();
    });

    it('should handle errors when updating expired appointments', async () => {
      // Arrange
      jest.spyOn(bookingsService, 'updateExpiredAppointments').mockRejectedValue(new Error('Database error'));
      
      // Act
      await service.updateExpiredAppointments();
      
      // Assert - should not throw
      expect(bookingsService.updateExpiredAppointments).toHaveBeenCalled();
    });
  });
}); 