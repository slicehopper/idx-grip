# IDX Stock Timeline & Market Heatmap

An interactive, dark-themed web application for analyzing stocks listed on the Indonesia Stock Exchange (IDX). It provides live market data, an interactive stock timeline with historical events, and a Finviz-style sector heatmap.

## Features

### 🌟 IDX Market Heatmap
A responsive, squarified treemap showing ~45 top IDX stocks grouped by sector.
* Tiles are sized proportionally by **Market Capitalization**.
* Colored in real-time based on **Daily Price Change** (Green for positive, Red for negative).
* Seamless integration — clicking a tile instantly loads that stock's complete timeline below.

### 📈 Interactive Stock Timeline
A powerful 5-year interactive chart using Chart.js.
* **Live Quotes:** Real-time data fetched directly via Yahoo Finance APIs.
* **Smart Annotations:** Important events (like price targets, earnings, or news) are plotted onto the timeline. Hover to see event details!
* **Zoom & Pan:** Native mouse wheel zooming and click-and-drag panning.

### 💸 Advanced TradingView Integration
* Want more detailed technical analysis? Toggle the main chart into a fully interactive **TradingView advanced candlestick chart**.
* Includes a built-in **TradingView Technical Analysis (Broker Summary)** widget showing real-time buy/sell signals for the active stock.

### 📄 Direct Company Documents
Quickly access critical financial documents without leaving the workflow. Provides direct Google `filetype:pdf` search links and official IDX filing links for:
* Annual Reports
* Financial Statements
* Prospectuses & Disclosures

## Architecture & Tech Stack

The application is built using pure **Vanilla JavaScript, HTML, and CSS**, ensuring lightweight, ultra-fast performance without heavy frontend frameworks.

* **Frontend:** HTML5, CSS3 (variables, flexbox layout, animations), Vanilla JS.
* **Charting:** Chart.js, chartjs-plugin-annotation, chartjs-plugin-zoom, TradingView Lightweight Widgets.
* **Data Sources:** Yahoo Finance APIs (Quotes and Charts), TradingView (Logos and Widgets).
* **Backend Proxy:** Included is a local PowerShell server (`serve.ps1`) and a Node.js serverless function (`api/yahoo.js`) to handle CORS for API requests.

## How to Run Locally (Windows)

To avoid CORS restrictions when fetching live data from Yahoo Finance, this repository includes a tiny static server and API proxy written in PowerShell.

1. Clone the repository.
2. Open PowerShell in the project directory.
3. Run the server script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File serve.ps1
   ```
4. Open your browser and navigate to `http://localhost:8888`.

## Cloud Deployment (Vercel)

This project is fully ready to be deployed to the cloud via **Vercel**.

1. Import this repository into Vercel.
2. Leave the "Framework Preset" as **Other**.
3. Deploy!

Vercel will automatically host the static files and turn `api/yahoo.js` into a serverless function that proxies the Yahoo Finance requests, meaning everything will work perfectly in the cloud.
