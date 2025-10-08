import axios from 'axios';

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

  const { symbol, timeframe = '1h' } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: 'Symbol parameter is required' });
  }

  try {
    // Convert Forex symbol to Binance format (EURUSD -> EURUSDT)
    const binanceSymbol = symbol.replace('/', '') + 'T';
    
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

    console.log('Fetching Binance data for:', binanceSymbol, 'with timeframe:', interval);
    
    const response = await axios.get(url, {
      timeout: 10000
    });

    const klines = response.data;

    if (!klines || klines.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for symbol in Binance',
        symbol: symbol,
        binanceSymbol: binanceSymbol
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
      trades: parseInt(kline[8])
    }));

    const responseData = {
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      source: 'binance',
      candles: candles,
      lastUpdate: new Date().toISOString()
    };

    res.json(responseData);

  } catch (error) {
    console.error('Binance API Error:', error.message);
    
    // If Binance doesn't have the pair, return empty but successful response
    if (error.response && error.response.status === 400) {
      return res.json({
        success: true,
        symbol: symbol,
        timeframe: timeframe,
        source: 'binance',
        candles: [],
        note: 'Symbol not available on Binance',
        lastUpdate: new Date().toISOString()
      });
    }
    
    res.status(500).json({
      error: 'Failed to fetch data from Binance',
      message: error.message,
      symbol: symbol,
      timeframe: timeframe
    });
  }
}