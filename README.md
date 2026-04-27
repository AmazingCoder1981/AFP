# A.F. Porto Competitions Scraper (FPF)

Full-stack Node.js app that scrapes A.F. Porto competitions from the FPF results website and serves a local dashboard/API backed by SQLite.

## Features

- Scrapes all configured seasons for **associationId 232 (A.F. Porto)**.
- Configured seasons:
  - `102` → `2022-2023`
  - `103` → `2023-2024`
  - `104` → `2024-2025`
  - `105` → `2025-2026`
- Extracted fields per competition:
  - `name`
  - `associationName`
  - `associationId`
  - `seasonId`
  - `seasonLabel`
  - `sport`
  - `gender`
  - `ageGroup`
  - `competitionUrl`
  - `sourcePage`
  - `lastScrapedAt`
- SQLite persistence with upsert logic to avoid duplicates during repeated/multi-season scraping.
- API endpoints:
  - `GET /api/seasons`
  - `GET /api/competitions`
  - `GET /api/competitions?seasonId=...`
  - `GET /api/competitions?seasonId=...&sport=...`
  - `GET /api/competitions?seasonId=...&gender=...`
  - `GET /api/competitions?seasonId=...&ageGroup=...`
  - (extra) `GET /api/competitions?search=...`
- Dashboard filters:
  - season
  - sport
  - gender
  - ageGroup
  - competition name search
- Controlled scraping:
  - delay between requests
  - retry with exponential backoff
  - scrape logging
  - graceful handling if payload structure changes
- Keeps previous cached SQLite data if a scrape fails.
- Scheduled background refresh:
  - current season refreshed more frequently
  - historical seasons refreshed less frequently

## Data source

Source pattern used for scraping:

```txt
https://resultados.fpf.pt/Competition/GetCompetitionsByAssociation?associationId=232&seasonId={seasonId}
```

## Local setup

```bash
npm install
npm run dev
```

Then open:

- Dashboard: `http://localhost:3000`
- API base: `http://localhost:3000/api`

## Useful scripts

- `npm run dev` → start server in watch mode
- `npm start` → start server normally
- `npm run scrape` → scrape once and exit

## Environment variables

Optional tuning:

- `PORT` (default `3000`)
- `DB_PATH` (default `./data.sqlite`)
- `REQUEST_DELAY_MS` (default `500`)
- `MAX_RETRIES` (default `4`)
- `CURRENT_SEASON_REFRESH_MS` (default `21600000`, 6h)
- `HISTORICAL_REFRESH_MS` (default `86400000`, 24h)

## Notes

- App uses lightweight JSON fetching/parsing (`fetch`) rather than browser automation.
- If the upstream response shape changes, the scraper logs an error/warning and keeps existing cached rows intact.
