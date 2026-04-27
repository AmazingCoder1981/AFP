const SEASONS = [
  { seasonId: 102, seasonLabel: '2022-2023', isCurrent: false },
  { seasonId: 103, seasonLabel: '2023-2024', isCurrent: false },
  { seasonId: 104, seasonLabel: '2024-2025', isCurrent: false },
  { seasonId: 105, seasonLabel: '2025-2026', isCurrent: true }
];

const ASSOCIATION = {
  associationId: 232,
  associationName: 'A.F. Porto'
};

const SOURCE_TEMPLATE = 'https://resultados.fpf.pt/Competition/GetCompetitionsByAssociation?associationId=232&seasonId=';

module.exports = {
  SEASONS,
  ASSOCIATION,
  SOURCE_TEMPLATE,
  REQUEST_DELAY_MS: Number(process.env.REQUEST_DELAY_MS || 500),
  MAX_RETRIES: Number(process.env.MAX_RETRIES || 4),
  CURRENT_SEASON_REFRESH_MS: Number(process.env.CURRENT_SEASON_REFRESH_MS || 6 * 60 * 60 * 1000),
  HISTORICAL_REFRESH_MS: Number(process.env.HISTORICAL_REFRESH_MS || 24 * 60 * 60 * 1000)
};
