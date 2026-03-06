import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ApiEndpoint } from './api-endpoint.entity';

@Entity('api_request_params')
export class ApiRequestParam extends BaseEntity {
  @Column({ name: 'endpoint_id', type: 'uuid', nullable: false })
  endpointId!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: false })
  type!: string;

  @Column({ type: 'boolean', nullable: false })
  required!: boolean;

  @Column({ type: 'varchar', nullable: false })
  description!: string;

  @ManyToOne(() => ApiEndpoint, (endpoint) => endpoint.apiRequestParams)
  @JoinColumn({ name: 'endpoint_id' })
  apiEndpoint!: ApiEndpoint;
}
