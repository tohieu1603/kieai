import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

/**
 * Persisted refresh token with token-family rotation.
 *
 * One "family" = one login session. Each rotation keeps the same family
 * but creates a new row and revokes the previous one.
 * If a revoked token is replayed → theft detected → entire family is purged.
 */
@Entity('refresh_tokens')
@Index('idx_refresh_tokens_family', ['family'])
@Index('idx_refresh_tokens_user_id', ['userId'])
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** SHA-256 hash of the JWT — never store the raw token */
  @Column({ name: 'token_hash', type: 'varchar', unique: true })
  tokenHash!: string;

  /** Token family groups all rotations of a single login session */
  @Column({ type: 'varchar' })
  family!: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked!: boolean;

  /** Why the token was revoked — useful for audit trails */
  @Column({ name: 'revoke_reason', type: 'varchar', nullable: true })
  revokeReason!: string | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  /** Client metadata for session management UI */
  @Column({ name: 'user_agent', type: 'varchar', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', nullable: true })
  ipAddress!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}
