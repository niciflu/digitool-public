console.log("ui script loaded");

document.getElementById('icaoToggle').onchange = (e) =>
  e.target.checked ? icaoKarte.addTo(map) : map.removeLayer(icaoKarte);
document.getElementById('icaoOpacity').oninput = (e) =>
  icaoKarte.setOpacity(parseFloat(e.target.value));

document.getElementById('obstacleToggle').onchange = (e) =>
  e.target.checked ? luftfahrthindernisse.addTo(map) : map.removeLayer(luftfahrthindernisse);
document.getElementById('obstacleOpacity').oninput = (e) =>
  luftfahrthindernisse.setOpacity(parseFloat(e.target.value));

document.getElementById('droneToggle').onchange = (e) =>
  e.target.checked ? drohnenEinschraenkungen.addTo(map) : map.removeLayer(drohnenEinschraenkungen);
document.getElementById('droneOpacity').oninput = (e) =>
  drohnenEinschraenkungen.setOpacity(parseFloat(e.target.value));

document.getElementById('soraToggle').onchange = (e) =>
  e.target.checked ? soraBodenrisiko.addTo(map) : map.removeLayer(soraBodenrisiko);
document.getElementById('soraOpacity').oninput = (e) =>
  soraBodenrisiko.setOpacity(parseFloat(e.target.value));

document.getElementById('spitalToggle').onchange = (e) =>
  e.target.checked ? spitallandeplaetze.addTo(map) : map.removeLayer(spitallandeplaetze);

document.getElementById('gebirgsToggle').onchange = (e) =>
  e.target.checked ? gebirgslandeplaetze.addTo(map) : map.removeLayer(gebirgslandeplaetze);

const toolsToggle = document.getElementById('toolsToggle');
const mapTools = document.getElementById('mapTools');

toolsToggle?.addEventListener('click', () => {
  mapTools.classList.toggle('collapsed');
  toolsToggle.textContent = mapTools.classList.contains('collapsed') ? '▲ Tools' : '▼ Tools';
});

// --- Address Search (simple) ---
const addrInput = document.getElementById('addrInput');
const addrResults = document.getElementById('addrResults');

let addrTimer = null;

async function searchAddress(q) {
  // GeoAdmin SearchServer: type=locations keeps results clean for places/addresses
  const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(q)}&type=locations`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  // Map to label + LV95 coords (x=E, y=N). We'll convert to WGS84 via a simple formula if needed later.
  return (data.results || []).slice(0, 8).map(r => ({
    label: r.attrs.label,
    lon: r.attrs.lon, // WGS84 lon/lat are available in the response
    lat: r.attrs.lat
  }));
}

function clearResults() {
  addrResults.innerHTML = '';
  addrResults.style.display = 'none';
}

function showResults(items) {
  if (!items.length) { clearResults(); return; }
  addrResults.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'result';
    div.innerHTML = item.label;
    div.onclick = () => {
      clearResults();
      // center & mark using helper on window from map.js
      window.flyToAndMark(item.lat, item.lon, item.label);
      addrInput.value = item.label;
    };
    addrResults.appendChild(div);
  });
  addrResults.style.display = 'block';
}

addrInput?.addEventListener('input', () => {
  const q = addrInput.value.trim();
  clearTimeout(addrTimer);
  if (q.length < 3) { clearResults(); return; }
  addrTimer = setTimeout(async () => {
    try {
      const items = await searchAddress(q);
      showResults(items);
    } catch (e) {
      console.error('address search failed', e);
      clearResults();
    }
  }, 250); // debounce
});

// Hide dropdown when clicking outside
document.addEventListener('click', (e) => {
  if (!document.getElementById('searchBox')?.contains(e.target)) clearResults();
});

