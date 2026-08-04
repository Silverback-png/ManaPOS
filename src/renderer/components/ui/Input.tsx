import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

/** Labelled text input with consistent dark-theme styling and error state. */
export function Input({ label, hint, error, id, ...rest }: InputProps): JSX.Element {
  const inputId = id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-gray-300">
        {label}
      </label>
      <input
        id={inputId}
        className={
          `w-full rounded-lg border bg-base px-3.5 py-2.5 text-sm text-gray-100 ` +
          `placeholder-muted transition-colors focus:outline-none focus:ring-2 ` +
          (error
            ? 'border-danger focus:ring-danger'
            : 'border-edge focus:border-edge-light focus:ring-accent')
        }
        {...rest}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
