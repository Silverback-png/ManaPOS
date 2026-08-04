import { ReactNode, useEffect } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Width preset — checkout and PIN modals stay compact. */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl'
} as const;

/**
 * The standard modal dialog: dimmed overlay, Escape to close, click-outside
 * to close. Forms inside can use footer buttons via the HTML `form` attribute.
 */
export function Modal({ title, onClose, children, footer, size = 'md' }: ModalProps): JSX.Element {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${SIZE_CLASSES[size]} rounded-xl border border-edge bg-panel shadow-2xl`}>
        <div className="flex items-center justify-between border-b border-edge px-6 py-4">
          <h2 className="text-base font-semibold text-gray-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-muted hover:bg-panel-hover hover:text-gray-100"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-edge px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
