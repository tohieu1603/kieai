import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { CreditPackage } from './credit-package.entity';
import { Subscription } from './subscription.entity';
import { TransactionType, TransactionStatus } from '../enums';

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'package_id', type: 'uuid', nullable: true })
  packageId!: string | null;

  @Column({ type: 'int', nullable: false })
  credits!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
    nullable: false,
    default: TransactionType.CREDIT_PURCHASE,
  })
  type!: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    nullable: false,
    default: TransactionStatus.COMPLETED,
  })
  status!: TransactionStatus;

  @Column({ name: 'sepay_ref', type: 'varchar', nullable: true })
  sepayRef!: string | null;

  @Column({ type: 'varchar', nullable: true })
  description!: string | null;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => CreditPackage)
  @JoinColumn({ name: 'package_id' })
  creditPackage!: CreditPackage;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription | null;
}
