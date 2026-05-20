import { Nav } from './components/Nav'
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
    <div className="app" id="top">
      <Nav />
      <Hero />
      <Section icon="🔥" title="News" id="news"><News /></Section>
      <Section icon="🎓" title="Education" id="education"><Education /></Section>
      <Section icon="✏️" title="Publications" id="publications"><Publications /></Section>
      <Section icon="📚" title="Academic Services" id="services"><Services /></Section>
      <Section icon="🏢" title="Work Experience" id="experience"><Experience /></Section>
      <Section icon="🏆" title="Honors & Awards" id="awards"><Awards /></Section>
      <Section icon="💰" title="Funding" id="funding"><Funding /></Section>
      <Section icon="✨" title="Projects" id="projects"><Projects /></Section>
      <VisitorMap />
      <ThemeToggle />
      <MusicIsland />
    </div>
  )
}
