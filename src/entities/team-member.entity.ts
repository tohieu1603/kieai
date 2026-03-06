import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { TeamMemberStatus } from '../enums';
import { User } from './user.entity';

@Entity('team_members')
export class TeamMember extends BaseEntity {
  @Column({ name: 'user_id', nullable: false })
  userId!: string;

  @Column({ name: 'team_owner_id', nullable: false })
  teamOwnerId!: string;

  @Column({ name: 'role', nullable: false })
  role!: string;

  @Column({
    name: 'status',
    type: 'enum',
    enum: TeamMemberStatus,
    default: TeamMemberStatus.PENDING,
  })
  status!: TeamMemberStatus;

  @Column({ name: 'invited_at', type: 'timestamptz', nullable: false })
  invitedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.teamMemberships)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => User, (user) => user.teamMembers)
  @JoinColumn({ name: 'team_owner_id' })
  teamOwner!: User;
}
