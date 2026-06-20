import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { BlobMenu } from './components/BlobMenu'
import { SubpageHomeBar } from './components/SubpageHomeBar'
import { ThemeToggle } from './components/ThemeToggle'
import { MusicIsland } from './components/MusicIsland'

// Sub-page chunks are pulled in only when the user navigates to them, so
// landing on '/' stays small and fast on mobile. Vite emits one chunk per
// lazy() import; the shared album-art + artist-photos data files come along
// with whichever chunk hits them first.
const JumapPage         = lazy(() => import('./pages/JumapPage3D').then((m) => ({ default: m.JumapPage3D })))
const JumapPage2D       = lazy(() => import('./pages/JumapPage').then((m) => ({ default: m.JumapPage })))
const JuwardArashiPage  = lazy(() => import('./pages/JuwardArashiPage').then((m) => ({ default: m.JuwardArashiPage })))
const JuwardVoicePage   = lazy(() => import('./pages/JuwardVoicePage').then((m) => ({ default: m.JuwardVoicePage })))
const JuwardOtherPage   = lazy(() => import('./pages/JuwardOtherPage').then((m) => ({ default: m.JuwardOtherPage })))
const JuwardJpopPage    = lazy(() => import('./pages/JuwardJpopPage').then((m) => ({ default: m.JuwardJpopPage })))

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-live="polite">
      <span className="route-fallback-dot" />
      <span className="route-fallback-dot" />
      <span className="route-fallback-dot" />
    </div>
  )
}

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/"               element={<HomePage />} />
          <Route path="/jumap"          element={<JumapPage />} />
          <Route path="/jumap2d"        element={<JumapPage2D />} />
          <Route path="/juward"         element={<Navigate to="/juward/arashi" replace />} />
          <Route path="/juward/arashi"  element={<JuwardArashiPage />} />
          <Route path="/juward/voice"   element={<JuwardVoicePage />} />
          <Route path="/juward/other"   element={<JuwardOtherPage />} />
          <Route path="/juward/jpop"    element={<JuwardJpopPage />} />
          <Route path="*"               element={<HomePage />} />
        </Routes>
      </Suspense>
      <SubpageHomeBar />
      <BlobMenu />
      <ThemeToggle />
      <MusicIsland />
    </HashRouter>
  )
}
