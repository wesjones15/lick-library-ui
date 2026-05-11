# Lick Library — Frontend

React UI for the Lick Library backend. Upload guitar tabs, browse your library, and view playable positions in any key on any instrument.

---

## Stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Router | React Router 7 |
| Styling | Tailwind CSS v4 |
| HTTP | Fetch API (no library) |

---

## Running

```bash
npm install
npm run dev
```

App available at `http://localhost:5173`. Expects the backend at `http://localhost:8080`.

---

## Pages

### Library (`/`)

Home page. Shows the full lick library and the upload form.

- **Upload form** — paste or type a tab, pick an optional root key and mode, submit. The tab editor enforces structure (see [Tab editor](#tab-editor) below).
- **Instrument selector** — sets the default instrument for all lick views. Persists across sessions via `localStorage`.
- **Lick list** — each card shows the interval display string, detected mode, and the original raw tab. Clicking a card navigates to the detail page.
- **Delete** — the `×` on each card deletes the lick and refreshes the list.

### Detail (`/lick/:id`)

Full view for a single lick.

- **Original tab** — the raw ASCII tab as uploaded. Never changes.
- **Mode chip** — hovering shows the mode's interval formula (e.g. `1  2  b3  4  5  6  b7` for Dorian).
- **Key selector** — choose any of the 12 chromatic notes. Positions re-fetch immediately.
- **Algorithm selector** — toggle between `Greedy`, `Chord`, and `DFS` position-finding strategies.
- **Instrument selector** — pick a preset or enter a custom tuning. Custom tuning only takes effect after clicking Apply (or pressing Enter).
- **Positions grid** — rendered ASCII tabs, one card per playable position. Grid column width auto-sizes to the tab content. The header reads `Positions in A — Bass` (key + instrument) so it's always clear what you're looking at.

---

## Components

### `UploadForm`

Tab editor with structured input handling.

- Pre-filled with an empty 6-string, 16-column template.
- Typing replaces the character under the cursor (overwrite mode). The cursor advances automatically.
- Only valid tab characters are accepted: `0–9`, `h`, `p`, `/`, `\`, `-`.
- Backspace replaces the previous character with `-`.
- String labels (`E|`, `B|`, etc.) and closing `|` bars are protected — they can't be overwritten.
- Typing a valid character at the closing `|` of a line **expands the tab** by one column across all strings.
- Submit is disabled until the tab contains at least one digit.
- **Root key** dropdown — optionally declare what key the tab is in. Defaults to "first note."
- **Mode** dropdown — optionally set the mode. Defaults to auto-detect.
- Resets to the empty template after a successful upload.

### `InstrumentSelector`

Named preset dropdown + optional custom tuning input.

| Preset value | Label |
|---|---|
| `GUITAR` | Standard Guitar |
| `DROP_D` | Drop D |
| `OPEN_G` | Open G |
| `OPEN_D` | Open D |
| `DADGAD` | DADGAD |
| `BASS` | Bass |
| `UKULELE` | Ukulele |
| `MANDOLIN` | Mandolin |
| `BANJO` | Banjo |
| `CUSTOM` | Custom… |

Selecting **Custom…** reveals a text input. Enter space-separated note names (`E A D G B E`). Sharps (`C#`, `F#`) and flats (`Bb`) are accepted. On the detail page, positions only update when **Apply** is clicked or Enter is pressed — not on every keystroke.

### `KeySelector`

Controlled dropdown over all 12 chromatic notes. Values are Java enum names (`C_SHARP`, `B_FLAT`, etc.); labels are the readable names (`C#`, `Bb`).

### `LickCard`

Clickable library card. Shows:
- Interval display string (e.g. `1 b3 h 4 5`) in monospace
- Mode badge (if detected)
- Raw ASCII tab preview
- Delete button (does not navigate)

### `PositionTab`

Dark terminal-style `<pre>` block (black background, green monospace text) rendering a single tab string from the backend. Scrolls horizontally for wide tabs.

---

## Tab editor

The textarea in `UploadForm` implements overwrite-mode editing so the 6×N grid structure is always preserved.

**Cursor rules:**
- Protected characters (`|`, string-label column, newlines) are skipped on advance.
- Backspace moves back one slot and writes `-`, unless on a protected character.
- Non-tab characters are blocked via `preventDefault` — the grid never grows unintentionally.

**Tab expansion:**
When the cursor is on the closing `|` of any line and a valid character is typed, `expandTab()` inserts a `-` before every line's closing `|`, growing all 6 strings by one column simultaneously. The cursor repositions into the new slot.

**Cursor restoration:**
A `nextCursorRef` + `useLayoutEffect` pattern restores `selectionStart`/`selectionEnd` synchronously after React re-renders the controlled textarea, preventing the cursor jumping to the end.

---

## Instrument persistence

`useInstrument` stores the selected instrument and custom tuning in `localStorage`:

| Key | Value |
|---|---|
| `lick_instrument` | `InstrumentName` string (e.g. `BASS`) |
| `lick_custom_tuning` | Tuning string (e.g. `E A D G B E`) |

Both pages share the same hook and initialise from `localStorage` on mount. Changing the instrument on the Library page sets the default for all subsequent Detail page visits.

---

## API client (`src/api/client.ts`)

All requests target `http://localhost:8080/api`.

```typescript
getAllLicks(): Promise<LickSummary[]>

uploadLick(request: UploadRequest): Promise<LickSummary>
// { rawTab, mode?, inputKey? }

getLick(
  id: string,
  key: string,
  algo?: 'greedy' | 'chord' | 'dfs',
  instrument?: string,
  customTuning?: string
): Promise<LickDetail>
// sends ?tuning= when customTuning is set; otherwise ?instrument=

deleteLick(id: string): Promise<void>
```

`getLick` throws `Error(statusCode)` on non-2xx responses. The detail page catches `'400'` to show a specific "invalid tuning" message rather than a generic error.

---

## Project structure

```
src/
├── api/
│   └── client.ts              Typed fetch wrappers + response interfaces
├── hooks/
│   └── useInstrument.ts       localStorage-backed instrument/tuning state
├── pages/
│   ├── LibraryPage.tsx        / — library list + upload
│   └── DetailPage.tsx         /lick/:id — positions view
├── components/
│   ├── UploadForm.tsx         Tab editor + upload controls
│   ├── LickList.tsx           Renders array of LickCard
│   ├── LickCard.tsx           Single library card
│   ├── KeySelector.tsx        12-note key dropdown
│   ├── InstrumentSelector.tsx Preset + custom tuning selector
│   └── PositionTab.tsx        Single position tab display
└── main.tsx                   Router root
```

---

## Type reference

```typescript
interface LickSummary {
  id: string;
  rawTab: string;
  intervalDisplayString: string;
  mode: string | null;
  positions: null;
}

interface LickDetail {
  id: string;
  rawTab: string;
  intervalDisplayString: string;
  mode: string;
  positions: PositionResponse[];
}

interface PositionResponse {
  tabString: string;
}

interface UploadRequest {
  rawTab: string;
  mode?: string;
  inputKey?: string;
}

type InstrumentName =
  | 'GUITAR' | 'DROP_D' | 'OPEN_G' | 'OPEN_D' | 'DADGAD'
  | 'BASS' | 'UKULELE' | 'MANDOLIN' | 'BANJO' | 'CUSTOM';
```
