import { FormEvent, useState } from 'react';
import type { Category, Product } from '@shared/types/domain';
import { toCents } from '@shared/money';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

interface ProductFormModalProps {
  mode: 'add' | 'edit';
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (product: Product) => void;
}

/**
 * Add/Edit product dialog. Prices are captured in rands (what the user
 * thinks in) and converted to integer cents before crossing IPC.
 */
export function ProductFormModal({
  mode,
  product,
  categories,
  onClose,
  onSaved
}: ProductFormModalProps): JSX.Element {
  const [name, setName] = useState(product?.name ?? '');
  const [categoryId, setCategoryId] = useState<number>(
    product?.categoryId ?? categories.find((c) => c.isActive)?.id ?? 0
  );
  const [costPrice, setCostPrice] = useState(
    product ? (product.costPriceCents / 100).toFixed(2) : ''
  );
  const [sellingPrice, setSellingPrice] = useState(
    product ? (product.sellingPriceCents / 100).toFixed(2) : ''
  );
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Inactive categories can't receive new products, but an edited product
  // must still show its current (possibly inactive) category.
  const selectableCategories = categories.filter(
    (c) => c.isActive || c.id === product?.categoryId
  );

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (saving) return;

    const cost = Number(costPrice);
    const selling = Number(sellingPrice);
    if (name.trim().length === 0) {
      setError('Product name is required.');
      return;
    }
    if (categoryId === 0) {
      setError('Please choose a category (create one on the Categories screen first).');
      return;
    }
    if (!Number.isFinite(cost) || cost < 0) {
      setError('Cost price must be zero or more.');
      return;
    }
    if (!Number.isFinite(selling) || selling < 0) {
      setError('Selling price must be zero or more.');
      return;
    }

    setSaving(true);
    setError(null);
    const payload = {
      name,
      categoryId,
      costPriceCents: toCents(cost),
      sellingPriceCents: toCents(selling),
      barcode: barcode.trim() === '' ? null : barcode.trim()
    };

    try {
      const savedProduct =
        mode === 'add'
          ? await api.products.create(payload)
          : await api.products.update({ ...payload, id: product!.id });
      onSaved(savedProduct);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={mode === 'add' ? 'Add product' : `Edit product`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="product-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save product'}
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Input
          label="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          autoFocus
        />

        <div>
          <label htmlFor="product-category" className="mb-1.5 block text-sm font-medium text-gray-300">
            Category
          </label>
          <select
            id="product-category"
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            disabled={selectableCategories.length === 0}
            className="w-full rounded-lg border border-edge bg-base px-3.5 py-2.5 text-sm text-gray-100 focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
          >
            {selectableCategories.length === 0 ? (
              <option value={0}>Create a category first…</option>
            ) : (
              selectableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.isActive ? '' : ' (inactive)'}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Cost price (R)"
            type="number"
            min="0"
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            required
          />
          <Input
            label="Selling price (R)"
            type="number"
            min="0"
            step="0.01"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            required
            hint="VAT-inclusive"
          />
        </div>

        <Input
          label="Barcode (optional)"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          maxLength={50}
          hint="Barcode scanning arrives in a later version."
        />
      </form>
    </Modal>
  );
}
