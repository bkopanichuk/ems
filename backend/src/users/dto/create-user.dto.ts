import { IsString, IsNotEmpty, IsEnum, IsOptional, MinLength, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Login must contain only letters, numbers, underscores, and hyphens',
  })
  login: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Length(6, 100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  @Length(1, 100)
  displayName?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}