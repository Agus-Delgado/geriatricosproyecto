import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { ReleaseNotes } from '../../config/releaseNotes';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: ReleaseNotes;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  isOpen,
  onClose,
  notes,
}) => {
  const accent = 'var(--facility-accent, #2563eb)';
  const prettyDate = (() => {
    try {
      const d = new Date(notes.date);
      if (Number.isNaN(d.getTime())) return notes.date;
      return d.toLocaleString('es-AR');
    } catch {
      return notes.date;
    }
  })();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={notes.title} size="lg">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Versión <span className="font-semibold text-gray-900">{notes.version}</span> · {prettyDate}
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ border: `1px solid ${accent}`, color: accent }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            Actualización informativa
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {notes.highlights.map((h) => (
            <div
              key={h}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm flex gap-3"
            >
              <div
                className="shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
                style={{ border: `1px solid ${accent}` }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: accent }}
                >
                  <path
                    d="M20 6L9 17l-5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900">Novedad</div>
                <div className="text-sm text-gray-700 break-words">{h}</div>
              </div>
            </div>
          ))}
        </div>

        {notes.details && notes.details.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center"
                style={{ border: `1px solid ${accent}` }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ color: accent }}
                >
                  <path
                    d="M12 8v4l3 3"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="text-sm font-semibold text-gray-900">Detalle</div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {notes.details.map((d) => (
                <div key={d} className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700">
                  {d}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-1">
          <Button onClick={onClose} fullWidth>
            Entendido
          </Button>
        </div>
      </div>
    </Modal>
  );
};
