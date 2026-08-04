import type { Product } from '@shared/types/domain';
import { formatCurrency } from '../../lib/format';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  hasCategories: boolean;
  currencySymbol: string;
  onProductClick: (product: Product) => void;
}

/**
 * The right-hand product buttons. Only active products in the selected
 * category appear — clicking one adds it to the cart.
 */
export function ProductGrid({
  products,
  loading,
  hasCategories,
  currencySymbol,
  onProductClick
}: ProductGridProps): JSX.Element {
  return (
    <section className="min-w-0 flex-1 overflow-y-auto p-4">
      {!hasCategories ? (
        <EmptyMessage message="Set up categories and products first — they become the buttons on this screen." />
      ) : loading ? (
        <EmptyMessage message="Loading products…" />
      ) : products.length === 0 ? (
        <EmptyMessage message="No active products in this category." />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onProductClick(product)}
              className="group flex min-h-[5.5rem] flex-col rounded-xl border border-edge bg-panel p-4 text-left transition-all hover:border-accent active:scale-[0.98]"
            >
              <span className="flex-1 text-sm font-semibold leading-snug text-gray-100 group-hover:text-white">
                {product.name}
              </span>
              <span className="mt-3 text-lg font-bold text-accent">
                {formatCurrency(product.sellingPriceCents, currencySymbol)}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyMessage({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="max-w-xs text-center text-sm leading-relaxed text-muted">{message}</p>
    </div>
  );
}
