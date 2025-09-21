import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message:
      'Login must contain only letters, numbers, underscores, and hyphens',
  })
  login: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 100)
  password: string;
}
