const BASE_URL = `http://${window.location.hostname}:8080/api`;

export interface LickSummary {
  id: string;
  rawTab: string;
  intervalDisplayString: string;
  mode: string | null;
  positions: null;
  autoImported: boolean;
}

export interface PositionResponse {
  tabString: string;
}

export interface LickDetail {
  id: string;
  rawTab: string;
  intervalDisplayString: string;
  mode: string;
  positions: PositionResponse[];
}

export interface UploadRequest {
  rawTab: string;
  mode?: string;
  inputKey?: string;
  instrument?: string;
  tuning?: string;
}

export async function getAllLicks(includeSongLicks = false): Promise<LickSummary[]> {
  const params = includeSongLicks ? '?includeSongLicks=true' : '';
  const res = await fetch(`${BASE_URL}/lick${params}`);
  if (!res.ok) throw new Error('Failed to fetch licks');
  return res.json();
}

export async function uploadLick(request: UploadRequest): Promise<LickSummary> {
  const res = await fetch(`${BASE_URL}/lick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to upload lick');
  return res.json();
}

export async function getLick(
  id: string,
  key: string,
  algo = 'greedy',
  instrument = 'GUITAR',
  customTuning?: string
): Promise<LickDetail> {
  const params = new URLSearchParams({ key, algo });
  if (instrument === 'CUSTOM' && customTuning?.trim()) {
    params.set('tuning', customTuning.trim());
  } else {
    params.set('instrument', instrument);
  }
  const res = await fetch(`${BASE_URL}/lick/${id}?${params}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function deleteLick(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/lick/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete lick');
}

// --- Song / Chord Sheet ---

export interface ChordLyric {
  type?: 'chord';
  chords: string;
  lyrics: string;
  fontSize: number;
}

export interface GuitarTabLine {
  type: 'tab';
  header: string;
  tabLines: string[];
  fontSize: number;
}

export type ChordSheetLine = ChordLyric | GuitarTabLine;

export interface SongSummary {
  id: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  canReparse: boolean;
  tempo: number | null;
}

export interface SongLickInfo {
  lickId: string | null;
  rawTab: string;
}

export interface SongDetail {
  id: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  capo: number | null;
  tempo: number | null;
  chordLines: ChordSheetLine[];
  numColumns: number;
  canReparse: boolean;
  rawChordSheet: string | null;
  songLicks: Record<number, SongLickInfo>;
}

export interface UpdateSongRequest {
  title?: string;
  artist?: string;
  originalKey?: string;
  capo?: number;
  tempo?: number;
  rawChordSheet?: string;
}

export interface UploadSongRequest {
  title: string;
  artist?: string;
  originalKey?: string;
  capo?: number;
  tempo?: number;
  rawChordSheet: string;
}

export async function getAllSongs(): Promise<SongSummary[]> {
  const res = await fetch(`${BASE_URL}/song`);
  if (!res.ok) throw new Error('Failed to fetch songs');
  return res.json();
}

export async function uploadSong(request: UploadSongRequest): Promise<SongSummary> {
  const res = await fetch(`${BASE_URL}/song`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to upload song');
  return res.json();
}

export async function getSong(id: string, semitones = 0): Promise<SongDetail> {
  const params = new URLSearchParams({ semitones: String(semitones) });
  const res = await fetch(`${BASE_URL}/song/${id}?${params}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export async function deleteSong(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/song/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete song');
}

export async function updateSong(id: string, request: UpdateSongRequest): Promise<SongDetail> {
  const res = await fetch(`${BASE_URL}/song/${id}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error('Failed to update song');
  return res.json();
}

export async function reparseSong(id: string): Promise<SongDetail> {
  const res = await fetch(`${BASE_URL}/song/${id}/reparse`, { method: 'POST' });
  if (!res.ok) throw new Error('Re-parse failed');
  return res.json();
}

// null = muted (x), 0 = open, positive = fret number; index 0 = low E, 5 = high e
export type ChordFrets = (number | null)[];

export interface ChordVoicing {
  id: string;
  frets: ChordFrets;
}

export async function getChordVoicings(root: string, quality: string): Promise<ChordVoicing[]> {
  const params = new URLSearchParams({ root, quality });
  const res = await fetch(`${BASE_URL}/chord?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getAllChordVoicings(root: string): Promise<Record<string, ChordVoicing[]>> {
  const params = new URLSearchParams({ root });
  const res = await fetch(`${BASE_URL}/chord/all?${params}`);
  if (!res.ok) return {};
  return res.json();
}

export async function deleteChordVoicing(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/chord/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete voicing');
}

export async function reseedChordDefaults(): Promise<void> {
  const res = await fetch(`${BASE_URL}/chord/reseed`, { method: 'POST' });
  if (!res.ok) throw new Error('Reseed failed');
}

export interface UploadChordRequest {
  root: string;
  quality: string;
  frets: string[];
  shapeName?: string;
  instrument?: string;
}

export async function uploadChordVoicing(request: UploadChordRequest): Promise<void> {
  const res = await fetch(`${BASE_URL}/chord`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Upload failed');
  }
}

// --- Playlists ---

export interface PlaylistSummary { id: string; name: string; songCount: number; }

export interface PlaylistEntry {
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

export interface PlaylistDetail { id: string; name: string; entries: PlaylistEntry[]; }

export async function getAllPlaylists(): Promise<PlaylistSummary[]> {
  const res = await fetch(`${BASE_URL}/playlist`);
  if (!res.ok) throw new Error('Failed to fetch playlists');
  return res.json();
}

export async function createPlaylist(name: string): Promise<PlaylistSummary> {
  const res = await fetch(`${BASE_URL}/playlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to create playlist');
  return res.json();
}

export async function getPlaylist(id: string): Promise<PlaylistDetail> {
  const res = await fetch(`${BASE_URL}/playlist/${id}`);
  if (!res.ok) throw new Error('Failed to fetch playlist');
  return res.json();
}

export async function renamePlaylist(id: string, name: string): Promise<PlaylistSummary> {
  const res = await fetch(`${BASE_URL}/playlist/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('Failed to rename playlist');
  return res.json();
}

export async function deletePlaylist(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/playlist/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete playlist');
}

export async function addPlaylistEntry(
  playlistId: string,
  songId: string,
  keyOffset = 0,
  capoOffset = 0,
): Promise<PlaylistDetail> {
  const res = await fetch(`${BASE_URL}/playlist/${playlistId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ songId, keyOffset, capoOffset }),
  });
  if (res.status === 409) throw new Error('DUPLICATE');
  if (!res.ok) throw new Error('Failed to add entry');
  return res.json();
}

export async function updatePlaylistEntry(
  playlistId: string,
  entryId: string,
  req: { keyOffset?: number | null; capoOffset?: number | null; position?: number },
): Promise<PlaylistDetail> {
  const res = await fetch(`${BASE_URL}/playlist/${playlistId}/entries/${entryId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('Failed to update entry');
  return res.json();
}

export async function removePlaylistEntry(playlistId: string, entryId: string): Promise<PlaylistDetail> {
  const res = await fetch(`${BASE_URL}/playlist/${playlistId}/entries/${entryId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove entry');
  return res.json();
}

export async function getPlaylistsContainingSong(
  songId: string
): Promise<{ playlistId: string; entryId: string }[]> {
  const res = await fetch(`${BASE_URL}/playlist/containing?songId=${songId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function clearPlaylistEntryOverrides(playlistId: string, entryId: string): Promise<PlaylistDetail> {
  const res = await fetch(`${BASE_URL}/playlist/${playlistId}/entries/${entryId}/overrides`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to clear overrides');
  return res.json();
}

// --- Scale ---

export interface ScalePosition { string: number; fret: number; degree: number; note: string; }
export interface ScaleResponse { root: string; mode: string; positions: ScalePosition[]; }

export async function getScalePositions(root: string, mode: string): Promise<ScaleResponse> {
  const params = new URLSearchParams({ root, mode });
  const res = await fetch(`${BASE_URL}/scale?${params}`);
  if (!res.ok) throw new Error('Failed to fetch scale');
  return res.json();
}
