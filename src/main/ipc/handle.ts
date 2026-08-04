import { ipcMain } from 'electron';
import { Result } from '../../shared/types/ipc';

/**
 * Registration wrappers that enforce the app's IPC contract:
 *
 *  - Every handler resolves to Result<T> — the renderer NEVER receives a
 *    rejected IPC promise, no matter what a service throws.
 *  - Error messages cross the boundary as plain, user-presentable strings.
 *  - Domain handler files stay one line per operation:
 *    validate/call a service, return its result.
 *
 * `handle`      → operations that take an input payload.
 * `handleQuery` → operations that take no payload.
 */
export function handle<TInput, TOutput>(
  channel: string,
  fn: (input: TInput) => TOutput | Promise<TOutput>
): void {
  ipcMain.handle(channel, async (_event, input: TInput): Promise<Result<TOutput>> => {
    try {
      const data = await fn(input);
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error) };
    }
  });
}

export function handleQuery<TOutput>(
  channel: string,
  fn: () => TOutput | Promise<TOutput>
): void {
  ipcMain.handle(channel, async (): Promise<Result<TOutput>> => {
    try {
      const data = await fn();
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: toErrorMessage(error) };
    }
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
