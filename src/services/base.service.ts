import {
  Repository,
  FindOptionsWhere,
  FindOptionsOrder,
  FindOptionsRelations,
  DeepPartial,
  ObjectLiteral,
} from 'typeorm';
import { AppError } from '../utils/app-error';

/**
 * Generic base service providing reusable CRUD operations.
 * All domain services should extend this for DRY code.
 */
export abstract class BaseService<T extends ObjectLiteral> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAll(options?: {
    where?: FindOptionsWhere<T>;
    order?: FindOptionsOrder<T>;
    relations?: FindOptionsRelations<T>;
    skip?: number;
    take?: number;
  }): Promise<[T[], number]> {
    return this.repository.findAndCount({
      where: options?.where,
      order: options?.order,
      relations: options?.relations,
      skip: options?.skip,
      take: options?.take,
    });
  }

  async findById(id: string, relations?: FindOptionsRelations<T>): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id } as any,
      relations,
    });
    if (!entity) throw AppError.notFound(`${this.entityName} not found`);
    return entity;
  }

  async findOne(where: FindOptionsWhere<T>, relations?: FindOptionsRelations<T>): Promise<T | null> {
    return this.repository.findOne({ where, relations });
  }

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    const entity = await this.findById(id);
    Object.assign(entity, data);
    return this.repository.save(entity);
  }

  async delete(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.repository.remove(entity);
  }

  /**
   * Verify entity belongs to user — prevents IDOR.
   */
  async findByIdAndOwner(id: string, userId: string, ownerField = 'userId'): Promise<T> {
    const entity = await this.repository.findOne({
      where: { id, [ownerField]: userId } as any,
    });
    if (!entity) throw AppError.notFound(`${this.entityName} not found`);
    return entity;
  }

  /** Override in subclass for better error messages */
  protected get entityName(): string {
    return 'Resource';
  }
}
