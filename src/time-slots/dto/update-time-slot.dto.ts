import { IsDate, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTimeSlotDto {
  @ApiProperty({
    example: '2024-05-10T11:00:00.000Z',
    description: 'Updated start time of the appointment slot',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @ApiProperty({
    example: '2024-05-10T11:30:00.000Z',
    description: 'Updated end time of the appointment slot',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endTime?: Date;

  @ApiProperty({
    example: 30,
    description: 'Updated duration of the appointment in minutes (minimum 15 minutes)',
    minimum: 15,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(15)
  duration?: number; // in minutes
} 