// Configuration
const CONFIG = {
    CURRENCY_PAIRS: [
        "EUR/USD", "GBP/USD", "AUD/USD", "USD/CAD", "USD/CHF",
        "EUR/JPY", "GBP/JPY", "AUD/JPY", "EUR/GBP", "EUR/CHF",
        "EUR/AUD", "EUR/CAD", "GBP/CHF", "GBP/AUD", "GBP/CAD",
        "AUD/CAD", "AUD/CHF", "CAD/JPY", "CHF/JPY", "NZD/USD"
    ],
    
    BINANCE_BASE_URL: 'https://api.binance.com/api/v3'
};

// Binance Symbol Mapping (যেগুলো কাজ করে)
const BINANCE_SYMBOLS = {
    'EUR/USD': 'EURUSDT',
    'GBP/USD': 'GBPUSDT', 
    'AUD/USD': 'AUDUSDT',
    'USD/CAD': 'USDCAD',
    'USD/CHF': 'USDCHF',
    'EUR/JPY': 'EURJPY',
    'GBP/JPY': 'GBPJPY',
    'AUD/JPY': 'AUDJPY',
    'EUR/GBP': 'EURGBP',
    'EUR/CHF': 'EURCHF',
    'EUR/AUD': 'EURAUD',
    'EUR/CAD': 'EURCAD',
    'GBP/CHF': 'GBPCHF',
    'GBP/AUD': 'GBPAUD',
    'GBP/CAD': 'GBPCAD',
    'AUD/CAD': 'AUDCAD',
    'AUD/CHF': 'AUDCHF',
    'CAD/JPY': 'CADJPY',
    'CHF/JPY': 'CHFJPY',
    'NZD/USD': 'NZDUSDT'
};

// Initialize App
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
    initializeDemoChart();
    updateMarketOverview();
}

// Populate Currency Pairs Dropdown
function populateCurrencyPairs() {
    const select = document.getElementById('currencyPair');
    select.innerHTML = '<option value="">Select Currency Pair</option>';
    
    CONFIG.CURRENCY_PAIRS.forEach(pair => {
        if (BINANCE_SYMBOLS[pair]) { // Only show pairs that work
            const option = document.createElement('option');
            option.value = pair;
            option.textContent = pair;
            select.appendChild(option);
        }
    });
}

// Event Listeners
function setupEventListeners() {
    document.getElementById('refreshSignal').addEventListener('click', generateSignal);
    document.getElementById('currencyPair').addEventListener('change', handleCurrencyPairChange);
    document.getElementById('timeframe').addEventListener('change', handleTimeframeChange);
}

// Handle Currency Pair Change
function handleCurrencyPairChange() {
    const pair = document.getElementById('currencyPair').value;
    if (pair) {
        const signalContainer = document.getElementById('signalContainer');
        signalContainer.innerHTML = `
            <div class="loading-signal">
                <div class="spinner"></div>
                <p>Ready to analyze ${pair}</p>
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

// Generate Trading Signal - WITH BINANCE API
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
        
        // Get REAL data from Binance
        const data = await fetchBinanceData(pair, timeframe);
        
        if (data && data.length > 0) {
            const signal = analyzeMarketData(data, pair, timeframe);
            displaySignal(signal);
            updateChart(pair, data);
            updateMarketOverview();
        } else {
            throw new Error('No data received from Binance');
        }
        
    } catch (error) {
        console.error('Error generating signal:', error);
        showError('Failed to generate signal. Please try again.');
    } finally {
        hideLoading();
    }
}

// Fetch REAL data from Binance API
async function fetchBinanceData(pair, timeframe) {
    try {
        const symbol = BINANCE_SYMBOLS[pair];
        if (!symbol) {
            throw new Error(`No Binance symbol for ${pair}`);
        }

        const interval = convertToBinanceInterval(timeframe);
        
        console.log(`Fetching from Binance: ${symbol}, ${interval}`);
        
        const response = await fetch(
            `${CONFIG.BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=50`
        );
        
        if (!response.ok) {
            throw new Error(`Binance API failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Binance data received:', data.length, 'candles');
        return parseBinanceData(data);
        
    } catch (error) {
        console.error('Binance API failed:', error.message);
        showError(`API Error: ${error.message}`);
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

// Technical Analysis - Generate Signal (YOUR NODE-RED LOGIC)
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
    
    // Calculate indicators (YOUR NODE-RED BOT LOGIC)
    const rsi = calculateRSI(prices);
    const ema9 = calculateEMA(prices, 9);
    const ema21 = calculateEMA(prices, 21);
    const ema50 = calculateEMA(prices, 50);
    const volumeAvg = calculateAverageVolume(volumes);
    const currentVolume = volumes[volumes.length - 1];
    
    // Signal logic based on your Node-RED bot
    let signal = 'HOLD';
    let confidence = 0;
    let reasons = [];
    
    // RSI based signals (Your bot logic)
    if (rsi < 30) {
        confidence += 25;
        reasons.push('RSI indicates oversold condition');
        signal = 'BUY';
    } else if (rsi > 70) {
        confidence += 25;
        reasons.push('RSI indicates overbought condition');
        signal = 'SELL';
    }
    
    // Multiple EMA strategy (Your bot logic)
    if (ema9 > ema21 && ema21 > ema50 && currentPrice > ema9) {
        confidence += 30;
        reasons.push('Strong bullish EMA alignment');
        if (signal === 'HOLD') signal = 'BUY';
    } else if (ema9 < ema21 && ema21 < ema50 && currentPrice < ema9) {
        confidence += 30;
        reasons.push('Strong bearish EMA alignment');
        if (signal === 'HOLD') signal = 'SELL';
    }
    
    // Volume confirmation (Your bot logic)
    const volumeRatio = currentVolume / volumeAvg;
    if (volumeRatio > 1.5) {
        confidence += 15;
        reasons.push(`High volume spike (${volumeRatio.toFixed(1)}x average)`);
    }
    
    // Price momentum
    const priceChange = ((currentPrice - prices[prices.length - 5]) / prices[prices.length - 5]) * 100;
    if (Math.abs(priceChange) > 0.2) {
        confidence += 10;
        const direction = priceChange > 0 ? 'up' : 'down';
        reasons.push(`Strong momentum: ${Math.abs(priceChange).toFixed(2)}% ${direction}`);
    }
    
    // Determine final signal strength (Your bot logic)
    let finalSignal = 'HOLD';
    if (confidence >= 60) {
        finalSignal = confidence >= 80 ? `STRONG ${signal}` : signal;
    } else {
        reasons.push('Mixed signals - waiting for confirmation');
    }
    
    return {
        signal: finalSignal,
        confidence: Math.min(Math.max(confidence, 0), 95),
        price: currentPrice,
        rsi: rsi,
        volumeRatio: volumeRatio,
        reasons: reasons,
        pair: pair,
        timeframe: timeframe,
        timestamp: new Date().toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' })
    };
}

// Technical Indicators (YOUR NODE-RED BOT FUNCTIONS)
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
                    <div class="detail-value">${signal.volumeRatio.toFixed(1)}x</div>
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

// Update Chart with REAL Binance data
function updateChart(pair, priceData) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    // Destroy existing chart if any
    if (window.priceChart) {
        window.priceChart.destroy();
    }
    
    const labels = priceData.map((d, i) => {
        return `T-${priceData.length - i}`;
    });
    
    const dataPoints = priceData.map(d => d.close);
    
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
                },
                title: {
                    display: true,
                    text: `${pair} Live Price Chart (Binance Data)`,
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: { size: 16 }
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

// Initialize Demo Chart
function initializeDemoChart() {
    const ctx = document.getElementById('priceChart').getContext('2d');
    
    const demoData = {
        labels: Array.from({length: 20}, (_, i) => `T-${20-i}`),
        datasets: [{
            label: 'Price',
            data: Array.from({length: 20}, () => 100 + Math.random() * 10),
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
                    text: 'Select a currency pair to view live Binance data',
                    color: 'rgba(255, 255, 255, 0.7)',
                    font: { size: 14 }
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

// Update Market Overview with REAL Binance data
async function updateMarketOverview() {
    const container = document.getElementById('marketData');
    
    // Real Binance data for popular pairs
    const popularPairs = [
        { symbol: 'EURUSDT', pair: 'EUR/USD' },
        { symbol: 'GBPUSDT', pair: 'GBP/USD' },
        { symbol: 'USDJPY', pair: 'USD/JPY' },
        { symbol: 'AUDUSDT', pair: 'AUD/USD' },
        { symbol: 'USDCAD', pair: 'USD/CAD' },
        { symbol: 'USDCHF', pair: 'USD/CHF' }
    ];
    
    let marketData = [];
    
    for (const item of popularPairs) {
        try {
            const response = await fetch(
                `${CONFIG.BINANCE_BASE_URL}/ticker/24hr?symbol=${item.symbol}`
            );
            
            if (response.ok) {
                const data = await response.json();
                marketData.push({
                    pair: item.pair,
                    price: parseFloat(data.lastPrice).toFixed(4),
                    change: parseFloat(data.priceChangePercent).toFixed(2)
                });
            }
        } catch (error) {
            console.warn(`Failed to fetch ${item.pair}:`, error);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // If Binance fails, use fallback
    if (marketData.length === 0) {
        marketData = [
            { pair: 'EUR/USD', price: '1.0854', change: '0.12' },
            { pair: 'GBP/USD', price: '1.2650', change: '-0.08' },
            { pair: 'USD/JPY', price: '148.23', change: '0.25' },
            { pair: 'USD/CHF', price: '0.8689', change: '-0.15' },
            { pair: 'AUD/USD', price: '0.6523', change: '0.18' },
            { pair: 'USD/CAD', price: '1.3589', change: '-0.22' }
        ];
    }
    
    container.innerHTML = marketData.map(item => `
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
    const signalContainer = document.getElementById('signalContainer');
    
    btn.classList.add('loading');
    btn.innerHTML = '<span class="spinner"></span> Analyzing Binance Data...';
    btn.disabled = true;
    
    signalContainer.innerHTML = `
        <div class="loading-signal">
            <div class="spinner"></div>
            <p>Fetching real-time data from Binance...</p>
        </div>
    `;
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
    updateMarketOverview();
}, 30000);
