import { IsEnum, IsBoolean, IsOptional, IsString, MaxLength, IsArray, IsInt, Min, ArrayMaxSize } from 'class-validator';
import { Theme } from '../enums';

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsInt({ each: true })
  @Min(1, { each: true })
  creditAlerts?: number[];
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
