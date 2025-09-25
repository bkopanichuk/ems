import {
  IsString,
  IsNumber,
  IsUrl,
  IsOptional,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInverterDto {
  @ApiProperty({
    description: 'Название инвертора',
    example: 'Солнечный инвертор #1',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ description: 'Мощность зарядки (кВт)', example: 5000 })
  @IsNumber()
  @Min(0)
  chargeCapacity: number;

  @ApiProperty({ description: 'Мощность разрядки (кВт)', example: 4500 })
  @IsNumber()
  @Min(0)
  dischargeCapacity: number;

  @ApiProperty({ description: 'Объем аккумулятора (кВт·ч)', example: 10000 })
  @IsNumber()
  @Min(0)
  batteryCapacity: number;

  @ApiPropertyOptional({
    description: 'Веб адрес для управления',
    example: 'http://192.168.1.100',
  })
  @IsOptional()
  @IsUrl()
  webUrl?: string;
}
