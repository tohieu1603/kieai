import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { FilterCategory } from './filter-category.entity';

@Entity('filter_options')
export class FilterOption extends BaseEntity {
  @Column({ name: 'category_id', type: 'uuid', nullable: false })
  categoryId!: string;

  @Column({ type: 'varchar', nullable: false })
  label!: string;

  @Column({ name: 'sort_order', type: 'int', nullable: false })
  sortOrder!: number;

  @ManyToOne(() => FilterCategory, (category) => category.filterOptions)
  @JoinColumn({ name: 'category_id' })
  filterCategory!: FilterCategory;
}
