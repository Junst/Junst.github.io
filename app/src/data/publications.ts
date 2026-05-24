export interface PublicationLink {
  label: 'arXiv' | 'PDF' | 'Code' | 'HuggingFace' | 'Project' | 'CivitAI' | 'Poster'
  href: string
}

export type PubTag = 'music' | 'nlp' | 'vision'
export type PubStatus = 'preprint' | 'under-review' | 'tech-report'

export interface Publication {
  title: string
  authors: string
  venue: string
  status?: PubStatus
  awards?: string
  links?: PublicationLink[]
  tags: PubTag[]
  selected?: boolean
}

// One unified list. Filter tabs control which subset is shown.
// Preprints & Under Review and Technical Reports are now part of the same
// list — distinguished only by an optional `status` badge after the venue.
export const allPapers: Publication[] = [
  {
    title: 'Instrumental Text-to-Music Generation with Auxiliary Conditioning Branches',
    authors: '<strong>Junyoung Koh</strong>',
    venue: 'ICME 2026 <a href="https://ntu-musicailab.github.io/ICME26-ATTM-Grand-Challenge/">Audio-Text-to-Music (ATTM) Grand Challenge</a>',
    awards: '🏆 <strong>1st Place, Performance Track</strong> · 🏆 <strong>#1 Overall MOS</strong>',
    links: [
      { label: 'arXiv', href: 'https://arxiv.org/abs/2605.21433' },
      { label: 'PDF',   href: 'https://arxiv.org/pdf/2605.21433' },
    ],
    tags: ['music'],
  },
  {
    title: 'Jamendo-MT-QA: A Benchmark for Multi-Track Comparative Music Question Answering',
    authors: '<strong>Junyoung Koh</strong>, Jaeyun Lee, Soo Yong Kim, GYU HYEONG CHOI, Jung In Koh, Jordan Phillips, Yeonjin Lee, and Min Song',
    venue: 'ACL 2026 Findings',
    links: [
      { label: 'arXiv',       href: 'https://arxiv.org/abs/2604.09721' },
      { label: 'PDF',         href: 'https://arxiv.org/pdf/2604.09721' },
      { label: 'Code',        href: 'https://github.com/MAAP-LAB/Jamendo-MT-QA' },
      { label: 'Project',     href: 'https://maap-lab.github.io/Jamendo-MT-QA/' },
      { label: 'HuggingFace', href: 'https://huggingface.co/datasets/m-a-a-p/Jamendo-MT-QA' },
    ],
    tags: ['music', 'nlp'],
    selected: true,
  },
  {
    title: 'Automatic Inter-document Multi-hop Scientific QA Generation',
    authors: 'Seungmin Lee, Dongha Kim, Yuni Jeon, <strong>Junyoung Koh</strong>, and Min Song',
    venue: 'LREC 2026',
    links: [
      { label: 'arXiv',  href: 'https://arxiv.org/abs/2603.14257' },
      { label: 'PDF',    href: 'https://arxiv.org/pdf/2603.14257' },
      { label: 'Poster', href: '/assets/poster/LREC_M3_Poster.pdf' },
    ],
    tags: ['nlp'],
  },
  {
    title: 'MCJudgeBench: A Benchmark for Constraint-Level Judge Evaluation in Multi-Constraint Instruction Following',
    authors: 'Jaeyun Lee, <strong>Junyoung Koh</strong>, Zeynel Tok, Hunar Batra, and Ronald Clark',
    venue: 'ACL 2026 Workshop on <a href="https://gem-workshop.com">Generation, Evaluation, and Metrics (GEM)</a>',
    links: [
      { label: 'arXiv', href: 'https://arxiv.org/abs/2605.03858' },
      { label: 'PDF',   href: 'https://arxiv.org/pdf/2605.03858' },
    ],
    tags: ['nlp'],
  },
  {
    title: 'Let Triggers Control: Frequency-aware Dropout for Effective Token Control',
    authors: '<strong>Junyoung Koh</strong>, Hoyeon Moon, Dongha Kim, Seungmin Lee, Sanghyun Park, and Min Song',
    venue: 'CVPR 2026 Workshop <a href="https://p13n-workshop.github.io/#call-for-papers">P13N: Personalization in Generative AI</a>',
    links: [
      { label: 'arXiv', href: 'https://arxiv.org/abs/2603.27199' },
      { label: 'PDF',   href: 'https://arxiv.org/pdf/2603.27199' },
      { label: 'Code',  href: 'https://github.com/Junst/FAD-Frequency-Aware-Dropout-for-Effective-Token-Control' },
    ],
    tags: ['vision'],
  },
  {
    title: 'AIBA: Attention-based Instrument Band Alignment for Text-to-Audio Diffusion',
    authors: '<strong>Junyoung Koh</strong>, Sooyong Kim, Gyuhyeong Choi, and Yongwon Choi',
    venue: 'NeurIPS 2025 Workshop on <a href="https://aiformusicworkshop.github.io/">AI for Music: Where Creativity Meets Computation</a>',
    links: [
      { label: 'arXiv',  href: 'https://arxiv.org/abs/2509.20891' },
      { label: 'PDF',    href: 'https://arxiv.org/pdf/2509.20891' },
      { label: 'Poster', href: '/assets/poster/AIBA_Poster.pdf' },
    ],
    tags: ['music'],
    selected: true,
  },
  {
    title: 'Closing the STFT-CQT Gap: Simple Multi-Scale Features for Vocal Multi-Pitch Estimation',
    authors: '<strong>Junyoung Koh</strong> and Hao-Wen Dong',
    venue: 'Under Review',
    status: 'under-review',
    tags: ['music'],
    selected: true,
  },
  {
    title: 'MusicCritic: Test-Time Scaling for Music Generation with Feature-Based and Audio-Native LLM Critics',
    authors: '<strong>Junyoung Koh</strong>, Jungwoo Kim, Sunghyeon Kim, Youngjin Na, Joonyong Park, Gyuhyeong Choi, and Soo Yong Kim',
    venue: 'Under Review',
    status: 'under-review',
    tags: ['music'],
  },
  {
    title: 'Probing Token Spaces under Generator Shift in AI-Generated Music Detection',
    authors: 'Joonyong Park, Jungwoo Kim, <strong>Junyoung Koh</strong>, and Yuki Saito',
    venue: 'Under Review',
    status: 'under-review',
    tags: ['music'],
  },
  {
    title: 'Probing-Based Test-Time Steering of Music Diffusion Transformers',
    authors: '<strong>Junyoung Koh</strong>',
    venue: 'Under Review',
    status: 'under-review',
    tags: ['music'],
  },
  {
    title: 'Hierarchy Aware Preference Optimization for the Safety of Korean Small Language Models',
    authors: 'Soo Yong Kim, <strong>Junyoung Koh</strong>, Kyeonghun Kim, and Seunghyeok Hong',
    venue: 'Under Review',
    status: 'under-review',
    tags: ['nlp'],
  },
  {
    title: 'Jamendo-QA: A Large-Scale Music Question Answering Dataset',
    authors: '<strong>Junyoung Koh</strong>, Sooyong Kim, Yongwon Choi, and Gyuhyeong Choi',
    venue: 'Preprint',
    status: 'preprint',
    links: [
      { label: 'arXiv',       href: 'https://arxiv.org/abs/2509.15662' },
      { label: 'PDF',         href: 'https://arxiv.org/pdf/2509.15662' },
      { label: 'HuggingFace', href: 'https://huggingface.co/datasets/m-a-a-p/Jamendo-QA' },
    ],
    tags: ['music'],
  },
  {
    title: 'Illustrious: an Open Advanced Illustration Model',
    authors: 'Sang Hyun Park*, <strong>Jun Young Koh</strong>*, Junha Lee, Joy Song, Dongha Kim, Hoyeon Moon, Hyunju Lee, and Min Song',
    venue: 'Technical Report',
    status: 'tech-report',
    links: [
      { label: 'arXiv',       href: 'https://arxiv.org/abs/2409.19946' },
      { label: 'PDF',         href: 'https://arxiv.org/pdf/2409.19946' },
      { label: 'HuggingFace', href: 'https://huggingface.co/OnomaAIResearch/Illustrious-xl-early-release-v0' },
      { label: 'CivitAI',     href: 'https://civitai.com/models/795765/illustrious-xl' },
    ],
    tags: ['vision'],
    selected: true,
  },
  {
    title: 'Improving Text Generation on Images with Synthetic Captions',
    authors: '<strong>Jun Young Koh</strong>*, Sang Hyun Park*, and Joy Song*',
    venue: 'IIAI AAI 2024 — 7th International Conference on Interaction Design and Digital Creation / Computing',
    links: [
      { label: 'arXiv', href: 'https://arxiv.org/abs/2406.00505' },
      { label: 'PDF',   href: 'https://arxiv.org/abs/2406.00505.pdf' },
    ],
    tags: ['vision'],
  },
  {
    title: 'CAT: Contrastive Adapter Training for Personalized Image Generation',
    authors: 'Jaewan Park*, Sang Hyun Park*, <strong>Jun Young Koh</strong>*, Junha Lee*, and Min Song',
    venue: 'CVPR 2024 Workshop <a href="https://generative-vision.github.io/workshop-CVPR-24/">Generative Models for Computer Vision</a>',
    links: [
      { label: 'arXiv', href: 'https://arxiv.org/abs/2404.07554' },
      { label: 'PDF',   href: 'https://arxiv.org/pdf/2404.07554.pdf' },
      { label: 'Code',  href: 'https://github.com/onoma-ai-cat/CAT' },
    ],
    tags: ['vision'],
  },
  {
    title: 'Proposal of 3D Camera-Based Digital Coordinate Recognition Technology',
    authors: '<strong>Junyoung Koh</strong> and Kanghee Lee',
    venue: 'Proceedings of the Korean Society of Computer Information Conference 2022',
    links: [
      { label: 'PDF', href: 'https://koreascience.kr/article/CFKO202232249429413.pdf' },
    ],
    tags: ['vision'],
  },
]

export const equalContributionNote = '* Equal Contribution'

// Status badge text + style hint
export const statusLabel: Record<PubStatus, string> = {
  'preprint':     'Preprint',
  'under-review': 'Under Review',
  'tech-report':  'Technical Report',
}

// Small icon per link type — kept lightweight and recognizable
export const linkIcons: Record<PublicationLink['label'], string> = {
  arXiv:       '📜',
  PDF:         '📄',
  Code:        '💻',
  HuggingFace: '🤗',
  Project:     '🌐',
  CivitAI:     '🎨',
  Poster:      '🖼️',
}

export interface FilterTab {
  key: 'selected' | 'all' | PubTag
  label: string
  filter: (p: Publication) => boolean
}

export const filterTabs: FilterTab[] = [
  { key: 'selected', label: 'Selected', filter: (p) => p.selected === true },
  { key: 'all',      label: 'All',      filter: () => true },
  { key: 'music',    label: 'Music',    filter: (p) => p.tags.includes('music') },
  { key: 'nlp',      label: 'NLP',      filter: (p) => p.tags.includes('nlp') },
  { key: 'vision',   label: 'Vision',   filter: (p) => p.tags.includes('vision') },
]
