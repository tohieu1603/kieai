import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { FilterOption } from './filter-option.entity';

@Entity('filter_categories')
export class FilterCategory extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  label!: string;

  @Column({ name: 'sort_order', type: 'int', nullable: false })
  sortOrder!: number;

  @OneToMany(() => FilterOption, (option) => option.filterCategory)
  filterOptions!: FilterOption[];
}
