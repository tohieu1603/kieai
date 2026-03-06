import {
  BaseEntity as TypeOrmBaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User as UserEntity } from './user.entity';

@Entity('user_credits')
export class UserCredit extends TypeOrmBaseEntity {
  @PrimaryColumn('uuid', { name: 'user_id' })
  userId!: string;

  @Column({ type: 'int', nullable: false, default: 0 })
  balance!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
