# Lick Library — Frontend

React UI for the Lick Library backend. Sign in with Google, upload guitar tabs, browse your lick library, and view playable positions in any key on any instrument. Upload chord sheets, transpose them on the fly, hover over chords for fingering diagrams, and view songs in a scrolling single-column mode. Manage playlists with per-song key and capo overrides. Explore scales, pentatonic overlays, and chord progressions on a live guitar neck with real-time pitch detection. Use Noodle mode for a beat-synchronized karaoke display while you play along.

---

## Stack

| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Router | React Router 7 |
| Styling | Tailwind CSS v4 |
| HTTP | Fetch API (no library) |
| Chord diagrams | svguitar |

---

## Running

```bash
npm install
npm run dev
```

App available at `http://localhost:5173`. Expects the backend at `http://{hostname}:8080` — uses the page's own hostname so it works on the local network (e.g. from an iPad).

The app includes a PWA manifest (`public/manifest.json`) with `display: standalone`. When added to an iPad home screen via Safari → Share → Add to Home Screen, it opens without browser chrome.

---

## Authentication

The app uses Google OAuth2 via the backend. JWTs are stored client-side.

### Login flow

1. Home page shows a "Sign in with Google" button for unauthenticated users.
2. Clicking it redirects to `/api/oauth2/authorize?provider=google` on the backend.
3. After Google authenticates, the backend issues a JWT and redirects to `/auth?token=<jwt>`.
4. `AuthCallbackPage` extracts the token, stores it in `localStorage` as `lick_library_token`, and navigates to `/`.

### Route protection

All routes except `/` and `/auth` are wrapped in `ProtectedRoute`. Unauthenticated users are redirected to `/`. The `/live` route additionally requires `role = ADMIN`.

Users with `status = PENDING` can access `/user` only — they see a waiting-for-approval message everywhere else until an admin approves their account.

### Auth state

`AuthContext` (via `useAuth()`) provides:

```typescript
{ currentUser: UserProfile | null, token: string | null, statusResolved: boolean, login, logout }
```

The JWT is decoded client-side on load for `{ userId, role, status }`. On mount the context also calls `GET /api/user/me` to hydrate the latest `status` and `requestType`. A `auth:unauthorized` window event (dispatched by the API client on any 401 response) triggers auto-logout.

---

## Pages

### Home (`/`)

Landing page. Shows feature cards for Licks, Songs, Chord Gallery, Playlists, Theory, and Live. Unauthenticated users see a "Sign in with Google" button; `PENDING` users see a waiting message.

### Licks (`/licks`)

Shows the full lick library and the upload form.

- **Upload form** — paste or type a tab, pick an optional root key, mode, and instrument, then submit. The tab editor enforces structure (see [Tab editor](#tab-editor) below).
- **Instrument selector** — sets the instrument for the upload form. Persists across sessions via `localStorage`.
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

### Lick Visualizer (`/lick/visualizer`)

Interactive lick viewer.

- **Load from Library** — opens `LickLibraryModal` to select a saved lick.
- **New Lick / Edit Lick** — open `LickInputModal`, a smart tab editor with overwrite-mode keyboard rules.
- **Guitar neck** — shows all notes simultaneously (All mode) or one column at a time (Column mode).
- **Tab display** — compact normalized format in All mode; spread format with technique decorators in Column mode.
- **Column mode controls** — Column/All pill, 1/sec or Metronome speed, Pause/Resume. Edit Lick and Save Lick are right-aligned in the same row.
- **`LickSource` state machine** (`none → new/library → modified`) controls Save Lick enablement.

### Lick Builder (`/licks/builder`)

Click-to-build neck interface for composing licks.

- **Scale overlay** — select a root note and mode; scale degrees appear as colored dots on the neck.
- **Instrument selector** — change the instrument; resets the built tab.
- **Start / Stop** — toggles recording mode. While recording, clicking any fret appends a note column.
- **Chord detection (♭³)** — notes tapped within 1.5 s are grouped into one column for chord input.
- **Tab textarea** — the built lick rendered in normalized tab format; directly editable.
- **Save Lick** — uploads the built tab and navigates to `/lick/visualizer` with the tab preloaded.
- **Clear / Copy** — reset the neck or copy the tab to clipboard.

### Theory (`/theory`)

Scale and harmony reference tool.

- **Key + Mode + Instrument selectors** — choose any root note, diatonic mode, and instrument; the neck updates immediately.
- **Interval legend** — 7 clickable degree bubbles (colored 1–7). Clicking a bubble toggles per-degree highlighting across the entire neck; multiple degrees can be selected simultaneously. A "Clear" button appears when any are active.
- **Guitar neck** — scale degrees rendered as colored dots. Clicking a dot lights it up as `active` and shows the 3 nearest scale candidates as ranked proximity rings (auto-clears after 3 s; click again to deselect early).
- **`PentatonicWidget`** — expandable panel for pentatonic overlays. Select up to 3 root keys simultaneously; colored rings are overlaid on each neck dot for each selected pentatonic scale. Mode sync toggle keeps the widget's mode in step with the scale selector. When interval degrees are highlighted, the widget also indicates which pentatonic keys are subsets of those degrees.
- **`ChordsWidget`** — expandable panel for chord voicing exploration. Click frets on the neck to select one position per string; the widget shows the resulting voicing.

### Live (`/live`) *(admin only)*

Real-time pitch detection against a scale.

- **Key + Mode + Instrument selectors** — choose any root note, diatonic mode, and instrument; the neck shows all scale degrees as colored dots.
- **Listen button** — starts the Web Audio API pitch detector. The detected MIDI note lights up on the neck as `active`; the 3 nearest scale candidates show animated candidate rings.
- Mic error messages for `NotAllowedError` (permission denied), `NotFoundError` (no mic), and `NotSecureContext` (non-HTTPS).
- No pentatonic widget, no interval legend, no chord panel.

### Noodle (`/noodle`)

Beat-synchronized karaoke chord display with guitar neck visualization.

- **Modes**: `none` (neck only), `song` (loaded song with karaoke), `freeChords` (manual chord entry).
- **URL params on mount**: `?songId` auto-loads a song; `?semitones`, `?capo`, and `?tempoOverride` set the initial controls. Used by the Song Detail page's "Noodle" deep link.
- **Song picker** — `SongLibraryModal` to load any song from the library.
- **`KaraokeDisplay`** — scrolling chord sheet that highlights the current chord in sync with the beat. Timing is driven by the song's saved beatmap; auto-generates one as a fallback.
- **`ChordInfoBox`** — the current (and next) chord's voicing diagram is shown in the header so you can see where to fret as the song progresses.
- **Free Chords mode** — type chord names separated by `|` and newlines; press Apply (or Cmd/Ctrl+Enter). Beat cycles through the chords with a karaoke-style 3-line display (prev / current / next).
- **Guitar Karaoke mode** — ◎ toggle button (song mode only). Hides the guitar neck and shows a large karaoke-only view; the title bar changes to "Guitar Karaoke".
- **Beatmap editor modal** — "Beat Map" button when a song is loaded. Displays each chord with a step-cycled beat value (−/+) and the lyric line below it for reference. Song owners save directly; non-owners submit for admin review. Auto-generated beatmaps show a ⚠ auto badge.
- **BPM input** — `NumpadInput` field (40–240); committed to `MetronomeContext` when Play is pressed.
- **Capo control** — −/+ adjust the capo offset, shifting which voicings are displayed.
- **Transpose control** (song mode only) — −/+ shift semitones; updates the neck scale key in real time.
- **Instrument selector** — drives the neck scale and chord voicing display.

### User (`/user`)

Profile page and admin dashboard. Accessible to all authenticated users including `PENDING`.

- **Profile** — email, username (editable inline), account status. Logout button.
- **My content** — tabs for own licks, songs, and playlists (shown when `APPROVED` or `ADMIN`).
- **Account deletion** — "Request deletion" queues an account-deletion request for admin review. Admins can also delete immediately.
- **Admin panel** (ADMIN role only):
  - **Pending queue** — users awaiting approval or deletion processing; approve/reject buttons.
  - **All users** — full user table with per-user delete.
  - **Song update queue** — pending chart/metadata/beatmap changes submitted by non-owners; clicking opens `SongUpdateReviewModal` to view a diff and approve or reject.

---

## Components

### `Layout`

Fixed top navbar wrapping the whole app via `<Outlet />`.

- Logo (`Lick Library`) links to `/` (home).
- Nav links: Licks, Songs, Chord Gallery, Playlists, Theory, Live, Noodle.
- User avatar / sign-in button on the right; avatar links to `/user`.
- `Metronome` widget anchored to the right side of the navbar.

### `Metronome`

Collapsible popover in the navbar.

- BPM input + `−1`/`+1` buttons (range 40–240).
- 4-beat visual pulse row — beat 1 accented.
- Start/Stop button.
- BPM syncs automatically when the user clicks a song's tempo on `SongDetailPage`.

### `GuitarNeck`

SVG guitar neck diagram used across Theory, Live, Lick Visualizer, Lick Builder, and Noodle.

- `dots: NeckDot[][]` — indexed by `[stringIndex][fret]`; string 0 = low E.
- `fretCount` — default 12.
- `onDotClick` — optional callback for build mode and dot highlighting.
- `cagedZones` — optional CAGED region overlays.
- Degree colors: 1=red, 2=cyan, 3=green, 4=yellow, 5=purple, 6=blue, 7=orange.
- Active notes pulse; candidate notes show animated stroke rings at decreasing opacity for 1st/2nd/3rd closest.
- Pentatonic rings rendered as concentric colored circles outward from the dot.

### `KaraokeDisplay`

Beat-synchronized scrolling chord sheet (Noodle feature). Highlights the currently playing chord token and auto-scrolls to keep it in view. Uses `useChordHighlight` for timing.

### `ChordInfoBox`

Noodle feature overlay showing the current chord's voicing diagram on the guitar neck. Updates as chords change during playback.

### `SongLibraryModal`

Song picker modal used by the Noodle page. Fetches all songs and renders each as a card; `onSelect(song)` called on click.

### `SongUpdateReviewModal`

Admin modal for reviewing a pending song update request. Shows a before/after diff of the chord chart or metadata; provides Approve and Reject buttons.

### `PentatonicWidget`

Expandable panel (Theory page) for selecting pentatonic scale overlays.

- Up to 3 root keys selectable simultaneously, each assigned a distinct ring color.
- Toggling a key on/off updates the neck overlay in real time.

### `ChordsProgressionPanel`

Chord progression panel used by `ChordsWidget` on the Theory page.

### `ChordSheet`

Renders a `ChordSheetLine[]` list as a formatted chord sheet.

- Column count and font sizes come from the backend.
- Accepts a `fontScale` multiplier (scroll view uses `2`).
- Chord tokens are bold and hoverable — popover shows a `ChordDiagram` with `‹ N/M ›` voicing navigation. Popover flips above the token when near the bottom of the viewport.
- `NC` / `N.C.` tokens are not bolded and have no popover.
- Module-level voicing cache — each `root+quality` pair is only fetched once per session.
- `GuitarTabLine` rows are rendered as preformatted tab blocks inline with the chord sheet.

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

### `SongLickCard`

Card component on `SongManagePage` showing a lick associated with the song. Displays the interval string and mode chip.

### `LickUploadForm`

Tab editor with structured input handling.

- Pre-filled with an empty 6-string, 16-column template.
- Overwrite-mode editing with cursor auto-advance.
- Only valid tab characters accepted: `0–9`, `h`, `p`, `/`, `\`, `-`.
- String labels and closing `|` bars are protected.
- Typing at the closing `|` expands the tab by one column across all strings.

### `InstrumentSelector`

Named preset dropdown + optional custom tuning input. Presets: GUITAR, DROP_D, OPEN_G, OPEN_D, DADGAD, EB, BASS, UKULELE, MANDOLIN, BANJO, CUSTOM.

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

### `useAuth()`

Returns `AuthContextValue` from `AuthContext`. Must be used within `AuthProvider`. Provides `{ currentUser, token, statusResolved, login, logout }`. Token stored in `localStorage` as `lick_library_token`; JWT decoded client-side for `userId`, `role`, and `status`. Profile is re-fetched from `/api/user/me` on mount to hydrate the latest status.

### `useMetronome(bpm, isPlaying, onBeat?)`

Web Audio API metronome scheduler. Plays oscillator clicks on a lookahead schedule (25 ms tick, 0.1 s lookahead). Beat 1 uses 1000 Hz; beats 2–4 use 800 Hz.

### `usePitchDetection(listening)`

Web Audio API pitch detector. Returns the current detected MIDI note number (or null). Used in Live mode to highlight the active neck dot.

### `useChordHighlight(chordLines, beats, bpm, isPlaying)`

Noodle feature hook. Maps beat timestamps (from beatmap) or metronome BPM to chord tokens in the chord sheet. Returns the currently active chord index and whether playback is running.

### `useInstrument()`

Manages selected instrument and custom tuning string. Persists to `localStorage` (`lick_instrument`, `lick_custom_tuning`).

### `MetronomeContext`

Global state: `{ bpm, setBpm, isPlaying, setIsPlaying }`. Default BPM 120. Lets `SongDetailPage` start the metronome at a song's tempo and `LickVisualizerPage` borrow the BPM for metronome-synced column stepping.

### `SongNavContext`

Global state carrying playlist navigation info when opening a song from a playlist detail page. Provides `{ info, setInfo, collapsed, setCollapsed, showChords, setShowChords }` where `info` holds `{ playlistId, playlistName, entries[], currentIndex }`. `SongDetailPage` reads this to show prev/next navigation and the playlist name.

---

## Utilities

### `parseChordName(name: string): ParsedChord | null`

Parses a chord symbol into backend-compatible components. Maps display names (`C#`, `Db`, `Bb`) to enum format (`C_SHARP`, `B_FLAT`). Strips slash bass note. Returns `null` for `NC`, `N.C.`, and unrecognised tokens.

### `cagedUtils.ts`

Pentatonic degree and note-set helpers (`getPentatonicDegree`, `getPentatonicNoteSet`) used by `PentatonicWidget` and `TheoryPage`.

### `diatonicUtils.ts`

Helpers for diatonic interval and mode calculations used in the Theory page.

### `lickUtils.ts`

Client-side tab parsing utilities shared between `LickVisualizerPage` and `LickBuilderPage`.

---

## API client (`src/core/api/client.ts`)

Base URL: `http://{hostname}:8080/api`. All requests include `Authorization: Bearer <token>` from `localStorage`. A 401 response dispatches `auth:unauthorized` and triggers logout.

### Auth endpoints

```typescript
getUserProfile(): Promise<UserProfileResponse>
updateUsername(username: string): Promise<UserProfileResponse>
requestDeletion(): Promise<void>
deleteOwnAccount(): Promise<void>
```

### Admin endpoints

```typescript
getAdminQueue(): Promise<AdminUserResponse[]>
getAdminUsers(): Promise<AdminUserResponse[]>
approveUser(userId: number): Promise<void>
rejectUser(userId: number): Promise<void>
deleteAdminUser(userId: number): Promise<void>
getAdminSongUpdateQueue(): Promise<SongUpdateRequestSummary[]>
getSongUpdateForReview(id: string): Promise<SongUpdateReviewResponse>
approveSongUpdate(id: string): Promise<void>
rejectSongUpdate(id: string): Promise<void>
```

### Lick endpoints

```typescript
getAllLicks(includeSongLicks?, filters?): Promise<LickSummary[]>
// filters: { instrument?, mode?, minLength?, maxLength?, intervals?, mine? }
forkLick(id: string): Promise<LickSummary>
uploadLick(request: UploadRequest): Promise<LickSummary>
getLick(id, key, algo?, instrument?, customTuning?): Promise<LickDetail>
deleteLick(id: string): Promise<void>
```

### Song endpoints

```typescript
getAllSongs(mine?: boolean): Promise<SongSummary[]>
uploadSong(request: UploadSongRequest): Promise<SongSummary>
getSong(id: string, semitones?: number): Promise<SongDetail>
updateSong(id: string, request: UpdateSongRequest): Promise<SongDetail>
reparseSong(id: string): Promise<SongDetail>
deleteSong(id: string): Promise<void>
submitSongUpdateRequest(id: string, request: UpdateSongRequest): Promise<SongUpdateRequestSummary>
getBeatmap(songId: string): Promise<BeatmapData>
saveBeatmap(songId: string, beats: number[]): Promise<BeatmapData>
submitBeatmapUpdateRequest(songId: string, beats: number[]): Promise<SongUpdateRequestSummary>
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
setPlaylistVisibility(id: string, isPublic: boolean): Promise<void>
addPlaylistEntry(playlistId, songId, keyOffset?, capoOffset?): Promise<PlaylistDetail>
updatePlaylistEntry(playlistId, entryId, req): Promise<PlaylistDetail>
removePlaylistEntry(playlistId: string, entryId: string): Promise<PlaylistDetail>
getPlaylistsContainingSong(songId: string): Promise<{ playlistId, entryId }[]>
clearPlaylistEntryOverrides(playlistId, entryId): Promise<PlaylistDetail>
```

### Scale endpoint

```typescript
getScalePositions(root: string, mode: string, instrument?: string): Promise<ScaleResponse>
// ScaleResponse: { root, mode, positions: { string, fret, degree, note }[] }
```

---

## Project structure

```
src/
├── core/
│   ├── api/
│   │   └── client.ts                  Typed fetch wrappers + response interfaces
│   ├── auth/
│   │   └── AuthContext.tsx            JWT decode, login/logout, status polling, AuthProvider
│   ├── components/
│   │   ├── Layout.tsx                 Fixed navbar + Outlet
│   │   ├── GuitarNeck.tsx             SVG neck diagram
│   │   ├── InstrumentSelector.tsx
│   │   ├── KeySelector.tsx
│   │   └── NumpadInput.tsx            Mobile numpad for tab entry
│   ├── context/
│   │   └── SongNavContext.tsx         Playlist nav state for song detail prev/next
│   ├── metronome/
│   │   ├── MetronomeContext.tsx
│   │   ├── MetronomeWidget.tsx
│   │   └── useMetronome.ts
│   ├── music.ts                       CHROMATIC_NOTES, getStringLabels, music helpers
│   └── useInstrument.ts
└── features/
    ├── auth/
    │   └── AuthCallbackPage.tsx       /auth  OAuth callback — extracts token, calls login()
    ├── home/
    │   └── HomePage.tsx               /
    ├── licks/
    │   ├── LickLibraryPage.tsx        /licks  and  /licks/library
    │   ├── LickUploadPage.tsx         /licks/upload  (legacy upload form)
    │   ├── LickUploadForm.tsx
    │   ├── LickDetailPage.tsx         /lick/:id
    │   ├── LickVisualizerPage.tsx     /lick/visualizer
    │   ├── LickBuilderPage.tsx        /licks/builder
    │   ├── LickInputModal.tsx         New Lick / Edit Lick tab editor modal
    │   ├── LickLibraryModal.tsx       Load from Library modal
    │   ├── LickSubNav.tsx
    │   ├── LickCard.tsx
    │   ├── LickList.tsx
    │   ├── LickPositionTab.tsx
    │   └── lickUtils.ts               Client-side tab parsing utilities
    ├── songs/
    │   ├── SongsPage.tsx              /songs
    │   ├── SongDetailPage.tsx         /song/:id
    │   ├── SongManagePage.tsx         /song/:id/manage
    │   ├── SongUploadPage.tsx         /songs/upload
    │   ├── SongCard.tsx
    │   ├── SongList.tsx
    │   ├── SongLickCard.tsx           Lick association card on manage page
    │   ├── SongUpdateReviewModal.tsx  Admin diff/review modal for pending updates
    │   ├── SongUploadForm.tsx
    │   ├── ChordSheet.tsx
    │   └── parseChordName.ts
    ├── chords/
    │   ├── ChordsGalleryPage.tsx      /chords
    │   ├── ChordUploadPage.tsx        /chords/upload
    │   ├── ChordsTheoryPage.tsx       /chords/theory
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
    │   ├── TheoryPage.tsx             /theory
    │   ├── PentatonicWidget.tsx       Expandable pentatonic overlay panel
    │   ├── ChordsWidget.tsx           Fret-click chord voicing selector
    │   ├── ChordsProgressionPanel.tsx Chord progression reference panel
    │   ├── cagedUtils.ts              Pentatonic degree + note-set helpers
    │   └── diatonicUtils.ts           Diatonic interval helpers
    ├── live/
    │   ├── LivePage.tsx               /live  (scale neck + pitch detection)
    │   └── usePitchDetection.ts       Web Audio pitch detector hook
    ├── noodle/
    │   ├── NoodlePage.tsx             /noodle
    │   ├── KaraokeDisplay.tsx         Beat-synced scrolling chord sheet
    │   ├── ChordInfoBox.tsx           Current chord voicing overlaid on neck
    │   ├── SongLibraryModal.tsx       Song picker for noodle mode
    │   └── useChordHighlight.ts       Chord timing hook (beatmap or metronome)
    └── user/
        └── UserPage.tsx               /user  Profile + admin dashboard
```

---

## Type reference

```typescript
interface UserProfile {
  userId: number;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestType?: string;
}

interface UserProfileResponse {
  id: number;
  email: string;
  username: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestType: string;
  creationTs: string;
}

interface AdminUserResponse extends UserProfileResponse {}

interface SongUpdateRequestSummary {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string | null;
  submitterUsername: string;
  requestType: 'SONG_METADATA' | 'SONG_CHART' | 'SONG_BEATMAP';
  createdAt: string;
}

interface BeatmapData { beats: number[]; }

interface LickSummary {
  id: string;
  rawTab: string;
  intervalDisplayString: string;
  mode: string | null;
  positions: null;
  autoImported: boolean;
  instrument: string | null;
  authorName: string;
  ownedByCurrentUser: boolean;
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
  mode: string | null;
  tempo: number | null;
  canReparse: boolean;
  authorName: string;
  ownedByCurrentUser: boolean;
}

interface SongLickInfo {
  lickId: string | null;
  rawTab: string;
}

interface SongDetail {
  id: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  mode: string | null;
  instrument: string | null;
  capo: number | null;
  tempo: number | null;
  canReparse: boolean;
  chordLines: ChordSheetLine[];
  numColumns: number;
  rawChordSheet: string | null;
  songLicks: Record<number, SongLickInfo>;
  ownedByCurrentUser: boolean;
  timeSignature: number | null;
}

type ChordSheetLine = ChordLyric | GuitarTabLine;

interface ChordLyric  { type?: 'chord'; chords: string; lyrics: string; fontSize: number; }
interface GuitarTabLine { type: 'tab'; header: string; tabLines: string[]; fontSize: number; }

interface ChordVoicing {
  id: string;
  frets: (number | null)[];  // null = muted (x), 0 = open, positive = fret number; index 0 = low E
  authorName: string;
  ownedByCurrentUser: boolean;
}

interface PlaylistSummary { id: string; name: string; songCount: number; authorName: string; ownedByCurrentUser: boolean; isPublic: boolean; }

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
  mode: string | null;
  instrument: string | null;
  defaultInstrument: string | null;
  tempoOverride: number | null;
}

interface PlaylistDetail { id: string; name: string; entries: PlaylistEntry[]; ownedByCurrentUser: boolean; isPublic: boolean; }

interface ScalePosition { string: number; fret: number; degree: number; note: string; }
interface ScaleResponse { root: string; mode: string; positions: ScalePosition[]; }

type InstrumentName =
  | 'GUITAR' | 'DROP_D' | 'OPEN_G' | 'OPEN_D' | 'DADGAD' | 'EB'
  | 'BASS' | 'UKULELE' | 'MANDOLIN' | 'BANJO' | 'CUSTOM';
```
