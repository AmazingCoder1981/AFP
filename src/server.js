const fs = require('fs');
const path = require('path');
const http = require('http');
const { URL } = require('url');
const { getSeasons, getCompetitions } = require('./db');
const { scrapeAllSeasons, scrapeSeason } = require('./scraper');
const { SEASONS, CURRENT_SEASON_REFRESH_MS, HISTORICAL_REFRESH_MS } = require('./config');

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(process.cwd(), 'public');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8'
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname, searchParams } = requestUrl;

  try {
    if (pathname === '/api/seasons' && req.method === 'GET') {
      return sendJson(res, 200, { items: getSeasons() });
    }

    if (pathname === '/api/competitions' && req.method === 'GET') {
      const items = getCompetitions({
        seasonId: searchParams.get('seasonId'),
        sport: searchParams.get('sport'),
        gender: searchParams.get('gender'),
        ageGroup: searchParams.get('ageGroup'),
        search: searchParams.get('search')
      });
      return sendJson(res, 200, { items, count: items.length });
    }

    if (pathname === '/api/scrape' && req.method === 'POST') {
      const results = await scrapeAllSeasons();
      return sendJson(res, 200, { ok: true, results });
    }

    if (!pathname.startsWith('/api/')) {
      const safePath = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.join(publicDir, safePath);
      if (filePath.startsWith(publicDir)) {
        return sendFile(res, filePath);
      }
    }

    sendJson(res, 404, { error: 'Route not found' });
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
}

function setupSchedules() {
  const currentSeason = SEASONS.find((season) => season.isCurrent);
  const historicalSeasons = SEASONS.filter((season) => !season.isCurrent);

  if (currentSeason) {
    setInterval(async () => {
      console.log(`[scheduler] refreshing current season ${currentSeason.seasonId}`);
      await scrapeSeason(currentSeason);
    }, CURRENT_SEASON_REFRESH_MS);
  }

  if (historicalSeasons.length) {
    setInterval(async () => {
      for (const season of historicalSeasons) {
        console.log(`[scheduler] refreshing historical season ${season.seasonId}`);
        await scrapeSeason(season);
      }
    }, HISTORICAL_REFRESH_MS);
  }
}

async function start() {
  const scrapeOnce = process.argv.includes('--scrape-once');
  const initialResults = await scrapeAllSeasons();
  console.log('[startup] initial scrape:', initialResults);

  if (scrapeOnce) process.exit(0);

  setupSchedules();
  const server = http.createServer((req, res) => {
    handleRequest(req, res);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`AFP competitions app running at http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error('Fatal error while starting app:', error);
  process.exit(1);
});
