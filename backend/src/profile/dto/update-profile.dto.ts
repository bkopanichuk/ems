import { IsString, IsOptional, Length } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsOptional()
  @Length(1, 100)
  displayName?: string;
}
