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
