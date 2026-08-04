/**
 * Display formatting helpers — pure presentation, no business logic.
 * The database stores integer cents; only the UI ever divides by 100.
 */

export function formatCurrency(cents: number, currencySymbol = 'R'): string {
  return `${currencySymbol} ${(cents / 100).toFixed(2)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}
