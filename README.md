# Globetrotter 🌍

A game for learning the world's 196 countries, with five game modes and a Learn page:

- **Free mode**: name as many countries as you can before the clock runs out.
- **Find on map**: click the country we name.
- **Guess the flag**
- **Capitals**: both directions.
- **Silhouettes**: recognise a country from its outline.

Every mode has scores, streaks, an optional timer and a continent filter. Smart review (spaced repetition) brings back the countries you miss, and a progress page shows your mastery for each country. Everything is saved in your browser's localStorage.

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository on the `main` branch.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds the site and publishes it on every push.

## Data

The data in `src/data/` is generated from `world-countries` and `world-atlas`:

```bash
node scripts/build-data.mjs
```

Flags come from `flag-icons`.
