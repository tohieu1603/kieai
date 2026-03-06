import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  BaseEntity as TypeOrmBaseEntity,
} from 'typeorm';
import { Theme } from '../enums';
import { User } from './user.entity';

@Entity('user_settings')
export class UserSettings extends TypeOrmBaseEntity {
  @PrimaryColumn({ name: 'user_id' })
  userId!: string;

  @Column({
    name: 'theme',
    type: 'enum',
    enum: Theme,
    default: Theme.LIGHT,
  })
  theme!: Theme;

  @Column({ name: 'email_notifications', default: true })
  emailNotifications!: boolean;

  // Relations
  @OneToOne(() => User, (user) => user.userSettings)
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
