let punoData = null;
let mapa = null;

// cuando el DOM cargue, iniciamos todo
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadData();
  initScrollTop();
  initScrollObserver();
  initNavbarScroll();
});

// --- modo oscuro/claro ---
function initTheme() {
  const saved = localStorage.getItem('puno-theme') || 'light';
  applyTheme(saved);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('puno-theme', next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// --- helper para imágenes: intenta varias rutas ---
function getImageCandidates(path) {
  const clean = String(path || '').trim();
  if (!clean) return [];

  const noImagesPrefix = clean.replace(/^images\//i, '');
  const withImagesPrefix = clean.startsWith('images/') ? clean : `images/${clean}`;

  const candidates = [];
  for (const p of [clean, noImagesPrefix, withImagesPrefix]) {
    if (p && !candidates.includes(p)) candidates.push(p);
  }
  return candidates;
}

function setImageWithFallback(imgEl, path, alt = '') {
  if (!imgEl) return;

  const candidates = getImageCandidates(path);
  let index = 0;

  const tryNext = () => {
    if (index >= candidates.length) {
      imgEl.removeAttribute('src');
      imgEl.alt = alt || 'Imagen no disponible';
      return;
    }

    const nextSrc = candidates[index++];
    imgEl.onerror = tryNext;
    imgEl.src = nextSrc;
    imgEl.alt = alt || '';
  };

  tryNext();
}

// --- carga del archivo JSON con los datos de destinos y gastronomía ---
async function loadData() {
  try {
    const res = await fetch('puno.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    punoData = await res.json();
    renderDestinos(punoData.destinos);
    renderGastronomia(punoData.gastronomia);
    initMap(punoData.marcadores);
  } catch (err) {
    console.error('Error cargando datos:', err);
    const destGrid = document.getElementById('destinos-grid');
    if (destGrid) destGrid.innerHTML = '<p class="text-center text-muted">Cargando destinos…</p>';
  }
}

// --- renderizado de tarjetas de destinos ---
const categoriaColores = {
  lago: { bg: '#1a6fa8', label: 'Lago' },
  isla: { bg: '#2e8b57', label: 'Isla' },
  arqueologia: { bg: '#8b4513', label: 'Arqueología' },
  ciudad: { bg: '#d4690a', label: 'Ciudad' },
  naturaleza: { bg: '#3a7d44', label: 'Naturaleza' }
};

function renderDestinos(destinos, filtro = 'todos') {
  const grid = document.getElementById('destinos-grid');
  if (!grid) return;

  const filtrados = filtro === 'todos'
    ? destinos
    : destinos.filter(d => d.categoria === filtro);

  grid.innerHTML = '';

  filtrados.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4 col-xl-3 fade-in-up';
    col.style.animationDelay = `${i * 0.07}s`;

    const cat = categoriaColores[d.categoria] || { bg: '#666', label: d.categoria };

    col.innerHTML = `
      <article class="destino-card h-100">
        <img class="destino-img" alt="${d.nombre}" loading="lazy">
        <div class="card-body">
          <span class="badge badge-categoria mb-2" style="background:${cat.bg}">${cat.label}</span>
          <h5 class="card-title">${d.nombre}</h5>
          <p class="card-text">${d.descripcion}</p>
          <small class="text-muted"><i class="bi bi-geo-alt-fill me-1"></i>${d.altitud}</small>
        </div>
      </article>`;

    grid.appendChild(col);

    const img = col.querySelector('img');
    setImageWithFallback(img, d.imagen, d.nombre);
  });

  observeFadeIn();
}

// Filtros de destinos
document.addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const filtro = btn.dataset.filtro;
  if (punoData) renderDestinos(punoData.destinos, filtro);
});

// --- tarjetas de gastronomía y modal con receta completa ---
function renderGastronomia(items) {
  const grid = document.getElementById('gastro-grid');
  if (!grid) return;

  grid.innerHTML = '';

  items.forEach((item, i) => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-lg-4 fade-in-up';
    col.style.animationDelay = `${i * 0.07}s`;

    col.innerHTML = `
      <article class="gastro-card h-100">
        <img class="gastro-img" alt="${item.nombre}" loading="lazy">
        <div class="card-body">
          <h5 class="card-title">${item.nombre}</h5>
          <p class="card-text">${item.descripcion}</p>
          <button class="btn-ver-receta mt-2" onclick="abrirModalGastro(${item.id})">
            Ver Receta →
          </button>
        </div>
      </article>`;

    grid.appendChild(col);

    const img = col.querySelector('img');
    setImageWithFallback(img, item.imagen, item.nombre);
  });

  observeFadeIn();
}

window.abrirModalGastro = function (id) {
  if (!punoData) return;
  const item = punoData.gastronomia.find(g => g.id === id);
  if (!item) return;

  const modalImg = document.getElementById('modal-gastro-img');
  document.getElementById('modal-gastro-title').textContent = item.nombre;
  document.getElementById('modal-gastro-desc').textContent = item.descripcion;
  document.getElementById('modal-gastro-receta').textContent = item.receta || '';
  document.getElementById('modal-gastro-origen').textContent = item.origen || '';

  const ingList = document.getElementById('modal-gastro-ing');
  ingList.innerHTML = (item.ingredientes || [])
    .map(i => `<li><span class="badge bg-secondary me-1">•</span>${i}</li>`)
    .join('');

  setImageWithFallback(modalImg, item.imagen, item.nombre);

  const modal = new bootstrap.Modal(document.getElementById('modalGastro'));
  modal.show();
};

// --- mapa con Leaflet.js usando tiles de OpenStreetMap ---
function initMap(marcadores) {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  mapa = L.map('map').setView([-15.84, -70.02], 9);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 17
  }).addTo(mapa);

  const iconColors = {
    ciudad: '🏙️',
    lago: '💧',
    isla: '🏝️',
    arqueologia: '🏛️',
    naturaleza: '🌿'
  };

  (marcadores || []).forEach(m => {
    const emoji = iconColors[m.tipo] || '📍';
    const icon = L.divIcon({
      html: `<div style="font-size:1.6rem;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">${emoji}</div>`,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    L.marker([m.lat, m.lng], { icon })
      .addTo(mapa)
      .bindPopup(`<strong>${m.nombre}</strong><br><small>${m.tipo}</small>`);
  });
}

// --- formulario de itinerario con validación en tiempo real ---
const formItinerario = document.getElementById('form-itinerario');
if (formItinerario) {
  formItinerario.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', () => validateField(el));
    el.addEventListener('blur', () => validateField(el));
    el.addEventListener('change', () => validateField(el));
  });

  formItinerario.addEventListener('submit', e => {
    e.preventDefault();
    let valido = true;
    formItinerario.querySelectorAll('input[required], select[required]').forEach(el => {
      if (!validateField(el)) valido = false;
    });
    if (valido) generarItinerario();
  });
}

function validateField(el) {
  const val = el.value.trim();

  if (el.hasAttribute('required') && !val) {
    setFieldState(el, false, 'Este campo es obligatorio');
    return false;
  }

  if (el.type === 'email' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
    setFieldState(el, false, 'Correo inválido');
    return false;
  }

  if (el.type === 'number') {
    const min = parseInt(el.min, 10);
    const max = parseInt(el.max, 10);
    const num = parseInt(val, 10);
    if (val && (num < min || num > max)) {
      setFieldState(el, false, `Valor entre ${min} y ${max}`);
      return false;
    }
  }

  if (val) setFieldState(el, true);
  else el.classList.remove('is-valid', 'is-invalid');

  return true;
}

function setFieldState(el, valid, msg = '') {
  el.classList.toggle('is-valid', valid);
  el.classList.toggle('is-invalid', !valid);
  const fb = el.nextElementSibling;
  if (fb && fb.classList.contains('invalid-feedback')) fb.textContent = msg;
}

function generarItinerario() {
  const nombre = document.getElementById('it-nombre').value;
  const dias = parseInt(document.getElementById('it-dias').value, 10);
  const personas = parseInt(document.getElementById('it-personas').value, 10);
  const tipo = document.getElementById('it-tipo').value;

  const costoBase = { economico: 80, intermedio: 150, premium: 280 };
  const costo = (costoBase[tipo] || 0) * dias * personas;

  const actividades = {
    economico: [
      'Visita al mercado central de Puno',
      'Recorrido por las Islas Flotantes de los Uros',
      'Caminata en el malecón del Titicaca',
      'Tour en lancha al amanecer',
      'Degustación de gastronomía local'
    ],
    intermedio: [
      'Tour completo Islas Uros + Taquile',
      'Visita al complejo arqueológico de Sillustani',
      'Noche de convivencia en comunidad Amantaní',
      'Tour gastronómico con chef local',
      'Visita a talleres de textiles andinos'
    ],
    premium: [
      'Tour privado en yate por el Titicaca',
      'Experiencia de turismo vivencial en Taquile',
      'Cena de maridaje con cocina andina de autor',
      'Clase de tejido con maestras artesanas',
      'Ceremonia andina de Ofrenda a la Pachamama',
      'Sobrevuelo panorámico sobre el Titicaca'
    ]
  };

  const acts = (actividades[tipo] || []).slice(0, Math.min(dias + 1, (actividades[tipo] || []).length));

  const resultado = document.getElementById('itinerario-resultado');
  document.getElementById('it-res-nombre').textContent = `Hola, ${nombre}!`;
  document.getElementById('it-res-resumen').textContent =
    `Itinerario de ${dias} día${dias > 1 ? 's' : ''} para ${personas} persona${personas > 1 ? 's' : ''} — Plan ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`;
  document.getElementById('it-res-costo').textContent = `S/. ${costo.toLocaleString('es-PE')}`;

  const lista = document.getElementById('it-res-lista');
  lista.innerHTML = acts.map((a, i) => `<li><strong>Día ${i + 1}:</strong> ${a}</li>`).join('');

  resultado.style.display = 'block';
  resultado.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showAlert('¡Itinerario generado con éxito!', 'success');
}

// --- alerta temporal ---
function showAlert(msg, tipo = 'info') {
  const container = document.getElementById('alert-container');
  if (!container) return;

  const id = `alert-${Date.now()}`;
  const el = document.createElement('div');
  el.id = id;
  el.className = `alert alert-${tipo} alert-dismissible fade show`;
  el.role = 'alert';
  el.innerHTML = `${msg} <button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  container.appendChild(el);

  setTimeout(() => {
    const a = document.getElementById(id);
    if (a && window.bootstrap?.Alert) {
      const bsA = bootstrap.Alert.getOrCreateInstance(a);
      bsA.close();
    } else if (a) {
      a.remove();
    }
  }, 5000);
}

// --- botón volver arriba ---
function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// --- animaciones al hacer scroll ---
function initScrollObserver() {
  observeFadeIn();
}

function observeFadeIn() {
  const els = document.querySelectorAll('.fade-in-up:not(.observed)');
  if (!('IntersectionObserver' in window)) {
    els.forEach(el => el.classList.add('visible'));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  els.forEach(el => {
    el.classList.add('observed');
    obs.observe(el);
  });
}

// --- efecto blur en el navbar cuando el usuario hace scroll ---
function initNavbarScroll() {
  const nav = document.querySelector('.navbar');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    nav.style.backdropFilter = window.scrollY > 60 ? 'blur(8px)' : 'none';
  }, { passive: true });
}

// --- marca como activo el link del navbar según la página actual ---
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
  if (link.getAttribute('href') === currentPage) link.classList.add('active');
});
