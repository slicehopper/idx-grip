/* ================================================
   IDX Market Heatmap — Stock Data
   ~45 top IDX stocks with sector, industry, market cap
   ================================================ */

// =============================================
// IDX SECTOR DATA
// Approximate market caps in trillion IDR
// =============================================
const IDX_HEATMAP_STOCKS = [
    // ---- Financials ----
    { ticker: 'BBCA', name: 'Bank Central Asia', sector: 'Financials', industry: 'Banking', mcap: 1200 },
    { ticker: 'BBRI', name: 'Bank Rakyat Indonesia', sector: 'Financials', industry: 'Banking', mcap: 820 },
    { ticker: 'BMRI', name: 'Bank Mandiri', sector: 'Financials', industry: 'Banking', mcap: 600 },
    { ticker: 'BBNI', name: 'Bank Negara Indonesia', sector: 'Financials', industry: 'Banking', mcap: 180 },
    { ticker: 'BRIS', name: 'Bank Syariah Indonesia', sector: 'Financials', industry: 'Banking', mcap: 80 },
    { ticker: 'MEGA', name: 'Bank Mega', sector: 'Financials', industry: 'Banking', mcap: 45 },
    { ticker: 'ARTO', name: 'Bank Jago', sector: 'Financials', industry: 'Banking', mcap: 55 },

    // ---- Energy ----
    { ticker: 'ADRO', name: 'Adaro Energy', sector: 'Energy', industry: 'Coal', mcap: 130 },
    { ticker: 'BUMI', name: 'Bumi Resources', sector: 'Energy', industry: 'Coal', mcap: 75 },
    { ticker: 'PTBA', name: 'Bukit Asam', sector: 'Energy', industry: 'Coal', mcap: 55 },
    { ticker: 'MEDC', name: 'Medco Energi', sector: 'Energy', industry: 'Oil & Gas', mcap: 40 },
    { ticker: 'AKRA', name: 'AKR Corporindo', sector: 'Energy', industry: 'Distribution', mcap: 30 },
    { ticker: 'ESSA', name: 'Surya Esa Perkasa', sector: 'Energy', industry: 'Natural Gas', mcap: 35 },

    // ---- Materials ----
    { ticker: 'ANTM', name: 'Aneka Tambang', sector: 'Materials', industry: 'Mining', mcap: 55 },
    { ticker: 'INCO', name: 'Vale Indonesia', sector: 'Materials', industry: 'Nickel', mcap: 65 },
    { ticker: 'MDKA', name: 'Merdeka Copper Gold', sector: 'Materials', industry: 'Gold', mcap: 60 },
    { ticker: 'SMGR', name: 'Semen Indonesia', sector: 'Materials', industry: 'Cement', mcap: 40 },
    { ticker: 'BRPT', name: 'Barito Pacific', sector: 'Materials', industry: 'Petrochemicals', mcap: 50 },
    { ticker: 'TPIA', name: 'Chandra Asri', sector: 'Materials', industry: 'Petrochemicals', mcap: 70 },

    // ---- Consumer ----
    { ticker: 'UNVR', name: 'Unilever Indonesia', sector: 'Consumer', industry: 'FMCG', mcap: 90 },
    { ticker: 'ICBP', name: 'Indofood CBP', sector: 'Consumer', industry: 'Food', mcap: 100 },
    { ticker: 'INDF', name: 'Indofood', sector: 'Consumer', industry: 'Food', mcap: 60 },
    { ticker: 'MYOR', name: 'Mayora Indah', sector: 'Consumer', industry: 'Food', mcap: 50 },
    { ticker: 'CPIN', name: 'Charoen Pokphand', sector: 'Consumer', industry: 'Poultry', mcap: 55 },
    { ticker: 'MAPI', name: 'Mitra Adiperkasa', sector: 'Consumer', industry: 'Retail', mcap: 25 },
    { ticker: 'ACES', name: 'Ace Hardware Indonesia', sector: 'Consumer', industry: 'Retail', mcap: 20 },

    // ---- Telecom ----
    { ticker: 'TLKM', name: 'Telkom Indonesia', sector: 'Telecom', industry: 'Telco', mcap: 350 },
    { ticker: 'EXCL', name: 'XL Axiata', sector: 'Telecom', industry: 'Telco', mcap: 35 },
    { ticker: 'ISAT', name: 'Indosat Ooredoo', sector: 'Telecom', industry: 'Telco', mcap: 45 },
    { ticker: 'TOWR', name: 'Sarana Menara', sector: 'Telecom', industry: 'Towers', mcap: 50 },
    { ticker: 'TBIG', name: 'Tower Bersama', sector: 'Telecom', industry: 'Towers', mcap: 40 },

    // ---- Industrials ----
    { ticker: 'ASII', name: 'Astra International', sector: 'Industrials', industry: 'Conglomerate', mcap: 250 },
    { ticker: 'UNTR', name: 'United Tractors', sector: 'Industrials', industry: 'Heavy Equipment', mcap: 100 },
    { ticker: 'SRTG', name: 'Saratoga', sector: 'Industrials', industry: 'Investment', mcap: 35 },

    // ---- Healthcare ----
    { ticker: 'KLBF', name: 'Kalbe Farma', sector: 'Healthcare', industry: 'Pharma', mcap: 75 },
    { ticker: 'SIDO', name: 'Sido Muncul', sector: 'Healthcare', industry: 'Herbal', mcap: 25 },

    // ---- Technology ----
    { ticker: 'GOTO', name: 'GoTo Gojek Tokopedia', sector: 'Technology', industry: 'Platform', mcap: 110 },
    { ticker: 'BUKA', name: 'Bukalapak', sector: 'Technology', industry: 'E-Commerce', mcap: 15 },
    { ticker: 'EMTK', name: 'Elang Mahkota', sector: 'Technology', industry: 'Media/Tech', mcap: 40 },

    // ---- Property ----
    { ticker: 'BSDE', name: 'Bumi Serpong Damai', sector: 'Property', industry: 'Developer', mcap: 25 },
    { ticker: 'CTRA', name: 'Ciputra Development', sector: 'Property', industry: 'Developer', mcap: 20 },
    { ticker: 'SMRA', name: 'Summarecon', sector: 'Property', industry: 'Developer', mcap: 12 },

    // ---- Infrastructure ----
    { ticker: 'PGAS', name: 'Perusahaan Gas Negara', sector: 'Infrastructure', industry: 'Gas Utility', mcap: 40 },
    { ticker: 'JSMR', name: 'Jasa Marga', sector: 'Infrastructure', industry: 'Toll Roads', mcap: 30 },
    { ticker: 'WIKA', name: 'Wijaya Karya', sector: 'Infrastructure', industry: 'Construction', mcap: 10 },
];

// Sector colors for the header labels
const SECTOR_COLORS = {
    'Financials': '#448AFF',
    'Energy': '#FF6E40',
    'Materials': '#AB47BC',
    'Consumer': '#26C6DA',
    'Telecom': '#66BB6A',
    'Industrials': '#FFA726',
    'Healthcare': '#EF5350',
    'Technology': '#42A5F5',
    'Property': '#8D6E63',
    'Infrastructure': '#78909C',
};

// =============================================
// FETCH BATCH QUOTES FROM YAHOO FINANCE
// Returns { TICKER: { price, change, changePercent, marketCap } }
// =============================================
async function fetchHeatmapData() {
    // Fetch each stock individually via the working /api/yahoo proxy
    // Uses range=5d&interval=1d to get recent daily data for price change
    const BATCH_SIZE = 10;
    const quotes = {};

    for (let i = 0; i < IDX_HEATMAP_STOCKS.length; i += BATCH_SIZE) {
        const batch = IDX_HEATMAP_STOCKS.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (stock) => {
            try {
                const symbol = stock.ticker + '.JK';
                const res = await fetch(`/api/yahoo?symbol=${symbol}&range=5d&interval=1d`, {
                    signal: AbortSignal.timeout(12000),
                });
                if (!res.ok) return;
                const data = await res.json();
                if (!data.chart?.result?.[0]) return;

                const result = data.chart.result[0];
                const meta = result.meta;
                const closes = result.indicators?.quote?.[0]?.close || [];
                const prevClose = meta.chartPreviousClose || meta.previousClose || 0;
                const lastClose = closes.filter(c => c != null).pop() || meta.regularMarketPrice || 0;

                if (prevClose > 0 && lastClose > 0) {
                    const change = lastClose - prevClose;
                    const changePct = (change / prevClose) * 100;
                    quotes[stock.ticker] = {
                        price: lastClose,
                        change: change,
                        changePercent: changePct,
                        marketCap: meta.marketCap || 0,
                    };
                }
            } catch (e) {
                // silently skip failed fetches
            }
        });
        await Promise.allSettled(promises);
    }

    // Merge with static data
    const sectors = {};
    IDX_HEATMAP_STOCKS.forEach(stock => {
        const q = quotes[stock.ticker] || {};
        const sectorName = stock.sector;
        if (!sectors[sectorName]) {
            sectors[sectorName] = { name: sectorName, stocks: [], totalMcap: 0 };
        }

        const mcap = q.marketCap || stock.mcap * 1e12;
        const entry = {
            ticker: stock.ticker,
            name: stock.name,
            sector: stock.sector,
            industry: stock.industry,
            price: q.price || 0,
            change: q.change || 0,
            changePercent: q.changePercent || 0,
            marketCap: mcap,
        };
        sectors[sectorName].stocks.push(entry);
        sectors[sectorName].totalMcap += mcap;
    });

    const sortedSectors = Object.values(sectors).sort((a, b) => b.totalMcap - a.totalMcap);
    sortedSectors.forEach(s => s.stocks.sort((a, b) => b.marketCap - a.marketCap));
    return sortedSectors;
}

function buildStaticHeatmapData() {
    const sectors = {};
    IDX_HEATMAP_STOCKS.forEach(stock => {
        if (!sectors[stock.sector]) {
            sectors[stock.sector] = { name: stock.sector, stocks: [], totalMcap: 0 };
        }
        const mcap = stock.mcap * 1e12;
        sectors[stock.sector].stocks.push({
            ticker: stock.ticker,
            name: stock.name,
            sector: stock.sector,
            industry: stock.industry,
            price: 0,
            change: 0,
            changePercent: 0,
            marketCap: mcap,
        });
        sectors[stock.sector].totalMcap += mcap;
    });

    const sorted = Object.values(sectors).sort((a, b) => b.totalMcap - a.totalMcap);
    sorted.forEach(s => s.stocks.sort((a, b) => b.marketCap - a.marketCap));
    return sorted;
}
