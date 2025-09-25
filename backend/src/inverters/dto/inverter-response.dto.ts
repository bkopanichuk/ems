import { ApiProperty } from '@nestjs/swagger';

export class InverterResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  chargeCapacity: number;

  @ApiProperty()
  dischargeCapacity: number;

  @ApiProperty()
  batteryCapacity: number;

  @ApiProperty({ required: false })
  webUrl?: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
