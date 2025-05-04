import { IsDate, IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimeSlotDto {
  @ApiProperty({
    example: '2024-05-10T10:00:00.000Z',
    description: 'Start time of the appointment slot',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  startTime: Date;

  @ApiProperty({
    example: '2024-05-10T10:30:00.000Z',
    description: 'End time of the appointment slot',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  endTime: Date;

  @ApiProperty({
    example: 30,
    description: 'Duration of the appointment in minutes (minimum 15 minutes)',
    minimum: 15,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(15)
  duration: number; // in minutes
} 