export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  title: string
  authors?: string
  blurb: string
  image?: string
  links: ProjectLink[]
}

export const projects: Project[] = [
  {
    title: 'Tab Orchestra — Multi-Tab Music Decomposition Art',
    blurb: 'Each browser tab plays one instrument stem. Open 4 tabs to hear the full song. AI-powered stem separation via Demucs.',
    image: '/assets/projects/Tab-Orchestra-Image.png',
    links: [
      { label: 'Live Demo', href: 'https://junst.github.io/tab-orchestra/' },
      { label: 'Code',      href: 'https://github.com/Junst/tab-orchestra' },
    ],
  },
  {
    title: 'ChromaRelief — 3D Tile Media Art',
    blurb: 'Transform videos into 10-color palette tile relief sculptures rendered in real-time 3D.',
    links: [
      { label: 'Live Demo', href: 'https://junst.github.io/chroma-relief/' },
      { label: 'Code',      href: 'https://github.com/Junst/chroma-relief' },
    ],
  },
  {
    title: 'AI Media Art Therapy Platform — Color, Play, and Music Therapies',
    authors: 'Junyoung Koh, Dain Park, Junghun Ha, Kanghee Lee',
    blurb: 'Development of an AI-driven media art therapy platform that incorporates color, play, and music therapeutic methods.',
    links: [
      { label: 'Code',         href: 'https://github.com/FW2022' },
      { label: 'Project Site', href: 'https://space4-u-client.vercel.app/space' },
    ],
  },
]
