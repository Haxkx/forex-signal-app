const axios = require('axios');

function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const change = prices[prices.length - i] - prices[prices.length - i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period || 0.001;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateSMA(prices, period) {
  if (prices.length < period) return null;
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol = 'EUR/USD', timeframe = '15m' } = req.query;

  try {
    // Try Yahoo Finance
    const yahooSymbol = symbol.replace('/', '') + '=X';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${timeframe}&range=1d`;
    
    let candles = [];
    let source = 'yahoo';
    
    try {
      const yahooResponse = await axios.get(yahooUrl, { 
        timeout: 8000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      });
      
      if (yahooResponse.data.chart?.result?.[0]) {
        const result = yahooResponse.data.chart.result[0];
        const quotes = result.indicators.quote[0];
        const timestamps = result.timestamp;
        
        candles = timestamps.map((timestamp, index) => ({
          time: timestamp * 1000,
          open: quotes.open[index],
          high: quotes.high[index],
          low: quotes.low[index],
          close: quotes.close[index],
          volume: quotes.volume[index]
        })).filter(candle => 
          candle.open && candle.high && candle.low && candle.close
        );
        
        console.log(`Fetched ${candles.length} candles from Yahoo Finance`);
      }
    } catch (yahooError) {
      console.log('Yahoo Finance failed:', yahooError.message);
      source = 'demo';
      candles = generateDemoData();
    }
    
    if (candles.length === 0) {
      source = 'demo';
      candles = generateDemoData();
    }
    
    // Generate trading signal
    const prices = candles.map(c => c.close);
    const rsi = calculateRSI(prices);
    const sma20 = calculateSMA(prices, 20);
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2] || lastPrice;
    const priceChange = ((lastPrice - prevPrice) / prevPrice) * 100;
    
    let action = 'HOLD';
    let confidence = 0;
    let reasons = [];
    
    // Enhanced signal logic
    if (rsi < 30 && priceChange > -1) {
      action = 'BUY';
      confidence = 75;
      reasons.push('RSI indicates oversold condition');
    } else if (rsi > 70 && priceChange < 1) {
      action = 'SELL';
      confidence = 75;
      reasons.push('RSI indicates overbought condition');
    } else if (sma20 && lastPrice > sma20 && priceChange > 0.1) {
      action = 'BUY';
      confidence = 65;
      reasons.push('Price above SMA20 with upward momentum');
    } else if (sma20 && lastPrice < sma20 && priceChange < -0.1) {
      action = 'SELL';
      confidence = 65;
      reasons.push('Price below SMA20 with downward momentum');
    } else if (priceChange > 0.3) {
      action = 'BUY';
      confidence = 60;
      reasons.push('Strong positive momentum');
    } else if (priceChange < -0.3) {
      action = 'SELL';
      confidence = 60;
      reasons.push('Strong negative momentum');
    } else {
      action = 'HOLD';
      confidence = 50;
      reasons.push('Market conditions are neutral');
    }
    
    const signal = {
      action,
      confidence: Math.round(confidence),
      strength: confidence >= 70 ? 'STRONG' : confidence >= 60 ? 'MODERATE' : 'WEAK',
      reasons: reasons,
      indicators: {
        rsi: Math.round(rsi),
        priceChange: parseFloat(priceChange.toFixed(3)),
        sma20: sma20 ? parseFloat(sma20.toFixed(5)) : null
      },
      timestamp: new Date().toISOString()
    };
    
    const responseData = {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: source,
      signal: signal,
      lastPrice: parseFloat(lastPrice.toFixed(5)),
      totalCandles: candles.length,
      lastUpdate: new Date().toISOString()
    };
    
    res.json(responseData);
    
  } catch (error) {
    console.error('Signal generation error:', error.message);
    
    // Fallback to demo data
    const demoData = generateDemoData();
    const lastPrice = demoData[demoData.length - 1].close;
    const prices = demoData.map(c => c.close);
    const rsi = calculateRSI(prices);
    
    res.json({
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: 'demo',
      signal: {
        action: 'HOLD',
        confidence: 50,
        strength: 'MODERATE',
        reasons: ['Using demo data - live data temporarily unavailable'],
        indicators: { 
          rsi: Math.round(rsi),
          priceChange: 0.1,
          sma20: parseFloat(lastPrice.toFixed(5))
        },
        timestamp: new Date().toISOString()
      },
      lastPrice: lastPrice,
      totalCandles: demoData.length,
      note: 'Live market data connection failed'
    });
  }
};

// Generate realistic demo data
function generateDemoData() {
  const candles = [];
  let price = 1.0800; // Starting price for EUR/USD
  const baseTime = Date.now() - (50 * 15 * 60 * 1000); // 50 candles of 15m
  
  for (let i = 0; i < 50; i++) {
    // More realistic price movement
    const volatility = 0.001; // 0.1% volatility
    const change = (Math.random() - 0.5) * 2 * volatility;
    price = price * (1 + change);
    
    const open = price;
    const high = open * (1 + Math.random() * volatility);
    const low = open * (1 - Math.random() * volatility);
    const close = low + Math.random() * (high - low);
    
    candles.push({
      time: baseTime + (i * 15 * 60 * 1000),
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.floor(1000 + Math.random() * 5000)
    });
    
    price = close; // Next candle starts from previous close
  }
  
  return candles;
}
