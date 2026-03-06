import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { HttpMethod } from '../enums';
import { ApiRequestParam } from './api-request-param.entity';

@Entity('api_endpoints')
export class ApiEndpoint extends BaseEntity {
  @Column({ type: 'varchar', enum: HttpMethod, nullable: false })
  method!: HttpMethod;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: false })
  path!: string;

  @Column({ type: 'varchar', nullable: false })
  description!: string;

  @OneToMany(() => ApiRequestParam, (param) => param.apiEndpoint)
  apiRequestParams!: ApiRequestParam[];
}
