import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('providers')
export class Provider extends BaseEntity {
  @Column({ type: 'varchar', unique: true, nullable: false })
  name!: string;

  @Column({ name: 'sort_order', type: 'int', nullable: false })
  sortOrder!: number;
}
