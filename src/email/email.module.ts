import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { BullModule } from '@nestjs/bull';
import { EmailProcessor } from './email.processor';
import { BookingsModule } from '../bookings/bookings.module';
import { BookingsService } from '../bookings/bookings.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
    BookingsModule,
  ],
  providers: [
    EmailService, 
    EmailProcessor,
    {
      provide: 'BOOKINGS_SERVICE',
      useExisting: BookingsService,
    }
  ],
  exports: [EmailService],
})
export class EmailModule {} 