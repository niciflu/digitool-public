const map = L.map('map').setView([46.8, 8.33], 8);

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// adding a new leaflet with all the calculated buffers inside
const bufferGroup = new L.FeatureGroup();
map.addLayer(bufferGroup);

const drawControl = new L.Control.Draw({
  position: 'topright',
  edit: {
    featureGroup: drawnItems
  },
  draw: {
    polygon: { shapeOptions: { color: 'green' } },
    polyline: { shapeOptions: { color: 'green' } },
    rectangle: { shapeOptions: { color: 'green' } },
    circle: { shapeOptions: { color: 'green' } },
    marker: { shapeOptions: { color: 'green' } },
    circlemarker: false
  }
});
map.addControl(drawControl);

map.addControl(drawControl);

map.on('draw:created', function (e) {
  const layer = e.layer;
  drawnItems.addLayer(layer);

  const gj = layer.toGeoJSON();
  layer.feature = layer.feature || { type:'Feature', properties:{}, geometry: layer.toGeoJSON().geometry };
  if (!layer.feature.properties.name) {
    const idx = drawnItems.getLayers().length;
    layer.feature.properties.name = `Flight Geography ${idx}`;
  }


  // Give FG a visible style (matches your exporter) and a name
  const FG_COLOR = '#00A36C';
  layer.setStyle?.({ color: FG_COLOR, fillColor: FG_COLOR, fillOpacity: 0.4, weight: 2, opacity: 1 });
  layer.feature.properties.style = {
    color: FG_COLOR, weight: 2, opacity: 1, fillColor: FG_COLOR, fillOpacity: 0.4
  };

  // Name the FG (use an index if you draw multiple)
  const idx = drawnItems.getLayers().length;
  layer.feature.properties.name = `Flight Geography ${idx}`;

  console.log("Drawn polygon GeoJSON:", JSON.stringify(layer.toGeoJSON()));
});

map.createPane('overlayPaneTop');
map.getPane('overlayPaneTop').style.zIndex = 650;

const pixelkarteFarbe = L.tileLayer.wms('https://wms.geo.admin.ch/', {
  layers: 'ch.swisstopo.pixelkarte-farbe',
  format: 'image/png'
});

const pixelkarteGrau = L.tileLayer.wms('https://wms.geo.admin.ch/', {
  layers: 'ch.swisstopo.pixelkarte-grau',
  format: 'image/png'
});

const Swissimage = L.tileLayer.wms('https://wms.geo.admin.ch/', {
  layers: 'ch.swisstopo.swissimage',
  format: 'image/png'
});

const luftfahrthindernisse = L.tileLayer.wms('https://wms.geo.admin.ch/', {
  pane: 'overlayPaneTop',
  layers: 'ch.bazl.luftfahrthindernis',
  format: 'image/png',
  transparent: true,
  opacity: 0.4
});

const drohnenEinschraenkungen = L.tileLayer.wms('https://wms.geo.admin.ch/', {
  pane: 'overlayPaneTop',
  layers: 'ch.bazl.einschraenkungen-drohnen',
  format: 'image/png',
  transparent: true,
  opacity: 0.4
});

const soraBodenrisiko = L.tileLayer.wms('https://wms.geo.admin.ch/', {
  pane: 'overlayPaneTop',
  layers: 'ch.bazl.intrinsisches-bodenrisiko_sora',
  format: 'image/png',
  transparent: true,
  opacity: 0.4
});

const icaoKarte = L.tileLayer.wms('https://wms.geo.admin.ch/', {
  layers: 'ch.bazl.luftfahrtkarten-icao',
  format: 'image/png',
  transparent: true,
  opacity: 1.0
});

// --- Spitallandeplätze (hospital landing sites) — WMTS (EPSG:3857)
const spitallandeplaetze = L.tileLayer(
  "https://wmts.geo.admin.ch/1.0.0/ch.bazl.spitallandeplaetze/default/current/3857/{z}/{x}/{y}.png",
  { pane: 'overlayPaneTop', attribution: '© geo.admin.ch / BAZL' }
);

// --- Gebirgslandeplätze (mountain landing sites) — WMTS (EPSG:3857)
const gebirgslandeplaetze = L.tileLayer(
  "https://wmts.geo.admin.ch/1.0.0/ch.bazl.gebirgslandeplaetze/default/current/3857/{z}/{x}/{y}.png",
  { pane: 'overlayPaneTop', attribution: '© geo.admin.ch / BAZL' }
);

pixelkarteFarbe.addTo(map);
drohnenEinschraenkungen.addTo(map);
soraBodenrisiko.addTo(map);

const baseLayers = {
  "Pixelkarte Farbe": pixelkarteFarbe,
  "Pixelkarte Grau": pixelkarteGrau,
  "Luftbild": Swissimage
};

const overlays = {
  "ICAO Karte": icaoKarte,
  "Luftfahrthindernisse": luftfahrthindernisse,
  "Einschränkungen für Drohnen": drohnenEinschraenkungen,
  "SORA Bodenrisiko": soraBodenrisiko,
  "Spitallandeplätze": spitallandeplaetze,
  "Gebirgslandeplätze": gebirgslandeplaetze
};

// Only include base layers — no overlays
const layerControl = L.control.layers(baseLayers, {}, {
  collapsed: false
}).addTo(map);

// Move to styled UI box
const layerControlEl = document.querySelector('.leaflet-control-layers');
const layerBox = document.querySelector('#layerBox');

if (layerControlEl && layerBox) {
  layerBox.appendChild(layerControlEl);
}

// Helper used by UI to center and mark an address
const searchMarker = L.marker([0,0], { draggable: false });
function flyToAndMark(lat, lon, label) {
  searchMarker.setLatLng([lat, lon]).addTo(map);
  if (label) searchMarker.bindPopup(label, { autoClose: true });
  map.flyTo([lat, lon], 17);
}

// Make helper globally available to ui.js
window.flyToAndMark = flyToAndMark;
window.getFG = () => drawnItems.toGeoJSON(); // returns a FeatureCollection

// Expose helpers so UI code can clear and add into this group
window.clearCalculatedBuffers = () => bufferGroup.clearLayers();
window._bufferGroup = bufferGroup;

window.map = map;
window.overlays = overlays; // expose for UI toggles

// signal that map + overlays are ready
window.dispatchEvent(new Event('digitool:mapReady'));

// Allow KML import to add features to the drawn items group
window.addGeoJSONToDrawn = (geojson) => {
  if (!geojson) return;

  // Map SimpleStyle -> Leaflet Path options
  const toLeafletStyle = (p = {}) => ({
    color:       p.stroke || '#00A36C',
    weight:      p['stroke-width'] ?? 2,
    opacity:     p['stroke-opacity'] ?? 1,
    fillColor:   p.fill || p.stroke || '#00A36C',
    fillOpacity: p['fill-opacity'] ?? (p.fill ? 0.4 : 0)
  });

L.geoJSON(geojson, {
    style: f => toLeafletStyle(f.properties || {}),
    pointToLayer: (f, latlng) => {
      const p = f.properties || {};
      if (p.icon) {
        // If KML had an IconStyle, togeojson exposes it as properties.icon
        return L.marker(latlng, { icon: L.icon({ iconUrl: p.icon, iconSize: [24, 24] }) });
      }
      return L.marker(latlng);
    },
    onEachFeature: (f, layer) => {
      // Persist a standard 'style' block so exports stay styled too
      const s = toLeafletStyle(f.properties || {});
      layer.feature = layer.feature || { type: 'Feature', properties: {}, geometry: f.geometry };
      layer.feature.properties.style = {
        color: s.color, weight: s.weight, opacity: s.opacity,
        fillColor: s.fillColor, fillOpacity: s.fillOpacity
      };
      // Keep the name if present (so re-exports keep placemark names)
      if (f.properties?.name) layer.feature.properties.name = f.properties.name;
    }
  }).eachLayer(layer => drawnItems.addLayer(layer));
};

// Returns a FeatureCollection of all calculated buffer layers
window.getCalculatedBuffers = () => window._bufferGroup?.toGeoJSON?.() || null;


// Return buffers as GeoJSON (FeatureCollection of all layers in bufferGroup)
window.getCalculatedBuffers = () => bufferGroup.toGeoJSON();

// map.js
import { exportKML, importKML } from './modules/kml/kml.js';
import { getKmlExportOptionsFromUI } from './ui.js';

// Collect current features from your map state
function collectFeaturesForExport() {
  // Normalize your current layers to { geometry, name, styleUrl, meta: { layerType, grbVersion, params } }
  // Ensure FG has meta.layerType = 'FG', buffers = 'AssembliesHorizon' | 'AdjacentArea'
  // Return an array
  return window.DigitoolState.features;
}

export function onClickExportKML() {
  const features = collectFeaturesForExport();
  const options = getKmlExportOptionsFromUI();
  const kml = exportKML(features, options);
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'digitool_export.kml';
  a.click();
  URL.revokeObjectURL(url);
}

export async function onImportKML(file) {
  const text = await file.text();
  const { features, unknowns } = importKML(text);

  // Add recognized features to their layers
  for (const f of features) {
    addFeatureToMap(f); // your existing add function
  }

  // If any unknowns, prompt the user to tag them
  if (unknowns.length) {
    // Simple approach: open a small modal allowing manual classification per feature
    openUnknownKmlModal(unknowns, (resolved) => {
      for (const f of resolved) addFeatureToMap(f);
    });
  }
}

// Collect all buffer layers as a single FeatureCollection for export
window.getCalculatedBuffers = () => {
  const fc = { type: "FeatureCollection", features: [] };
  bufferGroup.eachLayer(layer => {
    if (typeof layer.toGeoJSON !== 'function') return;
    const gj = layer.toGeoJSON();
    if (!gj) return;
    if (gj.type === 'FeatureCollection') fc.features.push(...(gj.features || []));
    else if (gj.type === 'Feature') fc.features.push(gj);
    else if (gj.type && gj.coordinates) fc.features.push({ type: 'Feature', properties: {}, geometry: gj });
  });
  return fc;
};
