import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import { MetronomeProvider } from './core/metronome/MetronomeContext'
import { SongNavProvider } from './core/context/SongNavContext'
import { AuthProvider, useAuth } from './core/auth/AuthContext'
import AuthCallbackPage from './features/auth/AuthCallbackPage'
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
import UserPage from './features/user/UserPage'

function ProtectedRoute({ children, adminOnly = false, allowPending = false }: { children: ReactNode; adminOnly?: boolean; allowPending?: boolean }) {
  const { currentUser, statusResolved } = useAuth();
  if (!statusResolved) return null;
  if (!currentUser) return <Navigate to="/" replace />;
  if (!allowPending && currentUser.status !== 'APPROVED' && currentUser.role !== 'ADMIN') return <Navigate to="/" replace />;
  if (adminOnly && currentUser.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <MetronomeProvider>
        <SongNavProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthCallbackPage />} />
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/licks" element={<ProtectedRoute><LickLibraryPage /></ProtectedRoute>} />
                <Route path="/licks/upload" element={<ProtectedRoute><LickUploadPage /></ProtectedRoute>} />
                <Route path="/lick/:id" element={<ProtectedRoute><LickDetailPage /></ProtectedRoute>} />
                <Route path="/songs" element={<ProtectedRoute><SongsPage /></ProtectedRoute>} />
                <Route path="/songs/upload" element={<ProtectedRoute><SongUploadPage /></ProtectedRoute>} />
                <Route path="/song/:id" element={<ProtectedRoute><SongDetailPage /></ProtectedRoute>} />
                <Route path="/song/:id/manage" element={<ProtectedRoute><SongManagePage /></ProtectedRoute>} />
                <Route path="/chords" element={<ProtectedRoute><ChordsGalleryPage /></ProtectedRoute>} />
                <Route path="/chords/upload" element={<ProtectedRoute><ChordUploadPage /></ProtectedRoute>} />
                <Route path="/playlists" element={<ProtectedRoute><PlaylistsPage /></ProtectedRoute>} />
                <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistDetailPage /></ProtectedRoute>} />
                <Route path="/theory" element={<ProtectedRoute><TheoryPage /></ProtectedRoute>} />
                <Route path="/live" element={<ProtectedRoute adminOnly><LivePage /></ProtectedRoute>} />
                <Route path="/lick/visualizer" element={<ProtectedRoute><LickVisualizerPage /></ProtectedRoute>} />
                <Route path="/licks/library" element={<ProtectedRoute><LickLibraryPage /></ProtectedRoute>} />
                <Route path="/chords/theory" element={<ProtectedRoute><ChordsTheoryPage /></ProtectedRoute>} />
                <Route path="/noodle" element={<ProtectedRoute><NoodlePage /></ProtectedRoute>} />
                <Route path="/user" element={<ProtectedRoute allowPending><UserPage /></ProtectedRoute>} />
              </Route>
            </Routes>
          </BrowserRouter>
        </SongNavProvider>
      </MetronomeProvider>
    </AuthProvider>
  </StrictMode>,
)
