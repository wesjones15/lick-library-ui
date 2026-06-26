import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type SortKey = 'title' | 'artist' | 'key' | 'tempo';

interface SongsListContextValue {
  sortBy: SortKey;
  setSortBy: (v: SortKey) => void;
  sortDir: 'asc' | 'desc';
  setSortDir: (v: 'asc' | 'desc') => void;
  filterArtist: string;
  setFilterArtist: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  showAll: boolean;
  setShowAll: (v: boolean) => void;
}

const SongsListContext = createContext<SongsListContextValue | null>(null);

export function SongsListProvider({ children }: { children: ReactNode }) {
  const [sortBy, setSortBy] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterArtist, setFilterArtist] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  return (
    <SongsListContext.Provider value={{ sortBy, setSortBy, sortDir, setSortDir, filterArtist, setFilterArtist, search, setSearch, page, setPage, showAll, setShowAll }}>
      {children}
    </SongsListContext.Provider>
  );
}

export function useSongsListContext() {
  const ctx = useContext(SongsListContext);
  if (!ctx) throw new Error('useSongsListContext must be used inside SongsListProvider');
  return ctx;
}
