import React from 'react';
import { Button } from '../ui/Button';

interface FolderSectionProps<T> {
  title: string;
  count: number;
  items: T[];
  onViewAll?: () => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyMessage?: string;
}

export function FolderSection<T>({
  title,
  count,
  items,
  onViewAll,
  renderItem,
  emptyMessage = 'No hay registros',
}: FolderSectionProps<T>) {
  return (
    <div
      className="rounded-xl shadow-lg p-6 mb-6"
      style={{ backgroundColor: 'var(--facility-card, white)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            className="text-xl font-semibold text-gray-900"
            style={{ color: 'var(--facility-accent, #667eea)' }}
          >
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {count} {count === 1 ? 'registro' : 'registros'}
          </p>
        </div>
        {onViewAll && count > items.length && (
          <Button
            variant="secondary"
            onClick={onViewAll}
            style={{ borderColor: 'var(--facility-accent, #667eea)' }}
          >
            Ver Todos
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index}>{renderItem(item, index)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
