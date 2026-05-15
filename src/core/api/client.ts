const BASE_URL = `http://${window.location.hostname}:8080/api`;

export interface LickSummary {
  id: string;
  rawTab: string;
  intervalDisplayString: string;
  mode: string | null;
  positions: null;
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
}

export async function getAllLicks(): Promise<LickSummary[]> {
  const res = await fetch(`${BASE_URL}/lick`);
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
  chords: string;
  lyrics: string;
  fontSize: number;
}

export interface SongSummary {
  id: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  canReparse: boolean;
}

export interface SongDetail {
  id: string;
  title: string;
  artist: string | null;
  originalKey: string | null;
  capo: number | null;
  tempo: number | null;
  chordLines: ChordLyric[];
  numColumns: number;
  canReparse: boolean;
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

export async function reparseSong(id: string): Promise<SongDetail> {
  const res = await fetch(`${BASE_URL}/song/${id}/reparse`, { method: 'POST' });
  if (!res.ok) throw new Error('Re-parse failed');
  return res.json();
}

export async function getChordVoicings(root: string, quality: string): Promise<string[]> {
  const params = new URLSearchParams({ root, quality });
  const res = await fetch(`${BASE_URL}/chord?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getAllChordVoicings(root: string): Promise<Record<string, string[]>> {
  const params = new URLSearchParams({ root });
  const res = await fetch(`${BASE_URL}/chord/all?${params}`);
  if (!res.ok) return {};
  return res.json();
}
