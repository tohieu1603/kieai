import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ModelCategory } from '../enums';
import { ModelPlaygroundField } from './model-playground-field.entity';
import { ModelPricingTier } from './model-pricing-tier.entity';

@Entity('models')
export class Model extends BaseEntity {
  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  slug!: string;

  @Column({ type: 'varchar', nullable: false })
  provider!: string;

  @Column({ type: 'text', nullable: false })
  description!: string;

  @Column({ type: 'enum', enum: ModelCategory, nullable: false })
  category!: ModelCategory;

  @Column('simple-json', { nullable: false })
  tags!: string[];

  @Column('simple-json', { name: 'task_tags', nullable: false })
  taskTags!: string[];

  @Column({ type: 'varchar', name: 'pricing_display', nullable: false })
  pricingDisplay!: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  image!: string | null;

  @Column({ type: 'varchar', nullable: false })
  gradient!: string;

  @Column({ type: 'boolean', name: 'is_new', default: false })
  isNew!: boolean;

  @Column({ type: 'boolean', name: 'is_popular', default: false })
  isPopular!: boolean;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @OneToMany(() => ModelPlaygroundField, (field) => field.model)
  modelPlaygroundFields!: ModelPlaygroundField[];

  @OneToMany(() => ModelPricingTier, (tier) => tier.model)
  modelPricingTiers!: ModelPricingTier[];
}
