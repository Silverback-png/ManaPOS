import type { Category } from '@shared/types/domain';

interface CategoryRailProps {
  categories: Category[];
  selectedId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
}

/**
 * The left-hand category buttons on the till. Only active categories appear,
 * in the exact order arranged on the Categories screen.
 */
export function CategoryRail({
  categories,
  selectedId,
  loading,
  onSelect
}: CategoryRailProps): JSX.Element {
  return (
    <aside className="flex w-48 shrink-0 flex-col space-y-2 overflow-y-auto border-r border-edge bg-panel p-3">
      {loading ? (
        <p className="px-2 py-3 text-sm text-muted">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="px-2 py-3 text-sm leading-relaxed text-muted">
          No active categories. Create some on the Categories screen.
        </p>
      ) : (
        categories.map((category) => {
          const isSelected = category.id === selectedId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelect(category.id)}
              className={
                'rounded-lg border px-4 py-3 text-left text-sm font-semibold transition-colors ' +
                (isSelected
                  ? 'border-accent bg-accent text-white'
                  : 'border-edge bg-panel-hover text-gray-200 hover:border-edge-light hover:text-white')
              }
            >
              {category.name}
            </button>
          );
        })
      )}
    </aside>
  );
}
