import {
  C_PRIMARY_BG, C_PRIMARY_BG_DARK, C_PRIMARY_BG_SOFT, C_PRIMARY_TEXT,
  C_PRIMARY_BORDER, C_PRIMARY_BORDER_SOFT, C_PRIMARY_BORDER_MID,
  C_DANGER_BG, C_DANGER_BG_DARK,
  C_SUCCESS_BG, C_SUCCESS_BG_DARK,
  C_WARN_BG_SOFT, C_WARN_TEXT, C_WARN_BORDER_SOFT,
  C_SUCCESS_BG_SOFT, C_SUCCESS_TEXT, C_SUCCESS_BORDER_SOFT,
  C_DANGER_BG_SOFT, C_DANGER_TEXT, C_DANGER_BORDER_SOFT,
  C_GRAY_BG_50, C_GRAY_TEXT_400, C_GRAY_TEXT_600,
  C_GRAY_BORDER_200, C_GRAY_BORDER_300,
  C_WHITE_BG, C_WHITE_TEXT,
} from './colors';

// Base button — append a color modifier for custom/dynamic states
export const BTN    = 'px-4 py-2 text-sm rounded-lg border transition-colors';
export const BTN_SM = 'px-3 py-1.5 text-xs rounded-lg border transition-colors';
export const BTN_XS = 'px-2 py-1 text-xs rounded border transition-colors';
export const BTN_ICON = `w-8 h-8 rounded-lg border ${C_GRAY_BORDER_300} ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50} flex items-center justify-center text-lg font-medium`;

// Toggle pair: use TOGGLE as base, TOGGLE_ON / TOGGLE_OFF as state modifier
export const TOGGLE     = 'px-3 py-1.5 text-xs rounded-md border transition-colors';
export const TOGGLE_ON  = `${C_PRIMARY_BG} ${C_WHITE_TEXT} ${C_PRIMARY_BORDER}`;
export const TOGGLE_OFF = `${C_WHITE_BG} ${C_GRAY_TEXT_600} ${C_GRAY_BORDER_300} hover:${C_GRAY_BG_50}`;

// Standalone variants — include sizing, use directly as className
export const BTN_PRIMARY   = `px-4 py-2 text-sm font-medium rounded-lg ${C_PRIMARY_BG} ${C_WHITE_TEXT} hover:${C_PRIMARY_BG_DARK} transition-colors`;
export const BTN_SECONDARY = `px-4 py-2 text-sm border ${C_GRAY_BORDER_300} rounded-lg ${C_GRAY_TEXT_600} hover:${C_GRAY_BG_50} transition-colors`;
export const BTN_DANGER    = `px-4 py-2 text-sm rounded-lg ${C_DANGER_BG} ${C_WHITE_TEXT} hover:${C_DANGER_BG_DARK} transition-colors`;
export const BTN_SUCCESS   = `px-4 py-2 text-sm rounded-lg ${C_SUCCESS_BG} ${C_WHITE_TEXT} hover:${C_SUCCESS_BG_DARK} disabled:opacity-50 transition-colors`;

// Form controls
export const SELECT         = `border ${C_GRAY_BORDER_300} rounded-lg px-3 py-2 text-sm focus:outline-none focus:${C_PRIMARY_BORDER_MID} ${C_WHITE_BG}`;
export const SELECT_COMPACT = `border ${C_GRAY_BORDER_300} rounded-lg px-1.5 py-0.5 text-xs focus:outline-none focus:${C_PRIMARY_BORDER_MID} ${C_WHITE_BG}`;
export const INPUT_SM       = `border ${C_GRAY_BORDER_300} rounded-lg px-3 py-1.5 text-xs ${C_WHITE_BG} focus:outline-none focus:${C_PRIMARY_BORDER_MID}`;
export const TEXTAREA_MONO  = `font-mono text-sm border ${C_GRAY_BORDER_300} rounded-lg p-3 resize-none focus:outline-none focus:${C_PRIMARY_BORDER_MID} ${C_GRAY_BG_50}`;

// Soft/outlined toggle (distinct visual from filled TOGGLE/TOGGLE_ON/TOGGLE_OFF)
export const TOGGLE_SOFT     = 'px-3 py-1.5 text-xs rounded-lg border transition-colors';
export const TOGGLE_SOFT_ON  = `${C_PRIMARY_BORDER_SOFT} ${C_PRIMARY_BG_SOFT} ${C_PRIMARY_TEXT}`;
export const TOGGLE_SOFT_OFF = `${C_GRAY_BORDER_200} ${C_GRAY_TEXT_400} hover:${C_GRAY_TEXT_600} hover:${C_GRAY_BORDER_300}`;

// Alert banners — callers prepend margin (e.g. `mb-4 ${ALERT_AMBER}`)
export const ALERT_AMBER = `rounded-lg border ${C_WARN_BORDER_SOFT} ${C_WARN_BG_SOFT} px-4 py-3 text-sm ${C_WARN_TEXT}`;
export const ALERT_GREEN = `rounded-lg border ${C_SUCCESS_BORDER_SOFT} ${C_SUCCESS_BG_SOFT} px-4 py-3 text-sm ${C_SUCCESS_TEXT}`;
export const ALERT_RED   = `rounded-lg border ${C_DANGER_BORDER_SOFT} ${C_DANGER_BG_SOFT} px-4 py-3 text-sm ${C_DANGER_TEXT}`;
