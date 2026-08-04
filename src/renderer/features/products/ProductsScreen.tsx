import { useEffect, useMemo, useState } from 'react';
import type { Category, Product } from '@shared/types/domain';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ProductFormModal } from './ProductFormModal';

type ModalState = { mode: 'add' } | { mode: 'edit'; product: Product } | null;

/**
 * Product management: add, edit, deactivate/reactivate, search, category
 * filter. Products are never hard-deleted — deactivated ones stay visible
 * here (muted) but disappear from the Point of Sale screen.
 */
export default function ProductsScreen(): JSX.Element {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState('R');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState<number | ''>('');
  const [modal, setModal] = useState<ModalState>(null);

  // Reference data (categories, currency) — loaded once.
  useEffect(() => {
    api.categories.list().then(setCategories).catch(reportError);
    api.settings
      .get()
      .then((s) => setCurrencySymbol(s.currencySymbol))
      .catch(() => undefined);
  }, []);

  // Search input is debounced so every keystroke doesn't hit the database.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Products re-query whenever the effective filters change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.products
      .list({
        search: debouncedSearch === '' ? undefined : debouncedSearch,
        categoryId: filterCategoryId === '' ? undefined : filterCategoryId,
        includeInactive: true
      })
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch((e: unknown) => {
        if (!cancelled) reportError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filterCategoryId]);

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  function reportError(e: unknown): void {
    setError(e instanceof Error ? e.message : String(e));
  }

  function upsertProduct(product: Product): void {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists ? prev.map((p) => (p.id === product.id ? product : p)) : [...prev, product];
      return [...next].sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  async function handleToggleActive(product: Product): Promise<void> {
    setError(null);
    try {
      const updated = await api.products.setActive({ id: product.id, isActive: !product.isActive });
      upsertProduct(updated);
    } catch (e) {
      reportError(e);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {error && (
          <div className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card>
          <div className="flex items-center gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="flex-1 rounded-lg border border-edge bg-base px-3.5 py-2.5 text-sm text-gray-100 placeholder-muted focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <select
              value={filterCategoryId}
              onChange={(e) =>
                setFilterCategoryId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className="rounded-lg border border-edge bg-base px-3.5 py-2.5 text-sm text-gray-100 focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button onClick={() => setModal({ mode: 'add' })}>Add product</Button>
          </div>
        </Card>

        <Card title={`Products (${products.length})`}>
          {loading ? (
            <p className="text-sm text-muted">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted">
              {search || filterCategoryId !== ''
                ? 'No products match your filters.'
                : 'No products yet. Click "Add product" to create your first one.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Category</th>
                  <th className="pb-3 pr-4 font-medium text-right">Cost</th>
                  <th className="pb-3 pr-4 font-medium text-right">Selling</th>
                  <th className="pb-3 pr-4 font-medium text-right">Profit</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={
                      'border-b border-edge/50 last:border-0 ' + (product.isActive ? '' : 'opacity-50')
                    }
                  >
                    <td className="py-3 pr-4 font-medium text-gray-100">{product.name}</td>
                    <td className="py-3 pr-4 text-muted">
                      {categoryNameById.get(product.categoryId) ?? '—'}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-muted">
                      {formatCurrency(product.costPriceCents, currencySymbol)}
                    </td>
                    <td className="py-3 pr-4 text-right font-mono text-gray-100">
                      {formatCurrency(product.sellingPriceCents, currencySymbol)}
                    </td>
                    <td
                      className={
                        'py-3 pr-4 text-right font-mono ' +
                        (product.sellingPriceCents - product.costPriceCents >= 0
                          ? 'text-accent'
                          : 'text-danger')
                      }
                    >
                      {formatCurrency(product.sellingPriceCents - product.costPriceCents, currencySymbol)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
                          (product.isActive
                            ? 'bg-accent-muted text-accent'
                            : 'bg-panel-hover text-muted')
                        }
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setModal({ mode: 'edit', product })}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={product.isActive ? 'text-danger hover:text-danger' : ''}
                        onClick={() => void handleToggleActive(product)}
                      >
                        {product.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {modal && (
        <ProductFormModal
          mode={modal.mode}
          product={modal.mode === 'edit' ? modal.product : null}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={(product) => {
            upsertProduct(product);
            setModal(null);
          }}
        />
      )}
    </main>
  );
}
