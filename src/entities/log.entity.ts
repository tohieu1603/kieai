import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { LogStatus } from '../enums';
import { User } from './user.entity';
import { ApiKey } from './api-key.entity';

@Entity('logs')
export class Log extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  @Column({ name: 'api_key_id', type: 'uuid', nullable: true })
  apiKeyId!: string | null;

  @Column({ type: 'varchar', nullable: false })
  model!: string;

  @Column({ type: 'date', nullable: false })
  date!: string;

  @Column({ type: 'time', nullable: false })
  time!: string;

  @Column({ type: 'int', nullable: false })
  duration!: number;

  @Column({ type: 'text', nullable: false })
  input!: string;

  @Column({ type: 'varchar', enum: LogStatus, nullable: false })
  status!: LogStatus;

  @Column({ name: 'credits_consumed', type: 'int', nullable: false, default: 0 })
  creditsConsumed!: number;

  @Column({ name: 'task_id', type: 'varchar', nullable: false })
  taskId!: string;

  @Column({ name: 'has_result', type: 'boolean', nullable: false })
  hasResult!: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => ApiKey, { nullable: true })
  @JoinColumn({ name: 'api_key_id' })
  apiKey!: ApiKey | null;
}
