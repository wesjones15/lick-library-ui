import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout'
import LibraryPage from './pages/LibraryPage'
import DetailPage from './pages/DetailPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/lick/:id" element={<DetailPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
