import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SubscriptionPlan } from './subscription-plan.entity';
import { SubscriptionStatus, BillingCycle } from '../enums';

@Entity('subscriptions')
export class Subscription extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'plan_id', type: 'uuid', nullable: false })
  planId!: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    nullable: false,
    default: SubscriptionStatus.ACTIVE,
  })
  status!: SubscriptionStatus;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: BillingCycle,
    nullable: false,
  })
  billingCycle!: BillingCycle;

  @Column({ name: 'current_period_start', type: 'timestamptz', nullable: false })
  currentPeriodStart!: Date;

  @Column({ name: 'current_period_end', type: 'timestamptz', nullable: false })
  currentPeriodEnd!: Date;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: 'plan_id' })
  plan!: SubscriptionPlan;
}
