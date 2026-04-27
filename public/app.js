const state = {
  competitions: []
};

const els = {
  season: document.getElementById('seasonFilter'),
  sport: document.getElementById('sportFilter'),
  gender: document.getElementById('genderFilter'),
  age: document.getElementById('ageFilter'),
  search: document.getElementById('searchFilter'),
  rows: document.getElementById('rows'),
  count: document.getElementById('count'),
  status: document.getElementById('status'),
  refresh: document.getElementById('refreshBtn')
};

const allFilters = [els.season, els.sport, els.gender, els.age, els.search];
allFilters.forEach((el) => el.addEventListener('input', loadCompetitions));
els.refresh.addEventListener('click', refreshData);

async function boot() {
  await loadSeasons();
  await loadCompetitions();
}

async function loadSeasons() {
  const response = await fetch('/api/seasons');
  const payload = await response.json();
  for (const season of payload.items) {
    const option = document.createElement('option');
    option.value = season.seasonId;
    option.textContent = season.seasonLabel;
    if (season.isCurrent) option.textContent += ' (current)';
    els.season.appendChild(option);
  }
}

function addOptions(select, values) {
  const selected = select.value;
  select.innerHTML = '<option value="">All</option>';
  values
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  select.value = selected;
}

function fillDynamicFilters(items) {
  addOptions(els.sport, [...new Set(items.map((item) => item.sport))]);
  addOptions(els.gender, [...new Set(items.map((item) => item.gender))]);
  addOptions(els.age, [...new Set(items.map((item) => item.ageGroup))]);
}

function makeQuery() {
  const query = new URLSearchParams();
  if (els.season.value) query.set('seasonId', els.season.value);
  if (els.sport.value) query.set('sport', els.sport.value);
  if (els.gender.value) query.set('gender', els.gender.value);
  if (els.age.value) query.set('ageGroup', els.age.value);
  if (els.search.value.trim()) query.set('search', els.search.value.trim());
  return query.toString();
}

async function loadCompetitions() {
  els.status.textContent = 'Loading competitions...';
  const query = makeQuery();
  const response = await fetch(`/api/competitions${query ? `?${query}` : ''}`);
  const payload = await response.json();

  state.competitions = payload.items;
  fillDynamicFilters(payload.items);
  renderRows(payload.items);

  els.count.textContent = `${payload.count} competitions found`;
  els.status.textContent = 'Ready';
}

function renderRows(items) {
  els.rows.innerHTML = '';
  if (!items.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="8">No competitions found with current filters.</td>';
    els.rows.appendChild(tr);
    return;
  }

  for (const item of items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.name || '')}</td>
      <td>${escapeHtml(item.seasonLabel || '')}</td>
      <td>${escapeHtml(item.sport || '-')}</td>
      <td>${escapeHtml(item.gender || '-')}</td>
      <td>${escapeHtml(item.ageGroup || '-')}</td>
      <td>${escapeHtml(item.associationName || '')} (${item.associationId})</td>
      <td>${item.competitionUrl ? `<a href="${item.competitionUrl}" target="_blank" rel="noopener">open</a>` : '-'}</td>
      <td>${new Date(item.lastScrapedAt).toLocaleString()}</td>
    `;
    els.rows.appendChild(tr);
  }
}

async function refreshData() {
  els.status.textContent = 'Running background refresh...';
  els.refresh.disabled = true;
  try {
    await fetch('/api/scrape', { method: 'POST' });
    await loadCompetitions();
  } catch (error) {
    console.error(error);
    els.status.textContent = 'Refresh failed. Existing cache is still available.';
  } finally {
    els.refresh.disabled = false;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

boot().catch((error) => {
  console.error(error);
  els.status.textContent = 'Failed to boot application';
});
