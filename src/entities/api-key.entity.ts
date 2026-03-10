import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('api_keys')
export class ApiKey extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ name: 'key_hash', type: 'varchar', nullable: false })
  keyHash!: string;

  @Column({ name: 'key_prefix', type: 'varchar', nullable: false })
  keyPrefix!: string;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked!: boolean;

  @Column({ name: 'hourly_limit', type: 'int', default: 0 })
  hourlyLimit!: number;

  @Column({ name: 'daily_limit', type: 'int', default: 0 })
  dailyLimit!: number;

  @Column({ name: 'total_limit', type: 'int', default: 0 })
  totalLimit!: number;

  @Column({ name: 'ip_whitelist', type: 'jsonb', default: [] })
  ipWhitelist!: string[];

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
