import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import LibraryPage from './pages/LibraryPage'
import DetailPage from './pages/DetailPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/lick/:id" element={<DetailPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
