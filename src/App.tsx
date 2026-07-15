import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { TeamList } from './pages/TeamList'
import { BibEntry } from './pages/BibEntry'
import { Leaderboard } from './pages/Leaderboard'
import { Settings } from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TeamList />} />
        <Route path="/bib/:bib" element={<BibEntry />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
