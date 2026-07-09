import * as L from 'leaflet';
import type { Resource, HealthEvent } from '../lib/types';
import { applyFilters, filtersToParams, paramsToFilters, type Filters } from '../lib/search';
import { sortByDistance } from '../lib/geo';

type Data = { resources: Resource[]; events: HealthEvent[] };

function multiVals(sel: HTMLSelectElement): string[] {
  return [...sel.selectedOptions].map((o) => o.value);
}
function setMulti(sel: HTMLSelectElement, vals: string[]) {
  for (const o of sel.options) o.selected = vals.includes(o.value);
}

async function init() {
  const res = await fetch('/data/resources.json');
  const data: Data = await res.json();
  const listEl = document.getElementById('results')!;
  const q = document.getElementById('q') as HTMLInputElement;
  const cat = document.getElementById('category') as HTMLSelectElement;
  const bor = document.getElementById('borough') as HTMLSelectElement;
  const who = document.getElementById('for') as HTMLSelectElement;
  const mapEl = document.getElementById('map') as HTMLDivElement;
  const toggle = document.getElementById('viewToggle') as HTMLButtonElement;
  const near = document.getElementById('nearMe') as HTMLButtonElement;

  let origin: { lat: number; lng: number } | null = null;
  let map: L.Map | null = null;
  let markers: L.LayerGroup | null = null;

  // hydrate filters from URL
  const initF = paramsToFilters(new URLSearchParams(location.search));
  q.value = initF.q;
  setMulti(cat, initF.categories); setMulti(bor, initF.boroughs); setMulti(who, initF.whoItsFor);

  function currentFilters(): Filters {
    return {
      q: q.value,
      categories: multiVals(cat) as Filters['categories'],
      boroughs: multiVals(bor) as Filters['boroughs'],
      whoItsFor: multiVals(who) as Filters['whoItsFor'],
    };
  }

  function render() {
    const f = currentFilters();
    let items = applyFilters(data.resources, f);
    if (origin) items = sortByDistance(items, origin);

    // update URL (shareable)
    history.replaceState(null, '', `?${filtersToParams(f).toString()}`);

    // list
    listEl.innerHTML = items.length
      ? items.map((r) => `<a class="card" href="/resource/${r.id}" style="display:block;text-decoration:none;color:inherit">
          <div style="font-size:.66rem;font-weight:800;color:var(--coral-ink);text-transform:uppercase">${r.costNote ?? 'Free'} · ${r.categories[0]}</div>
          <div style="font-weight:800;margin:4px 0">${r.title}</div>
          <div style="font-size:.82rem;color:var(--ink-soft)">${r.borough}${origin && r.coordinates ? '' : ''}</div>
        </a>`).join('')
      : `<p>No matches. Try removing a filter.</p>`;
    listEl.setAttribute('aria-live', 'polite');

    // map markers
    if (map && markers) {
      markers.clearLayers();
      for (const r of items) {
        if (!r.coordinates) continue;
        L.marker([r.coordinates.lat, r.coordinates.lng])
          .bindPopup(`<strong>${r.title}</strong><br><a href="/resource/${r.id}">Details</a>`)
          .addTo(markers);
      }
    }
  }

  function ensureMap() {
    if (map) return;
    map = L.map(mapEl).setView([40.7128, -74.006], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
  }

  toggle.addEventListener('click', () => {
    const showMap = mapEl.style.display === 'none';
    mapEl.style.display = showMap ? 'block' : 'none';
    toggle.textContent = showMap ? 'List view' : 'Map view';
    if (showMap) { ensureMap(); setTimeout(() => map!.invalidateSize(), 0); render(); }
  });

  near.addEventListener('click', () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      near.textContent = '📍 Sorted by nearest';
      render();
    });
  });

  [q, cat, bor, who].forEach((el) => el.addEventListener('input', render));

  // open map immediately if ?near=1 or map param
  if (new URLSearchParams(location.search).get('near') === '1') near.click();
  render();
}

init();
