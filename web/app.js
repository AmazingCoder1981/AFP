const API = {
  competitions: '/api/competitions',
  games: (id) => `/api/games?competitionId=${id}`,
  standings: (id) => `/api/standings?competitionId=${id}`,
  scorers: (id) => `/api/scorers?competitionId=${id}`
};

const el = {
  loadBtn: document.getElementById('loadBtn'),
  list: document.getElementById('competitionList'),
  detail: document.getElementById('competitionDetail'),
  status: document.getElementById('status'),
  count: document.getElementById('competitionCount')
};

el.loadBtn.addEventListener('click', loadCompetitions);

async function loadCompetitions() {
  setStatus('A carregar competições...');
  try {
    const res = await fetch(API.competitions);
    const data = await res.json();

    el.list.innerHTML = '';
    el.count.textContent = data.items.length;

    data.items.forEach(c => {
      const div = document.createElement('div');
      div.className = 'competition-item';
      div.textContent = c.Name;
      div.onclick = () => loadCompetitionDetail(c);
      el.list.appendChild(div);
    });

    setStatus('Competições carregadas.');
  } catch (e) {
    setStatus('Erro ao carregar competições');
  }
}

async function loadCompetitionDetail(c) {
  setStatus(`A carregar ${c.Name}...`);
  el.detail.innerHTML = `<h2>${c.Name}</h2><p>Loading...</p>`;

  try {
    const [games, standings, scorers] = await Promise.all([
      fetch(API.games(c.CompetitionId)).then(r => r.json()),
      fetch(API.standings(c.CompetitionId)).then(r => r.json()),
      fetch(API.scorers(c.CompetitionId)).then(r => r.json())
    ]);

    el.detail.innerHTML = `
      <h2>${c.Name}</h2>

      <h3>Jogos</h3>
      ${renderGames(games.items)}

      <h3>Classificação</h3>
      ${renderStandings(standings.items)}

      <h3>Marcadores</h3>
      ${renderScorers(scorers.items)}
    `;

    setStatus(`${c.Name} carregado.`);
  } catch (e) {
    setStatus('Erro ao carregar detalhe');
  }
}

function renderGames(games) {
  if (!games.length) return '<p>Sem jogos</p>';
  return '<ul>' + games.map(g => `<li>${g.HomeTeam} vs ${g.AwayTeam}</li>`).join('') + '</ul>';
}

function renderStandings(rows) {
  if (!rows.length) return '<p>Sem dados</p>';
  return '<ul>' + rows.map(r => `<li>${r.Position}. ${r.Team} (${r.Points} pts)</li>`).join('') + '</ul>';
}

function renderScorers(rows) {
  if (!rows.length) return '<p>Sem dados</p>';
  return '<ul>' + rows.map(s => `<li>${s.Player} - ${s.Goals} golos</li>`).join('') + '</ul>';
}

function setStatus(msg) {
  el.status.textContent = msg;
}