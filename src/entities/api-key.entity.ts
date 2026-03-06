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

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
