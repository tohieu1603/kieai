import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('credit_packages')
export class CreditPackage extends BaseEntity {
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  price!: number;

  @Column({ type: 'int', nullable: false })
  credits!: number;

  @Column({ type: 'varchar', nullable: true })
  badge!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
