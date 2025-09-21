import { IsString, IsNotEmpty, MinLength, Length, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Length(6, 100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword: string;
}