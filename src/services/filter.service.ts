import { AppDataSource } from '../config/database.config';

// Lazy entity imports
let FilterCategoryEntity: any;
let ProviderEntity: any;

function getRepos() {
  if (!FilterCategoryEntity) {
    FilterCategoryEntity = require('../entities/filter-category.entity').FilterCategory;
    ProviderEntity = require('../entities/provider.entity').Provider;
  }
  return {
    filterCategoryRepo: AppDataSource.getRepository(FilterCategoryEntity),
    providerRepo: AppDataSource.getRepository(ProviderEntity),
  };
}

export class FilterService {
  /**
   * Return all filter categories with their options, ordered by sortOrder.
   */
  async getFilterCategories() {
    const { filterCategoryRepo } = getRepos();
    return filterCategoryRepo.find({
      relations: { filterOptions: true },
      order: {
        sortOrder: 'ASC',
        filterOptions: { sortOrder: 'ASC' },
      },
    });
  }

  /**
   * Return all providers ordered by sortOrder.
   */
  async getProviders() {
    const { providerRepo } = getRepos();
    return providerRepo.find({
      order: { sortOrder: 'ASC' },
    });
  }
}

export const filterService = new FilterService();
