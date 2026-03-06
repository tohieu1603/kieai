import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('api_updates')
export class ApiUpdate extends BaseEntity {
  @Column({ type: 'date', nullable: false })
  date!: string;

  @Column({ type: 'varchar', nullable: false })
  tag!: string;

  @Column({ type: 'varchar', nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: false })
  content!: string;
}
