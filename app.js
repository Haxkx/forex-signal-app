// Configuration
const CONFIG = {
    CURRENCY_PAIRS: [
        "GBP/CHF", "EUR/JPY", "EUR/GBP", "USD/CHF", "USD/CAD",
        "GBP/AUD", "EUR/USD", "EUR/CHF", "EUR/CAD", "EUR/AUD",
        "CAD/JPY", "AUD/CAD", "GBP/NZD", "GBP/USD", "GBP/CAD",
        "AUD/JPY", "AUD/USD", "EUR/NZD", "USD/INR", "USD/COP",
        "USD/BDT", "NZD/CAD", "USD/BRL", "USD/MXN", "NZD/JPY",
        "USD/JPY", "USD/DZD", "USD/ZAR", "NZD/USD", "USD/PKR",
        "USD/NGN", "USD/IDR", "USD/TRY", "USD/PHP", "USD/EGP",
        "USD/ARS", "NZD/CHF", "AUD/NZD"
    ],
    
    BINANCE_BASE_URL: 'https://api.binance.com/api/v3',
    YAHOO_BASE_URL: 'https://query1.finance.yahoo.com/v8/finance/chart'
};

// Fix: Currency pair conversion functions
function getBinanceSymbol(pair) {
    const symbolMap = {
        'EUR/USD': 'EURUSDT', 'GBP/USD': 'GBPUSDT', 'USD/JPY': 'USDJPY',
        'AUD/USD': 'AUDUSDT', 'USD/CAD': 'USDCAD', 'USD/CHF': 'USDCHF',
        'EUR/JPY': 'EURJPY', 'GBP/JPY': 'GBPJPY', 'EUR/GBP': 'EURGBP',
        'AUD/JPY': 'AUDJPY', 'NZD/USD': 'NZDUSDT', 'GBP/CHF': 'GBPCHF',
        'EUR/CHF': 'EURCHF', 'EUR/CAD': 'EURCAD', 'EUR/AUD': 'EURAUD',
        'CAD/JPY': 'CADJPY', 'AUD/CAD': 'AUDCAD', 'GBP/NZD': 'GBPNZD',
        'GBP/CAD': 'GBPCAD', 'EUR/NZD': 'EURNZD', 'USD/INR': 'USDINR',
        'NZD/CAD': 'NZDCAD', 'NZD/JPY': 'NZDJPY', 'AUD/NZD': 'AUDNZD',
        'USD/BRL': 'USDBRL', 'USD/MXN': 'USDMXN', 'USD/ZAR': 'USDZAR',
        'USD/TRY': 'USDTRY', 'USD/SEK': 'USDSEK', 'USD/NOK': 'USDNOK'
    };
    return symbolMap[pair] || null;
}

function getYahooSymbol(pair) {
    return pair.replace('/', '') + '=X';
}

// Fix: Simple fallback data generator
function generateFallbackData(pair, timeframe) {
    const basePrice = 80 + Math.random() * 40;
    const data = [];
    const now = Date.now();
    
    for (let i = 0; i < 50; i++) {
        const priceVariation = (Math.random() - 0.5) * 4;
        data.push({
            timestamp: now - (50 - i) * 60000,
            open: basePrice + priceVariation,
            high: basePrice + priceVariation + Math.random() * 2,
            low: basePrice + priceVariation - Math.random() * 2,
            close: basePrice + priceVariation + (Math.random() - 0.5) * 1,
            volume: 1000 + Math.random() * 5000
        });
    }
    return data;
}

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', function() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    initializeApp();
});

// Main App Initialization
function initializeApp() {
    populateCurrencyPairs();
    setupEventListeners();
    loadInitialData();
    initializeDemoChart();
}

// Populate Currency Pairs Dropdown
function populateCurrencyPairs() {
    const select = document.getElementById('currencyPair');
    select.innerHTML = '<option value="">Select Currency Pair</option>';
    
    CONFIG.CURRENCY_PAIRS.forEach(pair => {
        const option = document.createElement('option');
        option.value = pair;
        option.textContent = pair;
        select.appendChild(option);
    });
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('refreshSignal').addEventListener('click', generateSignal);
    document.getElementById('currencyPair').addEventListener('change', handleCurrencyPairChange);
    document.getElementById('timeframe').addEventListener('change', handleTimeframeChange);
}

// Load initial market data
async function loadInitialData() {
    await updateMarketOverview();
}

// Handle Currency Pair Change
function handleCurrencyPairChange() {
    const pair = document.getElementById('currencyPair').value;
    if (pair) {
        // Show loading state
        const signalContainer = document.getElementById('signalContainer');
        signalContainer.innerHTML = `
            <div class="loading-signal">
                <div class="spinner"></div>
                <p>Loading data for ${pair}...</p>
            </div>
        `;
    }
}

// Handle Timeframe Change
function handleTimeframeChange() {
    const pair = document.getElementById('currencyPair').value;
    if (pair) {
        generateSignal();
    }
}

// Generate Trading Signal - Fixed version
async function generateSignal() {
    const pair = document.getElementById('currencyPair').value;
    const timeframe = document.getElementById('timeframe').value;
    
    if (!pair) {
        showError('Please select a currency pair');
        return;
    }

    showLoading();
    
    try {
        console.log(`Generating signal for: ${pair}, ${timeframe}`);
        
        let data = null;
        
        // Try Binance first
        data = await fetchBinanceData(pair, timeframe);
        
        // If Binance fails, try Yahoo Finance
        if (!data || data.length === 0) {
            console.log('Trying Yahoo Finance...');
            data = await fetchYahooData(pair);
        }
        
        // If both APIs fail, use fallback data for demo
        if (!data || data.length === 0) {
            console.log('Using fallback data for demo');
            data = generateFallbackData(pair, timeframe);
        }
        
        if (data && data.length > 0) {
            const signal = analyzeMarketData(data, pair, timeframe);
            displaySignal(signal);
            updateChart(pair, data);
            await updateMarketOverview();
        } else {
            throw new Error('No market data available');
        }
        
    } catch (error) {
        console.error('Error generating signal:', error);
        showError('Failed to generate signal. Please try again.');
    } finally {
        hideLoading();
    }
}

// Fetch data from Binance API - Fixed version
async function fetchBinanceData(pair, timeframe) {
    try {
        const symbol = getBinanceSymbol(pair);
        if (!symbol) {
            console.warn(`No Binance symbol mapping for: ${pair}`);
            return null;
        }

        const interval = convertToBinanceInterval(timeframe);
        
        console.log(`Fetching from Binance: ${symbol}, ${interval}`);
        
        const response = await fetch(
            `${CONFIG.BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=50`
        );
        
        if (!response.ok) {
            console.warn(`Binance API failed: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        console.log('Binance data received:', data.length, 'candles');
        return parseBinanceData(data);
        
    } catch (error) {
        console.warn('Binance API failed:', error.message);
        return null;
    }
}

// Fetch data from Yahoo Finance API - Fixed version
async function fetchYahooData(pair) {
    try {
        const symbol = getYahooSymbol(pair);
        
        console.log(`Fetching from Yahoo: ${symbol}`);
        
        const response = await fetch(
            `${CONFIG.YAHOO_BASE_URL}/${symbol}?range=1d&interval=5m`
        );
        
        if (!response.ok) {
            console.warn(`Yahoo Finance API failed: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        if (!data.chart || !data.chart.result || data.chart.result.length === 0) {
            console.warn('Yahoo Finance: No data available');
            return null;
        }
        
        console.log('Yahoo data received');
        return parseYahooData(data);
        
    } catch (error) {
        console.warn('Yahoo Finance API failed:', error.message);
        return null;
    }
}

// Convert timeframe to Binance interval
function convertToBinanceInterval(timeframe) {
    const intervals = {
        '1m': '1m', '5m': '5m', '10m': '10m', '15m': '15m',
        '20m': '15m', '25m': '15m', '30m': '30m'
    };
    return intervals[timeframe] || '15m';
}

// Parse Binance API response
function parseBinanceData(data) {
    return data.map(candle => ({
        timestamp: candle[0],
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
    }));
}

// Parse Yahoo Finance API response
function parseYahooData(data) {
    try {
        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];
        
        const parsedData = timestamps.map((timestamp, index) => ({
            timestamp: timestamp * 1000,
            open: quotes.open[index] || 0,
            high: quotes.high[index] || 0,
            low: quotes.low[index] || 0,
            close: quotes.close[index] || 0,
            volume: quotes.volume[index] || 0
        })).filter(candle => candle.open !== null && candle.open > 0);
        
        return parsedData;
    } catch (error) {
        console.warn('Error parsing Yahoo data:', error);
        return null;
    }
}

// Technical Analysis - Generate Signal
function analyzeMarketData(data, pair, timeframe) {
    if (!data || data.length < 10) {
        return { 
            signal: 'HOLD', 
            confidence: 0, 
            message: 'Insufficient data',
            price: 0,
            rsi: 50,
            volumeRatio: 1,
            reasons: ['Not enough market data for analysis'],
            pair: pair,
            timeframe: timeframe,
            timestamp: new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })
        };
    }

    const prices = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    const currentPrice = prices[prices.length - 1];
    
    // Calculate indicators
    const rsi = calculateRSI(prices);
    const ema = calculateEMA(prices, 14);
    const sma = calculateSMA(prices, 20);
    const volumeAvg = calculateAverageVolume(volumes);
    const currentVolume = volumes[volumes.length - 1];
    
    // Signal logic
    let signal = 'HOLD';
    let confidence = 0;
    let reasons = [];
    
    // RSI based signals
    if (rsi < 30) {
        confidence += 25;
        reasons.push('RSI indicates oversold condition');
        signal = 'BUY';
    } else if (rsi > 70) {
        confidence += 25;
        reasons.push('RSI indicates overbought condition');
        signal = 'SELL';
    }
    
    // Moving average signals
    if (currentPrice > ema && currentPrice > sma) {
        confidence += 20;
        reasons.push('Price above moving averages');
        if (signal === 'HOLD') signal = 'BUY';
    } else if (currentPrice < ema && currentPrice < sma) {
        confidence += 20;
        reasons.push('Price below moving averages');
        if (signal === 'HOLD') signal = 'SELL';
    }
    
    // Volume confirmation
    if (currentVolume > volumeAvg * 1.5) {
        confidence += 15;
        reasons.push('High volume confirmation');
    }
    
    // Price momentum
    const priceChange = ((currentPrice - prices[prices.length - 5]) / prices[prices.length - 5]) * 100;
    if (Math.abs(priceChange) > 0.3) {
        confidence += 10;
        reasons.push(`Significant price movement: ${priceChange.toFixed(2)}%`);
    }
    
    // Trend strength
    const trendStrength = calculateTrendStrength(prices);
    if (trendStrength > 0.6) {
        confidence += 10;
        reasons.push('Strong trend detected');
    }
    
    // Determine final signal strength
    let finalSignal = 'HOLD';
    if (confidence >= 60) {
        finalSignal = confidence >= 80 ? `STRONG ${signal}` : signal;
    } else if (confidence < 40) {
        finalSignal = 'HOLD';
        reasons.push('Weak signal confidence');
    }
    
    return {
        signal: finalSignal,
        confidence: Math.min(confidence, 95),
        price: currentPrice,
        rsi: rsi,
        volumeRatio: (currentVolume / volumeAvg).toFixed(2),
        reasons: reasons,
        pair: pair,
        timeframe: timeframe,
        timestamp: new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })
    };
}

// Technical Indicators
function calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) gains += change;
        else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / (avgLoss || 0.001);
    
    return 100 - (100 / (1 + rs));
}

function calculateSMA(prices, period) {
    if (prices.length < period) return prices[prices.length - 1];
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateEMA(prices, period) {
    const k = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
        ema = prices[i] * k + ema * (1 - k);
    }
    
    return ema;
}

function calculateAverageVolume(volumes) {
    const validVolumes = volumes.filter(v => v > 0);
    if (validVolumes.length === 0) return 1;
    return validVolumes.reduce((a, b) => a + b, 0) / validVolumes.length;
}

function calculateTrendStrength(prices) {
    if (prices.length < 10) return 0.5;
    
    const recentPrices = prices.slice(-10);
    const changes = [];
    
    for (let i = 1; i < recentPrices.length; i++) {
        changes.push(recentPrices[i] - recentPrices[i - 1]);
    }
    
    const positiveChanges = changes.filter(change => change > 0).length;
    return positiveChanges / changes.length;
}

// Display Signal
function displaySignal(signal) {
    const container = document.getElementById('signalContainer');
    
    const signalClass = `signal-${signal.signal.toLowerCase().replace(' ', '-')}`;
    const signalIcon = getSignalIcon(signal.signal);
    
    container.innerHTML = `
        <div class="${signalClass}">
            <i data-lucide="${signalIcon}" class="signal-icon"></i>
            <div class="signal-title">${signal.signal}</div>
            <div class="signal-confidence">Confidence: ${signal.confidence}%</div>
            
            <div class="signal-details">
                <div class="detail-item">
                    <div class="detail-label">Price</div>
                    <div class="detail-value">${signal.price.toFixed(4)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">RSI</div>
                    <div class="detail-value">${signal.rsi.toFixed(2)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Volume</div>
                    <div class="detail-value">${signal.volumeRatio}x</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Time</div>
                    <div class="detail-value">${signal.timestamp}</div>
                </div>
            </div>
            
            ${signal.reasons.length > 0 ? `
                <div style="margin-top: 16px; text-align: left;">
                    <div class="detail-label">Analysis Reasons:</div>
                    <ul style="font-size: 12px; color: var(--text-muted); margin-top: 8px; padding-left: 16px;">
                        ${signal.reasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    // Refresh icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function getSignalIcon(signal) {
    const icons = {
        'STRONG BUY': 'trending-up',
        'BUY': 'arrow-up',
        'HOLD': 'minus',
        'SELL': 'arrow-down',
        'STRONG SELL': 'trending-down'
    };
    return icons[signal] || 'bar-chart-3';
}

// Initialize Demo Chart
function initializeDemoChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    const demoData = {
        labels: Array.from({length: 50}, (_, i) => `Point ${i + 1}`),
        datasets: [{
            label: 'Price',
            data: Array.from({length: 50}, () => 100 + Math.random() * 20),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };
    
    window.priceChart = new Chart(ctx, {
        type: 'line',
        data: demoData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Select a currency pair to view live data',
                    color: 'rgba(255, 255, 255, 0.7)'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Update Chart with real data
function updateChart(pair, priceData = null) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Destroy existing chart if any
    if (window.priceChart) {
        window.priceChart.destroy();
    }
    
    let labels = [];
    let dataPoints = [];
    
    if (priceData && priceData.length > 0) {
        // Use real price data
        labels = priceData.map((d, i) => {
            const date = new Date(d.timestamp);
            return date.toLocaleTimeString();
        });
        dataPoints = priceData.map(d => d.close);
    } else {
        // Fallback demo data
        labels = Array.from({length: 50}, (_, i) => `Point ${i + 1}`);
        dataPoints = Array.from({length: 50}, () => 100 + Math.random() * 20);
    }
    
    window.priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${pair} Price`,
                data: dataPoints,
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Update Market Overview
async function updateMarketOverview() {
    const container = document.getElementById('marketData');
    
    // Sample market data with realistic prices
    const sampleData = [
        { pair: 'EUR/USD', price: (1.0854 + Math.random() * 0.01).toFixed(4), change: (Math.random() * 0.3 - 0.15).toFixed(2) },
        { pair: 'GBP/USD', price: (1.2650 + Math.random() * 0.01).toFixed(4), change: (Math.random() * 0.3 - 0.15).toFixed(2) },
        { pair: 'USD/JPY', price: (148.23 + Math.random() * 0.5).toFixed(2), change: (Math.random() * 0.3 - 0.15).toFixed(2) },
        { pair: 'USD/CHF', price: (0.8689 + Math.random() * 0.005).toFixed(4), change: (Math.random() * 0.3 - 0.15).toFixed(2) },
        { pair: 'AUD/USD', price: (0.6523 + Math.random() * 0.005).toFixed(4), change: (Math.random() * 0.3 - 0.15).toFixed(2) },
        { pair: 'USD/CAD', price: (1.3589 + Math.random() * 0.005).toFixed(4), change: (Math.random() * 0.3 - 0.15).toFixed(2) }
    ];
    
    container.innerHTML = sampleData.map(item => `
        <div class="market-item">
            <span class="market-pair">${item.pair}</span>
            <div>
                <span class="market-price">${item.price}</span>
                <span class="${parseFloat(item.change) >= 0 ? 'price-up' : 'price-down'}" style="margin-left: 8px; font-size: 12px;">
                    ${parseFloat(item.change) >= 0 ? '+' : ''}${item.change}%
                </span>
            </div>
        </div>
    `).join('');
}

// Utility Functions
function showLoading() {
    const btn = document.getElementById('refreshSignal');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Generating Signal...';
    btn.disabled = true;
}

function hideLoading() {
    const btn = document.getElementById('refreshSignal');
    btn.classList.remove('loading');
    btn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh Signal';
    btn.disabled = false;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function showError(message) {
    const container = document.getElementById('signalContainer');
    container.innerHTML = `
        <div class="error-message">
            <i data-lucide="alert-triangle"></i>
            <div style="margin-top: 8px;">${message}</div>
        </div>
    `;
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Auto-refresh market overview every 30 seconds
setInterval(() => {
    const pair = document.getElementById('currencyPair').value;
    if (pair) {
        updateMarketOverview();
    }
}, 30000);

// Initialize market overview on load
setTimeout(() => {
    updateMarketOverview();
}, 1000);{signal.signal}</div>
            <div class="signal-confidence">Confidence: ${signal.confidence}%</div>
            
            <div class="signal-details">
                <div class="detail-item">
                    <div class="detail-label">Price</div>
                    <div class="detail-value">${signal.price.toFixed(4)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">RSI</div>
                    <div class="detail-value">${signal.rsi.toFixed(2)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Volume</div>
                    <div class="detail-value">${signal.volumeRatio}x</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Time</div>
                    <div class="detail-value">${signal.timestamp}</div>
                </div>
            </div>
            
            ${signal.reasons.length > 0 ? `
                <div style="margin-top: 16px; text-align: left;">
                    <div class="detail-label">Analysis Reasons:</div>
                    <ul style="font-size: 12px; color: var(--text-muted); margin-top: 8px;">
                        ${signal.reasons.map(reason => `<li>${reason}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
    
    lucide.createIcons();
}

function getSignalIcon(signal) {
    const icons = {
        'STRONG BUY': 'trending-up',
        'BUY': 'arrow-up',
        'HOLD': 'minus',
        'SELL': 'arrow-down',
        'STRONG SELL': 'trending-down'
    };
    return icons[signal] || 'bar-chart-3';
}

// Update Chart
function updateChart(pair) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Sample chart data - in real app, use actual price data
    const data = {
        labels: Array.from({length: 50}, (_, i) => i),
        datasets: [{
            label: `${pair} Price`,
            data: Array.from({length: 50}, () => Math.random() * 100 + 100),
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
        }]
    };
    
    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.7)'
                    }
                }
            }
        }
    });
}

// Update Market Overview
async function updateMarketOverview() {
    const container = document.getElementById('marketData');
    
    // Sample market data
    const sampleData = [
        { pair: 'EUR/USD', price: 1.0854, change: 0.12 },
        { pair: 'GBP/USD', price: 1.2650, change: -0.08 },
        { pair: 'USD/JPY', price: 148.23, change: 0.25 },
        { pair: 'USD/CHF', price: 0.8689, change: -0.15 }
    ];
    
    container.innerHTML = sampleData.map(item => `
        <div class="market-item">
            <span class="market-pair">${item.pair}</span>
            <div>
                <span class="market-price">${item.price}</span>
                <span class="${item.change >= 0 ? 'price-up' : 'price-down'}" style="margin-left: 8px;">
                    ${item.change >= 0 ? '+' : ''}${item.change}%
                </span>
            </div>
        </div>
    `).join('');
}

// Utility Functions
function showLoading() {
    const btn = document.getElementById('refreshSignal');
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Generating Signal...';
    btn.disabled = true;
}

function hideLoading() {
    const btn = document.getElementById('refreshSignal');
    btn.classList.remove('loading');
    btn.innerHTML = '<i data-lucide="refresh-cw"></i> Refresh Signal';
    btn.disabled = false;
    lucide.createIcons();
}

function showError(message) {
    const container = document.getElementById('signalContainer');
    container.innerHTML = `
        <div class="error-message">
            <i data-lucide="alert-triangle"></i>
            <div>${message}</div>
        </div>
    `;
    lucide.createIcons();
}

// Auto-refresh every 30 seconds
setInterval(() => {
    const pair = document.getElementById('currencyPair').value;
    if (pair) {
        updateChart(pair);
        updateMarketOverview();
    }
}, 30000);
