import { VoidCartItemInput, VoidCartSaleInput, VoidRecord } from '../../shared/types/domain';
import { IpcChannels } from '../../shared/types/ipc';
import * as voidService from '../services/voidService';
import { handle } from './handle';

export function registerVoidHandlers(): void {
  handle<VoidCartItemInput, VoidRecord>(IpcChannels.voids.voidCartItem, (input) =>
    voidService.voidCartItem(input)
  );

  handle<VoidCartSaleInput, VoidRecord>(IpcChannels.voids.voidCartSale, (input) =>
    voidService.voidCartSale(input)
  );
}
