import { FormEvent, useEffect, useState } from 'react';
import { DndContext, DragEndEvent, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Category } from '@shared/types/domain';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SortableCategoryRow } from './SortableCategoryRow';

/**
 * Category management: add, rename, enable/disable, delete and reorder.
 * The order defined here becomes the button order on the Point of Sale screen.
 */
export default function CategoriesScreen(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  useEffect(() => {
    let cancelled = false;
    api.categories
      .list()
      .then((list) => {
        if (!cancelled) setCategories(list);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function reportError(e: unknown): void {
    setError(e instanceof Error ? e.message : String(e));
  }

  async function handleAdd(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (adding || newName.trim().length === 0) return;

    setAdding(true);
    setError(null);
    try {
      const created = await api.categories.create({ name: newName });
      setCategories((prev) => [...prev, created]);
      setNewName('');
    } catch (e) {
      reportError(e);
    } finally {
      setAdding(false);
    }
  }

  async function handleSaveRename(id: number): Promise<void> {
    setError(null);
    try {
      const updated = await api.categories.rename({ id, name: editingName });
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
    } catch (e) {
      reportError(e);
    }
  }

  async function handleToggleActive(category: Category): Promise<void> {
    setError(null);
    try {
      const updated = await api.categories.setActive({
        id: category.id,
        isActive: !category.isActive
      });
      setCategories((prev) => prev.map((c) => (c.id === category.id ? updated : c)));
    } catch (e) {
      reportError(e);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    setError(null);
    try {
      await api.categories.remove({ id });
      setCategories((prev) => prev.filter((c) => c.id !== id));
      setConfirmingDeleteId(null);
    } catch (e) {
      reportError(e);
      setConfirmingDeleteId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = categories;
    const next = arrayMove(categories, oldIndex, newIndex);
    setCategories(next);

    api.categories
      .reorder({ orderedIds: next.map((c) => c.id) })
      .then((fresh) => setCategories(fresh))
      .catch((e: unknown) => {
        reportError(e);
        setCategories(previous); // revert on failure
      });
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {error && (
          <div className="rounded-lg border border-danger bg-danger-muted px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <Card title="Add category" description="Categories become the buttons on the Point of Sale screen.">
          <form onSubmit={(e) => void handleAdd(e)} className="flex items-center gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Burgers, Drinks, Chips…"
              maxLength={50}
              className="flex-1 rounded-lg border border-edge bg-base px-3.5 py-2.5 text-sm text-gray-100 placeholder-muted focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Button type="submit" disabled={adding || newName.trim().length === 0}>
              {adding ? 'Adding…' : 'Add category'}
            </Button>
          </form>
        </Card>

        <Card
          title={`Categories (${categories.length})`}
          description="Drag the ⠿ handle to reorder — this is the order shown on the till."
        >
          {loading ? (
            <p className="text-sm text-muted">Loading categories…</p>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted">
              No categories yet. Add your first one above — it will appear as a button on the
              Point of Sale screen.
            </p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={categories.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <SortableCategoryRow
                      key={category.id}
                      category={category}
                      isEditing={editingId === category.id}
                      editingName={editingId === category.id ? editingName : ''}
                      isConfirmingDelete={confirmingDeleteId === category.id}
                      onEditNameChange={setEditingName}
                      onStartEdit={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                        setConfirmingDeleteId(null);
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onSaveEdit={() => void handleSaveRename(category.id)}
                      onToggleActive={() => void handleToggleActive(category)}
                      onRequestDelete={() => {
                        setConfirmingDeleteId(category.id);
                        setEditingId(null);
                      }}
                      onConfirmDelete={() => void handleDelete(category.id)}
                      onCancelDelete={() => setConfirmingDeleteId(null)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </Card>
      </div>
    </main>
  );
}
