/* ================================================
   Multi-Factor Equity Screener — UI Controller
   ================================================ */

// =============================================
// STATE
// =============================================
let screenerRawData = null;
let screenerResults = [];
let currentSort = { key: 'compositeScore', ascending: false };
let selectedTicker = null;
let weights = { value: 33, momentum: 33, quality: 34 };

// =============================================
// TOPOGRAPHICAL BACKGROUND (shared with main site)
// =============================================
function generateTopography() {
    const svg = document.getElementById('topoSvg');
    if (!svg) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    let paths = '';
    for (let i = 0; i < 18; i++) {
        const cy = h * (0.1 + Math.random() * 0.8);
        const amp = 30 + Math.random() * 60;
        const freq = 0.002 + Math.random() * 0.003;
        const phase = Math.random() * Math.PI * 2;
        let d = `M 0 ${cy}`;
        for (let x = 0; x <= w; x += 8) {
            const y = cy + Math.sin(x * freq + phase) * amp +
                       Math.sin(x * freq * 2.3 + phase * 1.5) * (amp * 0.4);
            d += ` L ${x} ${y}`;
        }
        const opacity = 0.15 + Math.random() * 0.35;
        paths += `<path d="${d}" fill="none" stroke="var(--accent, #00E676)" stroke-width="1" opacity="${opacity}"/>`;
    }
    svg.innerHTML = paths;
}

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < 30; i++) {
        const el = document.createElement('div');
        el.className = 'particle';
        el.style.left = Math.random() * 100 + '%';
        el.style.top = (40 + Math.random() * 60) + '%';
        el.style.animationDelay = Math.random() * 8 + 's';
        el.style.animationDuration = (5 + Math.random() * 6) + 's';
        el.style.width = (2 + Math.random() * 3) + 'px';
        el.style.height = el.style.width;
        container.appendChild(el);
    }
}

// =============================================
// SCORE → COLOR
// =============================================
function scoreToColor(score, alpha = 1) {
    if (score == null) return `rgba(74, 124, 90, ${alpha * 0.3})`;
    const t = score / 100; // 0..1
    let r, g, b;
    if (t < 0.5) {
        const f = t / 0.5;
        r = Math.round(180 - f * 130);
        g = Math.round(40 + f * 30);
        b = Math.round(40 + f * 10);
    } else {
        const f = (t - 0.5) / 0.5;
        r = Math.round(50 - f * 40);
        g = Math.round(70 + f * 160);
        b = Math.round(50 + f * 68);
    }
    return `rgba(${r},${g},${b},${alpha})`;
}

function scoreToTextColor(score) {
    if (score == null) return '#4a7c5a';
    return score > 30 ? '#fff' : '#ccc';
}

// =============================================
// FORMAT HELPERS
// =============================================
function formatRaw(key, value) {
    if (value == null) return '—';
    switch (key) {
        case 'pe': return value.toFixed(1) + 'x';
        case 'pb': return value.toFixed(2) + 'x';
        case 'mom6m': return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
        case 'relStr': return (value >= 0 ? '+' : '') + value.toFixed(1) + '%';
        case 'roe': return value.toFixed(1) + '%';
        case 'de': return value.toFixed(1);
        default: return value.toFixed(2);
    }
}

// =============================================
// POPULATE SECTOR FILTER
// =============================================
function populateSectorFilter() {
    const select = document.getElementById('filterSector');
    const sectors = [...new Set(IDX_HEATMAP_STOCKS.map(s => s.sector))].sort();
    sectors.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        select.appendChild(opt);
    });
}

// =============================================
// RENDER TABLE
// =============================================
function renderTable() {
    const sectorFilter = document.getElementById('filterSector').value;
    const minScore = parseInt(document.getElementById('filterMinScore').value) || 0;

    let filtered = screenerResults.filter(s => {
        if (sectorFilter !== 'all' && s.sector !== sectorFilter) return false;
        if (s.compositeScore != null && s.compositeScore < minScore) return false;
        if (s.compositeScore == null && minScore > 0) return false;
        return true;
    });

    // Sort
    const sortKey = currentSort.key;
    filtered.sort((a, b) => {
        let aVal, bVal;

        if (sortKey === 'rank') {
            aVal = a.compositeScore ?? -1;
            bVal = b.compositeScore ?? -1;
            return currentSort.ascending ? aVal - bVal : bVal - aVal;
        } else if (sortKey === 'ticker' || sortKey === 'name' || sortKey === 'sector') {
            aVal = (a[sortKey] || '').toLowerCase();
            bVal = (b[sortKey] || '').toLowerCase();
            return currentSort.ascending
                ? aVal.localeCompare(bVal)
                : bVal.localeCompare(aVal);
        } else {
            aVal = a[sortKey] ?? -1;
            bVal = b[sortKey] ?? -1;
            return currentSort.ascending ? aVal - bVal : bVal - aVal;
        }
    });

    // Update stock count
    document.getElementById('stockCount').textContent = `${filtered.length} stocks`;

    // Render rows
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = filtered.map((stock, i) => {
        const rank = i + 1;
        const cScore = stock.compositeScore;
        const vScore = stock.valueScore;
        const mScore = stock.momentumScore;
        const qScore = stock.qualityScore;

        return `
            <tr data-ticker="${stock.ticker}" class="${stock.ticker === selectedTicker ? 'selected' : ''}">
                <td class="col-rank">${rank}</td>
                <td class="col-ticker">${stock.ticker}</td>
                <td class="col-name">${stock.name}</td>
                <td class="col-sector">${stock.sector}</td>
                <td class="score-cell">
                    <span class="score-badge" style="background:${scoreToColor(cScore, 0.85)};color:${scoreToTextColor(cScore)}">${cScore != null ? cScore : '—'}</span>
                </td>
                <td class="score-cell">
                    <span class="score-badge" style="background:${scoreToColor(vScore, 0.6)};color:${scoreToTextColor(vScore)}">${vScore != null ? vScore : '—'}</span>
                </td>
                <td class="score-cell">
                    <span class="score-badge" style="background:${scoreToColor(mScore, 0.6)};color:${scoreToTextColor(mScore)}">${mScore != null ? mScore : '—'}</span>
                </td>
                <td class="score-cell">
                    <span class="score-badge" style="background:${scoreToColor(qScore, 0.6)};color:${scoreToTextColor(qScore)}">${qScore != null ? qScore : '—'}</span>
                </td>
            </tr>
        `;
    }).join('');

    // Attach row click handlers
    tbody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const ticker = row.dataset.ticker;
            openDetailDrawer(ticker);
        });
    });
}

// =============================================
// SORTING
// =============================================
function setupSorting() {
    document.querySelectorAll('.screener-table thead th').forEach(th => {
        th.addEventListener('click', () => {
            const key = th.dataset.sort;
            if (!key) return;

            if (currentSort.key === key) {
                currentSort.ascending = !currentSort.ascending;
            } else {
                currentSort.key = key;
                // Default: descending for scores, ascending for text
                currentSort.ascending = ['ticker', 'name', 'sector'].includes(key);
            }

            // Update header styles
            document.querySelectorAll('.screener-table thead th').forEach(h => {
                h.classList.remove('sorted');
                const arrow = h.querySelector('.sort-arrow');
                if (arrow) arrow.textContent = '▲';
            });
            th.classList.add('sorted');
            const arrow = th.querySelector('.sort-arrow');
            if (arrow) arrow.textContent = currentSort.ascending ? '▲' : '▼';

            renderTable();
        });
    });
}

// =============================================
// WEIGHT SLIDERS
// =============================================
function setupWeightSliders() {
    const sliders = {
        value: document.getElementById('weightValue'),
        momentum: document.getElementById('weightMomentum'),
        quality: document.getElementById('weightQuality'),
    };

    const displays = {
        value: document.getElementById('weightValueDisplay'),
        momentum: document.getElementById('weightMomentumDisplay'),
        quality: document.getElementById('weightQualityDisplay'),
    };

    const keys = ['value', 'momentum', 'quality'];

    function rebalance(changedKey) {
        const changedVal = parseInt(sliders[changedKey].value);
        const otherKeys = keys.filter(k => k !== changedKey);
        const remaining = 100 - changedVal;

        // Get current values of the other two sliders
        const otherTotal = otherKeys.reduce((s, k) => s + parseInt(sliders[k].value), 0);

        if (otherTotal > 0) {
            let distributed = 0;
            otherKeys.forEach((k, i) => {
                if (i === otherKeys.length - 1) {
                    sliders[k].value = remaining - distributed;
                } else {
                    const share = Math.round((parseInt(sliders[k].value) / otherTotal) * remaining);
                    sliders[k].value = share;
                    distributed += share;
                }
            });
        } else {
            const half = Math.floor(remaining / 2);
            sliders[otherKeys[0]].value = half;
            sliders[otherKeys[1]].value = remaining - half;
        }

        // Update displays only (no re-scoring)
        keys.forEach(k => {
            displays[k].textContent = parseInt(sliders[k].value) + '%';
        });
    }

    function applyWeights() {
        keys.forEach(k => {
            weights[k] = parseInt(sliders[k].value);
        });

        if (screenerRawData) {
            screenerResults = computeScores(screenerRawData, weights);
            renderTable();
            if (selectedTicker) {
                updateDrawerContent(selectedTicker);
            }
        }
    }

    keys.forEach(k => {
        sliders[k].addEventListener('input', () => rebalance(k));
    });

    document.getElementById('applyWeightsBtn').addEventListener('click', applyWeights);
}

// =============================================
// FILTERS
// =============================================
function setupFilters() {
    document.getElementById('filterSector').addEventListener('change', renderTable);
    document.getElementById('filterMinScore').addEventListener('input', renderTable);
}

// =============================================
// DETAIL DRAWER
// =============================================
function openDetailDrawer(ticker) {
    selectedTicker = ticker;
    updateDrawerContent(ticker);

    document.getElementById('detailDrawer').classList.add('open');
    document.getElementById('drawerOverlay').classList.add('open');

    // Highlight row
    document.querySelectorAll('.screener-table tbody tr').forEach(row => {
        row.classList.toggle('selected', row.dataset.ticker === ticker);
    });
}

function closeDetailDrawer() {
    selectedTicker = null;
    document.getElementById('detailDrawer').classList.remove('open');
    document.getElementById('drawerOverlay').classList.remove('open');

    document.querySelectorAll('.screener-table tbody tr').forEach(row => {
        row.classList.remove('selected');
    });
}

function updateDrawerContent(ticker) {
    const stock = screenerResults.find(s => s.ticker === ticker);
    if (!stock) return;

    document.getElementById('drawerTicker').textContent = stock.ticker;
    document.getElementById('drawerCompany').textContent = stock.name;
    document.getElementById('drawerSector').textContent = `${stock.sector} · ${stock.industry}`;

    // Composite score ring
    const score = stock.compositeScore ?? 0;
    const circumference = 2 * Math.PI * 15.91;
    const ring = document.getElementById('compositeRing');
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    ring.style.strokeDashoffset = circumference - (score / 100) * circumference;
    ring.style.stroke = scoreToColor(score);

    document.getElementById('compositeValue').textContent = stock.compositeScore != null ? stock.compositeScore : '—';
    document.getElementById('compositeDesc').textContent =
        stock.compositeScore != null
            ? `Scores better than ${stock.compositeScore}% of all IDX stocks across all weighted factors.`
            : 'Insufficient data to compute composite score.';

    // Family scores
    const familyScoresDiv = document.getElementById('familyScores');
    const families = [
        { key: 'valueScore', label: 'Value', color: '#448AFF' },
        { key: 'momentumScore', label: 'Momentum', color: '#FF6E40' },
        { key: 'qualityScore', label: 'Quality', color: '#00E676' },
    ];

    familyScoresDiv.innerHTML = families.map(f => {
        const val = stock[f.key];
        return `
            <div class="family-score-row">
                <span class="family-score-label">${f.label}</span>
                <div class="family-score-bar">
                    <div class="family-score-fill" style="width:${val ?? 0}%;background:${f.color};opacity:${val != null ? 0.85 : 0.2}"></div>
                </div>
                <span class="family-score-value" style="color:${val != null ? f.color : 'var(--text-muted)'}">${val != null ? val : '—'}</span>
            </div>
        `;
    }).join('');

    // Factor breakdown
    const factorBody = document.getElementById('factorTableBody');
    factorBody.innerHTML = FACTORS.map(f => {
        const raw = stock.raw[f.key];
        const z = stock.zScores[f.key];
        const pct = stock.factorPercentiles[f.key];

        return `
            <tr>
                <td class="factor-name">
                    ${f.name}
                    <span style="color:var(--text-muted);font-size:0.65rem;margin-left:4px">${f.lowerIsBetter ? '(lower ✓)' : '(higher ✓)'}</span>
                </td>
                <td class="factor-raw">${formatRaw(f.key, raw)}</td>
                <td class="factor-z" style="color:${z != null ? (z > 0 ? '#00E676' : '#FF5252') : 'var(--text-muted)'}">
                    ${z != null ? (z >= 0 ? '+' : '') + z.toFixed(2) : '—'}
                </td>
                <td class="factor-pct">
                    <span class="score-badge" style="background:${scoreToColor(pct, 0.6)};color:${scoreToTextColor(pct)};font-size:0.72rem;padding:2px 8px">
                        ${pct != null ? pct : '—'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function setupDrawer() {
    document.getElementById('drawerClose').addEventListener('click', closeDetailDrawer);
    document.getElementById('drawerOverlay').addEventListener('click', closeDetailDrawer);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDetailDrawer();
    });
}

// =============================================
// LOADING / PROGRESS
// =============================================
function showLoading() {
    document.getElementById('screenerLoading').style.display = 'flex';
    document.getElementById('tableWrapper').style.display = 'none';
}

function hideLoading() {
    document.getElementById('screenerLoading').style.display = 'none';
    document.getElementById('tableWrapper').style.display = '';
    // Re-trigger animation
    const wrapper = document.getElementById('tableWrapper');
    wrapper.style.animation = 'none';
    wrapper.offsetHeight;
    wrapper.style.animation = '';
}

function updateProgress(completed, total, text) {
    const pct = total > 0 ? (completed / total) * 100 : 0;
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressText').textContent = text;
}

// =============================================
// INIT
// =============================================
async function initScreener() {
    showLoading();
    populateSectorFilter();
    setupWeightSliders();
    setupFilters();
    setupSorting();
    setupDrawer();

    try {
        // Fetch and compute
        screenerRawData = await runScreenerPipeline(IDX_HEATMAP_STOCKS, updateProgress);
        screenerResults = computeScores(screenerRawData, weights);
        hideLoading();
        renderTable();
    } catch (err) {
        console.error('Screener init failed:', err);
        document.getElementById('progressText').textContent = 'Failed to load data. Please make sure the server is running.';
    }
}

// =============================================
// DOM READY
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    generateTopography();
    createParticles();
    initScreener();

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(generateTopography, 200);
    });
});
