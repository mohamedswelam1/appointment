import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BookingsService } from '../bookings/bookings.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class AppointmentsCronService {
  private readonly logger = new Logger(AppointmentsCronService.name);

  constructor(
    private bookingsService: BookingsService,
    private emailService: EmailService,
  ) {}

  // Run every minute to check for appointments that need reminders
  @Cron(CronExpression.EVERY_MINUTE)
  async sendAppointmentReminders() {
    this.logger.debug('Running appointment reminder cron job');

    try {
      // Get appointments that are 30 minutes from now
      const upcomingAppointments =
        await this.bookingsService.findUpcomingAppointmentsForReminders();

      for (const booking of upcomingAppointments) {
        // Send email reminder
        await this.emailService.sendAppointmentReminder(
          booking.user.email,
          `${booking.user.firstName} ${booking.user.lastName}`,
          `${booking.timeSlot.provider.user.firstName} ${booking.timeSlot.provider.user.lastName}`,
          booking.timeSlot.startTime,
          booking.timeSlot.duration,
          booking.id,
        );
      }

      if (upcomingAppointments.length > 0) {
        this.logger.log(
          `Queued ${upcomingAppointments.length} appointment reminders`,
        );
      }
    } catch (error) {
      this.logger.error(`Error queueing reminders: ${error.message}`);
    }
  }

  // Run every hour to check for expired appointments
  @Cron(CronExpression.EVERY_HOUR)
  async updateExpiredAppointments() {
    this.logger.debug('Running expired appointments update cron job');

    try {
      const result = await this.bookingsService.updateExpiredAppointments();
      if (result.updatedCount > 0) {
        this.logger.log(
          `Updated ${result.updatedCount} expired appointments to 'COMPLETED' status`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error updating expired appointments: ${error.message}`,
      );
    }
  }
}
