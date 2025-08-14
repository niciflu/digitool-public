const map = L.map('map').setView([46.8, 8.33], 8);



const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

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

map.on('draw:created', function (e) {
  const layer = e.layer;
  drawnItems.addLayer(layer);
  const geojson = layer.toGeoJSON();
  console.log("Drawn polygon GeoJSON:", JSON.stringify(geojson));
});

if (L.control && typeof L.control.measure === 'function') {
  L.control.measure({ position: 'topright',
    primaryLengthUnit: 'meters',
    secondaryLengthUnit: 'kilometers',
    primaryAreaUnit: 'sqmeters'}).addTo(map);
} 
else {
  console.error('leaflet-measure not found – is the script loaded before map.js?');
}

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
  "SORA Bodenrisiko": soraBodenrisiko
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
