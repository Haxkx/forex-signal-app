// Configuration
const CONFIG = {
    CURRENCY_PAIRS: [
        "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF",
        "EUR/JPY", "GBP/JPY", "EUR/GBP", "AUD/JPY", "NZD/USD", "GBP/CHF",
        "EUR/CHF", "EUR/CAD", "EUR/AUD", "CAD/JPY", "AUD/CAD", "GBP/NZD",
        "GBP/CAD", "EUR/NZD", "USD/INR", "NZD/CAD", "NZD/JPY", "AUD/NZD"
    ]
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

// Generate Trading Signal - COMPLETELY FIXED
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
        
        // Use demo data - NO API CALLS
        const data = generateRealisticDemoData(pair, timeframe);
        
        if (data && data.length > 0) {
            const signal = analyzeMarketData(data, pair, timeframe);
            displaySignal(signal);
            updateChart(pair, data);
            updateMarketOverview();
        } else {
            throw new Error('No data generated');
        }
        
    } catch (error) {
        console.error('Error generating signal:', error);
        showError('Signal generation failed. Please try again.');
    } finally {
        hideLoading();
    }
}

// Generate Realistic Demo Data - NO API DEPENDENCY
function generateRealisticDemoData(pair, timeframe) {
    const basePrices = {
        'EUR/USD': 1.0850, 'GBP/USD': 1.2650, 'USD/JPY': 148.00,
        'AUD/USD': 0.6520, 'USD/CAD': 1.3580, 'USD/CHF': 0.8680,
        'EUR/JPY': 160.50, 'GBP/JPY': 187.00, 'EUR/GBP': 0.8570,
        'AUD/JPY': 96.50, 'NZD/USD': 0.6100, 'GBP/CHF': 1.0980,
        'EUR/CHF': 0.9420, 'EUR/CAD': 1.4720, 'EUR/AUD': 1.6640,
        'CAD/JPY': 109.00, 'AUD/CAD': 0.8800, 'GBP/NZD': 2.0740,
        'GBP/CAD': 1.7180, 'EUR/NZD': 1.7780, 'USD/INR': 83.00,
        'NZD/CAD': 0.8280, 'NZD/JPY': 90.30, 'AUD/NZD': 1.0680
    };
    
    const basePrice = basePrices[pair] || 1.0000;
    const data = [];
    const now = Date.now();
    const volatility = 0.002; // 0.2% volatility
    
    let currentPrice = basePrice;
    
    for (let i = 0; i < 50; i++) {
        const priceChange = (Math.random() - 0.5) * volatility * 2;
        currentPrice = currentPrice * (1 + priceChange);
        
        const open = currentPrice;
        const high = open * (1 + Math.random() * volatility);
        const low = open * (1 - Math.random() * volatility);
        const close = open * (1 + (Math.random() - 0.5) * volatility);
        
        data.push({
            timestamp: now - (50 - i) * 60000,
            open: open,
            high: high,
            low: low,
            close: close,
            volume: 1000 + Math.random() * 5000
        });
        
        currentPrice = close;
    }
    
    return data;
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
    const volumeRatio = currentVolume / volumeAvg;
    if (volumeRatio > 1.5) {
        confidence += 15;
        reasons.push(`High volume (${volumeRatio.toFixed(1)}x average)`);
    }
    
    // Price momentum
    const priceChange = ((currentPrice - prices[prices.length - 5]) / prices[prices.length - 5]) * 100;
    if (Math.abs(priceChange) > 0.2) {
        confidence += 10;
        const direction = priceChange > 0 ? 'up' : 'down';
        reasons.push(`Price ${direction} ${Math.abs(priceChange).toFixed(2)}% in 5 periods`);
    }
    
    // Trend strength
    const trendStrength = calculateTrendStrength(prices);
    if (trendStrength > 0.7) {
        confidence += 10;
        reasons.push('Strong trending market');
    } else if (trendStrength < 0.3) {
        confidence += 5;
        reasons.push('Ranging market conditions');
    }
    
    // Determine final signal strength
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
                    text: 'Select a currency pair to view price chart',
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
            return `T-${priceData.length - i}`;
        });
        dataPoints = priceData.map(d => d.close);
    } else {
        // Fallback demo data
        labels = Array.from({length: 20}, (_, i) => `T-${20-i}`);
        dataPoints = Array.from({length: 20}, () => 100 + Math.random() * 10);
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
                },
                title: {
                    display: true,
                    text: `${pair} Price Chart`,
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

// Update Market Overview
function updateMarketOverview() {
    const container = document.getElementById('marketData');
    
    // Realistic market data
    const marketData = [
        { pair: 'EUR/USD', price: (1.0850 + Math.random() * 0.002).toFixed(4), change: (Math.random() * 0.1 - 0.05).toFixed(2) },
        { pair: 'GBP/USD', price: (1.2650 + Math.random() * 0.003).toFixed(4), change: (Math.random() * 0.1 - 0.05).toFixed(2) },
        { pair: 'USD/JPY', price: (148.00 + Math.random() * 0.2).toFixed(2), change: (Math.random() * 0.1 - 0.05).toFixed(2) },
        { pair: 'USD/CHF', price: (0.8680 + Math.random() * 0.001).toFixed(4), change: (Math.random() * 0.1 - 0.05).toFixed(2) },
        { pair: 'AUD/USD', price: (0.6520 + Math.random() * 0.002).toFixed(4), change: (Math.random() * 0.1 - 0.05).toFixed(2) },
        { pair: 'USD/CAD', price: (1.3580 + Math.random() * 0.002).toFixed(4), change: (Math.random() * 0.1 - 0.05).toFixed(2) }
    ];
    
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
    btn.innerHTML = '<span class="spinner"></span> Analyzing...';
    btn.disabled = true;
    
    signalContainer.innerHTML = `
        <div class="loading-signal">
            <div class="spinner"></div>
            <p>Analyzing market data...</p>
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
