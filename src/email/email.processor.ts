import { Process, Processor } from '@nestjs/bull';
import { Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';

interface EmailReminderJob {
  to: string;
  subject: string;
  html: string;
  bookingId?: string;
}

@Processor('email')
export class EmailProcessor {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailProcessor.name);
  private bookingsService: any;

  constructor(
    private configService: ConfigService,
    @Inject('BOOKINGS_SERVICE') bookingsService?: any
  ) {
    this.bookingsService = bookingsService;
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<number>('MAIL_PORT') === 465,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  @Process('sendEmail')
  async sendEmail(job: Job<EmailReminderJob>) {
    this.logger.debug(`Processing email job ${job.id}`);
    const { to, subject, html, bookingId } = job.data;
    
    try {
      const mailOptions = {
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent to ${to}`);
      // If this is a reminder (has bookingId) and we have the bookingsService injected
      if (bookingId && this.bookingsService) {
        // Mark the reminder as sent only after successfully sending the email
        await this.bookingsService.markReminderSent(bookingId);
        this.logger.log(`Marked reminder as sent for booking ${bookingId}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      throw error;
    }
  }
} 