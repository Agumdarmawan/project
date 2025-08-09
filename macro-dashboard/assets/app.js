/* global Chart */

const WORLD_BANK_BASE = 'https://api.worldbank.org/v2';

const INDICATORS = [
  {
    key: 'gdp_current_usd',
    code: 'NY.GDP.MKTP.CD',
    label: 'PDB (US$ berjalan)',
    unit: 'USD',
    formatter: formatCurrencyShort,
    footnote: 'Produk Domestik Bruto, harga berlaku (current US$)'
  },
  {
    key: 'gdp_growth',
    code: 'NY.GDP.MKTP.KD.ZG',
    label: 'Pertumbuhan PDB (% yoy)',
    unit: '%',
    formatter: (v) => formatNumber(v, 2) + ' %',
    footnote: 'Laju pertumbuhan PDB riil tahunan (%)'
  },
  {
    key: 'inflation',
    code: 'FP.CPI.TOTL.ZG',
    label: 'Inflasi CPI (% yoy)',
    unit: '%',
    formatter: (v) => formatNumber(v, 2) + ' %',
    footnote: 'Inflasi harga konsumen, perubahan % tahunan'
  },
  {
    key: 'unemployment',
    code: 'SL.UEM.TOTL.ZS',
    label: 'Pengangguran (% tenaga kerja)',
    unit: '%',
    formatter: (v) => formatNumber(v, 2) + ' %',
    footnote: 'Tingkat pengangguran, total (% dari angkatan kerja total)'
  },
  {
    key: 'gov_debt_gdp',
    code: 'GC.DOD.TOTL.GD.ZS',
    label: 'Utang Pemerintah (% PDB)',
    unit: '%',
    formatter: (v) => formatNumber(v, 1) + ' %',
    footnote: 'Utang pemerintah umum bruto (% dari PDB)'
  },
  {
    key: 'real_interest',
    code: 'FR.INR.RINR',
    label: 'Suku Bunga Riil (%)',
    unit: '%',
    formatter: (v) => formatNumber(v, 2) + ' %',
    footnote: 'Suku bunga riil, diperkirakan'
  }
];

const DEFAULT_SELECTED_INDICATORS = new Set([
  'gdp_current_usd',
  'gdp_growth',
  'inflation',
  'unemployment'
]);

const MAX_COUNTRIES = 3;

const dom = {
  countrySelect: document.getElementById('countrySelect'),
  startYear: document.getElementById('startYear'),
  endYear: document.getElementById('endYear'),
  indicatorList: document.getElementById('indicatorList'),
  kpiRow: document.getElementById('kpiRow'),
  chartsContainer: document.getElementById('chartsContainer'),
  tplKpi: document.getElementById('tplKpi'),
  tplChartCard: document.getElementById('tplChartCard'),
  btnReset: document.getElementById('btnReset')
};

const state = {
  countries: [], // {id, name, region}
  selectedCountryIds: ['IDN'],
  yearStart: 2000,
  yearEnd: new Date().getFullYear(),
  selectedIndicators: new Set(DEFAULT_SELECTED_INDICATORS),
  chartsByIndicator: new Map(), // key -> Chart
  cache: new Map() // key: `${countryId}|${indicatorCode}` -> {years:[], values:[]}
};

// Init
window.addEventListener('DOMContentLoaded', async () => {
  await loadCountries();
  initYearSelects();
  initIndicatorList();
  applyDefaultCountrySelection();
  bindEvents();
  await renderAll();
});

function bindEvents() {
  dom.countrySelect.addEventListener('change', () => {
    const selected = Array.from(dom.countrySelect.selectedOptions).map(o => o.value);
    if (selected.length > MAX_COUNTRIES) {
      // keep the last MAX_COUNTRIES chosen
      const trimmed = selected.slice(-MAX_COUNTRIES);
      setCountrySelection(trimmed);
    } else {
      state.selectedCountryIds = selected;
    }
    renderAll();
  });

  dom.startYear.addEventListener('change', () => {
    const y = Number(dom.startYear.value);
    state.yearStart = y;
    ensureYearOrder();
    renderAll();
  });

  dom.endYear.addEventListener('change', () => {
    const y = Number(dom.endYear.value);
    state.yearEnd = y;
    ensureYearOrder();
    renderAll();
  });

  dom.btnReset.addEventListener('click', () => {
    state.selectedCountryIds = ['IDN'];
    state.selectedIndicators = new Set(DEFAULT_SELECTED_INDICATORS);
    state.yearStart = 2000;
    state.yearEnd = new Date().getFullYear();
    applyDefaultCountrySelection();
    initYearSelects();
    initIndicatorList();
    renderAll();
  });
}

function ensureYearOrder() {
  if (state.yearStart > state.yearEnd) {
    const t = state.yearStart;
    state.yearStart = state.yearEnd;
    state.yearEnd = t;
  }
  dom.startYear.value = String(state.yearStart);
  dom.endYear.value = String(state.yearEnd);
}

async function loadCountries() {
  const url = `${WORLD_BANK_BASE}/country?per_page=400&format=json`;
  const res = await fetch(url);
  const json = await res.json();
  const list = json[1] || [];
  const countries = list
    .filter(c => c.region && c.region.value !== 'Aggregates')
    .map(c => ({ id: c.id, name: c.name, region: c.region.value }))
    .sort((a, b) => a.name.localeCompare(b.name));
  state.countries = countries;

  dom.countrySelect.innerHTML = '';
  for (const c of countries) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.name} (${c.id})`;
    dom.countrySelect.appendChild(opt);
  }
}

function applyDefaultCountrySelection() {
  setCountrySelection(state.selectedCountryIds);
}

function setCountrySelection(ids) {
  state.selectedCountryIds = ids;
  for (const opt of dom.countrySelect.options) {
    opt.selected = ids.includes(opt.value);
  }
}

function initYearSelects() {
  const currentYear = new Date().getFullYear();
  const start = 1960;
  const years = Array.from({ length: currentYear - start + 1 }, (_, i) => start + i);

  dom.startYear.innerHTML = '';
  dom.endYear.innerHTML = '';
  for (const y of years) {
    const o1 = document.createElement('option');
    o1.value = String(y);
    o1.textContent = String(y);
    const o2 = o1.cloneNode(true);
    dom.startYear.appendChild(o1);
    dom.endYear.appendChild(o2);
  }

  dom.startYear.value = String(state.yearStart);
  dom.endYear.value = String(state.yearEnd);
}

function initIndicatorList() {
  dom.indicatorList.innerHTML = '';
  for (const ind of INDICATORS) {
    const id = `ind_${ind.key}`;
    const wrapper = document.createElement('div');
    wrapper.className = 'form-check';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'form-check-input';
    input.id = id;
    input.checked = state.selectedIndicators.has(ind.key);

    const label = document.createElement('label');
    label.className = 'form-check-label';
    label.setAttribute('for', id);
    label.textContent = ind.label;

    input.addEventListener('change', () => {
      if (input.checked) state.selectedIndicators.add(ind.key);
      else state.selectedIndicators.delete(ind.key);
      renderAll();
    });

    wrapper.appendChild(input);
    wrapper.appendChild(label);
    dom.indicatorList.appendChild(wrapper);
  }
}

async function renderAll() {
  toggleGlobalLoading(true);
  await Promise.all([
    renderKpis(),
    renderCharts()
  ]);
  toggleGlobalLoading(false);
}

function toggleGlobalLoading(isLoading) {
  const overlays = document.querySelectorAll('.loading-overlay');
  overlays.forEach(el => el.classList.toggle('active', isLoading));
}

async function renderKpis() {
  const primaryCountryId = state.selectedCountryIds[0];
  const country = state.countries.find(c => c.id === primaryCountryId);
  dom.kpiRow.innerHTML = '';
  if (!country) return;

  const kpisToShow = INDICATORS.filter(ind => state.selectedIndicators.has(ind.key));

  const dataPerIndicator = await Promise.all(
    kpisToShow.map(ind => fetchSeries(primaryCountryId, ind.code, state.yearStart, state.yearEnd))
  );

  kpisToShow.forEach((ind, idx) => {
    const series = dataPerIndicator[idx];
    const { lastYear, lastValue } = lastNonNull(series);

    const node = dom.tplKpi.content.cloneNode(true);
    node.querySelector('.kpi-label').textContent = ind.label;
    node.querySelector('.kpi-value').textContent = lastValue != null ? ind.formatter(lastValue) : '-';
    node.querySelector('.kpi-subtext').textContent = `${country.name} · ${lastYear || '—'}`;

    dom.kpiRow.appendChild(node);
  });
}

async function renderCharts() {
  const container = dom.chartsContainer;
  container.innerHTML = '';

  const indicatorsToRender = INDICATORS.filter(ind => state.selectedIndicators.has(ind.key));

  for (const ind of indicatorsToRender) {
    const card = dom.tplChartCard.content.cloneNode(true);
    const titleEl = card.querySelector('.chart-title');
    const canvas = card.querySelector('canvas');
    const overlay = card.querySelector('.loading-overlay');
    const footnoteEl = card.querySelector('.chart-footnote');
    const btnToggleType = card.querySelector('.btn-toggle-type');
    const btnDownload = card.querySelector('.btn-download');

    titleEl.textContent = ind.label;
    footnoteEl.textContent = ind.footnote || '';

    container.appendChild(card);

    overlay.classList.add('active');

    const datasets = [];
    const labelsSet = new Set();
    const countryMeta = [];

    for (const cid of state.selectedCountryIds) {
      const country = state.countries.find(c => c.id === cid);
      if (!country) continue;
      const series = await fetchSeries(cid, ind.code, state.yearStart, state.yearEnd);
      series.forEach(p => labelsSet.add(p.year));
      const labels = Array.from(labelsSet).sort();
      const dataMap = new Map(series.map(p => [p.year, p.value]));

      countryMeta.push(country);
      datasets.push({
        label: `${country.name} (${country.id})`,
        data: labels.map(y => dataMap.get(y) ?? null),
        borderColor: colorForCountry(cid),
        backgroundColor: hexToRgba(colorForCountry(cid), 0.15),
        spanGaps: false,
        pointRadius: 2,
        tension: 0.2
      });
    }

    const labels = Array.from(labelsSet).sort();

    const chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: buildChartOptions(ind)
    });

    state.chartsByIndicator.set(ind.key, { chart, labels, indicator: ind, countries: countryMeta });

    overlay.classList.remove('active');

    btnToggleType.addEventListener('click', () => toggleChartType(ind.key));
    btnDownload.addEventListener('click', () => downloadCsv(ind.key));
  }
}

function buildChartOptions(indicator) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    scales: {
      x: { title: { display: true, text: 'Tahun' }, grid: { display: false } },
      y: {
        title: { display: true, text: indicator.unit || '' },
        ticks: {
          callback: (v) => formatAxisTick(v, indicator)
        }
      }
    },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const dsLabel = ctx.dataset.label || '';
            const raw = ctx.raw;
            const v = raw == null ? null : Number(raw);
            const valueStr = v == null || Number.isNaN(v) ? '-' : indicator.formatter(v);
            return `${dsLabel}: ${valueStr}`;
          },
          title: (items) => `Tahun ${items[0].label}`
        }
      }
    }
  };
}

function toggleChartType(indKey) {
  const entry = state.chartsByIndicator.get(indKey);
  if (!entry) return;
  const { chart } = entry;
  chart.config.type = chart.config.type === 'line' ? 'bar' : 'line';
  chart.update();
}

function downloadCsv(indKey) {
  const entry = state.chartsByIndicator.get(indKey);
  if (!entry) return;
  const { labels, chart, indicator, countries } = entry;

  const headers = ['Year', ...chart.data.datasets.map(ds => ds.label)];
  const rows = [headers.join(',')];

  for (let i = 0; i < labels.length; i++) {
    const row = [labels[i]];
    for (const ds of chart.data.datasets) {
      const val = ds.data[i];
      row.push(val == null ? '' : String(val));
    }
    rows.push(row.join(','));
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${indicator.key}_${countries.map(c => c.id).join('-')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function fetchSeries(countryId, indicatorCode, yearStart, yearEnd) {
  const cacheKey = `${countryId}|${indicatorCode}|${yearStart}|${yearEnd}`;
  if (state.cache.has(cacheKey)) return state.cache.get(cacheKey);

  const url = `${WORLD_BANK_BASE}/country/${countryId}/indicator/${indicatorCode}?date=${yearStart}:${yearEnd}&format=json&per_page=1000`;
  const res = await fetch(url);
  const json = await res.json();
  const arr = Array.isArray(json) ? json[1] : null;
  const series = (arr || [])
    .map(d => ({ year: Number(d.date), value: d.value == null ? null : Number(d.value) }))
    .sort((a, b) => a.year - b.year);
  state.cache.set(cacheKey, series);
  return series;
}

function lastNonNull(series) {
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value != null) {
      return { lastYear: series[i].year, lastValue: series[i].value };
    }
  }
  return { lastYear: null, lastValue: null };
}

// Colors
function colorForCountry(countryId) {
  const palette = [
    '#1f77b4', '#ff7f0e', '#2ca02c',
    '#d62728', '#9467bd', '#8c564b',
    '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
  ];
  const hash = [...countryId].reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0);
  return palette[Math.abs(hash) % palette.length];
}

function hexToRgba(hex, alpha) {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Formatters
function formatNumber(value, decimals = 0) {
  if (value == null || Number.isNaN(value)) return '-';
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
}

function formatCurrencyShort(value) {
  if (value == null || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  let unit = '';
  let n = value;
  if (abs >= 1e12) { n = value / 1e12; unit = 'T'; }
  else if (abs >= 1e9) { n = value / 1e9; unit = 'M'; }
  else if (abs >= 1e6) { n = value / 1e6; unit = 'Jt'; }
  else if (abs >= 1e3) { n = value / 1e3; unit = 'Rb'; }
  return 'US$ ' + formatNumber(n, n % 1 === 0 ? 0 : 2) + (unit ? ' ' + unit : '');
}

function formatAxisTick(v, indicator) {
  if (indicator.unit === '%') {
    return formatNumber(v, 0) + ' %';
  }
  if (indicator.unit === 'USD') {
    // short form similar to formatCurrencyShort but without prefix
    const abs = Math.abs(v);
    if (abs >= 1e12) return formatNumber(v / 1e12, 0) + ' T';
    if (abs >= 1e9) return formatNumber(v / 1e9, 0) + ' M';
    if (abs >= 1e6) return formatNumber(v / 1e6, 0) + ' Jt';
    if (abs >= 1e3) return formatNumber(v / 1e3, 0) + ' Rb';
    return formatNumber(v, 0);
  }
  return formatNumber(v, 0);
}