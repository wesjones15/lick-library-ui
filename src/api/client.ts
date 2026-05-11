const BASE_URL = 'http://localhost:8080/api';

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
