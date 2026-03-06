import { AppDataSource } from '../config/database.config';
import { ApiUpdate } from '../entities/api-update.entity';
import { ApiUpdateTag } from '../entities/api-update-tag.entity';

export class UpdateService {
  private get updateRepo() {
    return AppDataSource.getRepository(ApiUpdate);
  }

  private get tagRepo() {
    return AppDataSource.getRepository(ApiUpdateTag);
  }

  /**
   * List api_updates, optionally filtered by tag. Ordered by date DESC.
   */
  async getUpdates(
    tag?: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: ApiUpdate[]; total: number }> {
    const skip = (page - 1) * limit;

    const where = tag ? { tag } : undefined;

    const [data, total] = await this.updateRepo.findAndCount({
      where,
      order: { date: 'DESC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * List all api_update_tags ordered by name.
   */
  async getTags(): Promise<ApiUpdateTag[]> {
    return this.tagRepo.find({ order: { name: 'ASC' } });
  }
}

export const updateService = new UpdateService();
