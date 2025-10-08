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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol, timeframe = '15m' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  try {
    const yahooSymbol = symbol.replace('/', '') + '=X';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${timeframe}&range=1d`;
    
    let candles = [];
    let source = 'yahoo';
    
    try {
      const yahooResponse = await axios.get(yahooUrl, { timeout: 8000 });
      
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
      console.log('Yahoo failed, trying Binance...');
      try {
        const binanceSymbol = symbol.replace('/', '') + 'T';
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${timeframe}&limit=50`;
        
        const binanceResponse = await axios.get(binanceUrl, { timeout: 8000 });
        const klines = binanceResponse.data;
        
        if (klines && klines.length > 0) {
          source = 'binance';
          candles = klines.map(kline => ({
            time: parseInt(kline[0]),
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5])
          }));
        }
      } catch (binanceError) {
        console.log('Both Yahoo and Binance failed');
      }
    }
    
    if (candles.length === 0) {
      return res.json({
        success: true,
        symbol: symbol,
        timeframe: timeframe,
        signal: {
          action: 'HOLD',
          confidence: 0,
          strength: 'WEAK',
          reasons: ['No market data available'],
          indicators: { rsi: 50, priceChange: 0 },
          timestamp: new Date().toISOString()
        },
        note: 'Using demo data'
      });
    }
    
    const prices = candles.map(c => c.close).filter(p => p);
    const rsi = calculateRSI(prices);
    const sma20 = calculateSMA(prices, 20);
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const priceChange = prevPrice ? ((lastPrice - prevPrice) / prevPrice) * 100 : 0;
    
    let action = 'HOLD';
    let confidence = 0;
    let reasons = [];
    
    if (rsi < 30 && priceChange > 0) {
      action = 'BUY';
      confidence = 75;
      reasons.push('RSI oversold with positive momentum');
    } else if (rsi > 70 && priceChange < 0) {
      action = 'SELL';
      confidence = 75;
      reasons.push('RSI overbought with negative momentum');
    } else if (sma20 && lastPrice > sma20 && priceChange > 0) {
      action = 'BUY';
      confidence = 65;
      reasons.push('Price above SMA20 with upward trend');
    } else if (sma20 && lastPrice < sma20 && priceChange < 0) {
      action = 'SELL';
      confidence = 65;
      reasons.push('Price below SMA20 with downward trend');
    } else {
      reasons.push('Market conditions neutral');
    }
    
    const signal = {
      action,
      confidence: Math.round(confidence),
      strength: confidence >= 70 ? 'STRONG' : confidence >= 60 ? 'MODERATE' : 'WEAK',
      reasons: reasons,
      indicators: {
        rsi: Math.round(rsi),
        priceChange: parseFloat(priceChange.toFixed(2))
      },
      timestamp: new Date().toISOString()
    };
    
    const responseData = {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: source,
      signal: signal,
      lastPrice: lastPrice,
      totalCandles: candles.length,
      lastUpdate: new Date().toISOString()
    };
    
    res.json(responseData);
    
  } catch (error) {
    console.error('Signal generation error:', error.message);
    
    res.json({
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      signal: {
        action: 'HOLD',
        confidence: 0,
        strength: 'WEAK',
        reasons: ['Error analyzing market data'],
        indicators: { rsi: 50, priceChange: 0 },
        timestamp: new Date().toISOString()
      },
      error: error.message
    });
  }
};  const avgLoss = losses / period || 0.001;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
  if (prices.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  
  const ema12 = calculateEMA(prices.slice(-12), 12);
  const ema26 = calculateEMA(prices.slice(-26), 26);
  
  const macd = ema12 - ema26;
  const signal = calculateEMA([macd], 9) || macd;
  const histogram = macd - signal;
  
  return { macd, signal, histogram };
}

function generateTradingSignal(candles) {
  if (!candles || candles.length < 20) {
    return {
      action: 'HOLD',
      confidence: 0,
      reason: 'Insufficient data'
    };
  }

  const prices = candles.map(c => c.close).filter(p => p);
  const volumes = candles.map(c => c.volume).filter(v => v);
  
  // Calculate indicators
  const rsi = calculateRSI(prices);
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const macd = calculateMACD(prices);
  
  const lastPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2];
  const priceChange = ((lastPrice - prevPrice) / prevPrice) * 100;
  
  let buyScore = 0;
  let sellScore = 0;
  let reasons = [];
  
  // RSI Analysis
  if (rsi < 30) {
    buyScore += 25;
    reasons.push('RSI indicates oversold');
  } else if (rsi > 70) {
    sellScore += 25;
    reasons.push('RSI indicates overbought');
  }
  
  // Moving Average Analysis
  if (sma20 && sma50) {
    if (lastPrice > sma20 && sma20 > sma50) {
      buyScore += 20;
      reasons.push('Bullish MA alignment');
    } else if (lastPrice < sma20 && sma20 < sma50) {
      sellScore += 20;
      reasons.push('Bearish MA alignment');
    }
  }
  
  // MACD Analysis
  if (macd.macd > macd.signal && macd.histogram > 0) {
    buyScore += 15;
    reasons.push('MACD bullish crossover');
  } else if (macd.macd < macd.signal && macd.histogram < 0) {
    sellScore += 15;
    reasons.push('MACD bearish crossover');
  }
  
  // Price Momentum
  if (priceChange > 0.1) {
    buyScore += 10;
    reasons.push('Positive price momentum');
  } else if (priceChange < -0.1) {
    sellScore += 10;
    reasons.push('Negative price momentum');
  }
  
  // Volume Analysis (if available)
  if (volumes.length > 0) {
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const lastVolume = volumes[volumes.length - 1];
    
    if (lastVolume > avgVolume * 1.5 && priceChange > 0) {
      buyScore += 10;
      reasons.push('High volume with upward movement');
    } else if (lastVolume > avgVolume * 1.5 && priceChange < 0) {
      sellScore += 10;
      reasons.push('High volume with downward movement');
    }
  }
  
  // Determine final signal
  let action = 'HOLD';
  let confidence = 0;
  
  if (buyScore >= 50 && buyScore > sellScore) {
    action = 'BUY';
    confidence = Math.min(buyScore, 95);
  } else if (sellScore >= 50 && sellScore > buyScore) {
    action = 'SELL';
    confidence = Math.min(sellScore, 95);
  } else {
    action = 'HOLD';
    confidence = Math.max(buyScore, sellScore);
    reasons.push('Mixed signals - waiting for confirmation');
  }
  
  return {
    action,
    confidence: Math.round(confidence),
    strength: confidence >= 70 ? 'STRONG' : confidence >= 50 ? 'MODERATE' : 'WEAK',
    reasons: reasons.slice(0, 3), // Top 3 reasons
    indicators: {
      rsi: Math.round(rsi),
      priceChange: parseFloat(priceChange.toFixed(2)),
      macdHistogram: parseFloat(macd.histogram.toFixed(6))
    },
    timestamp: new Date().toISOString()
  };
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { symbol, timeframe = '15m' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  try {
    // Try Yahoo Finance first
    const yahooSymbol = symbol.replace('/', '') + '=X';
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${timeframe}&range=1d`;
    
    let candles = [];
    let source = 'yahoo';
    
    try {
      const yahooResponse = await axios.get(yahooUrl, { timeout: 8000 });
      
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
      console.log('Yahoo failed, trying Binance...');
      
      // Fallback to Binance
      try {
        const binanceSymbol = symbol.replace('/', '') + 'T';
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${timeframe}&limit=100`;
        
        const binanceResponse = await axios.get(binanceUrl, { timeout: 8000 });
        const klines = binanceResponse.data;
        
        if (klines && klines.length > 0) {
          source = 'binance';
          candles = klines.map(kline => ({
            time: parseInt(kline[0]),
            open: parseFloat(kline[1]),
            high: parseFloat(kline[2]),
            low: parseFloat(kline[3]),
            close: parseFloat(kline[4]),
            volume: parseFloat(kline[5])
          }));
        }
      } catch (binanceError) {
        console.log('Both Yahoo and Binance failed');
      }
    }
    
    if (candles.length === 0) {
      return res.status(404).json({
        error: 'Could not fetch data for symbol from any source',
        symbol: symbol
      });
    }
    
    // Generate trading signal
    const signal = generateTradingSignal(candles);
    
    const responseData = {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: source,
      signal: signal,
      lastCandle: candles[candles.length - 1],
      totalCandles: candles.length,
      lastUpdate: new Date().toISOString()
    };
    
    res.json(responseData);
    
  } catch (error) {
    console.error('Signal generation error:', error.message);
    
    res.status(500).json({
      error: 'Failed to generate trading signal',
      message: error.message,
      symbol: symbol
    });
  }
}
