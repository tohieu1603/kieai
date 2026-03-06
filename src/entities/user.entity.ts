import {
  Entity,
  Column,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { IsEmail, IsString, Length } from 'class-validator';
import { BaseEntity } from './base.entity';
import { UserRole, AuthProvider } from '../enums';

@Entity('users')
export class User extends BaseEntity {
  @IsString()
  @Length(1, 100)
  @Column({ name: 'name', nullable: false })
  name!: string;

  @IsEmail()
  @Column({ name: 'email', unique: true, nullable: false })
  email!: string;

  @IsString()
  @Length(1, 10)
  @Column({ name: 'initials', nullable: false })
  initials!: string;

  @Column({ name: 'avatar_url', nullable: true, type: 'text' })
  avatarUrl!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', nullable: true })
  passwordHash!: string | null;

  // OAuth fields
  @Column({ name: 'auth_provider', type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider!: AuthProvider;

  @Column({ name: 'oauth_id', type: 'varchar', nullable: true, unique: false })
  oauthId!: string | null;

  // Password reset
  @Column({ name: 'password_reset_token', type: 'varchar', nullable: true })
  passwordResetToken!: string | null;

  @Column({ name: 'password_reset_expires', type: 'timestamptz', nullable: true })
  passwordResetExpires!: Date | null;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean;

  @Column({ name: 'email_verify_token', type: 'varchar', nullable: true })
  emailVerifyToken!: string | null;

  @Column({ name: 'role', type: 'enum', enum: UserRole, default: UserRole.DEVELOPER })
  role!: UserRole;

  // Relations
  @OneToMany('TeamMember', 'teamOwner')
  teamMembers!: any[];

  @OneToMany('TeamMember', 'user')
  teamMemberships!: any[];

  @OneToOne('UserSettings', 'user')
  userSettings!: any;

  @OneToMany('ApiKey', 'user')
  apiKeys!: any[];

  @OneToMany('Transaction', 'user')
  transactions!: any[];

  @OneToOne('UserCredit', 'user')
  userCredits!: any;

  @OneToMany('Log', 'user')
  logs!: any[];

  @OneToMany('WebhookKey', 'user')
  webhookKeys!: any[];
}
