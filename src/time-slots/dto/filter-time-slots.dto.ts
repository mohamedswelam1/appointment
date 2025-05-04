import { IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FilterTimeSlotsDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Filter by provider ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty({
    example: '2024-05-01T00:00:00.000Z',
    description: 'Filter time slots starting from this date',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiProperty({
    example: '2024-05-31T23:59:59.999Z',
    description: 'Filter time slots ending before this date',
    required: false,
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;
} 