// Base button — append a color modifier for custom/dynamic states
export const BTN    = 'px-4 py-2 text-sm rounded-lg border transition-colors';
export const BTN_SM = 'px-3 py-1.5 text-xs rounded-lg border transition-colors';
export const BTN_XS = 'px-2 py-1 text-xs rounded border transition-colors';
export const BTN_ICON = 'w-8 h-8 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center text-lg font-medium';

// Toggle pair: use TOGGLE as base, TOGGLE_ON / TOGGLE_OFF as state modifier
export const TOGGLE     = 'px-3 py-1.5 text-xs rounded-md border transition-colors';
export const TOGGLE_ON  = 'bg-indigo-600 text-white border-indigo-600';
export const TOGGLE_OFF = 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50';

// Standalone variants — include sizing, use directly as className
export const BTN_PRIMARY   = 'px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors';
export const BTN_SECONDARY = 'px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors';
export const BTN_DANGER    = 'px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors';
export const BTN_SUCCESS   = 'px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors';

// Form controls
export const SELECT         = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white';
export const SELECT_COMPACT = 'border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:border-indigo-400 bg-white';
export const INPUT_SM       = 'border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-indigo-400';
export const TEXTAREA_MONO  = 'font-mono text-sm border border-gray-300 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-400 bg-gray-50';

// Soft/outlined toggle (distinct visual from filled TOGGLE/TOGGLE_ON/TOGGLE_OFF)
export const TOGGLE_SOFT     = 'px-3 py-1.5 text-xs rounded-lg border transition-colors';
export const TOGGLE_SOFT_ON  = 'border-indigo-300 bg-indigo-50 text-indigo-600';
export const TOGGLE_SOFT_OFF = 'border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300';

// Alert banners — callers prepend margin (e.g. `mb-4 ${ALERT_AMBER}`)
export const ALERT_AMBER = 'rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700';
export const ALERT_GREEN = 'rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700';
export const ALERT_RED   = 'rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700';
