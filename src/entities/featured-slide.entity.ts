import { Column, Entity } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity('featured_slides')
export class FeaturedSlide extends BaseEntity {
  @Column({ type: 'varchar', name: 'model_name', nullable: false })
  modelName!: string;

  @Column({ type: 'text', nullable: false })
  description!: string;

  @Column('simple-json', { nullable: false })
  tags!: string[];

  @Column({ type: 'varchar', nullable: true, default: null })
  image!: string | null;

  @Column({ type: 'varchar', nullable: false })
  href!: string;

  @Column({ type: 'varchar', nullable: false })
  gradient!: string;

  @Column({ type: 'int', name: 'sort_order', nullable: false })
  sortOrder!: number;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;
}
