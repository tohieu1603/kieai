import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { Transaction } from './transaction.entity';
import { Subscription } from './subscription.entity';
import { InvoiceStatus } from '../enums';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

@Entity('invoices')
export class Invoice extends BaseEntity {
  @Column({ name: 'invoice_number', type: 'varchar', unique: true, nullable: false })
  invoiceNumber!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId!: string | null;

  @Column({ name: 'subscription_id', type: 'uuid', nullable: true })
  subscriptionId!: string | null;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    nullable: false,
    default: InvoiceStatus.DRAFT,
  })
  status!: InvoiceStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  subtotal!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false, default: 0 })
  tax!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  total!: number;

  @Column({ type: 'varchar', nullable: false, default: 'USD' })
  currency!: string;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: Date | null;

  @Column({ type: 'simple-json', nullable: false })
  items!: InvoiceItem[];

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Transaction, { nullable: true })
  @JoinColumn({ name: 'transaction_id' })
  transaction!: Transaction | null;

  @ManyToOne(() => Subscription, { nullable: true })
  @JoinColumn({ name: 'subscription_id' })
  subscription!: Subscription | null;
}
