import { useState, useEffect } from 'react';

interface NumpadInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  className?: string;
}

const isTouch = typeof window !== 'undefined' && window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const DIGITS = ['7','8','9','4','5','6','1','2','3'];

export default function NumpadInput({ value, onChange, onCommit, placeholder, className }: NumpadInputProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (!isTouch) {
    return (
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => onCommit?.(value)}
        onKeyDown={e => e.key === 'Enter' && onCommit?.(value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  function handleOpen() {
    setDraft(value);
    setOpen(true);
  }

  function handleDigit(d: string) {
    setDraft(prev => (prev === '0' || prev === '') ? d : prev + d);
  }

  function handleBackspace() {
    setDraft(prev => prev.slice(0, -1));
  }

  function handleConfirm() {
    onChange(draft);
    onCommit?.(draft);
    setOpen(false);
  }

  function handleCancel() {
    setDraft(value);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`${className ?? ''} cursor-default text-left`}
      >
        {value !== '' ? value : <span className="text-gray-400">{placeholder}</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[199]" onPointerDown={handleCancel} />
          <div
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-[200] p-4 pb-10"
            onPointerDown={e => e.stopPropagation()}
          >
            <div className="text-center text-4xl font-bold text-gray-900 tabular-nums mb-5 h-12 flex items-center justify-center">
              {draft !== '' ? draft : <span className="text-gray-300">{placeholder ?? '—'}</span>}
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {DIGITS.map(d => (
                <button
                  key={d}
                  type="button"
                  onPointerDown={e => { e.preventDefault(); handleDigit(d); }}
                  className="h-14 rounded-xl bg-gray-100 text-xl font-semibold text-gray-900 active:bg-gray-200 select-none"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onPointerDown={e => { e.preventDefault(); handleBackspace(); }}
                className="h-14 rounded-xl bg-gray-100 text-xl font-semibold text-gray-500 active:bg-gray-200 select-none"
              >
                ⌫
              </button>
              <button
                type="button"
                onPointerDown={e => { e.preventDefault(); handleDigit('0'); }}
                className="h-14 rounded-xl bg-gray-100 text-xl font-semibold text-gray-900 active:bg-gray-200 select-none"
              >
                0
              </button>
              <button
                type="button"
                onPointerDown={e => { e.preventDefault(); handleConfirm(); }}
                className="h-14 rounded-xl bg-indigo-600 text-xl font-semibold text-white active:bg-indigo-700 select-none"
              >
                ✓
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
