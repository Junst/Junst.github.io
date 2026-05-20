# junst.github.io (v2 — React+Vite)

Source for the new design. Deployed to GitHub Pages via the
`.github/workflows/deploy.yml` workflow (builds and force-pushes to the
`gh-pages` branch).

The legacy Jekyll site is preserved at
[`/legacy/2025/`](https://junst.github.io/legacy/2025/) (static mirror).

## Development

```sh
cd app
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to app/dist
```

## Editing content

All content lives in `src/data/`:

- `profile.ts` — name, intro paragraphs, social links
- `news.ts` — news items grouped by year (current + collapsed prior years)
- `education.ts`
- `publications.ts` — three categories (Conf/Workshop, Preprints, Tech Reports)
- `services.ts` — academic services
- `experience.ts`
- `awards.ts`
- `funding.ts`
- `projects.ts`

## Floating features

- `ThemeToggle.tsx` — light/dark toggle, persists to localStorage
- `MusicIsland.tsx` — YouTube IFrame API music player
- `VisitorMap.tsx` — `mapmyvisitors.com` widget

## Deployment notes

GitHub Pages **source** must be set to the `gh-pages` branch
(Settings → Pages → Build and deployment → Source: Deploy from a branch →
Branch: `gh-pages` / `/ (root)`).

The workflow re-runs whenever files under `app/**` change on `main`.
