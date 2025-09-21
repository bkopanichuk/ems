import { IsString, IsOptional, IsBoolean, IsEnum, MinLength, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  @Length(1, 100)
  displayName?: string;

  @IsString()
  @IsOptional()
  @MinLength(6)
  @Length(6, 100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;
}