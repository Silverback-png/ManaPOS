import {
  CreateProductInput,
  Product,
  ProductFilter,
  SetProductActiveInput,
  UpdateProductInput
} from '../../shared/types/domain';
import * as categoryRepository from '../repositories/categoryRepository';
import * as productRepository from '../repositories/productRepository';
import { ProductWriteData } from '../repositories/productRepository';
import * as auditService from './auditService';
import { currentTimestamp } from '../utils/time';

const MAX_NAME_LENGTH = 100;
const MAX_BARCODE_LENGTH = 50;
/** Sanity ceiling: R100,000.00 — catches decimal-slip data entry errors. */
const MAX_PRICE_CENTS = 10_000_000;

export function listProducts(filter: ProductFilter): Product[] {
  return productRepository.listProducts({
    search: filter.search?.trim() || undefined,
    categoryId: filter.categoryId,
    includeInactive: filter.includeInactive === true
  });
}

export function createProduct(input: CreateProductInput): Product {
  const data = validateAndNormalize(input);
  const product = productRepository.insertProduct(data, currentTimestamp());

  auditService.log('product_create', 'product', product.id, {
    name: product.name,
    categoryId: product.categoryId,
    costPriceCents: product.costPriceCents,
    sellingPriceCents: product.sellingPriceCents
  });

  return product;
}

/**
 * Editing a product writes two distinct audit trails:
 *  - 'price_change'  → the price history the business depends on
 *  - 'product_edit'  → everything else (name, category, barcode)
 * Historical sales are untouched — sale_items holds its own snapshots.
 */
export function updateProduct(input: UpdateProductInput): Product {
  const existing = mustGet(input.id);
  const data = validateAndNormalize(input);

  const priceChanged =
    existing.costPriceCents !== data.costPriceCents ||
    existing.sellingPriceCents !== data.sellingPriceCents;

  const otherChanges: Array<{ field: string; from: string; to: string }> = [];
  if (existing.name !== data.name) {
    otherChanges.push({ field: 'name', from: existing.name, to: data.name });
  }
  if (existing.categoryId !== data.categoryId) {
    otherChanges.push({
      field: 'category_id',
      from: String(existing.categoryId),
      to: String(data.categoryId)
    });
  }
  if (existing.barcode !== data.barcode) {
    otherChanges.push({ field: 'barcode', from: existing.barcode ?? '', to: data.barcode ?? '' });
  }

  if (!priceChanged && otherChanges.length === 0) {
    return existing;
  }

  productRepository.updateProduct(input.id, data, currentTimestamp());

  if (priceChanged) {
    auditService.log('price_change', 'product', input.id, {
      name: existing.name,
      from: {
        costPriceCents: existing.costPriceCents,
        sellingPriceCents: existing.sellingPriceCents
      },
      to: {
        costPriceCents: data.costPriceCents,
        sellingPriceCents: data.sellingPriceCents
      }
    });
  }
  if (otherChanges.length > 0) {
    auditService.log('product_edit', 'product', input.id, {
      name: data.name,
      changes: otherChanges
    });
  }

  return mustGet(input.id);
}

export function setProductActive(input: SetProductActiveInput): Product {
  const existing = mustGet(input.id);
  if (existing.isActive === input.isActive) {
    return existing;
  }

  productRepository.setProductActive(input.id, input.isActive, currentTimestamp());
  auditService.log(
    input.isActive ? 'product_reactivate' : 'product_deactivate',
    'product',
    input.id,
    { name: existing.name }
  );
  return mustGet(input.id);
}

function mustGet(id: number): Product {
  const product = productRepository.getProductById(id);
  if (!product) {
    throw new Error('Product not found.');
  }
  return product;
}

function validateAndNormalize(input: CreateProductInput): ProductWriteData {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error('Product name is required.');
  }
  if (name.length > MAX_NAME_LENGTH) {
    throw new Error(`Product name is too long (max ${MAX_NAME_LENGTH} characters).`);
  }

  if (!categoryRepository.getCategoryById(input.categoryId)) {
    throw new Error('Please choose a valid category.');
  }

  validatePrice(input.costPriceCents, 'Cost price');
  validatePrice(input.sellingPriceCents, 'Selling price');

  const barcode = (input.barcode ?? '').trim();
  if (barcode.length > MAX_BARCODE_LENGTH) {
    throw new Error(`Barcode is too long (max ${MAX_BARCODE_LENGTH} characters).`);
  }

  return {
    name,
    categoryId: input.categoryId,
    costPriceCents: input.costPriceCents,
    sellingPriceCents: input.sellingPriceCents,
    barcode: barcode === '' ? null : barcode
  };
}

function validatePrice(cents: number, label: string): void {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error(`${label} must be zero or more.`);
  }
  if (cents > MAX_PRICE_CENTS) {
    throw new Error(`${label} is unrealistically high — please double-check.`);
  }
}
