import { HashRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { JumapPage } from './pages/JumapPage'
import { JuwardPage } from './pages/JuwardPage'
import { JuwardYearPage } from './pages/JuwardYearPage'
import { JuwardVoicePage } from './pages/JuwardVoicePage'
import { BlobMenu } from './components/BlobMenu'
import { ThemeToggle } from './components/ThemeToggle'
import { MusicIsland } from './components/MusicIsland'

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/"        element={<HomePage />} />
        <Route path="/jumap"   element={<JumapPage />} />
        <Route path="/juward"  element={<JuwardPage />} />
        <Route path="/juward/voice" element={<JuwardVoicePage />} />
        <Route path="/juward/:year" element={<JuwardYearPage />} />
        <Route path="*"        element={<HomePage />} />
      </Routes>
      <BlobMenu />
      <ThemeToggle />
      <MusicIsland />
    </HashRouter>
  )
}
