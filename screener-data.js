/* ================================================
   Multi-Factor Equity Screener — Scoring Engine
   Z-score normalization → weighted composite → percentile rank
   ================================================ */

// =============================================
// FACTOR DEFINITIONS
// =============================================
const FACTORS = [
    { key: 'pe',       name: 'P/E Ratio',          family: 'value',    lowerIsBetter: true  },
    { key: 'pb',       name: 'P/B Ratio',          family: 'value',    lowerIsBetter: true  },
    { key: 'mom6m',    name: '6M Return (ex-1M)',   family: 'momentum', lowerIsBetter: false },
    { key: 'relStr',   name: 'Rel. Strength vs IHSG', family: 'momentum', lowerIsBetter: false },
    { key: 'roe',      name: 'Return on Equity',   family: 'quality',  lowerIsBetter: false },
    { key: 'de',       name: 'Debt-to-Equity',     family: 'quality',  lowerIsBetter: true  },
];

const FAMILY_KEYS = ['value', 'momentum', 'quality'];

// =============================================
// FETCH FUNDAMENTALS FOR ONE STOCK
// =============================================
async function fetchStockFundamentals(symbol) {
    // Try quoteSummary first for richer data
    try {
        const res = await fetch(`/api/yahoo-summary?symbol=${encodeURIComponent(symbol)}`, {
            signal: AbortSignal.timeout(15000),
        });
        if (res.ok) {
            const data = await res.json();
            const result = data?.quoteSummary?.result?.[0];
            if (result) {
                const stats = result.defaultKeyStatistics || {};
                const fin = result.financialData || {};
                return {
                    pe: fin.currentPrice?.raw && stats.trailingEps?.raw
                        ? fin.currentPrice.raw / stats.trailingEps.raw
                        : (stats.trailingPE?.raw ?? null),
                    pb: stats.priceToBook?.raw ?? null,
                    roe: fin.returnOnEquity?.raw != null ? fin.returnOnEquity.raw * 100 : null, // as %
                    de: fin.debtToEquity?.raw ?? null,
                    evEbitda: stats.enterpriseToEbitda?.raw ?? null,
                };
            }
        }
    } catch (e) {
        // fall through to chart fallback
    }

    // Fallback: try chart meta
    try {
        const res = await fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=5d&interval=1d`, {
            signal: AbortSignal.timeout(12000),
        });
        if (res.ok) {
            const data = await res.json();
            const meta = data?.chart?.result?.[0]?.meta;
            if (meta) {
                return {
                    pe: meta.trailingPE ?? null,
                    pb: meta.priceToBook ?? null,
                    roe: null,
                    de: null,
                    evEbitda: null,
                };
            }
        }
    } catch (e) { /* skip */ }

    return { pe: null, pb: null, roe: null, de: null, evEbitda: null };
}

// =============================================
// FETCH PRICE HISTORY FOR MOMENTUM
// =============================================
async function fetchPriceHistory(symbol) {
    try {
        const res = await fetch(`/api/yahoo?symbol=${encodeURIComponent(symbol)}&range=1y&interval=1mo`, {
            signal: AbortSignal.timeout(15000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return null;

        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];
        const prices = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] != null && closes[i] > 0) {
                prices.push({
                    date: new Date(timestamps[i] * 1000),
                    close: closes[i],
                });
            }
        }
        return prices;
    } catch (e) {
        return null;
    }
}

// =============================================
// COMPUTE MOMENTUM FACTORS FROM PRICE HISTORY
// =============================================
function computeMomentum(prices) {
    if (!prices || prices.length < 3) return { mom6m: null };

    // prices are monthly candles, most recent last
    const n = prices.length;
    const current = prices[n - 1].close;

    // 6-month return excluding last 1 month (Fama-French standard)
    // We want months [-7, -1] relative to now
    const idx6m = Math.max(0, n - 7); // ~6 months ago
    const idx1m = Math.max(0, n - 2); // ~1 month ago (exclude last month)
    const price6m = prices[idx6m]?.close;
    const price1m = prices[idx1m]?.close;

    let mom6m = null;
    if (price6m && price1m && price6m > 0) {
        mom6m = ((price1m - price6m) / price6m) * 100;
    }

    return { mom6m, currentPrice: current };
}

// =============================================
// COMPUTE RELATIVE STRENGTH VS IHSG
// =============================================
function computeRelativeStrength(stockPrices, ihsgPrices) {
    if (!stockPrices || stockPrices.length < 3 || !ihsgPrices || ihsgPrices.length < 3) {
        return null;
    }

    const sN = stockPrices.length;
    const iN = ihsgPrices.length;

    // 6-month return of stock vs index
    const sReturn = (stockPrices[sN - 2].close - stockPrices[Math.max(0, sN - 7)].close)
        / stockPrices[Math.max(0, sN - 7)].close * 100;
    const iReturn = (ihsgPrices[iN - 2].close - ihsgPrices[Math.max(0, iN - 7)].close)
        / ihsgPrices[Math.max(0, iN - 7)].close * 100;

    return sReturn - iReturn; // excess return vs index
}

// =============================================
// Z-SCORE NORMALIZATION
// =============================================
function zScoreNormalize(values) {
    // values: array of { ticker, value }
    // Returns: Map of ticker -> z-score
    const valid = values.filter(v => v.value != null && isFinite(v.value));
    if (valid.length < 2) {
        const result = new Map();
        values.forEach(v => result.set(v.ticker, 0));
        return result;
    }

    const mean = valid.reduce((s, v) => s + v.value, 0) / valid.length;
    const variance = valid.reduce((s, v) => s + (v.value - mean) ** 2, 0) / valid.length;
    const std = Math.sqrt(variance) || 1;

    // Winsorize at ±3 std to limit outlier influence
    const result = new Map();
    values.forEach(v => {
        if (v.value == null || !isFinite(v.value)) {
            result.set(v.ticker, null);
        } else {
            let z = (v.value - mean) / std;
            z = Math.max(-3, Math.min(3, z));
            result.set(v.ticker, z);
        }
    });

    return result;
}

// =============================================
// PERCENTILE RANK
// =============================================
function percentileRank(values) {
    // values: array of { ticker, score }
    const valid = values.filter(v => v.score != null && isFinite(v.score));
    const sorted = [...valid].sort((a, b) => a.score - b.score);
    const n = sorted.length;

    const result = new Map();
    sorted.forEach((v, i) => {
        result.set(v.ticker, Math.round((i / (n - 1 || 1)) * 100));
    });

    // Stocks with null score get null percentile
    values.forEach(v => {
        if (!result.has(v.ticker)) result.set(v.ticker, null);
    });

    return result;
}

// =============================================
// MAIN: FETCH ALL DATA & COMPUTE SCORES
// =============================================
async function runScreenerPipeline(stocks, onProgress) {
    const BATCH_SIZE = 5;
    const total = stocks.length;
    let completed = 0;

    // Step 1: Fetch IHSG price history for relative strength
    if (onProgress) onProgress(0, total, 'Fetching IHSG benchmark...');
    const ihsgPrices = await fetchPriceHistory('^JKSE');

    // Step 2: Fetch data for each stock
    const rawData = [];
    for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
        const batch = stocks.slice(i, i + BATCH_SIZE);
        const promises = batch.map(async (stock) => {
            const symbol = stock.ticker + '.JK';
            const [fundamentals, prices] = await Promise.all([
                fetchStockFundamentals(symbol),
                fetchPriceHistory(symbol),
            ]);

            const momentum = computeMomentum(prices);
            const relStrength = computeRelativeStrength(prices, ihsgPrices);

            return {
                ticker: stock.ticker,
                name: stock.name,
                sector: stock.sector,
                industry: stock.industry,
                mcap: stock.mcap,
                raw: {
                    pe: fundamentals.pe,
                    pb: fundamentals.pb,
                    roe: fundamentals.roe,
                    de: fundamentals.de,
                    mom6m: momentum.mom6m,
                    relStr: relStrength,
                },
            };
        });

        const results = await Promise.allSettled(promises);
        results.forEach(r => {
            if (r.status === 'fulfilled' && r.value) rawData.push(r.value);
        });

        completed += batch.length;
        if (onProgress) onProgress(completed, total, `Fetching data... (${completed}/${total})`);
    }

    return rawData;
}

// =============================================
// SCORE COMPUTATION (separated from fetch so
// we can re-run with different weights)
// =============================================
function computeScores(rawData, weights) {
    // weights: { value: 0-100, momentum: 0-100, quality: 0-100 }
    const totalWeight = weights.value + weights.momentum + weights.quality;
    const w = {
        value: totalWeight > 0 ? weights.value / totalWeight : 1 / 3,
        momentum: totalWeight > 0 ? weights.momentum / totalWeight : 1 / 3,
        quality: totalWeight > 0 ? weights.quality / totalWeight : 1 / 3,
    };

    // Step 1: Z-score normalize each factor
    const zScores = {};
    FACTORS.forEach(factor => {
        const values = rawData.map(d => ({
            ticker: d.ticker,
            value: d.raw[factor.key],
        }));
        const zMap = zScoreNormalize(values);

        // Flip sign for "lower-is-better" factors
        if (factor.lowerIsBetter) {
            for (const [k, v] of zMap) {
                if (v != null) zMap.set(k, -v);
            }
        }

        zScores[factor.key] = zMap;
    });

    // Step 2: Compute family sub-scores (average of factors in family)
    const familyScores = {};
    FAMILY_KEYS.forEach(family => {
        const familyFactors = FACTORS.filter(f => f.family === family);
        familyScores[family] = new Map();

        rawData.forEach(d => {
            const factorZs = familyFactors.map(f => zScores[f.key].get(d.ticker));
            const validZs = factorZs.filter(z => z != null);

            if (validZs.length > 0) {
                const avg = validZs.reduce((s, v) => s + v, 0) / validZs.length;
                familyScores[family].set(d.ticker, avg);
            } else {
                familyScores[family].set(d.ticker, null);
            }
        });
    });

    // Step 3: Weighted composite
    const composites = rawData.map(d => {
        let weightedSum = 0;
        let usedWeight = 0;

        FAMILY_KEYS.forEach(family => {
            const score = familyScores[family].get(d.ticker);
            if (score != null) {
                weightedSum += score * w[family];
                usedWeight += w[family];
            }
        });

        return {
            ticker: d.ticker,
            score: usedWeight > 0 ? weightedSum / usedWeight : null,
        };
    });

    // Step 4: Percentile rank each family AND the composite
    const compositePercentiles = percentileRank(composites);

    const familyPercentiles = {};
    FAMILY_KEYS.forEach(family => {
        const vals = rawData.map(d => ({
            ticker: d.ticker,
            score: familyScores[family].get(d.ticker),
        }));
        familyPercentiles[family] = percentileRank(vals);
    });

    // Step 5: Assemble result objects
    return rawData.map(d => {
        const result = {
            ticker: d.ticker,
            name: d.name,
            sector: d.sector,
            industry: d.industry,
            mcap: d.mcap,
            compositeScore: compositePercentiles.get(d.ticker),
            valueScore: familyPercentiles.value.get(d.ticker),
            momentumScore: familyPercentiles.momentum.get(d.ticker),
            qualityScore: familyPercentiles.quality.get(d.ticker),
            raw: d.raw,
            zScores: {},
            factorPercentiles: {},
        };

        // Per-factor z-scores and percentiles for detail drawer
        FACTORS.forEach(f => {
            result.zScores[f.key] = zScores[f.key].get(d.ticker);
        });

        // Individual factor percentiles
        FACTORS.forEach(f => {
            const vals = rawData.map(dd => ({
                ticker: dd.ticker,
                score: zScores[f.key].get(dd.ticker),
            }));
            const pctMap = percentileRank(vals);
            result.factorPercentiles[f.key] = pctMap.get(d.ticker);
        });

        return result;
    }).sort((a, b) => (b.compositeScore ?? -1) - (a.compositeScore ?? -1));
}
