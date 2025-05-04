import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { getQueueToken } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

describe('EmailService', () => {
  let service: EmailService;
  let mockEmailQueue: any;

  beforeEach(async () => {
    // Mock implementation of the Bull Queue
    mockEmailQueue = {
      add: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              // Mock any config values needed for tests
              const config = {
                MAIL_HOST: 'smtp.example.com',
                MAIL_PORT: 587,
                MAIL_USER: 'test@example.com',
                MAIL_PASSWORD: 'password123',
                MAIL_FROM: 'noreply@example.com',
              };
              return config[key];
            }),
          },
        },
        {
          provide: getQueueToken('email'),
          useValue: mockEmailQueue,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    // Override logger to avoid console noise during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendAppointmentReminder', () => {
    it('should queue an email reminder successfully', async () => {
      // Arrange
      const userEmail = 'user@example.com';
      const userName = 'John Doe';
      const providerName = 'Dr. Smith';
      const appointmentDate = new Date('2023-12-01T10:00:00Z');
      const appointmentDuration = 60;
      const bookingId = 'booking-id-1';

      // Act
      const result = await service.sendAppointmentReminder(
        userEmail,
        userName,
        providerName,
        appointmentDate,
        appointmentDuration,
        bookingId,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'sendEmail',
        {
          to: userEmail,
          subject: 'Appointment Reminder',
          html: expect.stringContaining(userName),
          bookingId,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      );
      // Verify email content contains the required information
      const emailPayload = mockEmailQueue.add.mock.calls[0][1];
      expect(emailPayload.html).toContain(userName);
      expect(emailPayload.html).toContain(providerName);
      expect(emailPayload.html).toContain('60 minutes');
    });

    it('should return false if queueing fails', async () => {
      // Arrange
      mockEmailQueue.add.mockRejectedValueOnce(new Error('Queue error'));
      
      const userEmail = 'user@example.com';
      const userName = 'John Doe';
      const providerName = 'Dr. Smith';
      const appointmentDate = new Date('2023-12-01T10:00:00Z');
      const appointmentDuration = 60;
      const bookingId = 'booking-id-1';

      // Act
      const result = await service.sendAppointmentReminder(
        userEmail,
        userName,
        providerName,
        appointmentDate,
        appointmentDuration,
        bookingId,
      );

      // Assert
      expect(result).toBe(false);
      expect(mockEmailQueue.add).toHaveBeenCalled();
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      // Access the private method using any type
      const formatTime = (service as any).formatTime.bind(service);
      
      // Test with a specific time
      const date = new Date('2023-12-01T14:30:00Z');
      const formattedTime = formatTime(date);
      
      // The exact format depends on the locale, but we can check for the presence of hour and minute
      expect(formattedTime).toMatch(/\d{1,2}:\d{2}/);
    });
  });
}); 