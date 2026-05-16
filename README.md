# Lick Library — Frontend

React UI for the Lick Library backend. Upload guitar tabs, browse your lick library, and view playable positions in any key on any instrument. Upload chord sheets, transpose them on the fly, hover over chords for fingering diagrams, and view songs in a scrolling single-column mode.

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

The app includes a PWA manifest (`public/manifest.json`) with `display: standalone`. When added to an iPad home screen via Safari → Share → Add to Home Screen, it opens without browser chrome.

---

## Pages

### Home (`/`)

Landing page. Shows feature cards for Licks, Songs, Chord Gallery, Playlists, Theory, and Live. Clicking a card navigates to that section.

### Licks (`/licks`)

Shows the full lick library and the upload form.

- **Upload form** — paste or type a tab, pick an optional root key and mode, submit. The tab editor enforces structure (see [Tab editor](#tab-editor) below).
- **Instrument selector** — sets the default instrument for all lick views. Persists across sessions via `localStorage`.
- **Lick list** — each card shows the interval display string, detected mode, and the original raw tab. Clicking a card navigates to the detail page.
- **Delete** — the `×` on each card deletes the lick and refreshes the list.

### Lick Detail (`/lick/:id`)

Full view for a single lick.

- **Original tab** — the raw ASCII tab as uploaded.
- **Mode chip** — hovering shows the mode's interval formula.
- **Key selector** — choose any of the 12 chromatic notes. Positions re-fetch immediately.
- **Algorithm selector** — toggle between `Greedy`, `Chord`, and `DFS`.
- **Instrument selector** — pick a preset or enter a custom tuning.
- **Positions grid** — rendered ASCII tabs, one card per playable position.

### Songs (`/songs`)

Lists all songs in the library.

- **Sort** — sortable by title, artist, key, or tempo (asc/desc toggle).
- **Filter** — filter by artist via dropdown.
- **Pagination** — 18 songs per page.
- **Manage mode** — toggle reveals re-parse (↺) and manage (✎) buttons on each card; card click disabled while active.
- **Upload** — navigates to `/songs/upload`.

### Song Detail (`/song/:id`)

Full chord sheet viewer.

- **Header** — title, artist, tempo (clicking starts the metronome), tuning label.
- **Capo widget** — adjust capo independently of transpose; shows current capo fret with reset.
- **Transpose widget** — `−`/`+` shift all chords by semitones (wraps at ±12). Displays both shape key (chords you finger) and sound key (pitch heard). Reset button appears when semitones ≠ 0.
- **View toggle** — switches between column view (2–3 columns, normal font) and scroll view (single column, 2× font). Scroll view has a sticky header and an autoscroll `▶/⏸` button that slowly scrolls the page.
- **Show Chords** — fixed bottom panel showing chord diagrams for every chord in the song. Diagrams are navigable with ‹/› arrows. Clicking a missing chord opens the upload modal.
- **Hover diagrams** — hovering any chord token in the sheet opens a voicing popover.
- **Manage (✎)** — navigates to the song manage page.

### Song Manage (`/song/:id/manage`)

Edit song metadata and chord chart.

- **Metadata fields** — title, artist, original key, tempo. Submit enabled on change.
- **Update Chart** — reveals a raw chord sheet textarea; submitting re-parses the song.
- **Manage Chords** — lists all detected chords with their diagrams; each has an add voicing (+) button.
- **Delete Song** — confirmation dialog before deletion.

### Song Upload (`/songs/upload`)

Form to add a new song. Fields: title, artist, original key, capo, tempo, chord sheet textarea.

### Chord Gallery (`/chords`)

Browse all chord voicings by root note.

- **Key selector** — pick any root note.
- **Grid** — one card per chord quality, showing the first voicing and `‹ N/M ›` navigation.
- **Manage mode** — click a chord card to view all voicings with a delete button on each.
- **Add Chord** — navigates to `/chords/upload`.

### Chord Upload (`/chords/upload`)

Form to upload a new chord voicing. Chord name field (parsed into root + quality), fret input per string, live preview diagram.

### Stub pages

- **Playlists (`/playlists`)** — coming soon: playlists with per-song key/capo overrides.
- **Theory (`/theory`)** — coming soon: circle of fifths, CAGED shapes, mode reference.
- **Live (`/live`)** — coming soon: real-time pitch detection with animated neck.

---

## Components

### `Layout`

Fixed top navbar wrapping the whole app via `<Outlet />`.

- Logo (`Lick Library`) links to `/` (home).
- Nav links: Licks, Songs, Chord Gallery, Playlists, Theory, Live.
- `Metronome` widget anchored to the right side of the navbar.

### `Metronome`

Collapsible popover in the navbar.

- BPM input + `−1`/`+1` buttons (range 40–240).
- 4-beat visual pulse row — beat 1 accented.
- Start/Stop button.
- BPM syncs automatically when the user clicks a song's tempo on `SongDetailPage`.

### `ChordSheet`

Renders a `ChordLyric[]` list as a formatted chord sheet.

- Column count and font sizes come from the backend.
- Accepts a `fontScale` multiplier (scroll view uses `2`).
- Chord tokens are bold and hoverable — popover shows a `ChordDiagram` with `‹ N/M ›` voicing navigation. Popover flips above the token when near the bottom of the viewport.
- `NC` / `N.C.` tokens are not bolded and have no popover.
- Module-level voicing cache — each `root+quality` pair is only fetched once per session.

### `ChordDiagram`

SVG chord diagram. Renders a guitar neck grid with dots for fretted strings, `×` for muted strings, and an `○` for open strings. Accepts a `frets` array and `width` prop; height scales proportionally.

### `ChordUploadModal`

Modal for uploading a new voicing for a specific chord. Chord name field is pre-filled and locked. On success, the voicing cache is invalidated and the new diagram is shown immediately.

### `LickUploadForm`

Tab editor with structured input handling.

- Pre-filled with an empty 6-string, 16-column template.
- Overwrite-mode editing with cursor auto-advance.
- Only valid tab characters accepted: `0–9`, `h`, `p`, `/`, `\`, `-`.
- String labels and closing `|` bars are protected.
- Typing at the closing `|` expands the tab by one column across all strings.

### `InstrumentSelector`

Named preset dropdown + optional custom tuning input. Presets: GUITAR, DROP_D, OPEN_G, OPEN_D, DADGAD, BASS, UKULELE, MANDOLIN, BANJO, CUSTOM.

### `KeySelector`

Controlled dropdown over all 12 chromatic notes (`C_SHARP`, `B_FLAT`, etc.).

### `SongCard`

Clickable song library card. Three-tier font sizing (`text-sm` / `text-xs` / `text-[10px]`) with `line-clamp-2` keeps cards uniform height. Shows key and tempo in normal mode; re-parse and manage buttons in manage mode.

---

## Tab editor

The textarea in `LickUploadForm` implements overwrite-mode editing so the 6×N grid structure is always preserved.

**Cursor rules:**
- Protected characters (`|`, string-label column, newlines) are skipped on advance.
- Backspace moves back one slot and writes `-`, unless on a protected character.
- Non-tab characters blocked via `preventDefault`.

**Tab expansion:**
When the cursor is on the closing `|` and a valid character is typed, `expandTab()` inserts a `-` before every line's closing `|`, growing all 6 strings by one column.

**Cursor restoration:**
A `nextCursorRef` + `useLayoutEffect` pattern restores `selectionStart`/`selectionEnd` synchronously after React re-renders.

---

## Hooks & context

### `useMetronome(bpm, isPlaying, onBeat?)`

Web Audio API metronome scheduler. Plays oscillator clicks on a lookahead schedule (25 ms tick, 0.1 s lookahead). Beat 1 uses 1000 Hz; beats 2–4 use 800 Hz.

### `useInstrument()`

Manages selected instrument and custom tuning string. Persists to `localStorage` (`lick_instrument`, `lick_custom_tuning`).

### `MetronomeContext`

Global state: `{ bpm, setBpm, isPlaying, setIsPlaying }`. Default BPM 120. Lets `SongDetailPage` start the metronome at a song's tempo without prop-drilling.

---

## Utilities

### `parseChordName(name: string): ParsedChord | null`

Parses a chord symbol into backend-compatible components. Maps display names (`C#`, `Db`, `Bb`) to enum format (`C_SHARP`, `B_FLAT`). Strips slash bass note. Returns `null` for `NC`, `N.C.`, and unrecognised tokens.

---

## API client (`src/core/api/client.ts`)

Base URL: `http://{hostname}:8080/api`

### Lick endpoints

```typescript
getAllLicks(): Promise<LickSummary[]>
uploadLick(request: UploadRequest): Promise<LickSummary>
getLick(id, key, algo?, instrument?, customTuning?): Promise<LickDetail>
deleteLick(id: string): Promise<void>
```

### Song endpoints

```typescript
getAllSongs(): Promise<SongSummary[]>
uploadSong(request: UploadSongRequest): Promise<SongSummary>
getSong(id: string, semitones?: number): Promise<SongDetail>
updateSong(id: string, request: UpdateSongRequest): Promise<SongDetail>
reparseSong(id: string): Promise<SongDetail>
deleteSong(id: string): Promise<void>
```

### Chord endpoints

```typescript
getChordVoicings(root: string, quality: string): Promise<ChordVoicing[]>
getAllChordVoicings(root: string): Promise<Record<string, ChordVoicing[]>>
uploadChordVoicing(chordName: string, frets: number[]): Promise<ChordVoicing>
deleteChordVoicing(id: string): Promise<void>
```

---

## Project structure

```
src/
├── core/
│   ├── api/
│   │   └── client.ts              Typed fetch wrappers + response interfaces
│   ├── metronome/
│   │   ├── MetronomeContext.tsx
│   │   ├── MetronomeWidget.tsx
│   │   └── useMetronome.ts
│   └── useInstrument.ts
├── components/
│   ├── Layout.tsx                 Fixed navbar + Outlet
│   ├── InstrumentSelector.tsx
│   └── KeySelector.tsx
└── features/
    ├── home/
    │   └── HomePage.tsx           /
    ├── licks/
    │   ├── LicksPage.tsx          /licks
    │   ├── LickDetailPage.tsx     /lick/:id
    │   ├── LickCard.tsx
    │   ├── LickList.tsx
    │   ├── LickPositionTab.tsx
    │   └── LickUploadForm.tsx
    ├── songs/
    │   ├── SongsPage.tsx          /songs
    │   ├── SongDetailPage.tsx     /song/:id
    │   ├── SongManagePage.tsx     /song/:id/manage
    │   ├── SongUploadPage.tsx     /songs/upload
    │   ├── SongCard.tsx
    │   ├── SongList.tsx
    │   ├── SongUploadForm.tsx
    │   ├── ChordSheet.tsx
    │   └── parseChordName.ts
    ├── chords/
    │   ├── ChordsGalleryPage.tsx  /chords
    │   ├── ChordUploadPage.tsx    /chords/upload
    │   ├── ChordDiagram.tsx       SVG chord diagram
    │   └── ChordUploadModal.tsx   Voicing upload modal
    ├── playlists/
    │   └── PlaylistsPage.tsx      /playlists  (stub)
    ├── theory/
    │   └── TheoryPage.tsx         /theory     (stub)
    └── live/
        └── LivePage.tsx           /live       (stub)
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

interface PositionResponse { tabString: string; }

interface SongSummary {
  id: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  tempo: number | null;
  canReparse: boolean;
}

interface SongDetail extends SongSummary {
  capo: number | null;
  chordLines: ChordLyric[];
  numColumns: number;
}

interface ChordLyric {
  chords: string;
  lyrics: string;
  fontSize: number;
}

interface ChordVoicing {
  id: string;
  frets: number[];    // -1 = open, 0+ = fret number; length matches string count
  source: string;     // "system" | "user"
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
