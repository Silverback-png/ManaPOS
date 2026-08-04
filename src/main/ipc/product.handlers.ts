import {
  CreateProductInput,
  Product,
  ProductFilter,
  SetProductActiveInput,
  UpdateProductInput
} from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as productService from '../services/productService';
import { handle } from './handle';

export function registerProductHandlers(): void {
  handle<ProductFilter, Product[]>(IpcChannels.products.list, (input) =>
    productService.listProducts(input)
  );

  handle<CreateProductInput, Product>(IpcChannels.products.create, (input) =>
    productService.createProduct(input)
  );

  handle<UpdateProductInput, Product>(IpcChannels.products.update, (input) =>
    productService.updateProduct(input)
  );

  handle<SetProductActiveInput, Product>(IpcChannels.products.setActive, (input) =>
    productService.setProductActive(input)
  );
}
