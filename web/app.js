const form = document.getElementById('filters');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('competitions');

function pickName(item) {
  return item?.name || item?.competitionName || item?.descricao || `Competição #${item?.id ?? '?'}`;
}

function pickId(item) {
  return item?.id || item?.competitionId || item?.provaId || 'n/d';
}

async function loadCompetitions(associationId, seasonId) {
  statusEl.textContent = 'A carregar...';
  listEl.innerHTML = '';

  const url = `/api/competitions?associationId=${encodeURIComponent(associationId)}&seasonId=${encodeURIComponent(seasonId)}`;

  const response = await fetch(url);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || 'Erro a carregar dados.');
  }

  const competitions = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.result || payload?.competitions || [];

  if (!competitions.length) {
    statusEl.textContent = 'Sem competições para os filtros indicados.';
    return;
  }

  statusEl.textContent = `${competitions.length} competições encontradas.`;

  competitions.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = `${pickName(item)} (ID: ${pickId(item)})`;
    listEl.appendChild(li);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const associationId = document.getElementById('associationId').value.trim();
  const seasonId = document.getElementById('seasonId').value.trim();

  try {
    await loadCompetitions(associationId, seasonId);
  } catch (error) {
    statusEl.textContent = `Falha: ${error.message}`;
  }
});
