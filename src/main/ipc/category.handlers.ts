import {
  Category,
  CreateCategoryInput,
  DeleteCategoryInput,
  RenameCategoryInput,
  ReorderCategoriesInput,
  SetCategoryActiveInput
} from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as categoryService from '../services/categoryService';
import { handle, handleQuery } from './handle';

export function registerCategoryHandlers(): void {
  handleQuery<Category[]>(IpcChannels.categories.list, () => categoryService.listCategories());

  handle<CreateCategoryInput, Category>(IpcChannels.categories.create, (input) =>
    categoryService.createCategory(input)
  );

  handle<RenameCategoryInput, Category>(IpcChannels.categories.rename, (input) =>
    categoryService.renameCategory(input)
  );

  handle<SetCategoryActiveInput, Category>(IpcChannels.categories.setActive, (input) =>
    categoryService.setCategoryActive(input)
  );

  handle<DeleteCategoryInput, null>(IpcChannels.categories.remove, (input) => {
    categoryService.deleteCategory(input);
    return null;
  });

  handle<ReorderCategoriesInput, Category[]>(IpcChannels.categories.reorder, (input) =>
    categoryService.reorderCategories(input)
  );
}
