# Lick Library — Frontend

React UI for the Lick Library backend. Upload guitar tabs, browse your lick library, and view playable positions in any key on any instrument. Upload chord sheets, transpose them on the fly, hover over chords for fingering diagrams, and view songs in a scrolling single-column mode. Manage playlists with per-song key and capo overrides. Explore scales, pentatonic overlays, and chord progressions on a live guitar neck with real-time pitch detection.

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
- **Add to Playlist** — opens `AddToPlaylistModal` to add the song to any existing playlist.
- **Playlist navigation** — when opened from a playlist detail page, shows prev/next arrows and the playlist name in the header.
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

### Playlists (`/playlists`)

List and manage all playlists.

- **Create** — name input + submit; new playlist appears immediately.
- **Rename** — click the playlist name on a card to edit inline.
- **Delete** — button on each card with confirmation.
- **Navigate** — clicking a card navigates to the playlist detail page.

### Playlist Detail (`/playlist/:id`)

Song queue manager for a playlist.

- **Entry list** — each entry shows title, artist, and any key/capo overrides.
- **Reorder** — ↑/↓ buttons move entries; reflected immediately.
- **Per-entry overrides** — key offset (semitones) and capo offset; opening the modal shows the resulting shape key and sound key in real time. Saving stores the override; clearing resets to the song's defaults.
- **Remove** — removes the entry from the playlist.
- **Navigate to song** — clicking an entry opens the song detail page with playlist nav context (prev/next arrows, playlist name).
- **Add songs** — songs not yet in the playlist appear in an add panel below the queue; clicking adds them immediately.

### Theory (`/theory`)

Redirects to `/live?mode=chords`.

### Live (`/live`)

Three-panel guitar neck experience. The view mode pill (Live / Lick / Chords) is right-aligned in the toolbar.

**Live mode** — real-time pitch detection + scale visualization.

- **Key + Mode selectors** — choose any root note and scale mode; the neck shows all scale degrees as colored dots.
- **Interval legend** — clickable degree bubbles highlight all instances of that degree on the neck. Multiple degrees can be selected simultaneously.
- **Mic button** — starts the Web Audio API pitch detector. The detected note lights up on the neck as `active`; the three nearest scale candidates pulse with candidate rings.
- **Pentatonic overlay** — Pentatonic widget lets you select up to 3 keys simultaneously; colored rings are overlaid on each neck dot for the selected pentatonic scales.
- **CAGED zones** — diatonic CAGED shape overlays are drawn as semi-transparent region bands on the fretboard.
- **Dot click** — clicking a neck dot highlights it and shows its scale degree candidates.

**Lick mode** (`LickVisualizerPanel`) — load, build, and step through licks.

- **Panel mode toggle** — Visualize / Build.
- **Visualize mode**:
  - Load from Library opens `LickLibraryModal` to select a saved lick.
  - New Lick / Edit Lick open `LickInputModal` — a smart tab editor with the same overwrite-mode keyboard rules as the upload form.
  - The guitar neck shows all notes (All mode) or the current column (Column mode).
  - Tab display below the neck: compact normalized format in All mode; spread format with technique decorators in Column mode.
  - Column mode controls: Column/All pill, 1/sec or Metronome speed, Pause/Resume. Edit Lick and Save Lick are right-aligned in the same row.
  - `LickSource` state machine (`none → new/library → modified`) controls Save Lick enablement.
- **Build mode**:
  - Click any fret on the neck to append a note column.
  - A textarea shows the built tab in normalized format (editable).
  - Save Lick uploads and switches to Visualize mode; Clear resets the neck.

**Chords mode** (`ChordsProgressionPanel`) — chord progression reference and visualization.

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

### `GuitarNeck`

SVG guitar neck diagram used across Live and Lick visualizer.

- `dots: NeckDot[][]` — indexed by `[stringIndex][fret]`; string 0 = low E.
- `fretCount` — default 12.
- `onDotClick` — optional callback for build mode and dot highlighting.
- `cagedZones` — optional CAGED region overlays.
- Degree colors: 1=red, 2=cyan, 3=green, 4=yellow, 5=purple, 6=blue, 7=orange.
- Active notes pulse; candidate notes show animated stroke rings at decreasing opacity for 1st/2nd/3rd closest.
- Pentatonic rings rendered as concentric colored circles outward from the dot.

### `LickVisualizerPanel`

Self-contained lick visualizer (Live → Lick mode). Parses ASCII tab locally with no backend call for the primary display flow. See [Live page](#live-live) for full feature description.

Key internals:
- `parseTabString` — parses normalized ASCII tab into `TabColumn[]` (NoteCol | RestCol), capturing technique chars (`h`, `p`, `/`, `\`).
- `buildNormalizedTab` — compact format: `label + '-' + col0sep + col1sep + ... + '|'` where separator is the technique char or `-`.
- `buildSpreadTab` — SPREAD_SLOT=4 chars per column; technique placed at the second pad position (`5-h-`).
- `LickSource` state: `'none' | 'new' | 'library' | 'modified'`.

### `PentatonicWidget`

Expandable panel (Live → Live mode) for selecting pentatonic scale overlays.

- Up to 3 root keys selectable simultaneously, each assigned a distinct ring color.
- Toggling a key on/off updates the neck overlay in real time.

### `ChordsProgressionPanel`

Chord progression panel (Live → Chords mode).

### `ChordSheet`

Renders a `ChordLyric[]` list as a formatted chord sheet.

- Column count and font sizes come from the backend.
- Accepts a `fontScale` multiplier (scroll view uses `2`).
- Chord tokens are bold and hoverable — popover shows a `ChordDiagram` with `‹ N/M ›` voicing navigation. Popover flips above the token when near the bottom of the viewport.
- `NC` / `N.C.` tokens are not bolded and have no popover.
- Module-level voicing cache — each `root+quality` pair is only fetched once per session.

### `ChordDiagram`

SVG chord diagram. Renders a guitar neck grid with dots for fretted strings, `×` for muted strings, and `○` for open strings. Accepts a `frets` array (`(number | null)[]`, null = muted) and `width` prop.

### `ChordUploadModal`

Modal for uploading a new voicing for a specific chord. Chord name field is pre-filled and locked. On success, the voicing cache is invalidated and the new diagram is shown immediately.

### `LickInputModal`

Modal tab editor for New Lick and Edit Lick flows. Same smart overwrite-mode keyboard handling as `LickUploadForm`. Calls `onVisualize(rawTab)` on submit; no upload.

### `LickLibraryModal`

Modal to browse and select a saved lick. Fetches `getAllLicks()` and renders each as a card with mode chip and raw tab preview. `onSelect(rawTab)` is called on click.

### `AddToPlaylistModal`

Modal to add the current song to a playlist. Lists all playlists; highlights ones that already contain the song. Handles duplicate detection.

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

The textarea in `LickUploadForm` and `LickInputModal` implements overwrite-mode editing so the 6×N grid structure is always preserved.

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

### `usePitchDetection(listening)`

Web Audio API pitch detector. Returns the current detected MIDI note number (or null). Used in Live mode to highlight the active neck dot.

### `useInstrument()`

Manages selected instrument and custom tuning string. Persists to `localStorage` (`lick_instrument`, `lick_custom_tuning`).

### `MetronomeContext`

Global state: `{ bpm, setBpm, isPlaying, setIsPlaying }`. Default BPM 120. Lets `SongDetailPage` start the metronome at a song's tempo and `LickVisualizerPanel` borrow the BPM for metronome-synced column stepping.

### `SongNavContext`

Global state carrying playlist navigation info when opening a song from a playlist detail page. Provides `{ info, setInfo, collapsed, setCollapsed, showChords, setShowChords }` where `info` holds `{ playlistId, playlistName, entries[], currentIndex }`. `SongDetailPage` reads this to show prev/next navigation and the playlist name.

---

## Utilities

### `parseChordName(name: string): ParsedChord | null`

Parses a chord symbol into backend-compatible components. Maps display names (`C#`, `Db`, `Bb`) to enum format (`C_SHARP`, `B_FLAT`). Strips slash bass note. Returns `null` for `NC`, `N.C.`, and unrecognised tokens.

### `cagedUtils.ts`

Computes CAGED zone boundaries from scale positions for fretboard overlay rendering.

### `diatonicUtils.ts`

Helpers for diatonic interval and mode calculations used in the Live page.

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
uploadChordVoicing(request: UploadChordRequest): Promise<void>
deleteChordVoicing(id: string): Promise<void>
reseedChordDefaults(): Promise<void>
```

### Playlist endpoints

```typescript
getAllPlaylists(): Promise<PlaylistSummary[]>
createPlaylist(name: string): Promise<PlaylistSummary>
getPlaylist(id: string): Promise<PlaylistDetail>
renamePlaylist(id: string, name: string): Promise<PlaylistSummary>
deletePlaylist(id: string): Promise<void>
addPlaylistEntry(playlistId, songId, keyOffset?, capoOffset?): Promise<PlaylistDetail>
updatePlaylistEntry(playlistId, entryId, req): Promise<PlaylistDetail>
removePlaylistEntry(playlistId: string, entryId: string): Promise<PlaylistDetail>
getPlaylistsContainingSong(songId: string): Promise<{ playlistId, entryId }[]>
clearPlaylistEntryOverrides(playlistId, entryId): Promise<PlaylistDetail>
```

### Scale endpoint

```typescript
getScalePositions(root: string, mode: string): Promise<ScaleResponse>
// ScaleResponse: { root, mode, positions: { string, fret, degree, note }[] }
```

---

## Project structure

```
src/
├── core/
│   ├── api/
│   │   └── client.ts                  Typed fetch wrappers + response interfaces
│   ├── context/
│   │   └── SongNavContext.tsx         Playlist nav state for song detail prev/next
│   ├── metronome/
│   │   ├── MetronomeContext.tsx
│   │   ├── MetronomeWidget.tsx
│   │   └── useMetronome.ts
│   └── useInstrument.ts
├── components/
│   ├── Layout.tsx                     Fixed navbar + Outlet
│   ├── InstrumentSelector.tsx
│   └── KeySelector.tsx
└── features/
    ├── home/
    │   └── HomePage.tsx               /
    ├── licks/
    │   ├── LicksPage.tsx              /licks
    │   ├── LickDetailPage.tsx         /lick/:id
    │   ├── LickCard.tsx
    │   ├── LickList.tsx
    │   ├── LickPositionTab.tsx
    │   └── LickUploadForm.tsx
    ├── songs/
    │   ├── SongsPage.tsx              /songs
    │   ├── SongDetailPage.tsx         /song/:id
    │   ├── SongManagePage.tsx         /song/:id/manage
    │   ├── SongUploadPage.tsx         /songs/upload
    │   ├── SongCard.tsx
    │   ├── SongList.tsx
    │   ├── SongUploadForm.tsx
    │   ├── ChordSheet.tsx
    │   └── parseChordName.ts
    ├── chords/
    │   ├── ChordsGalleryPage.tsx      /chords
    │   ├── ChordUploadPage.tsx        /chords/upload
    │   ├── ChordCard.tsx
    │   ├── ChordDiagram.tsx           SVG chord diagram
    │   ├── ChordManageModal.tsx       Per-chord voicing management
    │   ├── ChordUploadForm.tsx
    │   └── ChordUploadModal.tsx       Inline voicing upload from song detail
    ├── playlists/
    │   ├── PlaylistsPage.tsx          /playlists
    │   ├── PlaylistDetailPage.tsx     /playlist/:id
    │   └── AddToPlaylistModal.tsx     Add-to-playlist from song detail
    ├── theory/
    │   └── TheoryPage.tsx             /theory  (redirects to /live?mode=chords)
    └── live/
        ├── LivePage.tsx               /live  (Live / Lick / Chords mode toggle)
        ├── GuitarNeck.tsx             SVG neck diagram
        ├── LickVisualizerPanel.tsx    Lick mode panel
        ├── LickInputModal.tsx         New Lick / Edit Lick tab editor modal
        ├── LickLibraryModal.tsx       Load from Library modal
        ├── PentatonicWidget.tsx       Pentatonic scale overlay selector
        ├── ChordsProgressionPanel.tsx Chords mode panel
        ├── cagedUtils.ts              CAGED zone boundary helpers
        ├── diatonicUtils.ts           Diatonic interval helpers
        └── usePitchDetection.ts       Web Audio pitch detector hook
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
  chordLines: ChordSheetLine[];
  numColumns: number;
  rawChordSheet: string | null;
}

type ChordSheetLine = ChordLyric | GuitarTabLine;

interface ChordLyric  { type?: 'chord'; chords: string; lyrics: string; fontSize: number; }
interface GuitarTabLine { type: 'tab'; header: string; tabLines: string[]; fontSize: number; }

interface ChordVoicing {
  id: string;
  frets: (number | null)[];  // null = muted (x), 0 = open, positive = fret number; index 0 = low E
}

interface PlaylistSummary { id: string; name: string; songCount: number; }

interface PlaylistEntry {
  entryId: string;
  songId: string;
  title: string;
  artist: string | null;
  position: number;
  keyOffset: number;
  capoOffset: number;
  originalKey: string | null;
  defaultCapo: number;
  tempo: number | null;
}

interface PlaylistDetail { id: string; name: string; entries: PlaylistEntry[]; }

interface ScalePosition { string: number; fret: number; degree: number; note: string; }
interface ScaleResponse { root: string; mode: string; positions: ScalePosition[]; }

type InstrumentName =
  | 'GUITAR' | 'DROP_D' | 'OPEN_G' | 'OPEN_D' | 'DADGAD'
  | 'BASS' | 'UKULELE' | 'MANDOLIN' | 'BANJO' | 'CUSTOM';
```
