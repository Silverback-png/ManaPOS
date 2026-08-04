import { ReactNode } from 'react';

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/** The standard content panel used across all management screens. */
export function Card({ title, description, children, className = '' }: CardProps): JSX.Element {
  const hasHeader = Boolean(title || description);
  return (
    <section className={`rounded-xl border border-edge bg-panel p-6 ${className}`}>
      {title && <h2 className="text-base font-semibold text-gray-100">{title}</h2>}
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className={hasHeader ? 'mt-5' : ''}>{children}</div>
    </section>
  );
}
