// Single source of truth for all Tailwind color class strings.
// Every token is a complete class string (no pseudo-class prefixes) so Tailwind's
// scanner detects it. Use hover:${TOKEN} / focus:${TOKEN} at call sites.
// Changing a value here propagates everywhere that imports the token.

// ─── Primary / brand (indigo) ─────────────────────────────────────────────────
export const C_PRIMARY_BG           = 'bg-indigo-600';
export const C_PRIMARY_BG_DARK      = 'bg-indigo-700';
export const C_PRIMARY_BG_SOFT      = 'bg-indigo-50';
export const C_PRIMARY_BG_SUBTLE    = 'bg-indigo-100';
export const C_PRIMARY_TEXT         = 'text-indigo-600';
export const C_PRIMARY_TEXT_DARK    = 'text-indigo-700';
export const C_PRIMARY_TEXT_MID     = 'text-indigo-500';
export const C_PRIMARY_TEXT_SOFT    = 'text-indigo-400';
export const C_PRIMARY_TEXT_STRONG  = 'text-indigo-800';
export const C_PRIMARY_BORDER       = 'border-indigo-600';
export const C_PRIMARY_BORDER_SOFT  = 'border-indigo-300';
export const C_PRIMARY_BORDER_MID   = 'border-indigo-400';

// ─── Danger (red) ─────────────────────────────────────────────────────────────
export const C_DANGER_BG            = 'bg-red-600';
export const C_DANGER_BG_DARK       = 'bg-red-700';
export const C_DANGER_BG_SOFT       = 'bg-red-50';
export const C_DANGER_BG_SUBTLE     = 'bg-red-100';
export const C_DANGER_BG_MID        = 'bg-red-500';
export const C_DANGER_TEXT          = 'text-red-700';
export const C_DANGER_TEXT_MID      = 'text-red-600';
export const C_DANGER_TEXT_SOFT     = 'text-red-500';
export const C_DANGER_TEXT_MUTED    = 'text-red-400';
export const C_DANGER_BORDER_SOFT   = 'border-red-200';
export const C_DANGER_BORDER_MID    = 'border-red-300';

// ─── Success (green) ──────────────────────────────────────────────────────────
export const C_SUCCESS_BG           = 'bg-green-600';
export const C_SUCCESS_BG_DARK      = 'bg-green-700';
export const C_SUCCESS_BG_SOFT      = 'bg-green-50';
export const C_SUCCESS_BG_SUBTLE    = 'bg-green-100';
export const C_SUCCESS_BG_MID       = 'bg-green-500';
export const C_SUCCESS_TEXT         = 'text-green-700';
export const C_SUCCESS_TEXT_SOFT    = 'text-green-400';
export const C_SUCCESS_BORDER_SOFT  = 'border-green-200';

// ─── Warning (amber) ──────────────────────────────────────────────────────────
export const C_WARN_BG_SOFT         = 'bg-amber-50';
export const C_WARN_TEXT            = 'text-amber-700';
export const C_WARN_TEXT_MID        = 'text-amber-600';
export const C_WARN_TEXT_ICON       = 'text-amber-500';
export const C_WARN_BORDER_SOFT     = 'border-amber-200';

// ─── Info (blue) ──────────────────────────────────────────────────────────────
export const C_INFO_BG_SUBTLE       = 'bg-blue-100';
export const C_INFO_BORDER_SOFT     = 'border-blue-200';
export const C_INFO_BORDER_MID      = 'border-blue-300';
export const C_INFO_TEXT_SOFT       = 'text-blue-400';
export const C_INFO_TEXT_MID        = 'text-blue-500';
export const C_INFO_TEXT_DARK       = 'text-blue-600';
export const C_INFO_TEXT            = 'text-blue-700';

// ─── Tempo / beat (yellow) ────────────────────────────────────────────────────
export const C_TEMPO_BG_SOFT        = 'bg-yellow-50';
export const C_TEMPO_BORDER_SOFT    = 'border-yellow-200';
export const C_TEMPO_BORDER_MID     = 'border-yellow-300';
export const C_TEMPO_TEXT_SOFT      = 'text-yellow-400';
export const C_TEMPO_TEXT           = 'text-yellow-500';
export const C_TEMPO_TEXT_MID       = 'text-yellow-600';

// ─── Type badges ──────────────────────────────────────────────────────────────
export const C_CHART_BG             = 'bg-purple-100';
export const C_CHART_TEXT           = 'text-purple-700';
export const C_BEATMAP_BG           = 'bg-teal-100';
export const C_BEATMAP_TEXT         = 'text-teal-700';
export const C_THEORY_BG_SOFT       = 'bg-orange-50';
export const C_THEORY_BG_SUBTLE     = 'bg-orange-100';
export const C_THEORY_BORDER        = 'border-orange-400';
export const C_THEORY_TEXT          = 'text-orange-700';

// ─── Neutral (gray) ───────────────────────────────────────────────────────────
export const C_GRAY_BG_50           = 'bg-gray-50';
export const C_GRAY_BG_100          = 'bg-gray-100';
export const C_GRAY_BG_200          = 'bg-gray-200';
export const C_GRAY_BG_300          = 'bg-gray-300';
export const C_GRAY_BG_800          = 'bg-gray-800';
export const C_GRAY_BG_900          = 'bg-gray-900';
export const C_GRAY_BORDER_100      = 'border-gray-100';
export const C_GRAY_BORDER_200      = 'border-gray-200';
export const C_GRAY_BORDER_300      = 'border-gray-300';
export const C_GRAY_BORDER_400      = 'border-gray-400';
export const C_GRAY_BORDER_800      = 'border-gray-800';
export const C_GRAY_TEXT_300        = 'text-gray-300';
export const C_GRAY_TEXT_400        = 'text-gray-400';
export const C_GRAY_TEXT_500        = 'text-gray-500';
export const C_GRAY_TEXT_600        = 'text-gray-600';
export const C_GRAY_TEXT_700        = 'text-gray-700';
export const C_GRAY_TEXT_800        = 'text-gray-800';
export const C_GRAY_TEXT_900        = 'text-gray-900';

// ─── White / black ────────────────────────────────────────────────────────────
export const C_WHITE_BG             = 'bg-white';
export const C_WHITE_TEXT           = 'text-white';
export const C_BLACK_BG             = 'bg-black';
