/* ═══════════════════════════════════════════════
   TERRA — app.js
   ═══════════════════════════════════════════════ */
'use strict';

// ── TILE LAYERS ────────────────────────────────
const LAYERS = {
  satellite: L.layerGroup([
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution:'Esri', maxZoom:19 }
    ),
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution:'Esri Labels', maxZoom:19, opacity:1 }
    )
  ]),
  street: L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution:'OSM', maxZoom:19 }
  ),
  terrain: L.tileLayer(
    'https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg',
    { attribution:'Stamen', maxZoom:18 }
  ),
  dark: L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution:'CartoDB', maxZoom:19 }
  )
};

// ── MAP INIT ───────────────────────────────────
const map = L.map('map', {
  center: [20, 0], zoom: 3,
  layers: [LAYERS.satellite],
  zoomControl: false
});
L.control.zoom({ position:'topleft' }).addTo(map);
let currentLayer = 'satellite';

// ── STATE ─────────────────────────────────────
let clickedLatLng = null;
let routeFromLL = null, routeToLL = null;
let routeFromMarker = null, routeToMarker = null;
let routeLayer = null;
let poiMarkers = L.layerGroup().addTo(map);
let poiVisible = false;
let currentLocation = null; // { name, lat, lon }

// ── MARKERS ───────────────────────────────────
const makeIcon = (color='#00dcb4', symbol='●') => L.divIcon({
  className:'',
  html:`<div style="width:28px;height:28px;background:rgba(8,14,22,0.9);border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:12px;color:${color};box-shadow:0 0 12px ${color}44">${symbol}</div>`,
  iconSize:[28,28], iconAnchor:[14,14]
});

// ── LAYER SWITCHER ─────────────────────────────
document.querySelectorAll('.layer-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const l = btn.dataset.layer;
    if(l === currentLayer) return;
    map.removeLayer(LAYERS[currentLayer]);
    map.addLayer(LAYERS[l]);
    currentLayer = l;
    document.querySelectorAll('.layer-btn').forEach(b=>b.classList.toggle('active', b.dataset.layer===l));
  });
});

// ── TOAST ─────────────────────────────────────
function toast(msg, dur=2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), dur);
}

// ── API HELPERS ───────────────────────────────
async function api(path) {
  const r = await fetch(path); return r.json();
}
async function post(path, body) {
  const r = await fetch(path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
  return r.json();
}

// ── SEARCH ────────────────────────────────────
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
let searchDebounce;

searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(doSearch, 400);
});
document.getElementById('searchBtn').addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if(e.key==='Enter') doSearch(); });

async function doSearch() {
  const q = searchInput.value.trim();
  if(q.length < 2) { searchResults.innerHTML=''; return; }
  searchResults.innerHTML = '<div class="search-item" style="color:var(--text2)">Searching…</div>';
  const data = await api(`/api/geocode?q=${encodeURIComponent(q)}`);
  searchResults.innerHTML = '';
  if(!data.length) { searchResults.innerHTML='<div class="search-item" style="color:var(--text2)">No results</div>'; return; }
  data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'search-item';
    div.textContent = item.display_name;
    div.addEventListener('click', () => {
      const lat=parseFloat(item.lat), lon=parseFloat(item.lon);
      map.setView([lat,lon], 13);
      searchResults.innerHTML='';
      searchInput.value='';
      handleMapClick({latlng:{lat,lng:lon}});
    });
    searchResults.appendChild(div);
  });
}
document.addEventListener('click', e => { if(!e.target.closest('.search-wrap')) searchResults.innerHTML=''; });

// ── MAP CLICK ─────────────────────────────────
map.on('click', handleMapClick);

function handleMapClick(e) {
  const {lat, lng} = e.latlng;
  clickedLatLng = {lat, lng};
  openInfoPanel(lat, lng);
}

async function openInfoPanel(lat, lng) {
  const panel = document.getElementById('infoPanel');
  panel.style.display = 'flex';
  switchTab('overview');

  // Update HUD coords
  document.getElementById('sv-coords').textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  document.getElementById('ms-lat').textContent = lat.toFixed(6);
  document.getElementById('ms-lon').textContent = lng.toFixed(6);
  document.getElementById('ms-elev').textContent = '…';
  document.getElementById('ms-country').textContent = '…';
  document.getElementById('placeName').textContent = 'Loading…';
  document.getElementById('placeAddr').textContent = '';
  document.getElementById('overviewWeather').innerHTML = '';
  document.getElementById('wikiContent').innerHTML = '<div class="loading-spin"></div>';
  document.getElementById('poisList').innerHTML = '<div class="loading-spin"></div>';
  document.getElementById('aiGuideContent').innerHTML = '<p class="ai-placeholder">Loading location…</p>';

  // Parallel data fetching
  const [geoData, weatherData, elevData] = await Promise.all([
    api(`/api/reverse-geocode?lat=${lat}&lon=${lng}`),
    api(`/api/weather?lat=${lat}&lon=${lng}`),
    api(`/api/elevation?lat=${lat}&lon=${lng}`)
  ]);

  // Geo
  const addr = geoData.address || {};
  const name = addr.city || addr.town || addr.village || addr.county || addr.state || addr.country || 'Unknown Location';
  const country = addr.country || '';
  const fullAddr = geoData.display_name || '';
  currentLocation = { name: `${name}${country ? ', ' + country : ''}`, lat, lng };

  document.getElementById('placeName').textContent = name;
  document.getElementById('placeAddr').textContent = fullAddr;
  document.getElementById('ms-country').textContent = country;

  // Elevation
  const elev = elevData?.results?.[0]?.elevation;
  const elevStr = elev !== undefined && elev !== 'N/A' ? `${Math.round(elev)}m` : '—';
  document.getElementById('ms-elev').textContent = elevStr;
  document.getElementById('sv-elev').textContent = elevStr;

  // Weather summary
  if(weatherData?.current_weather) {
    const cw = weatherData.current_weather;
    const tempStr = `${Math.round(cw.temperature)}°C`;
    document.getElementById('sv-temp').textContent = tempStr;
    const wDesc = wmoCode(cw.weathercode);
    document.getElementById('overviewWeather').innerHTML = `<span style="font-size:22px">${wDesc.icon}</span> <strong>${tempStr}</strong> <span style="color:var(--text2);font-size:10px">${wDesc.desc} · Wind ${Math.round(cw.windspeed)} km/h</span>`;
    loadWeatherPanel(weatherData, name);
  }

  // Auto-load wiki for current tab
  loadWiki(lat, lng, name);
  loadPOIs(lat, lng, document.getElementById('poiRadius').value);
}

// ── WIKI ──────────────────────────────────────
async function loadWiki(lat, lng, name) {
  const wikiContent = document.getElementById('wikiContent');
  wikiContent.innerHTML = '<div class="loading-spin"></div>';
  try {
    const data = await api(`/api/wikipedia?lat=${lat}&lon=${lng}&title=${encodeURIComponent(name)}`);
    if(data.error) { wikiContent.innerHTML = `<p style="color:var(--text2);font-size:11px">No Wikipedia article found. Try searching manually.</p>`; return; }
    wikiContent.innerHTML = `
      <div class="wiki-title">${data.title}</div>
      ${data.thumbnail ? `<img src="${data.thumbnail.source}" alt="${data.title}" style="width:100%;margin:8px 0;border:1px solid var(--border)"/>` : ''}
      <div class="wiki-extract">${data.extract || 'No summary available.'}</div>
      <div class="wiki-link" style="margin-top:10px"><a href="${data.content_urls?.desktop?.page || '#'}" target="_blank">→ Read full article on Wikipedia</a></div>
    `;
    document.getElementById('wikiQuery').value = data.title;
  } catch(e) {
    wikiContent.innerHTML = `<p style="color:var(--text2);font-size:11px">Wiki lookup failed. Try searching below.</p>`;
  }
}

document.getElementById('wikiSearchBtn').addEventListener('click', () => {
  const q = document.getElementById('wikiQuery').value.trim();
  if(q) loadWikiByTitle(q);
});
document.getElementById('wikiQuery').addEventListener('keydown', e => {
  if(e.key==='Enter') { const q=e.target.value.trim(); if(q) loadWikiByTitle(q); }
});
async function loadWikiByTitle(title) {
  const wikiContent = document.getElementById('wikiContent');
  wikiContent.innerHTML = '<div class="loading-spin"></div>';
  const data = await api(`/api/wikipedia?title=${encodeURIComponent(title)}`);
  if(data.error) { wikiContent.innerHTML = '<p style="color:var(--text2)">Not found.</p>'; return; }
  wikiContent.innerHTML = `
    <div class="wiki-title">${data.title}</div>
    ${data.thumbnail ? `<img src="${data.thumbnail.source}" alt="${data.title}"/>` : ''}
    <div class="wiki-extract">${data.extract || ''}</div>
    <div class="wiki-link" style="margin-top:10px"><a href="${data.content_urls?.desktop?.page || '#'}" target="_blank">→ Full article on Wikipedia</a></div>
  `;
}

// ── POIs ──────────────────────────────────────
async function loadPOIs(lat, lng, radius) {
  const poisList = document.getElementById('poisList');
  poisList.innerHTML = '<div class="loading-spin"></div>';
  poiMarkers.clearLayers();
  try {
    const data = await api(`/api/nearby-pois?lat=${lat}&lon=${lng}&radius=${radius}`);
    const elements = data.elements || [];
    if(!elements.length) { poisList.innerHTML='<p style="color:var(--text2);font-size:11px;padding:10px">No POIs found in this radius.</p>'; return; }
    poisList.innerHTML = '';
    elements.slice(0,20).forEach(el => {
      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Unnamed Place';
      const type = tags.tourism || tags.historic || tags.amenity || 'place';
      const icon = poiIcon(type);
      const dist = el.lat && el.lon ? haversine(lat, lng, el.lat, el.lon) : null;
      
      const item = document.createElement('div');
      item.className = 'poi-item';
      item.innerHTML = `<div class="poi-icon">${icon}</div><div class="poi-info"><div class="poi-name">${name}</div><div class="poi-type">${type.toUpperCase()}</div>${dist ? `<div class="poi-dist">${formatDist(dist)}</div>` : ''}</div>`;
      item.addEventListener('click', () => {
        if(el.lat && el.lon) { map.setView([el.lat, el.lon], 16); }
        document.getElementById('wikiQuery').value = name;
        loadWikiByTitle(name);
        switchTab('wiki');
      });
      poisList.appendChild(item);

      if(el.lat && el.lon && poiVisible) {
        const m = L.marker([el.lat, el.lon], {icon: makeIcon('#ff6b35', icon)}).addTo(poiMarkers);
        m.bindPopup(`<strong>${name}</strong><br><small>${type}</small>`);
      }
    });
  } catch(e) {
    poisList.innerHTML = '<p style="color:var(--text2);font-size:11px;padding:10px">Failed to load POIs.</p>';
  }
}

document.getElementById('poiRadius').addEventListener('change', function() {
  if(clickedLatLng) loadPOIs(clickedLatLng.lat, clickedLatLng.lng, this.value);
});

function poiIcon(type) {
  const map = { museum:'🏛', restaurant:'🍽', cafe:'☕', hotel:'🏨', church:'⛪', castle:'🏰', monument:'🗿', park:'🌳', viewpoint:'👁', tourism:'🗺', historic:'🏺', waterfall:'💧', beach:'🏖', mountain:'⛰', temple:'🛕' };
  return map[type] || '📍';
}

// ── AI GUIDE ──────────────────────────────────
document.querySelectorAll('.prompt-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    askAIGuide(btn.dataset.q);
  });
});
document.getElementById('askAI').addEventListener('click', () => {
  const q = document.getElementById('aiQuestion').value.trim();
  if(q) askAIGuide(q);
});
document.getElementById('aiQuestion').addEventListener('keydown', e => {
  if(e.key==='Enter') { const q=e.target.value.trim(); if(q) askAIGuide(q); }
});

async function askAIGuide(question) {
  if(!currentLocation) { toast('Click a location first'); return; }
  const content = document.getElementById('aiGuideContent');
  const btn = document.getElementById('askAI');
  content.innerHTML = '<div class="loading-spin"></div>';
  btn.disabled = true;
  switchTab('ai');
  try {
    const data = await post('/api/ai-guide', { location: currentLocation.name, question });
    content.innerHTML = `<div class="ai-response">${data.guide}</div>`;
  } catch(e) {
    content.innerHTML = '<p style="color:var(--text2);font-size:11px">AI currently guide unavailable.</p>';
  }
  btn.disabled = false;
}

// ── WEATHER PANEL ─────────────────────────────
function loadWeatherPanel(data, locName) {
  const wc = document.getElementById('weatherContent');
  const daily = data.daily;
  if(!daily) return;
  document.getElementById('weatherLoc').textContent = locName.substring(0,20);
  const days = ['Today','Tomorrow','Day 3'];
  wc.innerHTML = daily.time.slice(0,3).map((_, i) => {
    const w = wmoCode(daily.weathercode[i]);
    return `<div class="weather-day"><span>${days[i]}</span><span class="w-icon">${w.icon}</span><span class="w-temp">${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</span><span class="w-desc">${w.desc}</span></div>`;
  }).join('');
}

function wmoCode(code) {
  const map = {
    0:{icon:'☀️',desc:'Clear'}, 1:{icon:'🌤',desc:'Mostly clear'}, 2:{icon:'⛅',desc:'Partly cloudy'},
    3:{icon:'☁️',desc:'Overcast'}, 45:{icon:'🌫',desc:'Foggy'}, 48:{icon:'🌫',desc:'Icy fog'},
    51:{icon:'🌦',desc:'Light drizzle'}, 53:{icon:'🌦',desc:'Drizzle'}, 55:{icon:'🌧',desc:'Heavy drizzle'},
    61:{icon:'🌧',desc:'Light rain'}, 63:{icon:'🌧',desc:'Rain'}, 65:{icon:'⛈',desc:'Heavy rain'},
    71:{icon:'🌨',desc:'Light snow'}, 73:{icon:'❄️',desc:'Snow'}, 75:{icon:'❄️',desc:'Heavy snow'},
    77:{icon:'🌨',desc:'Snow grains'}, 80:{icon:'🌦',desc:'Showers'}, 81:{icon:'🌧',desc:'Rain showers'},
    82:{icon:'⛈',desc:'Violent showers'}, 85:{icon:'🌨',desc:'Snow showers'}, 86:{icon:'❄️',desc:'Heavy snow showers'},
    95:{icon:'⛈',desc:'Thunderstorm'}, 96:{icon:'⛈',desc:'Thunderstorm+hail'}, 99:{icon:'🌩',desc:'Heavy thunderstorm'}
  };
  return map[code] || {icon:'🌡',desc:'Unknown'};
}

// ── ROUTE ─────────────────────────────────────
let routeMode = null; // 'from' or 'to'
let activeProfile = 'driving';

document.querySelectorAll('.profile-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.profile-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    activeProfile = btn.dataset.p;
  });
});

document.getElementById('setAsFrom').addEventListener('click', () => {
  if(!clickedLatLng) return;
  routeFromLL = clickedLatLng;
  const name = document.getElementById('placeName').textContent;
  document.getElementById('routeFrom').value = name;
  if(routeFromMarker) map.removeLayer(routeFromMarker);
  routeFromMarker = L.marker([routeFromLL.lat, routeFromLL.lng], {icon: makeIcon('#b4ff6b', '▲')}).addTo(map).bindPopup('START: ' + name);
  document.getElementById('routePanel').classList.add('open');
  toast('Start point set!');
});

document.getElementById('setAsTo').addEventListener('click', () => {
  if(!clickedLatLng) return;
  routeToLL = clickedLatLng;
  const name = document.getElementById('placeName').textContent;
  document.getElementById('routeTo').value = name;
  if(routeToMarker) map.removeLayer(routeToMarker);
  routeToMarker = L.marker([routeToLL.lat, routeToLL.lng], {icon: makeIcon('#ff6b35', '★')}).addTo(map).bindPopup('DEST: ' + name);
  document.getElementById('routePanel').classList.add('open');
  toast('Destination set!');
});

document.getElementById('calcRoute').addEventListener('click', async () => {
  if(!routeFromLL || !routeToLL) { toast('Set start & destination first'); return; }
  const coords = `${routeFromLL.lng},${routeFromLL.lat};${routeToLL.lng},${routeToLL.lat}`;
  document.getElementById('routeInfo').innerHTML = '<div class="loading-spin" style="margin:6px 0"></div>';
  const data = await api(`/api/route?coords=${coords}&profile=${activeProfile}`);
  if(data.code !== 'Ok') { document.getElementById('routeInfo').textContent = 'Route not found.'; return; }
  const route = data.routes[0];
  const dist = (route.distance/1000).toFixed(1);
  const dur  = Math.round(route.duration/60);
  document.getElementById('routeInfo').innerHTML = `
    <div>📏 Distance: <strong>${dist} km</strong></div>
    <div>⏱ Duration: <strong>${dur < 60 ? dur+'min' : Math.floor(dur/60)+'h '+dur%60+'min'}</strong></div>
  `;
  if(routeLayer) map.removeLayer(routeLayer);
  routeLayer = L.geoJSON(route.geometry, {
    style: { color:'#b4ff6b', weight:4, opacity:0.9, dashArray:'10,6' }
  }).addTo(map);
  const bounds = routeLayer.getBounds();
  map.fitBounds(bounds, {padding:[40,40]});
});

document.getElementById('clearRoute').addEventListener('click', () => {
  if(routeLayer) { map.removeLayer(routeLayer); routeLayer=null; }
  if(routeFromMarker) { map.removeLayer(routeFromMarker); routeFromMarker=null; }
  if(routeToMarker)   { map.removeLayer(routeToMarker);   routeToMarker=null; }
  routeFromLL=routeToLL=null;
  document.getElementById('routeFrom').value='';
  document.getElementById('routeTo').value='';
  document.getElementById('routeInfo').innerHTML='';
  toast('Route cleared');
});

// ── FABs ──────────────────────────────────────
document.getElementById('locateMe').addEventListener('click', () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const {latitude:lat, longitude:lng} = pos.coords;
    map.setView([lat,lng], 14);
    handleMapClick({latlng:{lat,lng}});
  }, () => toast('Location access denied'));
});

document.getElementById('toggleRoute').addEventListener('click', () => {
  document.getElementById('routePanel').classList.toggle('open');
});

document.getElementById('togglePOI').addEventListener('click', function() {
  poiVisible = !poiVisible;
  this.classList.toggle('active', poiVisible);
  if(poiVisible && clickedLatLng) {
    loadPOIs(clickedLatLng.lat, clickedLatLng.lng, document.getElementById('poiRadius').value);
  } else {
    poiMarkers.clearLayers();
  }
  toast(poiVisible ? 'POIs visible on map' : 'POIs hidden');
});

document.getElementById('toggleWeather').addEventListener('click', function() {
  const wp = document.getElementById('weatherPanel');
  const vis = wp.style.display === 'none';
  wp.style.display = vis ? 'block' : 'none';
  this.classList.toggle('active', vis);
  if(vis && !clickedLatLng) toast('Click a location to see weather');
});

// ── TABS ──────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(id) {
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab===id));
  document.querySelectorAll('.tab-pane').forEach(p=>p.classList.toggle('active', p.id==='tab-'+id));
}

document.getElementById('closePanel').addEventListener('click', () => {
  document.getElementById('infoPanel').style.display = 'none';
});

// ── UTILS ─────────────────────────────────────
function haversine(lat1,lon1,lat2,lon2) {
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function formatDist(m) { return m<1000 ? Math.round(m)+'m' : (m/1000).toFixed(1)+'km'; }

// ── MAP MOUSEMOVE (coords HUD) ─────────────────
map.on('mousemove', e => {
  document.getElementById('sv-coords').textContent = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
});

// ── INIT ──────────────────────────────────────
toast('Click anywhere on Earth to explore 🌍');
