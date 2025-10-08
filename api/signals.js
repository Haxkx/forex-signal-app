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

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol = 'EUR/USD', timeframe = '15m' } = req.query;

  try {
    // Try Yahoo Finance first (most reliable for Forex)
    const yahooSymbol = symbol.replace('/', '') + '=X';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${timeframe}&range=1d`;
    
    let candles = [];
    let source = 'yahoo';
    
    try {
      const yahooResponse = await axios.get(yahooUrl, { timeout: 5000 });
      
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
      }
    } catch (yahooError) {
      console.log('Yahoo Finance failed:', yahooError.message);
      // Fallback to demo data
      source = 'demo';
      candles = generateDemoData();
    }
    
    if (candles.length === 0) {
      // Final fallback to demo data
      source = 'demo';
      candles = generateDemoData();
    }
    
    // Generate trading signal
    const prices = candles.map(c => c.close);
    const rsi = calculateRSI(prices);
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2] || lastPrice;
    const priceChange = ((lastPrice - prevPrice) / prevPrice) * 100;
    
    let action = 'HOLD';
    let confidence = 0;
    let reasons = [];
    
    // Simple signal logic
    if (rsi < 30 && priceChange > -0.5) {
      action = 'BUY';
      confidence = 75;
      reasons.push('RSI indicates oversold condition');
    } else if (rsi > 70 && priceChange < 0.5) {
      action = 'SELL';
      confidence = 75;
      reasons.push('RSI indicates overbought condition');
    } else if (priceChange > 0.2) {
      action = 'BUY';
      confidence = 60;
      reasons.push('Positive price momentum');
    } else if (priceChange < -0.2) {
      action = 'SELL';
      confidence = 60;
      reasons.push('Negative price momentum');
    } else {
      reasons.push('Market conditions are neutral');
    }
    
    const signal = {
      action,
      confidence: Math.round(confidence),
      strength: confidence >= 70 ? 'STRONG' : confidence >= 50 ? 'MODERATE' : 'WEAK',
      reasons: reasons,
      indicators: {
        rsi: Math.round(rsi),
        priceChange: parseFloat(priceChange.toFixed(3))
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
    
    // Always return successful response with demo data
    const demoData = generateDemoData();
    const lastPrice = demoData[demoData.length - 1].close;
    
    res.json({
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: 'demo',
      signal: {
        action: 'HOLD',
        confidence: 50,
        strength: 'MODERATE',
        reasons: ['Using demo data for analysis'],
        indicators: { rsi: 55, priceChange: 0.1 },
        timestamp: new Date().toISOString()
      },
      lastPrice: lastPrice,
      totalCandles: demoData.length,
      note: 'Live data temporarily unavailable'
    });
  }
};

// Generate demo data as fallback
function generateDemoData() {
  const candles = [];
  let price = 1.0800; // Starting price for EUR/USD
  const baseTime = Date.now() - (100 * 15 * 60 * 1000); // 100 candles of 15m
  
  for (let i = 0; i < 50; i++) {
    const change = (Math.random() - 0.5) * 0.002; // Random price change
    price += price * change;
    
    candles.push({
      time: baseTime + (i * 15 * 60 * 1000),
      open: price * (1 - Math.random() * 0.001),
      high: price * (1 + Math.random() * 0.002),
      low: price * (1 - Math.random() * 0.002),
      close: price,
      volume: 1000 + Math.random() * 5000
    });
  }
  
  return candles;
}
