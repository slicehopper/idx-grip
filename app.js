/* ================================================
   IDX Stock Timeline â€” Application Logic
   Dynamically loads any IDX stock
   ================================================ */

// =============================================
// STATE
// =============================================
let chart = null;
let currentStock = null;
let currentEvents = [];
let activeMarker = null;
let currentChartView = 'timeline'; // 'timeline' or 'tradingview'
let tvWidgetInitialized = false;

const categoryColors = {
    earnings: '#FFD740',
    acquisition: '#448AFF',
    milestone: '#FF5252',
    dividend: '#E040FB',
    high_low: '#D5D98B',
    big_move: '#FF6E40',
};

const categoryLabels = {
    earnings: 'Earnings',
    acquisition: 'Acquisition',
    milestone: 'Milestone',
    dividend: 'Div/Split',
    high_low: '52W Hi/Lo',
    big_move: 'Big Move',
};

// =============================================
// TRADINGVIEW LOGO SLUGS
// Maps IDX tickers to TradingView's logo URL slugs
// =============================================
const TV_LOGO_SLUGS = {
    BUMI: 'bumi-resources',
    BBCA: 'bank-central-asia',
    BBRI: 'bank-rakyat-indonesia',
    BMRI: 'bank-mandiri',
    TLKM: 'telkom-indonesia',
    ASII: 'astra-international',
    UNVR: 'unilever-indonesia',
    GOTO: 'goto-gojek-tokopedia',
    BBNI: 'bank-negara-indonesia',
    ANTM: 'aneka-tambang',
    INDF: 'indofood-sukses-makmur',
    ICBP: 'indofood-cbp-sukses-makmur',
    KLBF: 'kalbe-farma',
    PGAS: 'perusahaan-gas-negara',
    SMGR: 'semen-indonesia',
    INCO: 'vale-indonesia',
    ADRO: 'adaro-energy-indonesia',
    PTBA: 'bukit-asam',
    MDKA: 'merdeka-copper-gold',
    CPIN: 'charoen-pokphand-indonesia',
    EMTK: 'elang-mahkota-teknologi',
    ACES: 'ace-hardware-indonesia',
    MAPI: 'mitra-adiperkasa',
    EXCL: 'xl-axiata',
    ISAT: 'indosat-ooredoo-hutchison',
    BRPT: 'barito-pacific',
    MEDC: 'medco-energi-internasional',
    ESSA: 'surya-esa-perkasa',
    TOWR: 'sarana-menara-nusantara',
    TBIG: 'tower-bersama-infrastructure',
};

// =============================================
// TOPOGRAPHICAL BACKGROUND
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
        paths += `<path d="${d}" fill="none" stroke="var(--accent, #D5D98B)" stroke-width="1" opacity="${opacity}"/>`;
    }
    svg.innerHTML = paths;
}

// =============================================
// PARTICLES
// =============================================
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
// UI STATE MANAGEMENT
// =============================================
const SECTIONS = ['chartToggleBar', 'chartWrapper', 'tradingviewChartWrapper', 'legend', 'metricsSection', 'brokerSection', 'documentsSection'];

function hideAllSections() {
    SECTIONS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('errorState').style.display = 'none';
    hideAllSections();
}

function showChart() {
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';

    // Always show toggle bar, metrics, broker, docs
    document.getElementById('chartToggleBar').style.display = '';
    document.getElementById('metricsSection').style.display = '';
    document.getElementById('brokerSection').style.display = '';
    document.getElementById('documentsSection').style.display = '';

    // Show the correct chart view
    applyChartView();

    // Re-trigger animations
    ['chartToggleBar', 'chartWrapper', 'tradingviewChartWrapper', 'legend', 'metricsSection', 'brokerSection', 'documentsSection'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.style.display !== 'none') {
            el.style.animation = 'none'; el.offsetHeight; el.style.animation = '';
        }
    });
}

function applyChartView() {
    if (currentChartView === 'timeline') {
        document.getElementById('chartWrapper').style.display = '';
        document.getElementById('tradingviewChartWrapper').style.display = 'none';
        document.getElementById('legend').style.display = '';
    } else {
        document.getElementById('chartWrapper').style.display = 'none';
        document.getElementById('tradingviewChartWrapper').style.display = '';
        document.getElementById('legend').style.display = 'none';
    }
    // Update toggle button styles
    document.getElementById('btnTimelineChart').classList.toggle('active', currentChartView === 'timeline');
    document.getElementById('btnTradingviewChart').classList.toggle('active', currentChartView === 'tradingview');
}

function showError(title, msg) {
    document.getElementById('loadingOverlay').style.display = 'none';
    hideAllSections();
    document.getElementById('errorState').style.display = 'flex';
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorMsg').textContent = msg;
}

// =============================================
// COMPANY LOGO
// =============================================
function updateCompanyLogo(ticker) {
    const img = document.getElementById('companyLogo');
    const fallback = document.getElementById('fallbackLogo');
    const logoText = document.getElementById('logoText');

    const slug = TV_LOGO_SLUGS[ticker.toUpperCase()];
    if (slug) {
        const url = `https://s3-symbol-logo.tradingview.com/${slug}--big.svg`;
        img.src = url;
        img.alt = ticker;
        img.style.display = 'block';
        fallback.style.display = 'none';
        img.onerror = () => {
            img.style.display = 'none';
            fallback.style.display = 'block';
            if (logoText) logoText.textContent = ticker.length <= 4 ? ticker : ticker.substring(0, 4);
        };
    } else {
        img.style.display = 'none';
        fallback.style.display = 'block';
        if (logoText) logoText.textContent = ticker.length <= 4 ? ticker : ticker.substring(0, 4);
    }
}

function updateHeader(stockInfo, priceData) {
    const last = priceData[priceData.length - 1];
    const first = priceData[0];
    document.getElementById('stockName').textContent = stockInfo.ticker;
    document.getElementById('tickerLabel').textContent = `IDX:${stockInfo.ticker}`;
    document.getElementById('lastPrice').textContent = `IDR ${last.close.toLocaleString()}`;

    const startDate = new Date(first.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endDate = new Date(last.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    document.getElementById('periodRange').textContent = `${startDate} â€” ${endDate}`;

    // Update company logo
    updateCompanyLogo(stockInfo.ticker);

    // Animate header
    const header = document.getElementById('header');
    header.style.animation = 'none';
    header.offsetHeight;
    header.style.animation = '';

    // Update page title
    document.title = `IDX:${stockInfo.ticker} â€” ${stockInfo.name} Stock Timeline`;
}

// =============================================
// LOAD STOCK
// =============================================
async function loadStock(ticker) {
    ticker = ticker.toUpperCase().trim();
    if (!ticker) return;

    // Update active quick-pick button
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.ticker === ticker);
    });

    // Reset chart view to timeline
    currentChartView = 'timeline';
    tvWidgetInitialized = false;

    showLoading();

    try {
        const stockInfo = await fetchStockData(ticker);
        currentStock = stockInfo;

        // Get events â€” BUMI gets curated events, others get auto-generated
        if (ticker === 'BUMI') {
            currentEvents = BUMI_EVENTS;
        } else {
            currentEvents = generateAutoEvents(stockInfo);
        }

        updateHeader(stockInfo, stockInfo.priceData);
        buildChart(stockInfo.priceData);
        updateMetrics(stockInfo);
        initBrokerSummary(stockInfo.ticker);
        updateDocuments(stockInfo.ticker);
        showChart();

        // Render annotations after chart has rendered
        setTimeout(() => renderAnnotations(), 400);

        // Update URL hash
        history.replaceState(null, '', '#' + ticker);

    } catch (err) {
        console.error('Failed to load stock:', err);
        showError(
            `Unable to load ${ticker}`,
            err.message || 'Please check the ticker and try again.'
        );
    }
}

// =============================================
// CHART (with zoom & pan)
// =============================================
function buildChart(priceData) {
    const ctx = document.getElementById('stockChart').getContext('2d');

    // Destroy previous chart
    if (chart) {
        chart.destroy();
        chart = null;
    }

    const labels = priceData.map(d => new Date(d.date));
    const prices = priceData.map(d => d.close);

    // Gradient fill
    const canvasHeight = ctx.canvas.clientHeight || 400;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, 'rgba(213, 217, 139, 0.25)');
    gradient.addColorStop(0.5, 'rgba(213, 217, 139, 0.06)');
    gradient.addColorStop(1, 'rgba(213, 217, 139, 0)');

    // Create crosshair line element if not already present
    const wrapper = document.getElementById('chartWrapper');
    let crosshairLine = document.getElementById('chartCrosshairLine');
    if (!crosshairLine) {
        crosshairLine = document.createElement('div');
        crosshairLine.className = 'chart-crosshair-line';
        crosshairLine.id = 'chartCrosshairLine';
        wrapper.appendChild(crosshairLine);
    }

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'IDR',
                data: prices,
                borderColor: '#D5D98B',
                borderWidth: 2.5,
                backgroundColor: gradient,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#D5D98B',
                pointHoverBorderColor: '#0a0f0d',
                pointHoverBorderWidth: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        onPanComplete: () => renderAnnotations(),
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x',
                        onZoomComplete: () => renderAnnotations(),
                    },
                },
            },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'quarter', displayFormats: { quarter: 'MMM yyyy' } },
                    grid: { color: 'rgba(0,230,118,0.05)', drawTicks: false },
                    ticks: {
                        color: '#4a7c5a',
                        font: { family: 'Inter', size: 11, weight: '500' },
                        maxRotation: 0, padding: 8,
                    },
                    border: { display: false },
                },
                y: {
                    position: 'right',
                    grid: { color: 'rgba(0,230,118,0.05)', drawTicks: false },
                    ticks: {
                        color: '#4a7c5a',
                        font: { family: 'Inter', size: 11, weight: '500' },
                        padding: 12,
                        callback: v => 'IDR ' + v.toLocaleString(),
                    },
                    border: { display: false },
                },
            },
        }
    });

    // --- Y-axis price tag + crosshair on raw mouse movement ---
    const canvas = chart.canvas;
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    wrapper.addEventListener('mouseleave', handleCanvasMouseLeave);
}

// =============================================
// ZOOM CONTROLS
// =============================================
function setupZoomControls() {
    document.getElementById('zoomInBtn').addEventListener('click', () => {
        if (chart) chart.zoom(1.2);
    });
    document.getElementById('zoomOutBtn').addEventListener('click', () => {
        if (chart) chart.zoom(0.8);
    });
    document.getElementById('zoomResetBtn').addEventListener('click', () => {
        if (chart) {
            chart.resetZoom();
            setTimeout(() => renderAnnotations(), 100);
        }
    });
}

// =============================================
// Y-AXIS PRICE TAG + CROSSHAIR
// =============================================
function handleCanvasMouseMove(evt) {
    if (!chart) return;
    const yScale = chart.scales.y;
    const chartArea = chart.chartArea;
    const canvas = chart.canvas;

    // Get cursor position relative to the canvas
    const rect = canvas.getBoundingClientRect();
    const mouseY = evt.clientY - rect.top;

    // Only show if cursor is within the chart area vertically
    if (mouseY < chartArea.top || mouseY > chartArea.bottom) {
        hideYAxisPriceTag();
        return;
    }

    // Convert pixel position to price value
    const price = yScale.getValueForPixel(mouseY);
    if (price == null || isNaN(price)) {
        hideYAxisPriceTag();
        return;
    }

    // Position the price tag
    const priceTag = document.getElementById('yAxisPriceTag');
    const crosshairLine = document.getElementById('chartCrosshairLine');
    const canvasOffsetY = canvas.offsetTop;

    // y position relative to the wrapper
    const yPos = mouseY + canvasOffsetY;

    priceTag.textContent = 'IDR ' + Math.round(price).toLocaleString();
    priceTag.style.top = yPos + 'px';
    priceTag.classList.add('visible');

    // Position the crosshair line
    if (crosshairLine) {
        // Constrain line to chart area
        const canvasEl = chart.canvas;
        crosshairLine.style.top = yPos + 'px';
        crosshairLine.style.left = (chartArea.left + canvasEl.offsetLeft) + 'px';
        crosshairLine.style.right = (canvasEl.parentElement.clientWidth - chartArea.right - canvasEl.offsetLeft) + 'px';
        crosshairLine.style.width = 'auto';
        crosshairLine.classList.add('visible');
    }
}

function handleCanvasMouseLeave() {
    hideYAxisPriceTag();
}

function hideYAxisPriceTag() {
    const priceTag = document.getElementById('yAxisPriceTag');
    const crosshairLine = document.getElementById('chartCrosshairLine');
    if (priceTag) priceTag.classList.remove('visible');
    if (crosshairLine) crosshairLine.classList.remove('visible');
}

// =============================================
// ANNOTATION MARKERS
// =============================================
function getClosestPrice(dateStr) {
    if (!currentStock) return 0;
    const target = new Date(dateStr).getTime();
    let closest = currentStock.priceData[0];
    let minDiff = Infinity;
    for (const d of currentStock.priceData) {
        const diff = Math.abs(new Date(d.date).getTime() - target);
        if (diff < minDiff) { minDiff = diff; closest = d; }
    }
    return closest.close;
}

function renderAnnotations() {
    const layer = document.getElementById('annotationsLayer');
    if (!layer || !chart) return;
    layer.innerHTML = '';

    const chartArea = chart.chartArea;
    const xScale = chart.scales.x;
    const yScale = chart.scales.y;

    // Get canvas offset relative to the annotations layer (wrapper)
    const canvas = chart.canvas;
    const canvasOffsetX = canvas.offsetLeft;
    const canvasOffsetY = canvas.offsetTop;

    currentEvents.forEach((event, i) => {
        const dateMs = new Date(event.date).getTime();
        const xCanvas = xScale.getPixelForValue(dateMs);
        const price = getClosestPrice(event.date);
        const yCanvas = yScale.getPixelForValue(price);

        if (xCanvas < chartArea.left - 10 || xCanvas > chartArea.right + 10) return;
        if (yCanvas < chartArea.top - 10 || yCanvas > chartArea.bottom + 10) return;

        // Adjust for canvas offset within the wrapper
        const x = xCanvas + canvasOffsetX;
        const y = yCanvas + canvasOffsetY;

        const marker = document.createElement('div');
        const cat = event.category || 'big_move';
        marker.className = `annotation-marker cat-${cat}`;
        marker.style.left = x + 'px';
        marker.style.top = y + 'px';
        marker.style.animationDelay = (0.5 + i * 0.05) + 's';
        marker.innerHTML = event.icon;

        // Set color dynamically for auto categories
        const color = categoryColors[cat] || '#FF6E40';
        marker.style.setProperty('--marker-color', color);

        marker.addEventListener('mouseenter', (e) => showEventPopup(e, event, marker));
        marker.addEventListener('mouseleave', hideEventPopup);
        marker.addEventListener('click', (e) => {
            e.stopPropagation();
            showEventPopup(e, event, marker);
        });

        layer.appendChild(marker);
    });
}

function showEventPopup(e, event, marker) {
    const popup = document.getElementById('eventPopup');
    const wrapper = document.getElementById('chartWrapper');
    const cat = event.category || 'big_move';
    const color = categoryColors[cat] || '#FF6E40';

    document.getElementById('eventPopupIcon').textContent = event.icon;
    const catEl = document.getElementById('eventPopupCategory');
    catEl.textContent = categoryLabels[cat] || cat;
    catEl.style.background = color + '22';
    catEl.style.color = color;

    document.getElementById('eventPopupDate').textContent =
        new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    document.getElementById('eventPopupTitle').textContent = event.title;
    document.getElementById('eventPopupDesc').textContent = event.description;

    const wrapperRect = wrapper.getBoundingClientRect();
    const markerRect = marker.getBoundingClientRect();
    const popupWidth = 280;

    let left = markerRect.left - wrapperRect.left + markerRect.width / 2 - popupWidth / 2;
    let top = markerRect.top - wrapperRect.top + markerRect.height + 12;

    if (left < 10) left = 10;
    if (left + popupWidth > wrapperRect.width - 10) left = wrapperRect.width - popupWidth - 10;

    const arrow = popup.querySelector('.event-popup-arrow');
    if (top + 200 > wrapperRect.height) {
        top = markerRect.top - wrapperRect.top - 200;
        arrow.style.top = 'auto';
        arrow.style.bottom = '-6px';
        arrow.style.borderLeft = 'none';
        arrow.style.borderTop = 'none';
        arrow.style.borderRight = '1px solid rgba(0,230,118,0.3)';
        arrow.style.borderBottom = '1px solid rgba(0,230,118,0.3)';
    } else {
        arrow.style.top = '-6px';
        arrow.style.bottom = 'auto';
        arrow.style.borderLeft = '1px solid rgba(0,230,118,0.3)';
        arrow.style.borderTop = '1px solid rgba(0,230,118,0.3)';
        arrow.style.borderRight = 'none';
        arrow.style.borderBottom = 'none';
    }

    popup.style.left = left + 'px';
    popup.style.top = top + 'px';
    popup.classList.add('visible');
    activeMarker = marker;
}

function hideEventPopup() {
    document.getElementById('eventPopup').classList.remove('visible');
    activeMarker = null;
}

// =============================================
// RESIZE
// =============================================
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        generateTopography();
        if (chart) renderAnnotations();
    }, 200);
});

// =============================================
// CHART TOGGLE (Timeline vs TradingView)
// =============================================
function setupChartToggle() {
    document.getElementById('btnTimelineChart').addEventListener('click', () => {
        currentChartView = 'timeline';
        applyChartView();
        setTimeout(() => renderAnnotations(), 300);
    });
    document.getElementById('btnTradingviewChart').addEventListener('click', () => {
        currentChartView = 'tradingview';
        applyChartView();
        // Lazy init TradingView widget
        if (!tvWidgetInitialized && currentStock) {
            initTradingView(currentStock.ticker);
            tvWidgetInitialized = true;
        }
    });
}

// =============================================
// KEY METRICS (TradingView Widgets)
// =============================================
function updateMetrics(stockInfo) {
    const symbol = 'IDX:' + stockInfo.ticker.toUpperCase();

    // --- Symbol Info strip ---
    const infoContainer = document.getElementById('tvSymbolInfoContainer');
    if (infoContainer) {
        infoContainer.innerHTML = '';
        const infoWidget = document.createElement('div');
        infoWidget.className = 'tradingview-widget-container__widget';
        infoContainer.appendChild(infoWidget);
        const infoScript = document.createElement('script');
        infoScript.type = 'text/javascript';
        infoScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js';
        infoScript.async = true;
        infoScript.innerHTML = JSON.stringify({
            "symbol": symbol,
            "width": "100%",
            "locale": "en",
            "colorTheme": "dark",
            "isTransparent": true
        });
        infoContainer.appendChild(infoScript);
    }

    // --- Full Financials ---
    const finContainer = document.getElementById('tvMetricsContainer');
    if (finContainer) {
        finContainer.innerHTML = '';
        const finWidget = document.createElement('div');
        finWidget.className = 'tradingview-widget-container__widget';
        finContainer.appendChild(finWidget);
        const finScript = document.createElement('script');
        finScript.type = 'text/javascript';
        finScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-financials.js';
        finScript.async = true;
        finScript.innerHTML = JSON.stringify({
            "colorTheme": "dark",
            "isTransparent": true,
            "largeChartUrl": "",
            "displayMode": "regular",
            "width": "100%",
            "height": "100%",
            "symbol": symbol,
            "locale": "en"
        });
        finContainer.appendChild(finScript);
    }
}

// =============================================
// TRADINGVIEW ADVANCED CHART
// =============================================
let tvWidget = null;

function initTradingView(ticker) {
    const container = document.getElementById('tradingview_widget');
    container.innerHTML = '';

    if (typeof TradingView === 'undefined') {
        container.innerHTML = '<div style="padding:40px;text-align:center;color:#4a7c5a;">TradingView widget loading...</div>';
        return;
    }

    const symbol = 'IDX:' + ticker.toUpperCase();

    tvWidget = new TradingView.widget({
        container_id: 'tradingview_widget',
        symbol: symbol,
        interval: 'D',
        timezone: 'Asia/Jakarta',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#0a0f0d',
        enable_publishing: false,
        allow_symbol_change: false,
        hide_top_toolbar: false,
        hide_legend: false,
        save_image: false,
        width: '100%',
        height: 500,
        backgroundColor: 'rgba(10, 15, 13, 1)',
        gridColor: 'rgba(213, 217, 139, 0.05)',
        studies: ['MASimple@tv-basicstudies'],
        overrides: {
            'mainSeriesProperties.candleStyle.upColor': '#D5D98B',
            'mainSeriesProperties.candleStyle.downColor': '#FF5252',
            'mainSeriesProperties.candleStyle.borderUpColor': '#D5D98B',
            'mainSeriesProperties.candleStyle.borderDownColor': '#FF5252',
            'mainSeriesProperties.candleStyle.wickUpColor': '#D5D98B',
            'mainSeriesProperties.candleStyle.wickDownColor': '#FF5252',
            'paneProperties.background': '#0a0f0d',
            'paneProperties.vertGridProperties.color': 'rgba(213, 217, 139, 0.05)',
            'paneProperties.horzGridProperties.color': 'rgba(213, 217, 139, 0.05)',
        },
    });
}

// =============================================
// BROKER SUMMARY (TradingView Technical Analysis)
// =============================================
function initBrokerSummary(ticker) {
    const container = document.getElementById('tvBrokerContainer');
    if (!container) return;
    container.innerHTML = '';

    const symbol = 'IDX:' + ticker.toUpperCase();

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
        "interval": "1D",
        "width": "100%",
        "isTransparent": true,
        "height": "100%",
        "symbol": symbol,
        "showIntervalTabs": true,
        "displayMode": "single",
        "locale": "en",
        "colorTheme": "dark"
    });
    container.appendChild(script);
}

function updateDocuments(ticker) {
    const grid = document.getElementById('docsGrid');
    if (!grid) return;

    const t = ticker.toUpperCase();

    // Google filetype:pdf searches surface direct PDF links in search results
    const googlePdf = (query) =>
        `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    const cards = [
        {
            icon: '◆',
            type: 'Annual Report (PDF)',
            desc: `Find and download ${t}'s latest annual report PDF directly from search results.`,
            url: googlePdf(`"${t}" annual report ${new Date().getFullYear()} OR ${new Date().getFullYear() - 1} filetype:pdf`),
            source: 'Find PDF',
            isPdf: true,
        },
        {
            icon: '▪',
            type: 'Financial Statements (PDF)',
            desc: `Quarterly and annual financial statements - balance sheet, income statement, and cash flow.`,
            url: googlePdf(`"${t}" laporan keuangan financial statement ${new Date().getFullYear()} filetype:pdf`),
            source: 'Find PDF',
            isPdf: true,
        },
        {
            icon: '▫',
            type: 'Prospectus (PDF)',
            desc: `IPO prospectus, rights issue documents, and material disclosures.`,
            url: googlePdf(`"${t}" prospectus IDX filetype:pdf`),
            source: 'Find PDF',
            isPdf: true,
        },
        {
            icon: '⬡',
            type: 'IDX Filings',
            desc: `Official annual reports and financial statements filed on the Indonesia Stock Exchange.`,
            url: `https://www.idx.co.id/en/listed-companies/financial-statements-annual-report/`,
            source: 'IDX Official',
        },
        {
            icon: '↗',
            type: 'RTI Business Profile',
            desc: `Company overview, financial ratios, and shareholder information.`,
            url: `https://www.rti.co.id/company/${t}`,
            source: 'RTI Business',
        },
        {
            icon: '○',
            type: 'Stockbit Analysis',
            desc: `Community discussions, analyst opinions, and stock screener.`,
            url: `https://stockbit.com/symbol/${t}`,
            source: 'Stockbit',
        },
    ];

    grid.innerHTML = cards.map(doc => `
        <a class="doc-card${doc.isPdf ? ' doc-pdf' : ''}" href="${doc.url}" target="_blank" rel="noopener noreferrer">
            <div class="doc-card-icon">${doc.icon}</div>
            <div class="doc-card-type">${doc.type}</div>
            <div class="doc-card-desc">${doc.desc}</div>
            <div class="doc-card-link">
                ${doc.source}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
            </div>
        </a>
    `).join('');
}

// =============================================
// SEARCH HANDLERS
// =============================================
function handleSearch() {
    const input = document.getElementById('tickerInput');
    const ticker = input.value.trim().toUpperCase();
    if (ticker) loadStock(ticker);
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    generateTopography();
    createParticles();

    // Init heatmap (runs in background)
    initHeatmap();

    // Search button
    document.getElementById('searchBtn').addEventListener('click', handleSearch);

    // Enter key
    document.getElementById('tickerInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Quick pick buttons
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const ticker = btn.dataset.ticker;
            document.getElementById('tickerInput').value = ticker;
            loadStock(ticker);
        });
    });

    // Chart toggle
    setupChartToggle();

    // Zoom controls
    setupZoomControls();

    // Close popups on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.annotation-marker') && !e.target.closest('.event-popup')) {
            hideEventPopup();
        }
    });

    // Load from URL hash or default to BUMI
    const hash = window.location.hash.replace('#', '').trim();
    const defaultTicker = hash || 'BUMI';
    document.getElementById('tickerInput').value = defaultTicker;
    loadStock(defaultTicker);
});
