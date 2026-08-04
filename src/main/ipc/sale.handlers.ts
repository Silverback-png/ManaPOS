import { CompleteSaleInput, CompletedSale } from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as saleService from '../services/saleService';
import { handle } from './handle';

export function registerSaleHandlers(): void {
  handle<CompleteSaleInput, CompletedSale>(IpcChannels.sales.complete, (input) =>
    saleService.completeSale(input)
  );
}
