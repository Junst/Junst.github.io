import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { JumapPage } from './pages/JumapPage'
import { JuwardArashiPage } from './pages/JuwardArashiPage'
import { JuwardVoicePage } from './pages/JuwardVoicePage'
import { JuwardOtherPage } from './pages/JuwardOtherPage'
import { JuwardJpopPage } from './pages/JuwardJpopPage'
import { BlobMenu } from './components/BlobMenu'
import { ThemeToggle } from './components/ThemeToggle'
import { MusicIsland } from './components/MusicIsland'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/"               element={<HomePage />} />
        <Route path="/jumap"          element={<JumapPage />} />
        <Route path="/juward"         element={<Navigate to="/juward/arashi" replace />} />
        <Route path="/juward/arashi"  element={<JuwardArashiPage />} />
        <Route path="/juward/voice"   element={<JuwardVoicePage />} />
        <Route path="/juward/other"   element={<JuwardOtherPage />} />
        <Route path="/juward/jpop"    element={<JuwardJpopPage />} />
        <Route path="*"               element={<HomePage />} />
      </Routes>
      <BlobMenu />
      <ThemeToggle />
      <MusicIsland />
    </HashRouter>
  )
}
