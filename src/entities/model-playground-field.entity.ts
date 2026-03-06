import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ModelCategory, PlaygroundFieldType } from '../enums';
import { Model } from './model.entity';
import { ModelFieldOption } from './model-field-option.entity';

@Entity('model_playground_fields')
export class ModelPlaygroundField extends BaseEntity {
  @Column({ type: 'varchar', name: 'model_slug', nullable: true, default: null })
  modelSlug!: string | null;

  @Column({ type: 'enum', enum: ModelCategory, nullable: true, default: null })
  category!: ModelCategory | null;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: false })
  label!: string;

  @Column({ type: 'enum', enum: PlaygroundFieldType, nullable: false })
  type!: PlaygroundFieldType;

  @Column({ type: 'varchar', nullable: true, default: null })
  description!: string | null;

  @Column({ type: 'boolean', default: false })
  required!: boolean;

  @Column({ type: 'varchar', nullable: true, default: null })
  placeholder!: string | null;

  @Column({ type: 'varchar', name: 'default_value', nullable: true, default: null })
  defaultValue!: string | null;

  @Column({ type: 'int', name: 'sort_order', nullable: false })
  sortOrder!: number;

  @ManyToOne(() => Model, (model) => model.modelPlaygroundFields, { nullable: true })
  @JoinColumn({ name: 'model_slug', referencedColumnName: 'slug' })
  model!: Model | null;

  @OneToMany(() => ModelFieldOption, (option) => option.modelPlaygroundField)
  modelFieldOptions!: ModelFieldOption[];
}
