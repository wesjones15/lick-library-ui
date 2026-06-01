import { useState, useEffect, useRef } from 'react';
import { C_GRAY_BG_100, C_GRAY_BG_200, C_GRAY_BG_300, C_GRAY_BORDER_200, C_GRAY_TEXT_300, C_GRAY_TEXT_400, C_GRAY_TEXT_600, C_GRAY_TEXT_900, C_PRIMARY_BG, C_PRIMARY_BG_DARK, C_WHITE_BG, C_WHITE_TEXT } from '../colors';

export interface NumpadExtraKey { label: string; value: string; }

interface NumpadInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit?: (value: string) => void;
  onBackspace?: () => void;
  onClose?: () => void;
  extraKeys?: NumpadExtraKey[];
  insertMode?: boolean;
  placeholder?: string;
  className?: string;
}

export const isTouch =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: none) and (pointer: coarse)').matches;

const DIGITS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
const PAD_W = 184;
const PAD_H = 310;

export default function NumpadInput({
  value, onChange, onCommit, onBackspace, onClose,
  extraKeys = [], insertMode, placeholder, className,
}: NumpadInputProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [popPos, setPopPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!insertMode) setDraft(value);
  }, [value, insertMode]);

  // ── Desktop: plain number input ─────────────────────────────────────────
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

  const wide = window.innerWidth >= 768;

  function tapDigit(d: string) {
    if (insertMode) { onChange(d); }
    else { setDraft(prev => prev === '0' || prev === '' ? d : prev + d); }
  }

  function tapBackspace() {
    if (insertMode) { onBackspace?.(); }
    else { setDraft(prev => prev.slice(0, -1)); }
  }

  function tapExtra(val: string) {
    if (insertMode) { onChange(val); }
    else { setDraft(prev => prev + val); }
  }

  const btnBase = 'rounded-xl font-semibold select-none transition-colors';
  const digitCls = `${btnBase} ${C_GRAY_BG_100} ${C_GRAY_TEXT_900} active:${C_GRAY_BG_200}`;
  const specialCls = `${btnBase} ${C_GRAY_BG_200} ${C_GRAY_TEXT_600} active:${C_GRAY_BG_300}`;
  const confirmCls = `${btnBase} ${C_PRIMARY_BG} ${C_WHITE_TEXT} active:${C_PRIMARY_BG_DARK}`;
  const sizeCls = wide ? 'w-11 h-11 text-base' : 'h-12 text-lg';

  function Grid() {
    return (
      <div>
        {extraKeys.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {extraKeys.map(k => (
              <button
                key={k.value}
                type="button"
                onPointerDown={e => { e.preventDefault(); tapExtra(k.value); }}
                className={`${specialCls} ${sizeCls} px-3`}
              >
                {k.label}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {DIGITS.map(d => (
            <button
              key={d}
              type="button"
              onPointerDown={e => { e.preventDefault(); tapDigit(d); }}
              className={`${digitCls} ${sizeCls}`}
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); tapBackspace(); }}
            className={`${specialCls} ${sizeCls}`}
          >
            ⌫
          </button>
          <button
            type="button"
            onPointerDown={e => { e.preventDefault(); tapDigit('0'); }}
            className={`${digitCls} ${sizeCls}`}
          >
            0
          </button>
          {insertMode ? (
            <button
              type="button"
              onClick={onClose}
              className={`${specialCls} ${sizeCls} text-sm`}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              className={`${confirmCls} ${sizeCls}`}
            >
              ✓
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Insert mode: inline panel, no trigger ───────────────────────────────
  if (insertMode) {
    return (
      <div
        className={`fixed bottom-0 left-0 right-0 ${C_WHITE_BG} border-t ${C_GRAY_BORDER_200} z-[200] p-3 pb-6`}
        onPointerDown={e => e.stopPropagation()}
      >
        <Grid />
      </div>
    );
  }

  // ── Value mode: trigger + popover/sheet ─────────────────────────────────
  function handleOpen() {
    if (!triggerRef.current) return;
    if (wide) {
      const rect = triggerRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let top = rect.bottom + 6;
      let left = rect.left + rect.width / 2 - PAD_W / 2;
      if (left < 8) left = 8;
      if (left + PAD_W > vw - 8) left = vw - PAD_W - 8;
      if (top + PAD_H > vh - 8) top = rect.top - PAD_H - 6;
      setPopPos({ top, left });
    } else {
      setPopPos(null);
    }
    setDraft(value);
    setOpen(true);
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
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        className={`${className ?? ''} cursor-default text-left`}
      >
        {value !== '' ? value : <span className={`${C_GRAY_TEXT_400}`}>{placeholder}</span>}
      </button>

      {open && (
        <>
          <div
            className={`fixed inset-0 z-[199] ${wide ? 'bg-transparent' : '${C_BLACK_BG}/30'}`}
            onPointerDown={handleCancel}
          />
          {wide && popPos ? (
            <div
              className={`fixed ${C_WHITE_BG} rounded-xl shadow-xl z-[200] p-3`}
              style={{ top: popPos.top, left: popPos.left, width: PAD_W }}
              onPointerDown={e => e.stopPropagation()}
            >
              <div className={`text-center text-xl font-bold ${C_GRAY_TEXT_900} tabular-nums mb-3 h-7 flex items-center justify-center`}>
                {draft !== '' ? draft : <span className={`${C_GRAY_TEXT_300}`}>{placeholder ?? '—'}</span>}
              </div>
              <Grid />
            </div>
          ) : (
            <div
              className={`fixed bottom-0 left-0 right-0 ${C_WHITE_BG} rounded-t-2xl shadow-xl z-[200] p-4 pb-10`}
              onPointerDown={e => e.stopPropagation()}
            >
              <div className={`text-center text-4xl font-bold ${C_GRAY_TEXT_900} tabular-nums mb-4 h-12 flex items-center justify-center`}>
                {draft !== '' ? draft : <span className={`${C_GRAY_TEXT_300}`}>{placeholder ?? '—'}</span>}
              </div>
              <div className="max-w-xs mx-auto">
                <Grid />
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
