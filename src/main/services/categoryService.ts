import {
  Category,
  CreateCategoryInput,
  DeleteCategoryInput,
  RenameCategoryInput,
  ReorderCategoriesInput,
  SetCategoryActiveInput
} from '../../shared/types/domain';
import * as categoryRepository from '../repositories/categoryRepository';
import * as auditService from './auditService';
import { currentTimestamp } from '../utils/time';

const MAX_NAME_LENGTH = 50;

export function listCategories(): Category[] {
  return categoryRepository.listCategories();
}

export function createCategory(input: CreateCategoryInput): Category {
  const name = validateName(input.name);
  if (categoryRepository.categoryNameExists(name)) {
    throw new Error(`A category named "${name}" already exists.`);
  }

  const category = categoryRepository.insertCategory(
    name,
    categoryRepository.getNextSortOrder(),
    currentTimestamp()
  );
  auditService.log('category_create', 'category', category.id, { name });
  return category;
}

export function renameCategory(input: RenameCategoryInput): Category {
  const category = mustGet(input.id);
  const name = validateName(input.name);
  if (name === category.name) {
    return category;
  }
  if (categoryRepository.categoryNameExists(name, input.id)) {
    throw new Error(`A category named "${name}" already exists.`);
  }

  categoryRepository.updateCategoryName(input.id, name, currentTimestamp());
  auditService.log('category_rename', 'category', input.id, {
    from: category.name,
    to: name
  });
  return mustGet(input.id);
}

export function setCategoryActive(input: SetCategoryActiveInput): Category {
  const category = mustGet(input.id);
  if (category.isActive === input.isActive) {
    return category;
  }

  categoryRepository.updateCategoryActive(input.id, input.isActive, currentTimestamp());
  auditService.log('category_toggle', 'category', input.id, {
    name: category.name,
    isActive: input.isActive
  });
  return mustGet(input.id);
}

/**
 * Deleting a category is only allowed while no products reference it —
 * this keeps sale history and product records intact, and the database
 * FK (ON DELETE RESTRICT) backs it up as a last line of defence.
 */
export function deleteCategory(input: DeleteCategoryInput): void {
  const category = mustGet(input.id);
  const productCount = categoryRepository.countProductsInCategory(input.id);
  if (productCount > 0) {
    const noun = productCount === 1 ? 'product still uses' : 'products still use';
    throw new Error(
      `"${category.name}" cannot be deleted while ${productCount} ${noun} it. ` +
        'Move those products to another category first.'
    );
  }

  categoryRepository.deleteCategory(input.id);
  auditService.log('category_delete', 'category', input.id, { name: category.name });
}

export function reorderCategories(input: ReorderCategoriesInput): Category[] {
  const existing = categoryRepository.listCategories();
  const existingIds = new Set(existing.map((c) => c.id));
  const incomingIds = new Set(input.orderedIds);

  const isSameSet =
    existingIds.size === incomingIds.size &&
    [...existingIds].every((id) => incomingIds.has(id));
  if (!isSameSet) {
    throw new Error('Reorder request does not match the existing categories.');
  }

  const alreadyInOrder = existing.every((c, index) => c.id === input.orderedIds[index]);
  if (!alreadyInOrder) {
    categoryRepository.updateSortOrders(input.orderedIds, currentTimestamp());
    const namesById = new Map(existing.map((c) => [c.id, c.name]));
    auditService.log('category_reorder', 'category', null, {
      order: input.orderedIds.map((id) => namesById.get(id) ?? `#${id}`)
    });
  }

  return categoryRepository.listCategories();
}

function mustGet(id: number): Category {
  const category = categoryRepository.getCategoryById(id);
  if (!category) {
    throw new Error('Category not found.');
  }
  return category;
}

function validateName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Category name is required.');
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`Category name is too long (max ${MAX_NAME_LENGTH} characters).`);
  }
  return trimmed;
}
