async function loadCompetitions() {
  const res = await fetch('/api/competitions');
  const data = await res.json();
  const list = document.getElementById('list');
  list.innerHTML = '';
  data.items.forEach(c => {
    const li = document.createElement('li');
    li.textContent = c.Name;
    list.appendChild(li);
  });
}