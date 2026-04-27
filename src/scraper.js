const { SEASONS, ASSOCIATION, SOURCE_TEMPLATE, REQUEST_DELAY_MS, MAX_RETRIES } = require('./config');
const { saveCompetitions, logScrape } = require('./db');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readField(item, keys, fallback = null) {
  for (const key of keys) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
      return String(item[key]).trim();
    }
  }
  return fallback;
}

function normalizeCompetition(item, season) {
  const name = readField(item, ['Name', 'name', 'CompetitionName', 'description']);
  if (!name) {
    throw new Error('Missing competition name in source payload');
  }

  const competitionId = readField(item, ['CompetitionId', 'competitionId', 'Id']);
  const directUrl = readField(item, ['Url', 'url', 'CompetitionUrl']);
  const competitionUrl = directUrl || (competitionId
    ? `https://resultados.fpf.pt/Competition/Details?competitionId=${competitionId}`
    : null);

  return {
    uniqueKey: `${season.seasonId}::${competitionUrl || name.toLowerCase()}`,
    name,
    associationName: readField(item, ['AssociationName', 'associationName'], ASSOCIATION.associationName),
    associationId: Number(readField(item, ['AssociationId', 'associationId'], ASSOCIATION.associationId)),
    seasonId: season.seasonId,
    seasonLabel: season.seasonLabel,
    sport: readField(item, ['Sport', 'sport', 'SportName']),
    gender: readField(item, ['Gender', 'gender']),
    ageGroup: readField(item, ['AgeGroup', 'ageGroup', 'Category']),
    competitionUrl,
    sourcePage: `${SOURCE_TEMPLATE}${season.seasonId}`,
    lastScrapedAt: new Date().toISOString()
  };
}

async function fetchWithRetry(url, maxRetries = MAX_RETRIES) {
  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AFP-Competitions-Scraper/1.0',
          'Accept': 'application/json, text/plain, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('json')) {
        throw new Error(`Unexpected content-type (${contentType})`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries) break;
      const backoff = 250 * (2 ** attempt);
      console.warn(`[scraper] attempt ${attempt + 1} failed for ${url}: ${error.message}; retrying in ${backoff}ms`);
      await wait(backoff);
    }
    attempt += 1;
  }

  throw lastError;
}

function extractItems(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items)) return payload.items;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return null;
}

async function scrapeSeason(season) {
  const url = `${SOURCE_TEMPLATE}${season.seasonId}`;
  try {
    const payload = await fetchWithRetry(url);
    const items = extractItems(payload);
    if (!items) {
      const message = 'Could not find expected competition array in payload (structure may have changed)';
      logScrape(season.seasonId, 'error', message);
      console.error(`[scraper] ${message} for season ${season.seasonId}`);
      return { seasonId: season.seasonId, ok: false, count: 0, error: message };
    }

    const normalized = [];
    for (const rawItem of items) {
      try {
        normalized.push(normalizeCompetition(rawItem, season));
      } catch (error) {
        logScrape(season.seasonId, 'warn', `Skipping malformed competition row: ${error.message}`);
      }
    }

    saveCompetitions(normalized);
    logScrape(season.seasonId, 'success', `Scraped ${normalized.length} competitions`);
    return { seasonId: season.seasonId, ok: true, count: normalized.length };
  } catch (error) {
    const message = `Failed scraping season ${season.seasonId}: ${error.message}`;
    logScrape(season.seasonId, 'error', message);
    console.error(`[scraper] ${message}`);
    return { seasonId: season.seasonId, ok: false, count: 0, error: error.message };
  }
}

async function scrapeAllSeasons() {
  const results = [];
  for (const season of SEASONS) {
    results.push(await scrapeSeason(season));
    await wait(REQUEST_DELAY_MS);
  }
  return results;
}

module.exports = {
  scrapeSeason,
  scrapeAllSeasons
};
