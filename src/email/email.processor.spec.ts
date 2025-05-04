import { Test, TestingModule } from '@nestjs/testing';
import { EmailProcessor } from './email.processor';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailProcessor', () => {
  let processor: EmailProcessor;
  let mockTransporter: any;
  let mockBookingsService: any;

  beforeEach(async () => {
    // Create mock for the nodemailer transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'mock-message-id',
      }),
    };

    // Mock createTransport to return our mock transporter
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Mock bookings service
    mockBookingsService = {
      markReminderSent: jest.fn().mockResolvedValue({ id: 'booking-id-1', reminderSent: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
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
          provide: 'BOOKINGS_SERVICE',
          useValue: mockBookingsService,
        },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
    
    // Override logger to avoid console noise during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendEmail', () => {
    it('should send an email successfully', async () => {
      // Arrange
      const mockJob = {
        id: 'job-1',
        data: {
          to: 'user@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        },
      };

      // Act
      const result = await processor.sendEmail(mockJob as any);

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@example.com',
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test content</p>',
      });
      // Verify bookingsService.markReminderSent was not called (no bookingId)
      expect(mockBookingsService.markReminderSent).not.toHaveBeenCalled();
    });

    it('should mark reminder as sent if bookingId is provided', async () => {
      // Arrange
      const mockJob = {
        id: 'job-1',
        data: {
          to: 'user@example.com',
          subject: 'Appointment Reminder',
          html: '<p>Reminder content</p>',
          bookingId: 'booking-id-1',
        },
      };

      // Act
      const result = await processor.sendEmail(mockJob as any);

      // Assert
      expect(result).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalled();
      expect(mockBookingsService.markReminderSent).toHaveBeenCalledWith('booking-id-1');
    });

    it('should throw an error if sending email fails', async () => {
      // Arrange
      mockTransporter.sendMail.mockRejectedValueOnce(new Error('SMTP error'));
      
      const mockJob = {
        id: 'job-1',
        data: {
          to: 'user@example.com',
          subject: 'Test Email',
          html: '<p>Test content</p>',
        },
      };

      // Act & Assert
      await expect(processor.sendEmail(mockJob as any)).rejects.toThrow('SMTP error');
      expect(mockBookingsService.markReminderSent).not.toHaveBeenCalled();
    });
  });
}); 