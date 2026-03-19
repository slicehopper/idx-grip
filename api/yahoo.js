export default async function handler(req, res) {
    const { symbol, range = '5y', interval = '1wk' } = req.query;

    if (!symbol) {
        return res.status(400).json({ error: "Missing symbol parameter" });
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includeAdjustedClose=true`;

    try {
        const response = await fetch(yahooUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Yahoo API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Ensure CORS headers so frontend can call it if needed
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
        
        return res.status(200).json(data);
    } catch (error) {
        console.error("Proxy error:", error);
        return res.status(502).json({ error: error.message });
    }
}
