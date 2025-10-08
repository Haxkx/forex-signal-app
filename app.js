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

// Initialize Lucide Icons
document.addEventListener('DOMContentLoaded', function() {
    lucide.createIcons();
    initializeApp();
});

// Main App Initialization
function initializeApp() {
    populateCurrencyPairs();
    setupEventListeners();
    loadInitialData();
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
        updateChart(pair);
    }
}

// Handle Timeframe Change
function handleTimeframeChange() {
    const pair = document.getElementById('currencyPair').value;
    if (pair) {
        updateChart(pair);
    }
}

// Generate Trading Signal
async function generateSignal() {
    const pair = document.getElementById('currencyPair').value;
    const timeframe = document.getElementById('timeframe').value;
    
    if (!pair) {
        showError('Please select a currency pair');
        return;
    }

    showLoading();
    
    try {
        // Try Binance API first
        let data = await fetchBinanceData(pair, timeframe);
        
        // If Binance fails, try Yahoo Finance
        if (!data) {
            data = await fetchYahooData(pair);
        }
        
        if (data) {
            const signal = analyzeMarketData(data, pair, timeframe);
            displaySignal(signal);
            updateChart(pair);
        } else {
            throw new Error('Both APIs failed to fetch data');
        }
        
    } catch (error) {
        console.error('Error generating signal:', error);
        showError('Failed to generate signal. Please try again.');
    } finally {
        hideLoading();
    }
}

// Fetch data from Binance API
async function fetchBinanceData(pair, timeframe) {
    try {
        const symbol = convertToBinanceSymbol(pair);
        const interval = convertToBinanceInterval(timeframe);
        
        const response = await fetch(
            `${CONFIG.BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=100`
        );
        
        if (!response.ok) throw new Error('Binance API failed');
        
        const data = await response.json();
        return parseBinanceData(data);
        
    } catch (error) {
        console.warn('Binance API failed, trying Yahoo Finance...');
        return null;
    }
}

// Fetch data from Yahoo Finance API
async function fetchYahooData(pair) {
    try {
        const symbol = convertToYahooSymbol(pair);
        
        const response = await fetch(
            `${CONFIG.YAHOO_BASE_URL}/${symbol}?range=1d&interval=1m`
        );
        
        if (!response.ok) throw new Error('Yahoo Finance API failed');
        
        const data = await response.json();
        return parseYahooData(data);
        
    } catch (error) {
        console.error('Yahoo Finance API failed:', error);
        return null;
    }
}

// Convert currency pair to Binance symbol format
function convertToBinanceSymbol(pair) {
    const symbols = {
        'EUR/USD': 'EURUSDT', 'GBP/USD': 'GBPUSDT', 'USD/JPY': 'USDJPY',
        'AUD/USD': 'AUDUSDT', 'USD/CAD': 'USDCAD', 'EUR/JPY': 'EURJPY',
        'GBP/JPY': 'GBPJPY', 'USD/CHF': 'USDCHF', 'AUD/JPY': 'AUDJPY',
        'EUR/GBP': 'EURGBP', 'NZD/USD': 'NZDUSDT'
    };
    
    return symbols[pair] || pair.replace('/', '') + 'T';
}

// Convert timeframe to Binance interval
function convertToBinanceInterval(timeframe) {
    const intervals = {
        '1m': '1m', '5m': '5m', '10m': '10m', '15m': '15m',
        '20m': '15m', '25m': '15m', '30m': '30m'
    };
    return intervals[timeframe] || '15m';
}

// Convert currency pair to Yahoo Finance symbol
function convertToYahooSymbol(pair) {
    return pair.replace('/', '') + '=X';
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
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    return timestamps.map((timestamp, index) => ({
        timestamp: timestamp * 1000,
        open: quotes.open[index],
        high: quotes.high[index],
        low: quotes.low[index],
        close: quotes.close[index],
        volume: quotes.volume[index]
    })).filter(candle => candle.open !== null);
}

// Technical Analysis - Generate Signal
function analyzeMarketData(data, pair, timeframe) {
    if (!data || data.length < 10) {
        return { signal: 'HOLD', confidence: 0, message: 'Insufficient data' };
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
    
    // Signal logic based on your Node-RED bot
    let signal = 'HOLD';
    let confidence = 0;
    let reasons = [];
    
    // RSI based signals
    if (rsi < 30) {
        confidence += 25;
        reasons.push('RSI indicates oversold condition');
    } else if (rsi > 70) {
        confidence += 25;
        reasons.push('RSI indicates overbought condition');
    }
    
    // Moving average signals
    if (currentPrice > ema && currentPrice > sma) {
        confidence += 20;
        reasons.push('Price above moving averages');
        signal = 'BUY';
    } else if (currentPrice < ema && currentPrice < sma) {
        confidence += 20;
        reasons.push('Price below moving averages');
        signal = 'SELL';
    }
    
    // Volume confirmation
    if (currentVolume > volumeAvg * 1.5) {
        confidence += 15;
        reasons.push('High volume confirmation');
    }
    
    // Price momentum
    const priceChange = ((currentPrice - prices[prices.length - 5]) / prices[prices.length - 5]) * 100;
    if (Math.abs(priceChange) > 0.5) {
        confidence += 10;
        reasons.push(`Significant price movement: ${priceChange.toFixed(2)}%`);
    }
    
    // Determine final signal strength
    let finalSignal = 'HOLD';
    if (confidence >= 60) {
        finalSignal = confidence >= 80 ? `STRONG ${signal}` : signal;
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
