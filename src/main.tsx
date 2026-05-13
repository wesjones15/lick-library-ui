import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import { MetronomeProvider } from './contexts/MetronomeContext'
import LicksPage from './pages/LicksPage'
import LickDetailPage from './pages/LickDetailPage'
import SongsPage from './pages/SongsPage'
import SongDetailPage from './pages/SongDetailPage'
import SongUploadPage from './pages/SongUploadPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MetronomeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<LicksPage />} />
            <Route path="/lick/:id" element={<LickDetailPage />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/songs/upload" element={<SongUploadPage />} />
            <Route path="/song/:id" element={<SongDetailPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </MetronomeProvider>
  </StrictMode>,
)
