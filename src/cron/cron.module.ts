import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppointmentsCronService } from './appointments.cron.service';
import { BookingsModule } from '../bookings/bookings.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BookingsModule,
    EmailModule,
  ],
  providers: [AppointmentsCronService],
})
export class CronModule {} 