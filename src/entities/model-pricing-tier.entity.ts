import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { PricingCategory } from '../enums';
import { Model } from './model.entity';

@Entity('model_pricing_tiers')
export class ModelPricingTier extends BaseEntity {
  @Column({ type: 'uuid', name: 'model_id', nullable: false })
  modelId!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'enum', enum: PricingCategory, nullable: false })
  category!: PricingCategory;

  @Column({ type: 'varchar', nullable: false })
  provider!: string;

  @Column({ type: 'decimal', nullable: false })
  credits!: number;

  @Column({ type: 'varchar', name: 'credit_unit', nullable: false })
  creditUnit!: string;

  @Column({ type: 'decimal', name: 'our_price', precision: 10, scale: 4, nullable: false })
  ourPrice!: number;

  @Column({ type: 'decimal', name: 'market_price', precision: 10, scale: 4, nullable: true, default: null })
  marketPrice!: number | null;

  @ManyToOne(() => Model, (model) => model.modelPricingTiers, { nullable: false })
  @JoinColumn({ name: 'model_id' })
  model!: Model;
}
