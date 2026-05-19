import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import { MetronomeProvider } from './core/metronome/MetronomeContext'
import { SongNavProvider } from './core/context/SongNavContext'
import HomePage from './features/home/HomePage'
import LickUploadPage from './features/licks/LickUploadPage'
import LickDetailPage from './features/licks/LickDetailPage'
import SongsPage from './features/songs/SongsPage'
import SongDetailPage from './features/songs/SongDetailPage'
import SongUploadPage from './features/songs/SongUploadPage'
import ChordsGalleryPage from './features/chords/ChordsGalleryPage'
import ChordUploadPage from './features/chords/ChordUploadPage'
import SongManagePage from './features/songs/SongManagePage'
import PlaylistsPage from './features/playlists/PlaylistsPage'
import PlaylistDetailPage from './features/playlists/PlaylistDetailPage'
import TheoryPage from './features/theory/TheoryPage'
import LivePage from './features/live/LivePage'
import LickVisualizerPage from './features/licks/LickVisualizerPage'
import LickLibraryPage from './features/licks/LickLibraryPage'
import ChordsTheoryPage from './features/chords/ChordsTheoryPage'
import NoodlePage from './features/noodle/NoodlePage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MetronomeProvider>
      <SongNavProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/licks" element={<LickLibraryPage />} />
            <Route path="/licks/upload" element={<LickUploadPage />} />
            <Route path="/lick/:id" element={<LickDetailPage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/songs/upload" element={<SongUploadPage />} />
            <Route path="/song/:id" element={<SongDetailPage />} />
            <Route path="/song/:id/manage" element={<SongManagePage />} />
            <Route path="/chords" element={<ChordsGalleryPage />} />
            <Route path="/chords/upload" element={<ChordUploadPage />} />
            <Route path="/playlists" element={<PlaylistsPage />} />
            <Route path="/playlist/:id" element={<PlaylistDetailPage />} />
            <Route path="/theory" element={<TheoryPage />} />
            <Route path="/live" element={<LivePage />} />
            <Route path="/lick/visualizer" element={<LickVisualizerPage />} />
            <Route path="/licks/library" element={<LickLibraryPage />} />
            <Route path="/chords/theory" element={<ChordsTheoryPage />} />
            <Route path="/noodle" element={<NoodlePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </SongNavProvider>
    </MetronomeProvider>
  </StrictMode>,
)
