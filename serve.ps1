$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8888/')
$listener.Start()
Write-Host 'Server running on http://localhost:8888/'
Write-Host 'Serves static files and proxies Yahoo Finance API at /api/yahoo?symbol=XXXX'

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $path = $request.Url.LocalPath

    # CORS headers
    $response.Headers.Add('Access-Control-Allow-Origin', '*')
    $response.Headers.Add('Access-Control-Allow-Methods', 'GET, OPTIONS')
    $response.Headers.Add('Access-Control-Allow-Headers', '*')

    if ($request.HttpMethod -eq 'OPTIONS') {
        $response.StatusCode = 204
        $response.Close()
        continue
    }

    # Yahoo Finance API proxy
    if ($path -eq '/api/yahoo') {
        $symbol = $request.QueryString['symbol']
        if (-not $symbol) {
            $response.StatusCode = 400
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Missing symbol parameter"}')
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($msg, 0, $msg.Length)
            $response.Close()
            continue
        }

        $range = $request.QueryString['range']
        if (-not $range) { $range = '5y' }
        $interval = $request.QueryString['interval']
        if (-not $interval) { $interval = '1wk' }

        $yahooUrl = "https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}&includeAdjustedClose=true"
        Write-Host "Proxying: $yahooUrl"

        try {
            # Use TLS 1.2 for Yahoo Finance
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            $data = $webClient.DownloadString($yahooUrl)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($data)
            $response.ContentType = 'application/json; charset=utf-8'
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  -> OK ($($bytes.Length) bytes)"
        }
        catch {
            Write-Host "  -> Error: $_"
            $response.StatusCode = 502
            $errMsg = $_.Exception.Message -replace '"', '\"'
            $errBody = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"$errMsg`"}")
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($errBody, 0, $errBody.Length)
        }

        $response.Close()
        continue
    }

    # Yahoo Finance batch quote proxy (for heatmap)
    if ($path -eq '/api/yahoo-batch') {
        $symbols = $request.QueryString['symbols']
        if (-not $symbols) {
            $response.StatusCode = 400
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Missing symbols parameter"}')
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($msg, 0, $msg.Length)
            $response.Close()
            continue
        }

        $yahooUrl = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=symbol,shortName,longName,regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap"
        Write-Host "Batch quote: $($symbols.Substring(0, [Math]::Min(80, $symbols.Length)))..."

        try {
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            $data = $webClient.DownloadString($yahooUrl)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($data)
            $response.ContentType = 'application/json; charset=utf-8'
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  -> OK ($($bytes.Length) bytes)"
        }
        catch {
            Write-Host "  -> Error: $_"
            $response.StatusCode = 502
            $errMsg = $_.Exception.Message -replace '"', '\"'
            $errBody = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"$errMsg`"}")
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($errBody, 0, $errBody.Length)
        }

        $response.Close()
        continue
    }

    # Yahoo Finance quoteSummary proxy (for screener fundamentals)
    if ($path -eq '/api/yahoo-summary') {
        $symbol = $request.QueryString['symbol']
        if (-not $symbol) {
            $response.StatusCode = 400
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Missing symbol parameter"}')
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($msg, 0, $msg.Length)
            $response.Close()
            continue
        }

        $modules = $request.QueryString['modules']
        if (-not $modules) { $modules = 'defaultKeyStatistics,financialData' }

        $yahooUrl = "https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}"
        Write-Host "Summary proxy: $yahooUrl"

        try {
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            $data = $webClient.DownloadString($yahooUrl)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($data)
            $response.ContentType = 'application/json; charset=utf-8'
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  -> OK ($($bytes.Length) bytes)"
        }
        catch {
            Write-Host "  -> Error: $_"
            $response.StatusCode = 502
            $errMsg = $_.Exception.Message -replace '"', '\"'
            $errBody = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"$errMsg`"}")
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($errBody, 0, $errBody.Length)
        }

        $response.Close()
        continue
    }

    if ($path -eq '/api/idx-docs') {
        $ticker = $request.QueryString['ticker']
        $docType = $request.QueryString['type'] # 'annual' or 'financial'
        if (-not $ticker) {
            $response.StatusCode = 400
            $msg = [System.Text.Encoding]::UTF8.GetBytes('{"error":"Missing ticker parameter"}')
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($msg, 0, $msg.Length)
            $response.Close()
            continue
        }

        $ticker = $ticker.ToUpper()
        if ($docType -eq 'financial') {
            $idxUrl = "https://www.idx.co.id/primary/ListedCompany/GetFinancialStatement?indexFrom=0&pageSize=5&year=&period=&kodeEmiten=$ticker&reportType=rdf&efekEmiten=S&_=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
        } else {
            $idxUrl = "https://www.idx.co.id/primary/ListedCompany/GetAnnualReport?indexFrom=0&pageSize=5&year=&kodeEmiten=$ticker&_=$([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())"
        }

        Write-Host "IDX docs proxy: $idxUrl"

        try {
            [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
            $webClient = New-Object System.Net.WebClient
            $webClient.Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
            $webClient.Headers.Add('Referer', 'https://www.idx.co.id/')
            $webClient.Headers.Add('Origin', 'https://www.idx.co.id')
            $data = $webClient.DownloadString($idxUrl)
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($data)
            $response.ContentType = 'application/json; charset=utf-8'
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            Write-Host "  -> OK ($($bytes.Length) bytes)"
        }
        catch {
            Write-Host "  -> Error: $_"
            $response.StatusCode = 502
            $errMsg = $_.Exception.Message -replace '"', '\"'
            $errBody = [System.Text.Encoding]::UTF8.GetBytes("{`"error`":`"$errMsg`"}")
            $response.ContentType = 'application/json'
            $response.OutputStream.Write($errBody, 0, $errBody.Length)
        }

        $response.Close()
        continue
    }

    # Static file serving
    if ($path -eq '/') { $path = '/index.html' }
    $filePath = Join-Path 'e:\Akbar\antigravity' ($path.TrimStart('/'))

    if (Test-Path $filePath) {
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath)
        $mime = switch ($ext) {
            '.html' { 'text/html; charset=utf-8' }
            '.css'  { 'text/css; charset=utf-8' }
            '.js'   { 'application/javascript; charset=utf-8' }
            '.json' { 'application/json; charset=utf-8' }
            '.png'  { 'image/png' }
            '.svg'  { 'image/svg+xml' }
            default { 'application/octet-stream' }
        }
        $response.ContentType = $mime
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        $response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $response.Close()
}
