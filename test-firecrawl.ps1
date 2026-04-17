# Firecrawl API Verification Script (Path D)
$apiKey = "fc-297dbb52b62444d4bb0446345d2e3e2e"
$url = "https://api.firecrawl.dev/v2/scrape"

$body = @{
    url = "https://firecrawl.dev"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type"  = "application/json"
}

Write-Host "Verifying Firecrawl API Key..."
try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -Body $body
    Write-Host "Success! Scrape results received."
    $response | ConvertTo-Json -Depth 10 | Write-Host
} catch {
    Write-Host "Error verifying API key: $_"
}
