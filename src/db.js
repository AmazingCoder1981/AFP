const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { SEASONS } = require('./config');

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data.sqlite');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS seasons (
    seasonId INTEGER PRIMARY KEY,
    seasonLabel TEXT NOT NULL,
    isCurrent INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS competitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uniqueKey TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    associationName TEXT,
    associationId INTEGER NOT NULL,
    seasonId INTEGER NOT NULL,
    seasonLabel TEXT,
    sport TEXT,
    gender TEXT,
    ageGroup TEXT,
    competitionUrl TEXT,
    sourcePage TEXT NOT NULL,
    lastScrapedAt TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seasonId) REFERENCES seasons(seasonId)
  );

  CREATE TABLE IF NOT EXISTS scrape_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seasonId INTEGER,
    status TEXT NOT NULL,
    message TEXT,
    createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const upsertSeason = db.prepare(`
  INSERT INTO seasons (seasonId, seasonLabel, isCurrent)
  VALUES (?, ?, ?)
  ON CONFLICT(seasonId) DO UPDATE SET
    seasonLabel=excluded.seasonLabel,
    isCurrent=excluded.isCurrent
`);

for (const season of SEASONS) {
  upsertSeason.run(season.seasonId, season.seasonLabel, season.isCurrent ? 1 : 0);
}

const upsertCompetition = db.prepare(`
  INSERT INTO competitions (
    uniqueKey, name, associationName, associationId, seasonId, seasonLabel,
    sport, gender, ageGroup, competitionUrl, sourcePage, lastScrapedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(uniqueKey) DO UPDATE SET
    name=excluded.name,
    associationName=excluded.associationName,
    seasonLabel=excluded.seasonLabel,
    sport=excluded.sport,
    gender=excluded.gender,
    ageGroup=excluded.ageGroup,
    competitionUrl=excluded.competitionUrl,
    sourcePage=excluded.sourcePage,
    lastScrapedAt=excluded.lastScrapedAt,
    updatedAt=CURRENT_TIMESTAMP
`);

const insertLog = db.prepare('INSERT INTO scrape_logs (seasonId, status, message) VALUES (?, ?, ?)');

function saveCompetitions(rows) {
  db.exec('BEGIN');
  try {
    for (const row of rows) {
      upsertCompetition.run(
        row.uniqueKey,
        row.name,
        row.associationName,
        row.associationId,
        row.seasonId,
        row.seasonLabel,
        row.sport,
        row.gender,
        row.ageGroup,
        row.competitionUrl,
        row.sourcePage,
        row.lastScrapedAt
      );
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function logScrape(seasonId, status, message) {
  insertLog.run(seasonId || null, status, message || null);
}

function getSeasons() {
  return db.prepare('SELECT seasonId, seasonLabel, isCurrent FROM seasons ORDER BY seasonId').all()
    .map((s) => ({ ...s, isCurrent: Boolean(s.isCurrent) }));
}

function getCompetitions(filters = {}) {
  const where = [];
  const params = [];

  if (filters.seasonId) {
    where.push('seasonId = ?');
    params.push(Number(filters.seasonId));
  }
  if (filters.sport) {
    where.push('LOWER(COALESCE(sport, "")) = LOWER(?)');
    params.push(filters.sport);
  }
  if (filters.gender) {
    where.push('LOWER(COALESCE(gender, "")) = LOWER(?)');
    params.push(filters.gender);
  }
  if (filters.ageGroup) {
    where.push('LOWER(COALESCE(ageGroup, "")) = LOWER(?)');
    params.push(filters.ageGroup);
  }
  if (filters.search) {
    where.push('LOWER(name) LIKE LOWER(?)');
    params.push(`%${filters.search}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sql = `
    SELECT
      name,
      associationName,
      associationId,
      seasonId,
      seasonLabel,
      sport,
      gender,
      ageGroup,
      competitionUrl,
      sourcePage,
      lastScrapedAt
    FROM competitions
    ${whereSql}
    ORDER BY seasonId DESC, name ASC
  `;

  return db.prepare(sql).all(...params);
}

module.exports = {
  db,
  saveCompetitions,
  logScrape,
  getSeasons,
  getCompetitions
};
