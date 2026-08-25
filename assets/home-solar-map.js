(() => {
  'use strict';

  const data = Array.isArray(window.HIDROLAB_COMMUNES) ? window.HIDROLAB_COMMUNES : [];
  const region = document.getElementById('homeMapRegion');
  const commune = document.getElementById('homeMapCommune');
  const lat = document.getElementById('homeMapLat');
  const lon = document.getElementById('homeMapLon');
  const updateBtn = document.getElementById('homeMapUpdate');
  const map = document.getElementById('homeGoogleMap');
  const coordsOut = document.getElementById('homeMapCoords');
  const locationOut = document.getElementById('homeMapLocationLabel');
  const external = document.getElementById('homeMapExternal');
  const solarOpen = document.getElementById('homeSolarOpen');

  if (!region || !commune || !lat || !lon || !map) return;

  const esc = value => String(value ?? '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;');

  function selectedRecord(){
    const index = Number(commune.value);
    return Number.isInteger(index) && index >= 0 ? data[index] : null;
  }

  function coordinates(){
    const la = Number(lat.value);
    const lo = Number(lon.value);
    if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
    if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
    return [la, lo];
  }

  function updateMap(customLabel = false){
    const c = coordinates();
    if (!c) {
      lat.setCustomValidity('La latitud debe estar entre -90 y 90.');
      lon.setCustomValidity('La longitud debe estar entre -180 y 180.');
      lat.reportValidity();
      return;
    }

    lat.setCustomValidity('');
    lon.setCustomValidity('');

    const [la, lo] = c;
    const laText = la.toFixed(6);
    const loText = lo.toFixed(6);

    map.src = `https://maps.google.com/maps?q=${encodeURIComponent(laText + ',' + loText)}&z=14&output=embed`;
    coordsOut.textContent = `${laText}, ${loText}`;
    external.href = `https://www.google.com/maps?q=${encodeURIComponent(laText + ',' + loText)}`;

    const item = selectedRecord();
    if (customLabel) locationOut.textContent = 'Coordenadas personalizadas';
    else if (item) locationOut.textContent = `${item.comuna}, ${item.region}`;

    const params = new URLSearchParams({lat: laText, lon: loText});
    if (!customLabel && item) {
      params.set('region', item.region);
      params.set('comuna', item.comuna);
    }
    solarOpen.href = `simulador-solar.html?${params.toString()}`;
  }

  function applyCommune(){
    const item = selectedRecord();
    if (!item) return;
    lat.value = Number(item.lat).toFixed(6);
    lon.value = Number(item.lon).toFixed(6);
    locationOut.textContent = `${item.comuna}, ${item.region}`;
    updateMap(false);
  }

  function fillCommunes(preferred = ''){
    const reg = region.value;
    const options = data
      .map((item, index) => ({item, index}))
      .filter(x => x.item.region === reg);

    commune.innerHTML = options
      .map(x => `<option value="${x.index}">${esc(x.item.comuna)}</option>`)
      .join('');

    let chosen = options[0];
    if (preferred) chosen = options.find(x => x.item.comuna === preferred) || chosen;
    if (chosen) commune.value = String(chosen.index);
    applyCommune();
  }

  if (data.length) {
    const regions = [...new Set(data.map(x => x.region).filter(Boolean))];
    region.innerHTML = regions.map(r => `<option>${esc(r)}</option>`).join('');

    const defaultRegion = regions.includes('Metropolitana de Santiago')
      ? 'Metropolitana de Santiago'
      : regions[0];

    region.value = defaultRegion;
    fillCommunes(defaultRegion === 'Metropolitana de Santiago' ? 'Santiago' : '');
  } else {
    region.innerHTML = '<option>Chile</option>';
    commune.innerHTML = '<option value="-1">Coordenadas manuales</option>';
    updateMap(true);
  }

  region.addEventListener('change', () => fillCommunes());
  commune.addEventListener('change', applyCommune);

  updateBtn?.addEventListener('click', () => updateMap(true));

  [lat, lon].forEach(input => {
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') updateMap(true);
    });
  });
})();