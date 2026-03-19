/* ================================================
   Stock Data Module
   - Yahoo Finance API fetching via CORS proxy
   - BUMI hardcoded events (special case)
   - Auto-generated events for all stocks
   ================================================ */

// =============================================
// FETCH STOCK DATA FROM YAHOO FINANCE
// Uses local proxy first (/api/yahoo), then CORS proxies as fallback
// =============================================
async function fetchYahooData(symbol) {
    // 1. Try local proxy first (built into serve.ps1)
    try {
        const res = await fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}`, {
            signal: AbortSignal.timeout(20000),
        });
        if (res.ok) {
            const data = await res.json();
            if (!data.error) return data;
        }
    } catch (e) {
        console.warn('Local proxy failed:', e.message);
    }

    // 2. Fallback: external CORS proxies
    const CORS_PROXIES = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?url=',
    ];
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5y&interval=1wk&includeAdjustedClose=true`;

    for (const proxy of CORS_PROXIES) {
        try {
            const res = await fetch(proxy + encodeURIComponent(yahooUrl), {
                signal: AbortSignal.timeout(15000),
            });
            if (res.ok) return await res.json();
        } catch (e) {
            console.warn(`Proxy ${proxy} failed:`, e.message);
        }
    }

    throw new Error('Unable to fetch stock data. Please make sure the server is running (powershell serve.ps1).');
}

async function fetchStockData(ticker) {
    const symbol = ticker.toUpperCase() + '.JK';

    const data = await fetchYahooData(symbol);

    if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
        throw new Error(`No data found for ticker "${ticker}". Make sure it's a valid IDX ticker.`);
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    const adjClose = result.indicators.adjclose?.[0]?.adjclose || quotes.close;

    // Get dividends and splits if available
    const divEvents = result.events?.dividends || {};
    const splitEvents = result.events?.splits || {};

    // Build price data array
    const priceData = [];
    for (let i = 0; i < timestamps.length; i++) {
        const close = adjClose[i] ?? quotes.close[i];
        const volume = quotes.volume[i];
        if (close == null || close <= 0) continue;

        priceData.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
            close: Math.round(close),
            volume: volume || 0,
            high: Math.round(quotes.high[i] || close),
            low: Math.round(quotes.low[i] || close),
        });
    }

    if (priceData.length === 0) {
        throw new Error(`No valid price data found for "${ticker}".`);
    }

    return {
        ticker: ticker.toUpperCase(),
        symbol,
        name: meta.longName || meta.shortName || ticker.toUpperCase(),
        currency: meta.currency || 'IDR',
        exchange: meta.exchangeName || 'JKT',
        marketCap: meta.marketCap || 0,
        priceData,
        dividends: divEvents,
        splits: splitEvents,
    };
}

// =============================================
// AUTO-GENERATE EVENTS FROM PRICE DATA
// =============================================
function generateAutoEvents(stockInfo) {
    const { priceData, dividends, splits, ticker } = stockInfo;
    const events = [];

    if (priceData.length < 4) return events;

    // --- 52-week highs and lows ---
    const weeklyWindow = 52;
    for (let i = weeklyWindow; i < priceData.length; i++) {
        const window = priceData.slice(i - weeklyWindow, i);
        const maxPrice = Math.max(...window.map(d => d.high));
        const minPrice = Math.min(...window.map(d => d.low));
        const current = priceData[i];

        if (current.high >= maxPrice && current.high > 0) {
            // Check if we already have a recent 52w high
            const recentHigh = events.find(e =>
                e.category === 'high_low' &&
                e.title.includes('High') &&
                Math.abs(new Date(e.date) - new Date(current.date)) < 90 * 24 * 60 * 60 * 1000
            );
            if (!recentHigh) {
                events.push({
                    date: current.date,
                    category: 'high_low',
                    icon: '📈',
                    title: `52-Week High: IDR ${current.high.toLocaleString()}`,
                    description: `${ticker} reached a new 52-week high of IDR ${current.high.toLocaleString()}, surpassing the previous high in the trailing 52-week period.`
                });
            }
        }

        if (current.low <= minPrice && current.low > 0) {
            const recentLow = events.find(e =>
                e.category === 'high_low' &&
                e.title.includes('Low') &&
                Math.abs(new Date(e.date) - new Date(current.date)) < 90 * 24 * 60 * 60 * 1000
            );
            if (!recentLow) {
                events.push({
                    date: current.date,
                    category: 'high_low',
                    icon: '📉',
                    title: `52-Week Low: IDR ${current.low.toLocaleString()}`,
                    description: `${ticker} hit a new 52-week low of IDR ${current.low.toLocaleString()}, the lowest point in the trailing 52-week period.`
                });
            }
        }
    }

    // --- Big weekly moves (>15% change) ---
    for (let i = 1; i < priceData.length; i++) {
        const prev = priceData[i - 1].close;
        const curr = priceData[i].close;
        if (prev <= 0) continue;
        const pctChange = ((curr - prev) / prev) * 100;

        if (Math.abs(pctChange) >= 15) {
            const direction = pctChange > 0 ? 'surged' : 'dropped';
            const emoji = pctChange > 0 ? '🚀' : '💥';
            events.push({
                date: priceData[i].date,
                category: 'big_move',
                icon: emoji,
                title: `Stock ${direction} ${Math.abs(pctChange).toFixed(1)}% in a week`,
                description: `${ticker} ${direction} ${Math.abs(pctChange).toFixed(1)}% from IDR ${prev.toLocaleString()} to IDR ${curr.toLocaleString()} in a single week — a significant price movement.`
            });
        }
    }

    // --- Dividends ---
    for (const [ts, div] of Object.entries(dividends)) {
        const date = new Date(parseInt(ts) * 1000).toISOString().split('T')[0];
        events.push({
            date,
            category: 'dividend',
            icon: '💰',
            title: `Dividend: IDR ${div.amount.toFixed(2)}/share`,
            description: `${ticker} distributed a cash dividend of IDR ${div.amount.toFixed(2)} per share on this date.`
        });
    }

    // --- Stock Splits ---
    for (const [ts, split] of Object.entries(splits)) {
        const date = new Date(parseInt(ts) * 1000).toISOString().split('T')[0];
        events.push({
            date,
            category: 'dividend',
            icon: '✂️',
            title: `Stock Split: ${split.numerator}:${split.denominator}`,
            description: `${ticker} executed a ${split.numerator}-for-${split.denominator} stock split, adjusting the share price and outstanding share count accordingly.`
        });
    }

    // --- Approximate annual earnings announcements ---
    const years = [...new Set(priceData.map(d => new Date(d.date).getFullYear()))];
    for (const year of years) {
        // Companies in IDX typically report annual results in March/April
        const earningsDate = `${year}-03-28`;
        // Only add if we have data around that date
        const hasData = priceData.some(d => {
            const diff = Math.abs(new Date(d.date) - new Date(earningsDate));
            return diff < 30 * 24 * 60 * 60 * 1000;
        });
        if (hasData && year > years[0]) {
            events.push({
                date: earningsDate,
                category: 'earnings',
                icon: '📊',
                title: `FY${year - 1} Annual Results (Est.)`,
                description: `Estimated date for ${ticker}'s FY${year - 1} full-year earnings announcement. IDX-listed companies typically release annual results in March-April.`
            });
        }
    }

    // Limit total events to avoid clutter
    // Prioritize: dividends/splits > earnings > big moves > 52w high/low
    const priorityOrder = { dividend: 0, earnings: 1, big_move: 2, high_low: 3 };
    events.sort((a, b) => (priorityOrder[a.category] ?? 4) - (priorityOrder[b.category] ?? 4));

    // Cap at ~20 events, keeping the most important
    if (events.length > 20) {
        // Keep all dividends/splits/earnings, trim the rest
        const important = events.filter(e => e.category === 'dividend' || e.category === 'earnings');
        const others = events.filter(e => e.category !== 'dividend' && e.category !== 'earnings');
        const remaining = 20 - important.length;
        events.length = 0;
        events.push(...important, ...others.slice(0, Math.max(remaining, 5)));
    }

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    return events;
}

// =============================================
// BUMI-SPECIFIC HARDCODED EVENTS
// =============================================
const BUMI_EVENTS = [
    { date: '2021-06-15', category: 'earnings', icon: '📊', title: 'FY2020 Results Announced', description: 'BUMI reported a net loss of IDR 4.77 trillion for FY2020. Recovery trajectory began as coal prices started rising globally.' },
    { date: '2021-09-20', category: 'high_low', icon: '⛏️', title: 'Coal Prices Surge', description: 'Global coal benchmarks surged past $150/ton amid energy crises. Realized coal prices for FY2021 reached $67.4/ton, driving BUMI to record revenues of $5.4 billion.' },
    { date: '2022-03-15', category: 'earnings', icon: '📊', title: 'FY2021 Results: Record Profit', description: 'Net profit of IDR 2.40 trillion, a turnaround from IDR 4.77T loss. EPS Rp 32.27. Revenue reached a record $5.4 billion.' },
    { date: '2022-04-20', category: 'high_low', icon: '📈', title: 'Coal Prices at All-Time High', description: 'Realized coal prices surged 80% YoY to $121/ton for FY2022, driven by the Russia-Ukraine conflict and global energy shortages.' },
    { date: '2022-07-12', category: 'milestone', icon: '🏆', title: 'Energy Risk Asia Award', description: 'Corporate Risk Manager of The Year at Energy Risk Asia Awards 2022, alongside the Highest ESG Rating from Refinitiv.' },
    { date: '2022-10-05', category: 'milestone', icon: '💰', title: 'PKPU Debt Fully Repaid', description: 'Completed repayment of all PKPU (debt restructuring) obligations, eliminating significant future interest expenses.' },
    { date: '2022-11-15', category: 'big_move', icon: '🤝', title: 'Salim Group Becomes Co-Controller', description: 'Through a $1.6B Non-Preemptive Share Issue and debt conversions, the Salim Group became a joint controlling shareholder alongside Bakrie.' },
    { date: '2023-03-28', category: 'earnings', icon: '📊', title: 'FY2022 Results: Record Revenue', description: 'Gross revenue $1.83B. Net profit IDR 8.26T (EPS Rp 22.25). Coal sales declined 12% to 69.4 MT due to La Nina.' },
    { date: '2023-07-15', category: 'acquisition', icon: '🔑', title: 'Jubilee Metals Acquisition', description: 'Acquired 64.98% of Jubilee Metals Limited (JML) for AUD 31.5 million — key step in metals diversification.' },
    { date: '2024-03-28', category: 'earnings', icon: '📊', title: 'FY2023 Results: Profit Declines', description: 'Net profit fell to IDR 168.4B as coal prices dropped 33% to $81.3/ton. Coal sales +13% to 78.7 MT.' },
    { date: '2024-06-20', category: 'milestone', icon: '📋', title: 'Quasi-Reorganization Plan', description: 'Announced quasi-reorganization to eliminate US$2.35B accumulated deficit — aiming for healthier balance sheet.' },
    { date: '2024-12-11', category: 'milestone', icon: '📄', title: 'Convertible Bond Conversion', description: 'Completed conversion of mandatory convertible bonds (OWK BUMI) by issuing 13M+ new shares.' },
    { date: '2025-01-15', category: 'acquisition', icon: '🔑', title: 'Wolfram Limited Acquisition', description: 'Signed agreement to acquire ~65% of Wolfram Limited, an Australian copper and gold mining company.' },
    { date: '2025-03-28', category: 'earnings', icon: '📊', title: 'FY2024: Profit Surges 518%', description: 'Net profit jumped 517.8% to $67.48M despite revenue declining 19% to $1.36B. Coal production: 74.7 MT.' },
    { date: '2025-05-12', category: 'milestone', icon: '🌿', title: 'ESG & CSR Awards', description: 'Best Corporate Emission Reduction Transparency Award and Indonesia CSR Award for sustainability.' },
    { date: '2025-06-15', category: 'acquisition', icon: '🔑', title: 'Laman Mining Partnership', description: 'Partnership with PT Laman Mining in West Kalimantan, aiming for up to 45% for bauxite exploration.' },
    { date: '2025-11-10', category: 'big_move', icon: '📌', title: 'Added to LQ45 & IDX80', description: 'Included in LQ45, IDX80, BISNIS-27, and Kompas-100 indices — reflecting improved liquidity.' },
    { date: '2025-12-18', category: 'acquisition', icon: '✅', title: 'Jubilee Metals Completed', description: 'Finalized 64.98% stake in Jubilee Metals Limited, completing the multi-year acquisition.' },
    { date: '2026-01-06', category: 'high_low', icon: '🚀', title: '52-Week High: IDR 484', description: 'Stock reached IDR 484, driven by metals diversification strategy and strong coal fundamentals.' },
    { date: '2026-03-10', category: 'big_move', icon: '✨', title: 'New Corporate Logo', description: 'Unveiled new logo with topographical contour lines, symbolizing renewal and sustainability.' },
];
