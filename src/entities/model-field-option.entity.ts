import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ModelPlaygroundField } from './model-playground-field.entity';

@Entity('model_field_options')
export class ModelFieldOption extends BaseEntity {
  @Column({ type: 'uuid', name: 'field_id', nullable: false })
  fieldId!: string;

  @Column({ type: 'varchar', nullable: false })
  label!: string;

  @Column({ type: 'varchar', nullable: false })
  value!: string;

  @Column({ type: 'int', name: 'sort_order', nullable: false })
  sortOrder!: number;

  @ManyToOne(() => ModelPlaygroundField, (field) => field.modelFieldOptions, { nullable: false })
  @JoinColumn({ name: 'field_id' })
  modelPlaygroundField!: ModelPlaygroundField;
}
