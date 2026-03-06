import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('api_update_tags')
export class ApiUpdateTag extends BaseEntity {
  @Column({ type: 'varchar', unique: true, nullable: false })
  name!: string;
}
