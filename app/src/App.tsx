import { Hero } from './components/Hero'
import { Section } from './components/Section'
import { News } from './components/News'
import { Education } from './components/Education'
import { Publications } from './components/Publications'
import { Services } from './components/Services'
import { Experience } from './components/Experience'
import { Awards } from './components/Awards'
import { Funding } from './components/Funding'
import { Projects } from './components/Projects'
import { ThemeToggle } from './components/ThemeToggle'
import { MusicIsland } from './components/MusicIsland'
import { VisitorMap } from './components/VisitorMap'

export function App() {
  return (
    <div className="app">
      <Hero />
      <Section icon="🔥" title="News"><News /></Section>
      <Section icon="🎓" title="Education"><Education /></Section>
      <Section icon="✏️" title="Publications"><Publications /></Section>
      <Section icon="📚" title="Academic Services"><Services /></Section>
      <Section icon="🏢" title="Work Experience"><Experience /></Section>
      <Section icon="🏆" title="Honors & Awards"><Awards /></Section>
      <Section icon="💰" title="Funding"><Funding /></Section>
      <Section icon="✨" title="Projects"><Projects /></Section>
      <VisitorMap />
      <ThemeToggle />
      <MusicIsland />
    </div>
  )
}
