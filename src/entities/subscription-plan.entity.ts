import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('subscription_plans')
export class SubscriptionPlan extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'monthly_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  monthlyPrice!: number;

  @Column({ name: 'yearly_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  yearlyPrice!: number;

  @Column({ name: 'monthly_credits', type: 'int', nullable: false })
  monthlyCredits!: number;

  @Column({ type: 'simple-json', nullable: false })
  features!: string[];

  @Column({ name: 'is_popular', type: 'boolean', default: false })
  isPopular!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', nullable: false, default: 0 })
  sortOrder!: number;
}
