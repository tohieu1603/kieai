import { IsEnum, IsInt, IsNumber, IsString, Min } from 'class-validator';
import { BillingCycle } from '../enums';

export class PurchaseCreditsDto {
  @IsString()
  packageId!: string;
}

export class CreateSepayOrderDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsInt()
  @Min(1)
  credits!: number;
}

export class SubscribeDto {
  @IsString()
  planSlug!: string;

  @IsEnum(BillingCycle)
  billingCycle!: string;
}

export class ChangePlanDto {
  @IsString()
  newPlanSlug!: string;
}
