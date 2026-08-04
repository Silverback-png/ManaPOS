import { create } from 'zustand';

/**
 * Cart state for the active sale.
 *
 * This is client-side, in-memory working state only — the authoritative sale
 * is computed and persisted by the main process at checkout (Module 8),
 * using database prices, never trusting these display values.
 */
export interface CartLine {
  productId: number;
  name: string;
  unitPriceCents: number;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  /** Adds a product, or increments its quantity if already in the cart. */
  addProduct: (product: { id: number; name: string; sellingPriceCents: number }) => void;
  increment: (productId: number) => void;
  /** Decreases quantity, stopping at 1 — use removeLine to delete a line. */
  decrement: (productId: number) => void;
  removeLine: (productId: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()((set) => ({
  lines: [],

  addProduct: (product) =>
    set((state) => {
      const existing = state.lines.find((line) => line.productId === product.id);
      if (existing) {
        return {
          lines: state.lines.map((line) =>
            line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line
          )
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            productId: product.id,
            name: product.name,
            unitPriceCents: product.sellingPriceCents,
            quantity: 1
          }
        ]
      };
    }),

  increment: (productId) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line
      )
    })),

  decrement: (productId) =>
    set((state) => ({
      lines: state.lines.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.max(1, line.quantity - 1) }
          : line
      )
    })),

  removeLine: (productId) =>
    set((state) => ({
      lines: state.lines.filter((line) => line.productId !== productId)
    })),

  clear: () => set({ lines: [] })
}));

export interface CartTotals {
  totalItems: number;
  grandTotalCents: number;
}

/** Pure totals — reused by the cart panel and the checkout flow. */
export function getCartTotals(lines: readonly CartLine[]): CartTotals {
  return {
    totalItems: lines.reduce((sum, line) => sum + line.quantity, 0),
    grandTotalCents: lines.reduce((sum, line) => sum + line.quantity * line.unitPriceCents, 0)
  };
}
