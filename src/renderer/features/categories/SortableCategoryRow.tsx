import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Category } from '@shared/types/domain';
import { Button } from '../../components/ui/Button';

interface SortableCategoryRowProps {
  category: Category;
  isEditing: boolean;
  editingName: string;
  isConfirmingDelete: boolean;
  onEditNameChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onToggleActive: () => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

/**
 * One row of the category list: drag handle, name (or inline rename editor),
 * status badge and row actions. The drag handle owns the dnd listeners so
 * clicking anywhere else on the row never starts a drag.
 */
export function SortableCategoryRow({
  category,
  isEditing,
  editingName,
  isConfirmingDelete,
  onEditNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onToggleActive,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete
}: SortableCategoryRowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    disabled: isEditing || isConfirmingDelete
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={
        'flex items-center gap-3 rounded-lg border border-edge bg-base px-3 py-2.5 ' +
        (isDragging ? 'z-10 opacity-90 shadow-xl ring-2 ring-accent' : '')
      }
    >
      {/* Drag handle — the only element that starts a drag */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none select-none rounded px-1.5 py-1 text-muted hover:bg-panel-hover hover:text-gray-100 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label={`Drag ${category.name} to reorder`}
      >
        ⠿
      </button>

      {isEditing ? (
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveEdit();
          }}
        >
          <input
            value={editingName}
            onChange={(e) => onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onCancelEdit();
            }}
            maxLength={50}
            autoFocus
            className="flex-1 rounded-md border border-edge bg-panel px-3 py-1.5 text-sm text-gray-100 focus:border-edge-light focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <Button type="submit" size="sm">
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancelEdit}>
            Cancel
          </Button>
        </form>
      ) : (
        <>
          <span
            className={
              'flex-1 truncate text-sm font-medium ' +
              (category.isActive ? 'text-gray-100' : 'text-muted line-through')
            }
          >
            {category.name}
          </span>

          <span
            className={
              'rounded-full px-2.5 py-0.5 text-xs font-medium ' +
              (category.isActive ? 'bg-accent-muted text-accent' : 'bg-panel-hover text-muted')
            }
          >
            {category.isActive ? 'Active' : 'Inactive'}
          </span>

          {isConfirmingDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-xs text-danger">Delete this category?</span>
              <Button size="sm" variant="danger" onClick={onConfirmDelete}>
                Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={onCancelDelete}>
                Cancel
              </Button>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={onStartEdit}>
                Rename
              </Button>
              <Button size="sm" variant="ghost" onClick={onToggleActive}>
                {category.isActive ? 'Disable' : 'Enable'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-danger hover:text-danger"
                onClick={onRequestDelete}
              >
                Delete
              </Button>
            </span>
          )}
        </>
      )}
    </li>
  );
}
