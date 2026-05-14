# Lick Library — Frontend

React UI for the Lick Library backend. Upload guitar tabs, browse your lick library, and view playable positions in any key on any instrument. Upload chord sheets, transpose them on the fly, and hover over chords to see fingering diagrams.

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

App available at `http://localhost:5173`. Expects the backend at `http://{hostname}:8080` — uses the page's own hostname so it works on the local network (e.g. from an iPad).

---

## Pages

### Licks (`/`)

Home page. Shows the full lick library and the upload form.

- **Upload form** — paste or type a tab, pick an optional root key and mode, submit. The tab editor enforces structure (see [Tab editor](#tab-editor) below).
- **Instrument selector** — sets the default instrument for all lick views. Persists across sessions via `localStorage`.
- **Lick list** — each card shows the interval display string, detected mode, and the original raw tab. Clicking a card navigates to the detail page.
- **Delete** — the `×` on each card deletes the lick and refreshes the list.

### Lick Detail (`/lick/:id`)

Full view for a single lick.

- **Original tab** — the raw ASCII tab as uploaded. Never changes.
- **Mode chip** — hovering shows the mode's interval formula (e.g. `1  2  b3  4  5  6  b7` for Dorian).
- **Key selector** — choose any of the 12 chromatic notes. Positions re-fetch immediately.
- **Algorithm selector** — toggle between `Greedy`, `Chord`, and `DFS` position-finding strategies.
- **Instrument selector** — pick a preset or enter a custom tuning. Custom tuning only takes effect after clicking Apply (or pressing Enter).
- **Positions grid** — rendered ASCII tabs, one card per playable position. Grid column width auto-sizes to the tab content. The header reads `Positions in A — Bass` (key + instrument) so it's always clear what you're looking at.

### Songs (`/songs`)

Lists all songs in the library.

- **Song list** — each card shows title, artist, and original key. Clicking navigates to the song detail page.
- **Delete** — inline delete button on each card.
- **Re-parse** — toggle button enables a re-parse button on every card; clicking it calls `POST /api/song/:id/reparse` and shows a ✓ on success. Used to refresh songs after parser logic updates.
- **Upload** — button navigates to `/songs/upload`.

### Song Detail (`/song/:id`)

Full chord sheet viewer with transposition and capo controls.

- **Header** — song title, artist, original key. Tempo shown below the title; clicking it starts the metronome at that BPM.
- **Capo display** — shown on the left when capo > 0; includes a "shape" key (the chord shapes you play) alongside the "sound" key (actual pitch heard).
- **Transpose controls** — `−` / `+` buttons shift all chords by semitones (wraps at ±12). A Reset button appears when semitones ≠ 0. The chord sheet fades to 50% opacity during the fetch; no layout shift.
- **Chord sheet** — rendered by `ChordSheet`; chords are bold and hoverable (see [ChordSheet](#chordsheet)).

### Song Upload (`/songs/upload`)

Form to add a new song.

- Fields: Title (required), Artist, Original Key, Capo, Tempo/BPM, chord sheet textarea (required).
- Submit disabled until title and chord sheet are both filled. Navigates to `/songs` on success.

---

## Components

### `Layout`

Fixed top navbar wrapping the whole app via `<Outlet />`.

- Logo (`Lick Library`) links to `/`.
- Nav links to **Licks** and **Songs**.
- `Metronome` widget anchored to the right side of the navbar.

### `Metronome`

Collapsible popover in the navbar.

- BPM input field + `−1`/`+1` buttons (range 40–240).
- 4-beat visual pulse row — beat 1 accented.
- Start/Stop button (green when stopped, red when playing).
- BPM syncs automatically when the user clicks a song's tempo on `SongDetailPage`.

### `ChordSheet`

Renders a `ChordLyric[]` list as a formatted chord sheet.

- Columns: 2 or 3, as computed by the backend parser.
- Chord tokens are **bold**. Hovering opens a voicing popover:
  - Fetches ASCII tab voicings from `GET /api/chord?root=...&quality=...`.
  - `‹ N/M ›` arrows to page through multiple voicings.
  - Unknown chords show `???`; `NC` / `N.C.` tokens are skipped entirely.
  - Slash chords (e.g. `G/B`): bass note stripped, root quality looked up.
  - Module-level cache — each `root+quality` pair is only fetched once.

### `LickUploadForm`

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

### `LickPositionTab`

Dark terminal-style `<pre>` block (black background, green monospace text) rendering a single tab string from the backend. Scrolls horizontally for wide tabs.

### `SongList` / `SongCard`

`SongList` renders an array of `SongCard` components with an empty-state message.

`SongCard` shows title, artist, original key, a delete button, and (when re-parse mode is active) a re-parse button that shows a ✓ after the call completes.

### `SongUploadForm`

Two-row form (Title + Artist on row 1; Original Key + Capo + Tempo on row 2) plus a chord sheet textarea. Submit disabled until title and chord sheet are filled.

---

## Tab editor

The textarea in `LickUploadForm` implements overwrite-mode editing so the 6×N grid structure is always preserved.

**Cursor rules:**
- Protected characters (`|`, string-label column, newlines) are skipped on advance.
- Backspace moves back one slot and writes `-`, unless on a protected character.
- Non-tab characters are blocked via `preventDefault` — the grid never grows unintentionally.

**Tab expansion:**
When the cursor is on the closing `|` of any line and a valid character is typed, `expandTab()` inserts a `-` before every line's closing `|`, growing all 6 strings by one column simultaneously. The cursor repositions into the new slot.

**Cursor restoration:**
A `nextCursorRef` + `useLayoutEffect` pattern restores `selectionStart`/`selectionEnd` synchronously after React re-renders the controlled textarea, preventing the cursor jumping to the end.

---

## Hooks & context

### `useMetronome(bpm, isPlaying, onBeat?)`

Web Audio API metronome scheduler. Plays oscillator clicks on a lookahead schedule (25 ms tick, 0.1 s lookahead) for drift-free timing. Beat 1 of each 4-beat cycle uses a 1000 Hz oscillator; beats 2–4 use 800 Hz. Cleans up the audio context on unmount.

### `useInstrument()`

Manages selected instrument and custom tuning string. Persists to `localStorage`:

| Key | Value |
|---|---|
| `lick_instrument` | `InstrumentName` (e.g. `BASS`) |
| `lick_custom_tuning` | tuning string (e.g. `E A D G B E`) |

Both `LicksPage` and `LickDetailPage` share the same hook and initialise from `localStorage` on mount.

### `MetronomeContext`

Global state provider: `{ bpm, setBpm, isPlaying, setIsPlaying }`. Default BPM 120, not playing. Wraps the app in `main.tsx`. Lets `SongDetailPage` set BPM by clicking the tempo without prop-drilling through `Layout` and `Metronome`.

---

## Utilities

### `parseChordName(name: string): ParsedChord | null`

Parses a chord symbol into backend-compatible components.

- Maps display note names (`C`, `C#`, `Db`, `Bb`, …) to Java enum format (`C`, `C_SHARP`, `B_FLAT`, …).
- Strips slash bass note (`G/B` → root `G`).
- Returns `null` for `NC`, `N.C.`, and unrecognised tokens.
- Returns `{ root: string, quality: string }` on success.

---

## API client (`src/api/client.ts`)

Base URL: `http://{hostname}:8080/api`

### Lick endpoints

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

`getLick` throws `Error(statusCode)` on non-2xx. The detail page catches `'400'` to show a specific "invalid tuning" message.

### Song endpoints

```typescript
getAllSongs(): Promise<SongSummary[]>

uploadSong(request: UploadSongRequest): Promise<SongSummary>

getSong(id: string, semitones?: number): Promise<SongDetail>
// sends ?semitones=N; omitted when 0

deleteSong(id: string): Promise<void>

reparseSong(id: string): Promise<SongDetail>
```

### Chord endpoint

```typescript
getChordVoicings(root: string, quality: string): Promise<string[]>
// Returns list of ASCII tab voicing strings
```

---

## Project structure

```
src/
├── api/
│   └── client.ts                  Typed fetch wrappers + response interfaces
├── contexts/
│   └── MetronomeContext.tsx        Global BPM + playback state
├── hooks/
│   ├── useInstrument.ts            localStorage-backed instrument/tuning state
│   └── useMetronome.ts             Web Audio API metronome scheduler
├── pages/
│   ├── LicksPage.tsx              /              lick list + upload
│   ├── LickDetailPage.tsx         /lick/:id      positions view
│   ├── SongsPage.tsx              /songs         song list
│   ├── SongDetailPage.tsx         /song/:id      chord sheet + transpose
│   └── SongUploadPage.tsx         /songs/upload  upload form
├── components/
│   ├── Layout.tsx                 Fixed navbar + Outlet
│   ├── Metronome.tsx              Popover metronome widget
│   ├── ChordSheet.tsx             Chord sheet renderer + voicing popovers
│   ├── LickList.tsx               Renders array of LickCard
│   ├── LickCard.tsx               Single lick library card
│   ├── LickUploadForm.tsx         Tab editor + upload controls
│   ├── LickPositionTab.tsx        Single position tab display
│   ├── SongList.tsx               Renders array of SongCard
│   ├── SongCard.tsx               Single song library card
│   ├── SongUploadForm.tsx         Song upload form fields
│   ├── InstrumentSelector.tsx     Preset + custom tuning selector
│   └── KeySelector.tsx            12-note key dropdown
└── utils/
    └── parseChordName.ts          Chord symbol parser
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

interface SongSummary {
  id: string;
  title: string;
  artist: string;
  originalKey: string;
  canReparse: boolean;
}

interface SongDetail extends SongSummary {
  capo: number;
  tempo: number;
  chordLines: ChordLyric[];
  numColumns: number;
}

interface ChordLyric {
  chords: string;
  lyrics: string;
  fontSize: number;
}

interface UploadSongRequest {
  title: string;
  artist?: string;
  originalKey?: string;
  capo?: number;
  tempo?: number;
  rawChordSheet: string;
}

type InstrumentName =
  | 'GUITAR' | 'DROP_D' | 'OPEN_G' | 'OPEN_D' | 'DADGAD'
  | 'BASS' | 'UKULELE' | 'MANDOLIN' | 'BANJO' | 'CUSTOM';
```
