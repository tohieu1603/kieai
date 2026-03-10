import { IsString, IsInt, IsArray, IsIP, Min, MinLength, MaxLength, ArrayMaxSize } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class RenameApiKeyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;
}

export class UpdateLimitsDto {
  @IsInt()
  @Min(0)
  hourlyLimit!: number;

  @IsInt()
  @Min(0)
  dailyLimit!: number;

  @IsInt()
  @Min(0)
  totalLimit!: number;
}

export class UpdateWhitelistDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsIP(undefined, { each: true })
  ips!: string[];
}
