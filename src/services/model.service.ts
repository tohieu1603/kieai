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

  // ── Admin CRUD for pricing tiers ──

  /** Create a pricing tier for a model */
  async createPricingTier(modelId: string, data: any) {
    const { modelRepo } = getRepos();
    const model = await modelRepo.findOne({ where: { id: modelId } });
    if (!model) throw AppError.notFound('Model not found');

    const ModelPricingTierEntity = require('../entities/model-pricing-tier.entity').ModelPricingTier;
    const tierRepo = AppDataSource.getRepository(ModelPricingTierEntity);
    const tier = tierRepo.create({ ...data, modelId });
    return tierRepo.save(tier);
  }

  /** Update a pricing tier */
  async updatePricingTier(tierId: string, data: any) {
    const ModelPricingTierEntity = require('../entities/model-pricing-tier.entity').ModelPricingTier;
    const tierRepo = AppDataSource.getRepository(ModelPricingTierEntity);
    const tier = await tierRepo.findOne({ where: { id: tierId } });
    if (!tier) throw AppError.notFound('Pricing tier not found');
    Object.assign(tier, data);
    return tierRepo.save(tier);
  }

  /** Delete a pricing tier */
  async deletePricingTier(tierId: string) {
    const ModelPricingTierEntity = require('../entities/model-pricing-tier.entity').ModelPricingTier;
    const tierRepo = AppDataSource.getRepository(ModelPricingTierEntity);
    const tier = await tierRepo.findOne({ where: { id: tierId } });
    if (!tier) throw AppError.notFound('Pricing tier not found');
    await tierRepo.remove(tier);
  }

  /**
   * Return all pricing tiers grouped by model, with category filter, search, and pagination.
   * Matches kie.ai/pricing layout: models grouped with their pricing rows.
   */
  async getPricingList(
    category?: string,
    q?: string,
    page = 1,
    limit = 25,
  ) {
    const { modelRepo } = getRepos();
    const ModelPricingTierEntity = require('../entities/model-pricing-tier.entity').ModelPricingTier;
    const tierRepo = AppDataSource.getRepository(ModelPricingTierEntity);

    // Get category counts (unfiltered by category for tab badges)
    const countQb = tierRepo
      .createQueryBuilder('tier')
      .innerJoin('tier.model', 'model')
      .select('tier.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('model.is_active = :active', { active: true });

    if (q) {
      countQb.andWhere(
        '(model.name ILIKE :q OR tier.name ILIKE :q OR tier.provider ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    const categoryCounts = await countQb.groupBy('tier.category').getRawMany();

    // Build counts map
    const counts: Record<string, number> = { all: 0, chat: 0, video: 0, image: 0, music: 0 };
    for (const row of categoryCounts) {
      counts[row.category] = parseInt(row.count, 10);
      counts.all += parseInt(row.count, 10);
    }

    // Paginate: we paginate by distinct model, not by tier row
    // First get paginated model IDs
    const modelQb = modelRepo
      .createQueryBuilder('model')
      .select('model.id', 'id')
      .innerJoin('model.modelPricingTiers', 'tier')
      .where('model.is_active = :active', { active: true });

    if (category) {
      modelQb.andWhere('tier.category = :category', { category: category.toLowerCase() });
    }

    if (q) {
      modelQb.andWhere(
        '(model.name ILIKE :q OR tier.name ILIKE :q OR tier.provider ILIKE :q)',
        { q: `%${q}%` },
      );
    }

    const totalModels = await modelQb.groupBy('model.id').getCount();

    const modelIds = await modelQb
      .groupBy('model.id')
      .addOrderBy('model.name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    if (modelIds.length === 0) {
      return {
        models: [],
        counts,
        pagination: { total: totalModels, page, limit, totalPages: Math.ceil(totalModels / limit) },
      };
    }

    // Fetch full model data with their tiers for paginated model IDs
    const ids = modelIds.map((r: any) => r.id);
    const modelsQb = modelRepo
      .createQueryBuilder('model')
      .leftJoinAndSelect('model.modelPricingTiers', 'tier')
      .whereInIds(ids)
      .orderBy('model.name', 'ASC')
      .addOrderBy('tier.name', 'ASC');

    if (category) {
      modelsQb.andWhere('tier.category = :category', { category: category.toLowerCase() });
    }

    const models = await modelsQb.getMany();

    // Transform to grouped format
    const grouped = models.map((model: any) => ({
      id: model.id,
      name: model.name,
      slug: model.slug,
      category: model.category,
      priceCount: model.modelPricingTiers?.length || 0,
      prices: (model.modelPricingTiers || []).map((tier: any) => ({
        id: tier.id,
        name: tier.name,
        category: tier.category,
        provider: tier.provider,
        credits: Number(tier.credits),
        creditUnit: tier.creditUnit,
        ourPrice: Number(tier.ourPrice),
        marketPrice: tier.marketPrice ? Number(tier.marketPrice) : null,
        discount: tier.marketPrice && Number(tier.marketPrice) > 0
          ? Math.round((1 - Number(tier.ourPrice) / Number(tier.marketPrice)) * 100)
          : null,
      })),
    }));

    return {
      models: grouped,
      counts,
      pagination: { total: totalModels, page, limit, totalPages: Math.ceil(totalModels / limit) },
    };
  }
}

export const modelService = new ModelService();
