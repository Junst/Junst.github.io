export interface NewsItem {
  date: string  // "May 2026"
  text: string  // HTML allowed
}

export interface NewsGroup {
  year: string
  items: NewsItem[]
}

// Most recent first. The "current" group is shown expanded; prior years are collapsed.
export const newsGroups: NewsGroup[] = [
  {
    year: 'current',
    items: [
      { date: 'May 2026', text: '🏆 Won <strong>1st place in the Performance Track</strong> AND <strong>#1 overall in MOS evaluation</strong> at the ICME 2026 ATTM Grand Challenge!' },
      { date: 'May 2026', text: '1 paper is accepted to the ICME 2026 ATTM Grand Challenge! 🎵' },
      { date: 'Apr 2026', text: 'MCJudgeBench is accepted to ACL 2026 Workshop (GEM)!' },
      { date: 'Apr 2026', text: 'Jamendo-MT-QA is accepted to ACL 2026 Findings!' },
      { date: 'Mar 2026', text: '1 paper is accepted to CVPR 2026 Workshop (P13N)!' },
      { date: 'Feb 2026', text: "I'm going to University of Michigan as a Visiting Graduate Student 👨‍🎓" },
      { date: 'Feb 2026', text: '1 paper is accepted to LREC 2026!' },
    ],
  },
  {
    year: '2025',
    items: [
      { date: 'Sep 2025', text: 'Our AIBA paper is accepted to NeurIPS 2025 Workshop (AI for Music) 🎶' },
      { date: 'Sep 2025', text: 'Awarded Brian Impact Foundation (Kakao, USD 1.5K Per paper)' },
      { date: 'Aug 2025', text: 'Selected for NRF Ph.D. Research Fellowship (RS-2025-25422688, USD 20K)' },
      { date: 'Jul 2025', text: 'I will be working at KRAFTON AI in August!' },
      { date: 'May 2025', text: "I'm going to USC summer session in July!" },
    ],
  },
  {
    year: '2024',
    items: [
      { date: 'Oct 2024', text: 'Our model has been downloaded over 33,000 times and has ranked 7th among trending models worldwide!' },
      { date: 'Sep 2024', text: 'Illustrious technical report is submitted in arXiv and HuggingFace!' },
      { date: 'Aug 2024', text: '1st Anniversary at my first company, Onoma AI 🎉' },
      { date: 'May 2024', text: 'One paper is accepted to IIAI-AAI 2024!' },
      { date: 'Jan 2024', text: 'One paper is accepted to CVPR!' },
    ],
  },
]
