import { useEffect, useState } from 'react';
import type { Category, Product } from '@shared/types/domain';
import { api } from '../../lib/api';
import { useCartStore } from '../../store/cartStore';
import { CartPanel } from './CartPanel';
import { CategoryRail } from './CategoryRail';
import { ProductGrid } from './ProductGrid';

/**
 * The Point of Sale screen.
 *
 * Layout per spec: categories on the left, products on the right, cart along
 * the bottom. Data flows one way — the main process owns the data; this
 * screen only displays it and accumulates the cart.
 */
export default function PosScreen(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [vatRatePercent, setVatRatePercent] = useState(15);
  const [currencySymbol, setCurrencySymbol] = useState('R');
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addProduct = useCartStore((s) => s.addProduct);

  // Initial load: active categories (in till order) + receipt-relevant settings.
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.categories.list(), api.settings.get()])
      .then(([categoryList, settings]) => {
        if (cancelled) return;
        const active = categoryList.filter((c) => c.isActive);
        setCategories(active);
        setSelectedCategoryId(active[0]?.id ?? null);
        setVatRatePercent(settings.vatRatePercent);
        setCurrencySymbol(settings.currencySymbol);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Active products for the selected category.
  useEffect(() => {
    if (selectedCategoryId === null) {
      setProducts([]);
      return;
    }
    let cancelled = false;
    setLoadingProducts(true);
    api.products
      .list({ categoryId: selectedCategoryId, includeInactive: false })
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategoryId]);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {error && (
        <div className="mx-4 mt-4 rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <CategoryRail
          categories={categories}
          selectedId={selectedCategoryId}
          loading={loadingCategories}
          onSelect={setSelectedCategoryId}
        />
        <ProductGrid
          products={products}
          loading={loadingProducts}
          hasCategories={categories.length > 0}
          currencySymbol={currencySymbol}
          onProductClick={(product) =>
            addProduct({
              id: product.id,
              name: product.name,
              sellingPriceCents: product.sellingPriceCents
            })
          }
        />
      </div>

      <CartPanel currencySymbol={currencySymbol} vatRatePercent={vatRatePercent} />
    </main>
  );
}
