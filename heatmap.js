/* ================================================
   IDX Market Heatmap â€” Treemap Renderer
   Row-based treemap using absolute positioning
   ================================================ */

// =============================================
// COLOR HELPERS
// =============================================
function changeToColor(pct) {
    const clamped = Math.max(-5, Math.min(5, pct));
    const t = (clamped + 5) / 10; // 0..1

    let r, g, b;
    if (t < 0.5) {
        const f = t / 0.5;
        r = Math.round(180 - f * 140);
        g = Math.round(30 + f * 15);
        b = Math.round(30 + f * 15);
    } else {
        const f = (t - 0.5) / 0.5;
        r = Math.round(40 - f * 30);
        g = Math.round(45 + f * 135);
        b = Math.round(45 - f * 15);
    }
    return `rgb(${r},${g},${b})`;
}

function changeToTextColor(pct) {
    return Math.abs(pct) > 1.5 ? '#fff' : '#ccc';
}

// =============================================
// SQUARIFIED TREEMAP LAYOUT
// Produces absolute-positioned rectangles
// =============================================
function squarify(items, x, y, w, h) {
    const rects = [];
    if (items.length === 0 || w <= 0 || h <= 0) return rects;

    const totalVal = items.reduce((s, it) => s + it.value, 0);
    if (totalVal <= 0) return rects;

    // Simple strip-based layout
    let remaining = [...items];
    let cx = x, cy = y, cw = w, ch = h;

    while (remaining.length > 0) {
        const isHorizontal = cw >= ch;
        const side = isHorizontal ? ch : cw;
        const totalRemaining = remaining.reduce((s, it) => s + it.value, 0);

        // Greedily add items to current strip
        let strip = [];
        let stripVal = 0;
        let bestAspect = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const testStrip = [...strip, remaining[i]];
            const testVal = stripVal + remaining[i].value;
            const stripSize = (testVal / totalRemaining) * (isHorizontal ? cw : ch);

            // Calculate worst aspect ratio in test strip
            let worstAspect = 0;
            testStrip.forEach(it => {
                const itemSize = (it.value / testVal) * side;
                const aspect = Math.max(stripSize / itemSize, itemSize / stripSize);
                worstAspect = Math.max(worstAspect, aspect);
            });

            if (worstAspect <= bestAspect || strip.length === 0) {
                strip = testStrip;
                stripVal = testVal;
                bestAspect = worstAspect;
            } else {
                break;
            }
        }

        // Lay out the strip
        const stripFraction = stripVal / totalRemaining;
        const stripSize = isHorizontal
            ? stripFraction * cw
            : stripFraction * ch;

        let offset = 0;
        strip.forEach(it => {
            const itemFraction = it.value / stripVal;
            const itemSize = itemFraction * side;

            const rect = isHorizontal
                ? { x: cx, y: cy + offset, w: stripSize, h: itemSize }
                : { x: cx + offset, y: cy, w: itemSize, h: stripSize };

            rects.push({ ...it, rect });
            offset += itemSize;
        });

        // Shrink remaining area
        if (isHorizontal) {
            cx += stripSize;
            cw -= stripSize;
        } else {
            cy += stripSize;
            ch -= stripSize;
        }

        remaining = remaining.slice(strip.length);
    }

    return rects;
}

// =============================================
// BUILD TREEMAP DOM
// =============================================
function buildTreemapLayout(container, sectors) {
    container.innerHTML = '';

    const totalMcap = sectors.reduce((s, sec) => s + sec.totalMcap, 0);
    if (totalMcap === 0) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    // First level: squarify sectors
    const sectorItems = sectors.map(s => ({ ...s, value: s.totalMcap }));
    const sectorRects = squarify(sectorItems, 0, 0, containerW, containerH);

    sectorRects.forEach(sec => {
        const { rect } = sec;
        if (rect.w < 2 || rect.h < 2) return;

        const sectorDiv = document.createElement('div');
        sectorDiv.className = 'hm-sector';
        sectorDiv.style.position = 'absolute';
        sectorDiv.style.left = rect.x + 'px';
        sectorDiv.style.top = rect.y + 'px';
        sectorDiv.style.width = rect.w + 'px';
        sectorDiv.style.height = rect.h + 'px';

        // Sector label
        const label = document.createElement('div');
        label.className = 'hm-sector-label';
        label.textContent = sec.name;
        label.style.borderLeftColor = SECTOR_COLORS[sec.name] || '#666';
        sectorDiv.appendChild(label);

        // Second level: squarify stocks within this sector
        const stockItems = sec.stocks.map(st => ({ ...st, value: st.marketCap }));
        const stockRects = squarify(stockItems, 0, 0, rect.w, rect.h);

        stockRects.forEach(stock => {
            const sr = stock.rect;
            if (sr.w < 3 || sr.h < 3) return;

            const tile = document.createElement('div');
            tile.className = 'hm-tile';
            tile.style.position = 'absolute';
            tile.style.left = sr.x + 'px';
            tile.style.top = sr.y + 'px';
            tile.style.width = sr.w + 'px';
            tile.style.height = sr.h + 'px';
            tile.style.backgroundColor = changeToColor(stock.changePercent);
            tile.dataset.ticker = stock.ticker;

            // Only show text if tile is big enough
            if (sr.w > 35 && sr.h > 25) {
                const tickerSpan = document.createElement('div');
                tickerSpan.className = 'hm-tile-ticker';
                tickerSpan.textContent = stock.ticker;
                tickerSpan.style.color = changeToTextColor(stock.changePercent);
                // Scale font based on tile size
                const fontSize = Math.min(Math.max(sr.w / 6, 8), 16);
                tickerSpan.style.fontSize = fontSize + 'px';
                tile.appendChild(tickerSpan);

                if (sr.h > 38) {
                    const changeSpan = document.createElement('div');
                    changeSpan.className = 'hm-tile-change';
                    const sign = stock.changePercent >= 0 ? '+' : '';
                    changeSpan.textContent = stock.price > 0 ? `${sign}${stock.changePercent.toFixed(2)}%` : 'â€”';
                    changeSpan.style.color = changeToTextColor(stock.changePercent);
                    const changeFontSize = Math.min(Math.max(sr.w / 8, 7), 12);
                    changeSpan.style.fontSize = changeFontSize + 'px';
                    tile.appendChild(changeSpan);
                }
            }

            // Tooltip on hover
            tile.addEventListener('mouseenter', (e) => showHeatmapTooltip(e, stock, tile));
            tile.addEventListener('mousemove', (e) => moveHeatmapTooltip(e));
            tile.addEventListener('mouseleave', hideHeatmapTooltip);

            // Click to load stock
            tile.addEventListener('click', () => {
                if (typeof loadStock === 'function') {
                    document.getElementById('tickerInput').value = stock.ticker;
                    loadStock(stock.ticker);
                    document.getElementById('header').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });

            sectorDiv.appendChild(tile);
        });

        container.appendChild(sectorDiv);
    });
}

// =============================================
// TOOLTIP
// =============================================
let hmTooltip = null;

function ensureTooltip() {
    if (!hmTooltip) {
        hmTooltip = document.createElement('div');
        hmTooltip.className = 'hm-tooltip';
        document.body.appendChild(hmTooltip);
    }
    return hmTooltip;
}

function showHeatmapTooltip(e, stock, tile) {
    const tt = ensureTooltip();
    const sign = stock.changePercent >= 0 ? '+' : '';
    const changeColor = stock.changePercent >= 0 ? '#2D8C4E' : '#D44040';

    const mcapStr = stock.marketCap > 1e12
        ? (stock.marketCap / 1e12).toFixed(1) + 'T'
        : (stock.marketCap / 1e9).toFixed(0) + 'B';

    tt.innerHTML = `
        <div class="hm-tt-ticker">${stock.ticker}</div>
        <div class="hm-tt-name">${stock.name}</div>
        <div class="hm-tt-sector">${stock.sector} Â· ${stock.industry}</div>
        ${stock.price > 0 ? `
            <div class="hm-tt-price">IDR ${stock.price.toLocaleString()}</div>
            <div class="hm-tt-change" style="color:${changeColor}">${sign}${stock.changePercent.toFixed(2)}% (${sign}${stock.change.toFixed(0)})</div>
            <div class="hm-tt-mcap">Market Cap: IDR ${mcapStr}</div>
        ` : '<div class="hm-tt-price" style="color:#666">No live data</div>'}
    `;

    tt.style.display = 'block';
    moveHeatmapTooltip(e);
}

function moveHeatmapTooltip(e) {
    if (!hmTooltip) return;
    const x = e.clientX + 16;
    const y = e.clientY + 16;
    const w = hmTooltip.offsetWidth || 200;
    const h = hmTooltip.offsetHeight || 100;
    const maxX = window.innerWidth - w - 10;
    const maxY = window.innerHeight - h - 10;
    hmTooltip.style.left = Math.min(x, maxX) + 'px';
    hmTooltip.style.top = Math.min(y, maxY) + 'px';
}

function hideHeatmapTooltip() {
    if (hmTooltip) hmTooltip.style.display = 'none';
}

// =============================================
// INIT HEATMAP
// =============================================
async function initHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    container.style.position = 'relative';

    // Show loading
    container.innerHTML = `
        <div class="hm-loading">
            <div class="loader-ring" style="width:32px;height:32px;border-width:2px;margin:0 auto 10px;"></div>
            <div style="color:var(--text-muted);font-size:0.8rem;">Loading market data...</div>
        </div>`;

    try {
        const sectors = await fetchHeatmapData();
        buildTreemapLayout(container, sectors);
    } catch (err) {
        console.error('Heatmap error:', err);
        container.innerHTML = `
            <div class="hm-loading" style="color:var(--text-muted);">
                Unable to load market heatmap
            </div>`;
    }
}
