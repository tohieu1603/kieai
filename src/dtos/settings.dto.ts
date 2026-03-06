import { IsEnum, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Theme } from '../enums';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
