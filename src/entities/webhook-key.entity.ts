import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity('webhook_keys')
export class WebhookKey extends BaseEntity {
  @Column({ name: 'user_id', nullable: false })
  userId!: string;

  @Column({ name: 'hmac_key', nullable: false })
  hmacKey!: string;

  // Relations
  @ManyToOne(() => User, (user) => user.webhookKeys)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
