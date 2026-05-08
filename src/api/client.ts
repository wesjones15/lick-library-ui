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

export async function getLick(id: string, key: string): Promise<LickDetail> {
  const res = await fetch(`${BASE_URL}/lick/${id}?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error('Failed to fetch lick');
  return res.json();
}
