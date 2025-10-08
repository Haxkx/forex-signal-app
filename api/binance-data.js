const axios = require('axios');

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

  const { symbol, timeframe = '1h' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  try {
    // Convert Forex symbol to Binance format (EUR/USD -> EURUSDT)
    // Remove slash and add 'T' for stablecoin pairs
    const binanceSymbol = symbol.replace('/', '') + 'USDT';
    
    console.log('Trying Binance symbol:', binanceSymbol);
    
    const binanceTimeframeMap = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '1d': '1d'
    };

    const interval = binanceTimeframeMap[timeframe] || '1h';

    const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=100`;

    console.log('Fetching Binance data from:', url);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const klines = response.data;

    if (!klines || klines.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No data found for symbol in Binance',
        symbol: symbol,
        binanceSymbol: binanceSymbol,
        note: 'This Forex pair might not be available on Binance Spot Market'
      });
    }

    // Process Binance klines data
    const candles = klines.map(kline => ({
      time: parseInt(kline[0]), // Open time
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
      closeTime: parseInt(kline[6]),
      quoteVolume: parseFloat(kline[7]),
      trades: parseInt(kline[8]),
      takerBuyBaseVolume: parseFloat(kline[9]),
      takerBuyQuoteVolume: parseFloat(kline[10])
    }));

    // Calculate some basic metrics
    const lastCandle = candles[candles.length - 1];
    const priceChange = candles.length > 1 ? 
      ((lastCandle.close - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100 : 0;

    const responseData = {
      success: true,
      symbol: symbol,
      binanceSymbol: binanceSymbol,
      timeframe: timeframe,
      source: 'binance',
      candles: candles,
      metrics: {
        currentPrice: lastCandle.close,
        priceChange: parseFloat(priceChange.toFixed(4)),
        high24h: Math.max(...candles.map(c => c.high)),
        low24h: Math.min(...candles.map(c => c.low)),
        volume24h: candles.reduce((sum, candle) => sum + candle.volume, 0)
      },
      lastUpdate: new Date().toISOString()
    };

    console.log(`Successfully fetched ${candles.length} candles for ${binanceSymbol}`);
    res.json(responseData);

  } catch (error) {
    console.error('Binance API Error:', error.message);
    
    // More specific error handling
    if (error.response) {
      // Binance API returned an error response
      const status = error.response.status;
      const errorMsg = error.response.data?.msg || error.message;
      
      if (status === 400) {
        return res.json({
          success: false,
          error: 'Invalid symbol for Binance',
          message: `The Forex pair ${symbol} is not available on Binance Spot Market`,
          symbol: symbol,
          note: 'Try using Yahoo Finance instead for Forex pairs',
          fallback: true
        });
      } else if (status === 429) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests to Binance API'
        });
      } else {
        return res.status(status).json({
          success: false,
          error: 'Binance API error',
          message: errorMsg
        });
      }
    } else if (error.request) {
      // Network error
      return res.status(503).json({
        success: false,
        error: 'Network error',
        message: 'Cannot connect to Binance API'
      });
    } else {
      // Other errors
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
};
