import { AppDataSource } from '../config/database.config';
import { BaseService } from './base.service';
import { AppError } from '../utils/app-error';

// Lazy entity imports to avoid circular dependency issues at module load time
let ModelEntity: any;
let FeaturedSlideEntity: any;

function getRepos() {
  if (!ModelEntity) {
    ModelEntity = require('../entities/model.entity').Model;
    FeaturedSlideEntity = require('../entities/featured-slide.entity').FeaturedSlide;
  }
  return {
    modelRepo: AppDataSource.getRepository(ModelEntity),
    featuredSlideRepo: AppDataSource.getRepository(FeaturedSlideEntity),
  };
}

export class ModelService extends BaseService<any> {
  constructor() {
    // Repository is resolved lazily via getRepos(); pass a proxy-safe getter.
    // We override all access to repo via getRepos() in each method.
    super(new Proxy({} as any, {
      get: (_t, prop) => {
        const { modelRepo } = getRepos();
        const val = (modelRepo as any)[prop];
        return typeof val === 'function' ? val.bind(modelRepo) : val;
      },
    }));
  }

  protected get entityName(): string {
    return 'Model';
  }

  /**
   * Find model by slug with full relations (playgroundFields, options, pricingTiers).
   */
  async findBySlug(slug: string) {
    const { modelRepo } = getRepos();
    const model = await modelRepo.findOne({
      where: { slug },
      relations: {
        modelPlaygroundFields: {
          modelFieldOptions: true,
        },
        modelPricingTiers: true,
      },
    });
    if (!model) throw AppError.notFound('Model not found');
    return model;
  }

  /**
   * Full-text search on name/description/provider with optional category, tags, and provider filters.
   */
  async search(
    query?: string,
    category?: string,
    tags?: string[],
    provider?: string,
    page = 1,
    limit = 20,
  ): Promise<[any[], number]> {
    const { modelRepo } = getRepos();
    const skip = (page - 1) * limit;

    const qb = modelRepo
      .createQueryBuilder('model')
      .where('model.is_active = :active', { active: true });

    if (query) {
      qb.andWhere(
        '(model.name ILIKE :q OR model.description ILIKE :q OR model.provider ILIKE :q)',
        { q: `%${query}%` },
      );
    }

    if (category) {
      qb.andWhere('model.category = :category', { category });
    }

    if (provider) {
      qb.andWhere('model.provider ILIKE :provider', { provider: `%${provider}%` });
    }

    if (tags && tags.length > 0) {
      // tags stored as simple-json string — check substring match for each tag
      const tagConditions = tags.map((_, i) => `model.tags LIKE :tag${i}`).join(' OR ');
      const tagParams = Object.fromEntries(tags.map((tag, i) => [`tag${i}`, `%${tag}%`]));
      qb.andWhere(`(${tagConditions})`, tagParams);
    }

    qb.orderBy('model.created_at', 'DESC').skip(skip).take(limit);

    return qb.getManyAndCount();
  }

  /**
   * Return active featured slides ordered by sortOrder.
   */
  async getFeaturedSlides() {
    const { featuredSlideRepo } = getRepos();
    return featuredSlideRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * Return pricing tiers for a model identified by slug.
   */
  async getPricingBySlug(slug: string) {
    const { modelRepo } = getRepos();
    const model = await modelRepo.findOne({
      where: { slug },
      relations: { modelPricingTiers: true },
    });
    if (!model) throw AppError.notFound('Model not found');
    return model.modelPricingTiers;
  }
}

export const modelService = new ModelService();
