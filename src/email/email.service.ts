import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private configService: ConfigService,
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async sendAppointmentReminder(
    userEmail: string,
    userName: string,
    providerName: string,
    appointmentDate: Date,
    appointmentDuration: number,
    bookingId: string,
  ): Promise<boolean> {
    try {
      const html = `
        <h2>Appointment Reminder</h2>
        <p>Hello ${userName},</p>
        <p>This is a reminder that you have an appointment with ${providerName} today at ${this.formatTime(
          appointmentDate,
        )}.</p>
        <p>The appointment is scheduled for ${appointmentDuration} minutes.</p>
        <p>Thank you for using our service!</p>
      `;

      // Add email to queue instead of sending directly
      await this.emailQueue.add(
        'sendEmail',
        {
          to: userEmail,
          subject: 'Appointment Reminder',
          html,
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
      this.logger.log(`Appointment reminder queued for ${userEmail}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to queue reminder email: ${error.message}`);
      return false;
    }
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
} 