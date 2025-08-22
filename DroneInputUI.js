import { collectInputs } from './DroneInput.js';
import { wireKmlUI } from './modules/kml/kml.js';

export function renderDroneInputUI(containerId = 'inputContent') {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <label>Flughöhe [m AGL]*:
      <input id="hfgInput" type="number" step="1">
    </label><br>

    <label>Betriebsmodus:
      <select id="opType">
        <option value="VLOS">VLOS</option>
        <option value="BVLOS">BVLOS</option>
      </select>
    </label><br>

    <label>Drohnentyp:
      <select id="aircraftType">
        <option value="rotorcraft">Drehflügler</option>
        <option value="fixedwing">Starrflügler</option>
      </select>
    </label><br>

    <label>
      <input type="checkbox" id="prsEquipped"> Ausgestattet mit PRS
    </label><br>

    <label>Drohnengrösse [m]*:
      <input id="cdInput" type="number" step="0.1">
    </label><br>

    <label>Fluggeschwindigkeit [m/s]*:
      <input id="v0Input" type="number" step="0.1">
    </label><br>

    <label>Steigrate (ROC) [m/s]:
      <input id="rocInput" type="number" step="0.1">
    </label><br>

    <label>Sinkrate (ROD) [m/s]*:
      <input id="rodInput" type="number" step="0.1">
    </label><br>

    <label>Windgeschwindigkeit [m/s]:
      <input id="windInput" type="number" step="0.1">
    </label><br>

    <button id="submitDroneInputs">Puffer berechnen</button>
    
    <!-- KML controls -->
    <div style="display:flex; gap:8px; align-items:center; margin-top:4px;">
      <button id="kmlImportBtn">KML importieren</button>
      <button id="kmlExportBtn">KML exportieren</button>
    </div>
  `;

  // simple style helper (you were calling style(...) but hadn't defined it)
  const style = (color) => ({ color, weight: 1, opacity: 1, fillOpacity: 0.4 });

  document.getElementById('submitDroneInputs')?.addEventListener('click', async () => {
    const input = collectInputs();
    if (!input) return;

    const fg = window.getFG?.();
    if (!fg || !fg.features || !fg.features.length) {
      alert("Please draw the Flight Geography (polygon/line/area) on the map first.");
      return;
    }

    // Clear previous results UI and buffer layers before new calculation
    el.querySelectorAll('.resultsPanel').forEach(n => n.remove());
    window.clearCalculatedBuffers?.();

    try {
      const res = await fetch('https://digitool-backend.onrender.com/api/grb/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fg, params: input })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Backend error (${res.status}): ${txt}`);
      }

      const data = await res.json();
      console.debug('[GRB] response:', data);

      const meta = data?.meta ?? {};
      const layers = data?.layers ?? {};

      const fmt = (x, digits = 1) => Number.isFinite(x) ? x.toFixed(digits) : '—';

      const scv_m = Number.isFinite(meta.scv_m) ? meta.scv_m : null;
      const hcv_m = Number.isFinite(meta.hcv_m) ? meta.hcv_m : null;
      const grb_m = Number.isFinite(meta.grb_m) ? (meta.grb_m - meta.scv_m) : null;
      const sd_m  = Number.isFinite(meta.sd_m)  ? meta.sd_m  : null;
      const aa_m  = Number.isFinite(meta.aa_m)  ? meta.aa_m  : null;
      const ah_m = Number.isFinite(meta.ah_m) ? meta.ah_m : null;

      const targetGroup = window._bufferGroup || map;
      
      if (layers.ca)                 L.geoJSON(layers.ca, {                 style: f => f.properties.style }).addTo(targetGroup);
      if (layers.grb)                L.geoJSON(layers.grb, {                style: f => f.properties.style }).addTo(targetGroup);
      if (layers.detection_area)     L.geoJSON(layers.detection_area, {     style: f => f.properties.style }).addTo(targetGroup);
      if (layers.adjacent_area)      L.geoJSON(layers.adjacent_area, {      style: f => f.properties.style }).addTo(targetGroup);
      if (layers.assemblies_horizon) L.geoJSON(layers.assemblies_horizon, { style: f => f.properties.style }).addTo(targetGroup);


      const panelHtml = `
        <div class="resultsPanel">
          <h4>Berechnete Puffer</h4>

          <div class="metricRow">
            <div class="metricLabel"><span class="chip chip-scv"></span>Scv</div>
            <div class="metricValue">${fmt(scv_m)} m</div>
          </div>

          ${hcv_m !== null ? `
          <div class="metricRow">
            <div class="metricLabel"><span class="chip chip-scv"></span>Hcv</div>
            <div class="metricValue">${fmt(hcv_m)} m</div>
          </div>` : ''}

          <div class="metricRow">
            <div class="metricLabel"><span class="chip chip-grb"></span>GRB</div>
            <div class="metricValue">${fmt(grb_m)} m</div>
          </div>

          <div class="metricRow">
            <div class="metricLabel"><span class="chip chip-ah"></span>Versammlungen</div>
            <div class="metricValue">${fmt(ah_m)} m</div>
          </div>

          <div class="metricRow">
            <div class="metricLabel"><span class="chip chip-sd"></span>Detektion</div>
            <div class="metricValue">${fmt(sd_m)} m</div>
          </div>

          <div class="metricRow">
            <div class="metricLabel"><span class="chip chip-aa"></span>Angrenzend</div>
            <div class="metricValue">${fmt(aa_m, 0)} m</div>
          </div>
        </div>
      `;

      el.insertAdjacentHTML('beforeend', panelHtml);

    } catch (e) {
      console.error(e);
      alert(`Request failed: ${e.message}`);
    }
  });

  wireKmlUI({ exportScopeSelectId: 'kmlScope' }); // will look for #kmlImportBtn and #kmlExportBtn we added above

}
